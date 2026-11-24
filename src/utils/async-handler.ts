import type { NextFunction, Request, RequestHandler, Response } from "express";

// Si un controlador asíncrono lanza un error, lo manda al middleware de errores
export function asyncHandler(fn: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}
