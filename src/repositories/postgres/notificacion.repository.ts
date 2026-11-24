import { NotificacionRepository } from "../interfaces";
import { Consulta } from "./helpers";

export function crearNotificacionRepository(q: Consulta): NotificacionRepository {
  return {
    async crear(usuarioId, tipo, mensaje) {
      await q(`INSERT INTO notificaciones (usuario_id, tipo, mensaje) VALUES ($1, $2, $3)`, [usuarioId, tipo, mensaje]);
    },
  };
}
