import { OfertaRepository } from "../interfaces";
import { ACEPTADOS, aOferta, Consulta, escaparLike, OFERTA_COLS } from "./helpers";

export function crearOfertaRepository(q: Consulta): OfertaRepository {
  const porId: OfertaRepository["porId"] = async (id) => {
    const { rows } = await q(`SELECT ${OFERTA_COLS}, ${ACEPTADOS} FROM ofertas o WHERE o.id = $1`, [id]);
    return rows[0] ? { ...aOferta(rows[0]), aceptados: rows[0].aceptados } : null;
  };

  return {
    async crear(empleadorId, dto) {
      const { rows } = await q(
        `INSERT INTO ofertas (empleador_id, titulo, tipo, descripcion, fecha, duracion_horas, pago, ubicacion, cupos)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [empleadorId, dto.titulo, dto.tipo, dto.descripcion, dto.fecha, dto.duracionHoras, dto.pago, dto.ubicacion, dto.cupos],
      );
      return (await porId(rows[0].id)) as NonNullable<Awaited<ReturnType<typeof porId>>>;
    },

    async listar(f) {
      const params: unknown[] = [];
      const condiciones = [`o.estado = 'abierta'`];
      if (f.fecha) {
        params.push(f.fecha);
        condiciones.push(`(o.fecha AT TIME ZONE 'UTC')::date = $${params.length}::date`);
      }
      if (f.ubicacion) {
        params.push(`%${escaparLike(f.ubicacion)}%`);
        condiciones.push(`o.ubicacion ILIKE $${params.length}`);
      }
      if (f.tipo) {
        params.push(`%${escaparLike(f.tipo)}%`);
        condiciones.push(`o.tipo ILIKE $${params.length}`);
      }
      const donde = condiciones.join(" AND ");

      const conteo = await q(`SELECT COUNT(*)::int AS total FROM ofertas o WHERE ${donde}`, params);

      params.push(f.limit, (f.page - 1) * f.limit);
      const { rows } = await q(
        `SELECT ${OFERTA_COLS}, ${ACEPTADOS}
         FROM ofertas o
         WHERE ${donde}
         ORDER BY o.fecha ASC, o.id ASC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      );
      return {
        data: rows.map((r) => ({ ...aOferta(r), aceptados: r.aceptados })),
        total: conteo.rows[0].total,
      };
    },

    porId,

    async listarPorEmpleador(empleadorId) {
      const { rows } = await q(
        `SELECT ${OFERTA_COLS}, ${ACEPTADOS}
         FROM ofertas o
         WHERE o.empleador_id = $1
         ORDER BY o.fecha DESC, o.id DESC`,
        [empleadorId],
      );
      return rows.map((r) => ({ ...aOferta(r), aceptados: r.aceptados }));
    },

    async bloquear(id) {
      const { rows } = await q(`SELECT ${OFERTA_COLS} FROM ofertas o WHERE o.id = $1 FOR UPDATE`, [id]);
      return rows[0] ? aOferta(rows[0]) : null;
    },

    async contarAceptados(id) {
      const { rows } = await q(
        `SELECT COUNT(*)::int AS n FROM postulaciones WHERE oferta_id = $1 AND estado = 'aceptada'`,
        [id],
      );
      return rows[0].n;
    },

    async actualizarEstado(id, estado) {
      await q(`UPDATE ofertas SET estado = $2 WHERE id = $1`, [id, estado]);
    },
  };
}
