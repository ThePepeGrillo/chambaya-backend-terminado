import { CalificarDto } from "../dtos/calificacion.dto";
import { ConflictError } from "../errors/app-error";
import { UsuarioActual } from "../models/usuario";
import { Db } from "../repositories/interfaces";
import { cargarParticipacion } from "./participacion";

export class CalificacionService {
  constructor(private readonly db: Db) {}

  // Empleador y trabajador se califican entre sí, una vez cada uno, cuando ambos confirmaron el trabajo
  async calificar(postulacionId: number, usuario: UsuarioActual, dto: CalificarDto) {
    return this.db.transaction(async (r) => {
      const { postulacion, oferta, parte } = await cargarParticipacion(r, postulacionId, usuario);

      if (postulacion.estado !== "aceptada") {
        throw new ConflictError("Solo se califican los trabajos de postulaciones aceptadas");
      }
      if (!(postulacion.confirmadaPorEmpleador && postulacion.confirmadaPorTrabajador)) {
        throw new ConflictError("Ambas partes deben confirmar que el trabajo se completó antes de calificar");
      }
      if (await r.calificaciones.existe(postulacionId, usuario.id)) {
        throw new ConflictError("Ya calificaste esta postulación");
      }

      const destinatarioId = parte === "empleador" ? postulacion.trabajadorId : oferta.empleadorId;
      return r.calificaciones.crear(postulacionId, usuario.id, destinatarioId, dto.puntaje, dto.comentario ?? null);
    });
  }
}
