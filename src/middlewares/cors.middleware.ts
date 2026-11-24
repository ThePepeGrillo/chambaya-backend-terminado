import type { RequestHandler } from "express";

// Permite que el frontend (otro puerto) llame a la API desde el navegador
export function corsMiddleware(origenesPermitidos: string[]): RequestHandler {
  return (req, res, next) => {
    const origen = req.headers.origin;
    if (origen && origenesPermitidos.includes(origen)) {
      res.setHeader("Access-Control-Allow-Origin", origen);
      res.setHeader("Vary", "Origin");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      res.status(204).end(); // respuesta a la consulta previa (preflight) del navegador
      return;
    }
    next();
  };
}
