import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { asyncHandler } from "../utils/async-handler";

export function crearAuthRouter(controller: AuthController): Router {
  const router = Router();
  router.post("/register", asyncHandler(controller.register));
  router.post("/login", asyncHandler(controller.login));
  router.post("/forgot-password", asyncHandler(controller.olvidePassword));
  router.post("/reset-password", asyncHandler(controller.restablecerPassword));
  return router;
}
