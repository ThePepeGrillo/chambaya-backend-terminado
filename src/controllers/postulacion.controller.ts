import type { Request, Response } from "express";
import { usuarioActual, usuarioActualId } from "../middlewares/auth.middleware";
import { PostulacionService } from "../services/postulacion.service";
import { idDe } from "../validators/common";
import { validarCambioEstado, validarCancelacion, validarFiltroEstado } from "../validators/postulacion.validator";

export class PostulacionController {
  constructor(private readonly postulaciones: PostulacionService) {}

  postular = async (req: Request, res: Response): Promise<void> => {
    const ofertaId = idDe(req.params.id, "Oferta no encontrada");
    const postulacion = await this.postulaciones.postular(ofertaId, usuarioActualId(res));
    res.status(201).json(postulacion);
  };

  listarMias = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json(await this.postulaciones.listarDelTrabajador(usuarioActualId(res)));
  };

  listarPostulantes = async (req: Request, res: Response): Promise<void> => {
    const ofertaId = idDe(req.params.id, "Oferta no encontrada");
    const estado = validarFiltroEstado(req.query as Record<string, unknown>);
    const resultado = await this.postulaciones.listarPostulantes(ofertaId, usuarioActualId(res), estado);
    res.status(200).json(resultado);
  };

  cambiarEstado = async (req: Request, res: Response): Promise<void> => {
    const id = idDe(req.params.id, "Postulación no encontrada");
    const dto = validarCambioEstado(req.body);
    const resultado = await this.postulaciones.cambiarEstado(id, usuarioActualId(res), dto);
    res.status(200).json(resultado);
  };

  cancelar = async (req: Request, res: Response): Promise<void> => {
    const id = idDe(req.params.id, "Postulación no encontrada");
    const dto = validarCancelacion(req.body);
    const resultado = await this.postulaciones.cancelar(id, usuarioActualId(res), dto);
    res.status(200).json(resultado);
  };

  completar = async (req: Request, res: Response): Promise<void> => {
    const id = idDe(req.params.id, "Postulación no encontrada");
    const resultado = await this.postulaciones.confirmarCompletado(id, usuarioActual(res));
    res.status(200).json(resultado);
  };
}
