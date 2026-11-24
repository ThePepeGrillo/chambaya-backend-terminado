import { RequestHandler, Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { CalificacionController } from "../controllers/calificacion.controller";
import { OfertaController } from "../controllers/oferta.controller";
import { PostulacionController } from "../controllers/postulacion.controller";
import { crearAuthRouter } from "./auth.routes";
import { crearOfertaRouter } from "./oferta.routes";
import { crearPostulacionRouter } from "./postulacion.routes";

export interface Controladores {
  auth: AuthController;
  ofertas: OfertaController;
  postulaciones: PostulacionController;
  calificaciones: CalificacionController;
}

// Junta todas las rutas de la API: /auth, /ofertas y /postulaciones
export function crearApiRouter(c: Controladores, autenticar: RequestHandler): Router {
  const router = Router();
  router.use("/auth", crearAuthRouter(c.auth));
  router.use("/ofertas", crearOfertaRouter(c.ofertas, c.postulaciones, autenticar));
  router.use("/postulaciones", crearPostulacionRouter(c.postulaciones, c.calificaciones, autenticar));
  return router;
}
