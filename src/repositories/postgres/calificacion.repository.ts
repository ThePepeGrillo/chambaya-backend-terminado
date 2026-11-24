import { ConflictError } from "../../errors/app-error";
import { CalificacionRepository } from "../interfaces";
import { Consulta, esDuplicado, iso } from "./helpers";

export function crearCalificacionRepository(q: Consulta): CalificacionRepository {
  return {
    async crear(postulacionId, autorId, destinatarioId, puntaje, comentario) {
      try {
        const { rows } = await q(
          `INSERT INTO calificaciones (postulacion_id, autor_id, destinatario_id, puntaje, comentario)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, postulacion_id, autor_id, destinatario_id, puntaje, comentario, creado_en`,
          [postulacionId, autorId, destinatarioId, puntaje, comentario],
        );
        const r = rows[0];
        return {
          id: r.id,
          postulacionId: r.postulacion_id,
          autorId: r.autor_id,
          destinatarioId: r.destinatario_id,
          puntaje: r.puntaje,
          comentario: r.comentario,
          fecha: iso(r.creado_en),
        };
      } catch (e) {
        if (esDuplicado(e)) throw new ConflictError("Ya calificaste esta postulación");
        throw e;
      }
    },

    async existe(postulacionId, autorId) {
      const { rows } = await q(`SELECT 1 FROM calificaciones WHERE postulacion_id = $1 AND autor_id = $2 LIMIT 1`, [
        postulacionId,
        autorId,
      ]);
      return rows.length > 0;
    },
  };
}
