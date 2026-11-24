import type { Request, Response } from "express";
import { usuarioActualId } from "../middlewares/auth.middleware";
import { OfertaService } from "../services/oferta.service";
import { idDe } from "../validators/common";
import { validarCrearOferta, validarFiltrosOfertas } from "../validators/oferta.validator";

export class OfertaController {
  constructor(private readonly ofertas: OfertaService) {}

  crear = async (req: Request, res: Response): Promise<void> => {
    const oferta = await this.ofertas.crear(usuarioActualId(res), validarCrearOferta(req.body));
    res.status(201).json(oferta);
  };

  listar = async (req: Request, res: Response): Promise<void> => {
    const resultado = await this.ofertas.listar(validarFiltrosOfertas(req.query as Record<string, unknown>));
    res.status(200).json(resultado);
  };

  listarMias = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json(await this.ofertas.listarDelEmpleador(usuarioActualId(res)));
  };

  obtener = async (req: Request, res: Response): Promise<void> => {
    const oferta = await this.ofertas.obtener(idDe(req.params.id, "Oferta no encontrada"));
    res.status(200).json(oferta);
  };
}
