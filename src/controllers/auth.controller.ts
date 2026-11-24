import type { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { validarLogin, validarOlvidePassword, validarRegister, validarRestablecerPassword } from "../validators/auth.validator";

export class AuthController {
  constructor(private readonly auth: AuthService) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const usuario = await this.auth.register(validarRegister(req.body));
    res.status(201).json(usuario);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const resultado = await this.auth.login(validarLogin(req.body));
    res.status(200).json(resultado);
  };

  olvidePassword = async (req: Request, res: Response): Promise<void> => {
    const resultado = await this.auth.olvidePassword(validarOlvidePassword(req.body));
    res.status(200).json(resultado);
  };

  restablecerPassword = async (req: Request, res: Response): Promise<void> => {
    const resultado = await this.auth.restablecerPassword(validarRestablecerPassword(req.body));
    res.status(200).json(resultado);
  };
}
