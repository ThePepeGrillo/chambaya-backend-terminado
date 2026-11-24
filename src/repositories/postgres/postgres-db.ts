import { Db, Repos } from "../interfaces";
import { Consulta } from "./helpers";
import { crearCalificacionRepository } from "./calificacion.repository";
import { crearNotificacionRepository } from "./notificacion.repository";
import { crearOfertaRepository } from "./oferta.repository";
import { crearPostulacionRepository } from "./postulacion.repository";
import { crearRestablecimientoRepository } from "./restablecimiento.repository";
import { crearUsuarioRepository } from "./usuario.repository";

function crearRepos(q: Consulta): Repos {
  return {
    usuarios: crearUsuarioRepository(q),
    ofertas: crearOfertaRepository(q),
    postulaciones: crearPostulacionRepository(q),
    calificaciones: crearCalificacionRepository(q),
    notificaciones: crearNotificacionRepository(q),
    restablecimientos: crearRestablecimientoRepository(q),
  };
}

export async function crearPgDb(url: string): Promise<Db> {
  // pg se carga aquí para que el modo memoria funcione aunque no esté instalado
  const modulo: any = await import("pg");
  const Pool = modulo.Pool ?? modulo.default.Pool;

  const pool = new Pool({ connectionString: url, max: 5 });
  pool.on("error", (e: Error) => console.error("Error en una conexión con la base de datos:", e.message));
  await pool.query("SELECT 1"); // si la cadena de conexión está mal, falla aquí con un mensaje claro

  return {
    repos: crearRepos((texto, valores) => pool.query(texto, valores)),

    async transaction(fn) {
      const cliente = await pool.connect();
      try {
        await cliente.query("BEGIN");
        const resultado = await fn(crearRepos((texto, valores) => cliente.query(texto, valores)));
        await cliente.query("COMMIT");
        return resultado;
      } catch (e) {
        try {
          await cliente.query("ROLLBACK");
        } catch {
          /* si el rollback falla, el error original es el importante */
        }
        throw e;
      } finally {
        cliente.release();
      }
    },

    cerrar: () => pool.end(),
  };
}
