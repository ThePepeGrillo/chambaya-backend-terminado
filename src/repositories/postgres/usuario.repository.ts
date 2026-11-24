import { ConflictError } from "../../errors/app-error";
import { UsuarioRepository } from "../interfaces";
import { Consulta, esDuplicado } from "./helpers";

export function crearUsuarioRepository(q: Consulta): UsuarioRepository {
  return {
    async crear(u) {
      let fila: any;
      try {
        const res = await q(
          `INSERT INTO usuarios (nombre, correo, password_hash, rol)
           VALUES ($1, $2, $3, $4)
           RETURNING id, nombre, correo, rol, verificado`,
          [u.nombre, u.correo, u.passwordHash, u.rol],
        );
        fila = res.rows[0];
      } catch (e) {
        if (esDuplicado(e)) throw new ConflictError("Ya existe un usuario con ese correo");
        throw e;
      }

      if (u.rol === "empleador") {
        await q(`INSERT INTO perfiles_empleador (usuario_id, nit, direccion) VALUES ($1, $2, $3)`, [
          fila.id,
          u.nit ?? null,
          u.direccion ?? null,
        ]);
      } else {
        await q(`INSERT INTO perfiles_trabajador (usuario_id, habilidades, disponibilidad) VALUES ($1, $2, $3)`, [
          fila.id,
          u.habilidades ?? [],
          u.disponibilidad ?? null,
        ]);
      }
      return { id: fila.id, nombre: fila.nombre, correo: fila.correo, rol: fila.rol, verificado: fila.verificado };
    },

    async porCorreo(correo) {
      const { rows } = await q(
        `SELECT id, nombre, correo, password_hash, rol, verificado FROM usuarios WHERE correo = $1`,
        [correo],
      );
      const r = rows[0];
      return r
        ? { id: r.id, nombre: r.nombre, correo: r.correo, passwordHash: r.password_hash, rol: r.rol, verificado: r.verificado }
        : null;
    },

    async cambiarPassword(id, passwordHash) {
      await q(`UPDATE usuarios SET password_hash = $2 WHERE id = $1`, [id, passwordHash]);
    },

    async nombrePorId(id) {
      const { rows } = await q(`SELECT nombre FROM usuarios WHERE id = $1`, [id]);
      return rows[0] ? rows[0].nombre : null;
    },
  };
}
