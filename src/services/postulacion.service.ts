import { CambiarEstadoDto, CancelarDto } from "../dtos/postulacion.dto";
import { ConflictError, ForbiddenError, NotFoundError } from "../errors/app-error";
import { AccionesPostulacion, EstadoPostulacion, PostulacionDelTrabajador, Postulante } from "../models/postulacion";
import { UsuarioActual } from "../models/usuario";
import { Db } from "../repositories/interfaces";
import { cargarParticipacion } from "./participacion";

interface OpcionesPostulaciones {
  completarSinEsperar: boolean; // solo para demos y pruebas
}

export class PostulacionService {
  constructor(
    private readonly db: Db,
    private readonly opciones: OpcionesPostulaciones = { completarSinEsperar: false },
  ) {}

  // Se puede confirmar desde el inicio del día del trabajo en la zona horaria de Colombia.
  // No se exige esperar a la hora exacta configurada en la oferta.
  private yaComenzo(fechaOferta: string): boolean {
    if (this.opciones.completarSinEsperar) return true;

    const fechaTrabajo = fechaOferta.slice(0, 10);
    const partes = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const hoy = `${partes.find((p) => p.type === "year")?.value}-${partes.find((p) => p.type === "month")?.value}-${partes.find((p) => p.type === "day")?.value}`;
    return fechaTrabajo <= hoy;
  }

  async postular(ofertaId: number, trabajadorId: number) {
    const { repos } = this.db;
    const oferta = await repos.ofertas.porId(ofertaId);
    if (!oferta) throw new NotFoundError("Oferta no encontrada");
    if (oferta.estado === "cubierta") throw new ConflictError("La oferta ya está cubierta");
    if (await repos.postulaciones.existeActiva(ofertaId, trabajadorId)) {
      throw new ConflictError("Ya te postulaste a esta oferta");
    }
    return repos.postulaciones.crear(ofertaId, trabajadorId);
  }

  async listarDelTrabajador(trabajadorId: number) {
    const lista = await this.db.repos.postulaciones.listarPorTrabajador(trabajadorId);
    const data: (PostulacionDelTrabajador & AccionesPostulacion)[] = lista.map((p) => {
      const aceptada = p.estado === "aceptada";
      return {
        ...p,
        puedeConfirmar: aceptada && !p.confirmadaPorTrabajador && this.yaComenzo(p.oferta.fecha),
        puedeCalificar: aceptada && p.confirmadaPorEmpleador && p.confirmadaPorTrabajador && !p.calificado,
      };
    });
    return { data };
  }

  async listarPostulantes(ofertaId: number, empleadorId: number, estado?: EstadoPostulacion) {
    const { repos } = this.db;
    const oferta = await repos.ofertas.porId(ofertaId);
    if (!oferta) throw new NotFoundError("Oferta no encontrada");
    if (oferta.empleadorId !== empleadorId) throw new ForbiddenError("Esta oferta no te pertenece");

    const lista = await repos.postulaciones.listarPorOferta(ofertaId, estado);
    const comenzo = this.yaComenzo(oferta.fecha);
    const data: (Postulante & AccionesPostulacion)[] = lista.map((p) => {
      const aceptada = p.estado === "aceptada";
      return {
        ...p,
        puedeConfirmar: aceptada && !p.confirmadaPorEmpleador && comenzo,
        puedeCalificar: aceptada && p.confirmadaPorEmpleador && p.confirmadaPorTrabajador && !p.calificado,
      };
    });
    return { data };
  }

