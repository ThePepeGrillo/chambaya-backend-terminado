import type { Request, Response } from "express";
import { usuarioActual } from "../middlewares/auth.middleware";
import { CalificacionService } from "../services/calificacion.service";
import { validarCalificacion } from "../validators/calificacion.validator";
import { idDe } from "../validators/common";

export class CalificacionController {
  constructor(private readonly calificaciones: CalificacionService) {}

  calificar = async (req: Request, res: Response): Promise<void> => {
    const postulacionId = idDe(req.params.id, "Postulación no encontrada");
    const dto = validarCalificacion(req.body);
    const calificacion = await this.calificaciones.calificar(postulacionId, usuarioActual(res), dto);
    res.status(201).json(calificacion);
  };
}
