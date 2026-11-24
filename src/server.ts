import { createApp } from "./app";
import { crearDb } from "./config/database";
import { loadConfig } from "./config/env";

async function main(): Promise<void> {
  const config = loadConfig();
  const db = await crearDb(config);
  const app = createApp(config, db);

  app.listen(config.port, () => {
    console.log(`ChambaYa API escuchando en http://localhost:${config.port}/api/v1`);
    console.log(config.usarMemoria ? "Datos: en memoria (se borran al apagar)" : "Datos: PostgreSQL conectado");
  });

  process.on("SIGINT", () => {
    void db.cerrar().finally(() => process.exit(0));
  });
}

main().catch((err: Error) => {
  console.error("No se pudo iniciar el servidor:", err.message);
  console.error("Si el error es de conexión, revisa DATABASE_URL en el archivo .env.");
  process.exit(1);
});
