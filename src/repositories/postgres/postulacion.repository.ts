import { ConflictError } from "../../errors/app-error";
import { PostulacionRepository } from "../interfaces";
import { aPostulacion, Consulta, esDuplicado, iso, POSTULACION_COLS } from "./helpers";

export function crearPostulacionRepository(q: Consulta): PostulacionRepository {
  const porId: PostulacionRepository["porId"] = async (id) => {
    const { rows } = await q(`SELECT ${POSTULACION_COLS} FROM postulaciones p WHERE p.id = $1`, [id]);
    return rows[0] ? aPostulacion(rows[0]) : null;
  };

  return {
    async crear(ofertaId, trabajadorId) {
      let id: number;
      try {
        const { rows } = await q(
          `INSERT INTO postulaciones (oferta_id, trabajador_id) VALUES ($1, $2) RETURNING id`,
          [ofertaId, trabajadorId],
        );
        id = rows[0].id;
      } catch (e) {
        if (esDuplicado(e)) throw new ConflictError("Ya te postulaste a esta oferta");
        throw e;
      }
      return (await porId(id)) as NonNullable<Awaited<ReturnType<typeof porId>>>;
    },

    porId,

    async existeActiva(ofertaId, trabajadorId) {
      const { rows } = await q(
        `SELECT 1 FROM postulaciones WHERE oferta_id = $1 AND trabajador_id = $2 AND estado <> 'cancelada' LIMIT 1`,
        [ofertaId, trabajadorId],
      );
      return rows.length > 0;
    },

    async listarPorOferta(ofertaId, estado) {
      const params: unknown[] = [ofertaId];
      let filtro = "";
      if (estado) {
        params.push(estado);
        filtro = `AND p.estado = $2`;
      }
      // "calificado": el empleador ya calificó a este trabajador en esta postulación
      const { rows } = await q(
        `SELECT p.id, p.estado, p.fecha_postulacion, p.confirmada_por_empleador, p.confirmada_por_trabajador,
                u.id AS trabajador_id, u.nombre, pt.habilidades, pt.disponibilidad,
                v.promedio::float8 AS calificacion_promedio, COALESCE(v.total, 0)::int AS calificaciones_total,
                EXISTS (SELECT 1 FROM calificaciones c WHERE c.postulacion_id = p.id AND c.autor_id = o.empleador_id) AS calificado
         FROM postulaciones p
         JOIN ofertas o ON o.id = p.oferta_id
         JOIN usuarios u ON u.id = p.trabajador_id
         LEFT JOIN perfiles_trabajador pt ON pt.usuario_id = u.id
         LEFT JOIN vista_calificacion_promedio v ON v.usuario_id = u.id
         WHERE p.oferta_id = $1 ${filtro}
         ORDER BY p.fecha_postulacion ASC, p.id ASC`,
        params,
      );
      return rows.map((r) => ({
        id: r.id,
        estado: r.estado,
        fechaPostulacion: iso(r.fecha_postulacion),
        confirmadaPorEmpleador: r.confirmada_por_empleador,
        confirmadaPorTrabajador: r.confirmada_por_trabajador,
        calificado: r.calificado,
        trabajador: {
          id: r.trabajador_id,
          nombre: r.nombre,
          habilidades: r.habilidades ?? [],
          disponibilidad: r.disponibilidad ?? null,
          calificacionPromedio: r.calificacion_promedio ?? null,
          calificacionesTotal: r.calificaciones_total,
        },
      }));
    },

    async listarPorTrabajador(trabajadorId) {
      // "calificado": el trabajador ya calificó al empleador; "calificacion_recibida": lo que el empleador le puso a él
      const { rows } = await q(
        `SELECT p.id, p.estado, p.fecha_postulacion, p.cancelacion_tardia,
                p.confirmada_por_empleador, p.confirmada_por_trabajador,
                o.id AS oferta_id, o.titulo, o.tipo, o.fecha, o.ubicacion,
                o.pago::float8 AS pago, o.duracion_horas::float8 AS duracion_horas,
                u.nombre AS empleador_nombre,
                EXISTS (SELECT 1 FROM calificaciones c WHERE c.postulacion_id = p.id AND c.autor_id = p.trabajador_id) AS calificado,
                (SELECT c.puntaje FROM calificaciones c WHERE c.postulacion_id = p.id AND c.destinatario_id = p.trabajador_id LIMIT 1) AS calificacion_recibida
         FROM postulaciones p
         JOIN ofertas o ON o.id = p.oferta_id
         JOIN usuarios u ON u.id = o.empleador_id
         WHERE p.trabajador_id = $1
         ORDER BY o.fecha DESC, p.id DESC`,
        [trabajadorId],
      );
      return rows.map((r) => ({
        id: r.id,
        estado: r.estado,
        fechaPostulacion: iso(r.fecha_postulacion),
        cancelacionTardia: r.cancelacion_tardia,
        confirmadaPorEmpleador: r.confirmada_por_empleador,
        confirmadaPorTrabajador: r.confirmada_por_trabajador,
        calificado: r.calificado,
        calificacionRecibida: r.calificacion_recibida ?? null,
        oferta: {
          id: r.oferta_id,
          titulo: r.titulo,
          tipo: r.tipo,
          fecha: iso(r.fecha),
          ubicacion: r.ubicacion,
          pago: r.pago,
          duracionHoras: r.duracion_horas,
          empleadorNombre: r.empleador_nombre,
        },
      }));
    },

    async actualizarEstado(id, estado) {
      await q(`UPDATE postulaciones SET estado = $2 WHERE id = $1`, [id, estado]);
    },

    async cancelar(id, motivo, tardia) {
      await q(
        `UPDATE postulaciones SET estado = 'cancelada', motivo_cancelacion = $2, cancelacion_tardia = $3 WHERE id = $1`,
        [id, motivo, tardia],
      );
    },

    async confirmar(id, parte) {
      // Dos consultas fijas: el nombre de la columna nunca viene de datos del usuario
      if (parte === "empleador") {
        await q(`UPDATE postulaciones SET confirmada_por_empleador = TRUE WHERE id = $1`, [id]);
      } else {
        await q(`UPDATE postulaciones SET confirmada_por_trabajador = TRUE WHERE id = $1`, [id]);
      }
    },
  };
}
