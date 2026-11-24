import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error";

// Último middleware: convierte cualquier error en una respuesta JSON { "error": "mensaje" }
// Express lo reconoce como manejador de errores porque tiene 4 parámetros.
export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  // Errores del lector de JSON de Express
  const tipo = (err as { type?: string } | null)?.type;
  if (tipo === "entity.parse.failed") {
    res.status(400).json({ error: "El cuerpo no es un JSON válido" });
    return;
  }
  if (tipo === "entity.too.large") {
    res.status(413).json({ error: "El cuerpo de la petición es demasiado grande" });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
}
