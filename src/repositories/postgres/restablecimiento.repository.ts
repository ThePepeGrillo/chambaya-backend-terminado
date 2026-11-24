import { RestablecimientoPasswordRepository } from "../interfaces";
import { Consulta } from "./helpers";

export function crearRestablecimientoRepository(q: Consulta): RestablecimientoPasswordRepository {
  return {
    async crear(usuarioId, tokenHash, expiraEn) {
      await q(`INSERT INTO restablecimientos_password (usuario_id, token_hash, expira_en) VALUES ($1, $2, $3)`, [
        usuarioId,
        tokenHash,
        expiraEn.toISOString(),
      ]);
    },

    async buscarVigente(tokenHash) {
      const { rows } = await q(
        `SELECT id, usuario_id FROM restablecimientos_password
         WHERE token_hash = $1 AND usado = FALSE AND expira_en > NOW()
         LIMIT 1`,
        [tokenHash],
      );
      return rows[0] ? { id: rows[0].id, usuarioId: rows[0].usuario_id } : null;
    },

    async marcarUsado(id) {
      await q(`UPDATE restablecimientos_password SET usado = TRUE WHERE id = $1`, [id]);
    },

    async invalidarDelUsuario(usuarioId) {
      await q(`UPDATE restablecimientos_password SET usado = TRUE WHERE usuario_id = $1 AND usado = FALSE`, [usuarioId]);
    },
  };
}
