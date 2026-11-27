import express, { Express } from "express";
import { AppConfig } from "./config/env";
import { AuthController } from "./controllers/auth.controller";
import { CalificacionController } from "./controllers/calificacion.controller";
import { OfertaController } from "./controllers/oferta.controller";
import { PostulacionController } from "./controllers/postulacion.controller";
import { authenticate } from "./middlewares/auth.middleware";
import { corsMiddleware } from "./middlewares/cors.middleware";
import { errorMiddleware } from "./middlewares/error.middleware";
import { notFoundMiddleware } from "./middlewares/not-found.middleware";
import { Db } from "./repositories/interfaces";
import { crearApiRouter } from "./routes";
import { AuthService } from "./services/auth.service";
import { CalificacionService } from "./services/calificacion.service";
import { crearEmailService, EmailService } from "./services/email.service";
import { OfertaService } from "./services/oferta.service";
import { PostulacionService } from "./services/postulacion.service";
import { TokenService } from "./utils/token";

// Arma la aplicación: crea cada capa y la conecta con la siguiente
// (repositorios -> servicios -> controladores -> rutas)
export function createApp(config: AppConfig, db: Db, correos: EmailService = crearEmailService(config)): Express {
  const tokens = new TokenService(config.jwtSecret);

  const servicios = {
    auth: new AuthService(db, tokens, correos, config.frontendUrl, config.exponerEnlaceRecuperacion),
    ofertas: new OfertaService(db),
    postulaciones: new PostulacionService(db, { completarSinEsperar: config.completarSinEsperar, emailNotificacionesTo: config.emailNotificacionesTo }, correos),
    calificaciones: new CalificacionService(db),
  };

  const controladores = {
    auth: new AuthController(servicios.auth),
    ofertas: new OfertaController(servicios.ofertas),
    postulaciones: new PostulacionController(servicios.postulaciones),
    calificaciones: new CalificacionController(servicios.calificaciones),
  };

  const app = express();
  app.use(corsMiddleware(config.corsOrigins));
  app.use(express.json({ limit: "1mb" }));
  app.use("/api/v1", crearApiRouter(controladores, authenticate(tokens)));
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  return app;
}
