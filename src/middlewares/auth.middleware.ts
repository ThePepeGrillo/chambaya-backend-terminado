import type { RequestHandler, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "../errors/app-error";
import { Rol, UsuarioActual } from "../models/usuario";
import { TokenPayload, TokenService } from "../utils/token";

// Revisa el token de la cabecera Authorization y guarda el usuario en res.locals
export function authenticate(tokens: TokenService): RequestHandler {
  return (req, res, next) => {
    const cabecera = req.headers.authorization ?? "";
    if (!cabecera.startsWith("Bearer ")) {
      return next(new UnauthorizedError("Falta el token. Usa la cabecera Authorization: Bearer <token>"));
    }
    const payload = tokens.verify(cabecera.slice(7).trim());
    if (!payload) return next(new UnauthorizedError("Token inválido o expirado"));
    res.locals.user = payload;
    next();
  };
}

// Solo deja pasar a los usuarios con alguno de los roles indicados
export function authorize(...roles: Rol[]): RequestHandler {
  return (_req, res, next) => {
    const user = res.locals.user as TokenPayload | undefined;
    if (!user || !roles.includes(user.rol)) {
      return next(new ForbiddenError(`Esta acción es solo para: ${roles.join(", ")}`));
    }
    next();
  };
}

// Id del usuario que hizo la petición (los controladores lo usan después de authenticate)
export function usuarioActualId(res: Response): number {
  return Number((res.locals.user as TokenPayload).sub);
}

// Id y rol del usuario que hizo la petición
export function usuarioActual(res: Response): UsuarioActual {
  const { sub, rol } = res.locals.user as TokenPayload;
  return { id: Number(sub), rol };
}
