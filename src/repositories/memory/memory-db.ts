// Base de datos "de mentira" en memoria: sirve para probar sin PostgreSQL (npm run start:memoria).
// Los datos se borran al reiniciar el servidor.
import { ConflictError } from "../../errors/app-error";
import { Calificacion } from "../../models/calificacion";
import { Oferta, OfertaConAceptados } from "../../models/oferta";
import { Postulacion } from "../../models/postulacion";
import { UsuarioConHash } from "../../models/usuario";
import { Db, Repos } from "../interfaces";

interface UsuarioMem extends UsuarioConHash {
  habilidades: string[];
  disponibilidad: string | null;
}

interface RestablecimientoMem {
  id: number;
  usuarioId: number;
  tokenHash: string;
  expiraEn: number; // milisegundos
  usado: boolean;
}

export function crearMemoriaDb(): Db {
  const usuarios: UsuarioMem[] = [];
  const ofertas: Oferta[] = [];
  const postulaciones: Postulacion[] = [];
  const calificaciones: Calificacion[] = [];
  const restablecimientos: RestablecimientoMem[] = [];
  const contador = { u: 0, o: 0, p: 0, c: 0, r: 0 };

  const aceptadosDe = (ofertaId: number) =>
    postulaciones.filter((p) => p.ofertaId === ofertaId && p.estado === "aceptada").length;
  const conAceptados = (o: Oferta): OfertaConAceptados => ({ ...o, aceptados: aceptadosDe(o.id) });
  const publico = ({ id, nombre, correo, rol, verificado }: UsuarioConHash) => ({ id, nombre, correo, rol, verificado });

  // Promedio de lo que le han calificado a un usuario (null si no tiene calificaciones)
  const recibidas = (usuarioId: number) => calificaciones.filter((c) => c.destinatarioId === usuarioId);
  const promedio = (usuarioId: number): number | null => {
    const lista = recibidas(usuarioId);
    if (lista.length === 0) return null;
    return Math.round((lista.reduce((suma, c) => suma + c.puntaje, 0) / lista.length) * 100) / 100;
  };

  const repos: Repos = {
    usuarios: {
      async crear(u) {
        if (usuarios.some((x) => x.correo === u.correo)) throw new ConflictError("Ya existe un usuario con ese correo");
        const nuevo: UsuarioMem = {
          id: ++contador.u,
          nombre: u.nombre,
          correo: u.correo,
          passwordHash: u.passwordHash,
          rol: u.rol,
          verificado: false,
          habilidades: u.habilidades ?? [],
          disponibilidad: u.disponibilidad ?? null,
        };
        usuarios.push(nuevo);
        return publico(nuevo);
      },
      async porCorreo(correo) {
        const u = usuarios.find((x) => x.correo === correo);
        return u ? { ...publico(u), passwordHash: u.passwordHash } : null;
      },
      async nombrePorId(id) {
        return usuarios.find((x) => x.id === id)?.nombre ?? null;
      },
      async cambiarPassword(id, passwordHash) {
        const u = usuarios.find((x) => x.id === id);
        if (u) u.passwordHash = passwordHash;
      },
    },

    ofertas: {
      async crear(empleadorId, dto) {
        const o: Oferta = { id: ++contador.o, empleadorId, ...dto, estado: "abierta" };
        ofertas.push(o);
        return conAceptados(o);
      },
      async listar(f) {
        const ubicacion = f.ubicacion?.toLowerCase();
        const tipo = f.tipo?.toLowerCase();
        const filtradas = ofertas
          .filter((o) => o.estado === "abierta")
          .filter((o) => (f.fecha ? o.fecha.slice(0, 10) === f.fecha : true))
          .filter((o) => (ubicacion ? o.ubicacion.toLowerCase().includes(ubicacion) : true))
          .filter((o) => (tipo ? o.tipo.toLowerCase().includes(tipo) : true))
          .sort((a, b) => Date.parse(a.fecha) - Date.parse(b.fecha) || a.id - b.id);
        return {
          data: filtradas.slice((f.page - 1) * f.limit, f.page * f.limit).map(conAceptados),
          total: filtradas.length,
        };
      },
      async porId(id) {
        const o = ofertas.find((x) => x.id === id);
        return o ? conAceptados(o) : null;
      },
      async listarPorEmpleador(empleadorId) {
        return ofertas
          .filter((o) => o.empleadorId === empleadorId)
          .sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha) || b.id - a.id)
          .map(conAceptados);
      },
      async bloquear(id) {
        return ofertas.find((x) => x.id === id) ?? null;
      },
      async contarAceptados(id) {
        return aceptadosDe(id);
      },
      async actualizarEstado(id, estado) {
        const o = ofertas.find((x) => x.id === id);
        if (o) o.estado = estado;
      },
    },

    postulaciones: {
      async crear(ofertaId, trabajadorId) {
        if (postulaciones.some((p) => p.ofertaId === ofertaId && p.trabajadorId === trabajadorId && p.estado !== "cancelada")) {
          throw new ConflictError("Ya te postulaste a esta oferta");
        }
        const p: Postulacion = {
          id: ++contador.p,
          ofertaId,
          trabajadorId,
          estado: "pendiente",
          fechaPostulacion: new Date().toISOString(),
          cancelacionTardia: false,
          motivoCancelacion: null,
          confirmadaPorEmpleador: false,
          confirmadaPorTrabajador: false,
        };
        postulaciones.push(p);
        return { ...p };
      },
      async porId(id) {
        const p = postulaciones.find((x) => x.id === id);
        return p ? { ...p } : null;
      },
      async existeActiva(ofertaId, trabajadorId) {
        return postulaciones.some((p) => p.ofertaId === ofertaId && p.trabajadorId === trabajadorId && p.estado !== "cancelada");
      },
      async listarPorOferta(ofertaId, estado) {
        const oferta = ofertas.find((o) => o.id === ofertaId);
        return postulaciones
          .filter((p) => p.ofertaId === ofertaId && (estado ? p.estado === estado : true))
          .map((p) => {
            const t = usuarios.find((u) => u.id === p.trabajadorId);
            return {
              id: p.id,
              estado: p.estado,
              fechaPostulacion: p.fechaPostulacion,
              confirmadaPorEmpleador: p.confirmadaPorEmpleador,
              confirmadaPorTrabajador: p.confirmadaPorTrabajador,
              calificado: calificaciones.some((c) => c.postulacionId === p.id && c.autorId === oferta?.empleadorId),
              trabajador: {
                id: p.trabajadorId,
                nombre: t?.nombre ?? "Desconocido",
                habilidades: t?.habilidades ?? [],
                disponibilidad: t?.disponibilidad ?? null,
                calificacionPromedio: promedio(p.trabajadorId),
                calificacionesTotal: recibidas(p.trabajadorId).length,
              },
            };
          });
      },
      async listarPorTrabajador(trabajadorId) {
        return postulaciones
          .filter((p) => p.trabajadorId === trabajadorId)
          .flatMap((p) => {
            const o = ofertas.find((x) => x.id === p.ofertaId);
            if (!o) return [];
            return [
              {
                id: p.id,
                estado: p.estado,
                fechaPostulacion: p.fechaPostulacion,
                cancelacionTardia: p.cancelacionTardia,
                confirmadaPorEmpleador: p.confirmadaPorEmpleador,
                confirmadaPorTrabajador: p.confirmadaPorTrabajador,
                calificado: calificaciones.some((c) => c.postulacionId === p.id && c.autorId === trabajadorId),
                calificacionRecibida: calificaciones.find((c) => c.postulacionId === p.id && c.destinatarioId === trabajadorId)?.puntaje ?? null,
                oferta: {
                  id: o.id,
                  titulo: o.titulo,
                  tipo: o.tipo,
                  fecha: o.fecha,
                  ubicacion: o.ubicacion,
                  pago: o.pago,
                  duracionHoras: o.duracionHoras,
                  empleadorNombre: usuarios.find((u) => u.id === o.empleadorId)?.nombre ?? "Empleador",
                },
              },
            ];
          })
          .sort((a, b) => Date.parse(b.oferta.fecha) - Date.parse(a.oferta.fecha) || b.id - a.id);
      },
      async actualizarEstado(id, estado) {
        const p = postulaciones.find((x) => x.id === id);
        if (p) p.estado = estado;
      },
      async cancelar(id, motivo, tardia) {
        const p = postulaciones.find((x) => x.id === id);
        if (p) {
          p.estado = "cancelada";
          p.motivoCancelacion = motivo;
          p.cancelacionTardia = tardia;
        }
      },
      async confirmar(id, parte) {
        const p = postulaciones.find((x) => x.id === id);
        if (!p) return;
        if (parte === "empleador") p.confirmadaPorEmpleador = true;
        else p.confirmadaPorTrabajador = true;
      },
    },

    calificaciones: {
      async crear(postulacionId, autorId, destinatarioId, puntaje, comentario) {
        if (calificaciones.some((c) => c.postulacionId === postulacionId && c.autorId === autorId)) {
          throw new ConflictError("Ya calificaste esta postulación");
        }
        const nueva: Calificacion = {
          id: ++contador.c,
          postulacionId,
          autorId,
          destinatarioId,
          puntaje,
          comentario,
          fecha: new Date().toISOString(),
        };
        calificaciones.push(nueva);
        return { ...nueva };
      },
      async existe(postulacionId, autorId) {
        return calificaciones.some((c) => c.postulacionId === postulacionId && c.autorId === autorId);
      },
    },

    notificaciones: {
      async crear() {
        /* en modo memoria no se guardan */
      },
    },

    restablecimientos: {
      async crear(usuarioId, tokenHash, expiraEn) {
        restablecimientos.push({ id: ++contador.r, usuarioId, tokenHash, expiraEn: expiraEn.getTime(), usado: false });
      },
      async buscarVigente(tokenHash) {
        const r = restablecimientos.find((x) => x.tokenHash === tokenHash && !x.usado && x.expiraEn > Date.now());
        return r ? { id: r.id, usuarioId: r.usuarioId } : null;
      },
      async marcarUsado(id) {
        const r = restablecimientos.find((x) => x.id === id);
        if (r) r.usado = true;
      },
      async invalidarDelUsuario(usuarioId) {
        for (const r of restablecimientos) if (r.usuarioId === usuarioId) r.usado = true;
      },
    },
  };

  return { repos, transaction: (fn) => fn(repos), cerrar: async () => {} };
}
