import { RequestHandler, Router } from "express";
import { CalificacionController } from "../controllers/calificacion.controller";
import { PostulacionController } from "../controllers/postulacion.controller";
import { authorize } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/async-handler";

export function crearPostulacionRouter(
  postulaciones: PostulacionController,
  calificaciones: CalificacionController,
  autenticar: RequestHandler,
): Router {
  const router = Router();
  router.get("/mias", autenticar, authorize("trabajador"), asyncHandler(postulaciones.listarMias));
  router.patch("/:id/estado", autenticar, authorize("empleador"), asyncHandler(postulaciones.cambiarEstado));
  router.patch("/:id/cancelar", autenticar, authorize("trabajador"), asyncHandler(postulaciones.cancelar));
  // Las dos partes (empleador y trabajador) confirman el trabajo y se califican entre sí
  router.patch("/:id/completar", autenticar, authorize("empleador", "trabajador"), asyncHandler(postulaciones.completar));
  router.post("/:id/calificaciones", autenticar, authorize("empleador", "trabajador"), asyncHandler(calificaciones.calificar));
  return router;
}