  async cambiarEstado(id: number, empleadorId: number, dto: CambiarEstadoDto) {
    return this.db.transaction(async (r) => {
      const previa = await r.postulaciones.porId(id);
      if (!previa) throw new NotFoundError("Postulación no encontrada");

      // Se bloquea la oferta para que dos aceptaciones simultáneas no superen los cupos
      const oferta = await r.ofertas.bloquear(previa.ofertaId);
      if (!oferta) throw new NotFoundError("Oferta no encontrada");
      if (oferta.empleadorId !== empleadorId) throw new ForbiddenError("Esta oferta no te pertenece");

      const postulacion = await r.postulaciones.porId(id); // se lee de nuevo ya con el bloqueo
      if (!postulacion) throw new NotFoundError("Postulación no encontrada");
      if (postulacion.estado !== "pendiente") {
        throw new ConflictError(`La postulación ya está '${postulacion.estado}' y no se puede cambiar`);
      }

      const nombreEmpleador = (await r.usuarios.nombrePorId(oferta.empleadorId)) ?? "el empleador";
      let aceptados = await r.ofertas.contarAceptados(oferta.id);
      let estadoOferta = oferta.estado;

      if (dto.estado === "aceptada") {
        if (aceptados >= oferta.cupos) {
          throw new ConflictError("Los cupos de la oferta ya están completos; el postulante queda en espera");
        }
        await r.postulaciones.actualizarEstado(id, "aceptada");
        aceptados += 1;
        if (aceptados >= oferta.cupos) {
          await r.ofertas.actualizarEstado(oferta.id, "cubierta");
          estadoOferta = "cubierta";
        }
        await r.notificaciones.crear(
          postulacion.trabajadorId,
          "aceptacion",
          `Fuiste aceptado en "${oferta.titulo}" de ${nombreEmpleador}. Fecha: ${oferta.fecha}. Lugar: ${oferta.ubicacion}.`,
        );
      } else {
        await r.postulaciones.actualizarEstado(id, "rechazada");
        await r.notificaciones.crear(
          postulacion.trabajadorId,
          "rechazo",
          `Tu postulación a "${oferta.titulo}" de ${nombreEmpleador} fue rechazada.`,
        );
      }

      return {
        postulacion: { ...postulacion, estado: dto.estado },
        oferta: { ...oferta, estado: estadoOferta, aceptados },
      };
    });
  }

  async cancelar(id: number, trabajadorId: number, dto: CancelarDto) {
    return this.db.transaction(async (r) => {
      const previa = await r.postulaciones.porId(id);
      if (!previa) throw new NotFoundError("Postulación no encontrada");
      if (previa.trabajadorId !== trabajadorId) throw new ForbiddenError("Esta postulación no es tuya");

      const oferta = await r.ofertas.bloquear(previa.ofertaId);
      if (!oferta) throw new NotFoundError("Oferta no encontrada");

      const postulacion = await r.postulaciones.porId(id); // lectura con el bloqueo ya tomado
      if (!postulacion) throw new NotFoundError("Postulación no encontrada");
      if (postulacion.estado !== "pendiente" && postulacion.estado !== "aceptada") {
        throw new ConflictError(`No se puede cancelar una postulación '${postulacion.estado}'`);
      }

      const estabaAceptada = postulacion.estado === "aceptada";
      const horasRestantes = (Date.parse(oferta.fecha) - Date.now()) / 3_600_000;
      const tardia = estabaAceptada && horasRestantes < 24;
      await r.postulaciones.cancelar(id, dto.motivo, tardia);

      if (estabaAceptada) {
        if (oferta.estado === "cubierta") await r.ofertas.actualizarEstado(oferta.id, "abierta"); // el cupo liberado reabre la oferta
        const nombre = (await r.usuarios.nombrePorId(trabajadorId)) ?? "Un trabajador";
        await r.notificaciones.crear(
          oferta.empleadorId,
          "cancelacion",
          `${nombre} canceló su participación en "${oferta.titulo}". Motivo: ${dto.motivo}`,
        );
      }

      return { id, estado: "cancelada" as const, cancelacionTardia: tardia };
    });
  }

  // Cada parte confirma por su lado que el trabajo se realizó; con las dos confirmaciones ya se puede calificar
  async confirmarCompletado(id: number, usuario: UsuarioActual) {
    return this.db.transaction(async (r) => {
      const { postulacion, oferta, parte } = await cargarParticipacion(r, id, usuario);

      if (postulacion.estado !== "aceptada") {
        throw new ConflictError("Solo se puede confirmar un trabajo cuya postulación fue aceptada");
      }
      if (!this.yaComenzo(oferta.fecha)) {
        throw new ConflictError("El trabajo todavía no ha comenzado, no se puede confirmar aún");
      }

      const yaConfirmo = parte === "empleador" ? postulacion.confirmadaPorEmpleador : postulacion.confirmadaPorTrabajador;
      if (!yaConfirmo) await r.postulaciones.confirmar(id, parte);

      const confirmadaPorEmpleador = parte === "empleador" ? true : postulacion.confirmadaPorEmpleador;
      const confirmadaPorTrabajador = parte === "trabajador" ? true : postulacion.confirmadaPorTrabajador;
      return {
        id,
        confirmadaPorEmpleador,
        confirmadaPorTrabajador,
        completada: confirmadaPorEmpleador && confirmadaPorTrabajador,
      };
    });
  }
}
