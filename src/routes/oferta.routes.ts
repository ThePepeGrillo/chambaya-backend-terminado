import { RequestHandler, Router } from "express";
import { OfertaController } from "../controllers/oferta.controller";
import { PostulacionController } from "../controllers/postulacion.controller";
import { authorize } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/async-handler";

export function crearOfertaRouter(
  ofertas: OfertaController,
  postulaciones: PostulacionController,
  autenticar: RequestHandler,
): Router {
  const router = Router();
  router.get("/", asyncHandler(ofertas.listar));
  router.post("/", autenticar, authorize("empleador"), asyncHandler(ofertas.crear));
  router.get("/mias", autenticar, authorize("empleador"), asyncHandler(ofertas.listarMias)); // antes de "/:id"
  router.get("/:id", asyncHandler(ofertas.obtener));
  router.post("/:id/postulaciones", autenticar, authorize("trabajador"), asyncHandler(postulaciones.postular));
  router.get("/:id/postulaciones", autenticar, authorize("empleador"), asyncHandler(postulaciones.listarPostulantes));
  return router;
}
