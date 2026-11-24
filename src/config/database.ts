import { Db } from "../repositories/interfaces";
import { crearMemoriaDb } from "../repositories/memory/memory-db";
import { crearPgDb } from "../repositories/postgres/postgres-db";
import { AppConfig } from "./env";

// Elige la base de datos según la configuración: PostgreSQL o memoria
export async function crearDb(config: AppConfig): Promise<Db> {
  if (config.usarMemoria) return crearMemoriaDb();
  if (!config.databaseUrl) {
    throw new Error("Falta DATABASE_URL. Copia .env.example como .env o usa 'npm run start:memoria'.");
  }
  return crearPgDb(config.databaseUrl);
}
