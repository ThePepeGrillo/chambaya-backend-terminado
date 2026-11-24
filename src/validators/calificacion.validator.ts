import { CalificarDto } from "../dtos/calificacion.dto";
import { BadRequestError } from "../errors/app-error";
import { objeto, textoOpcional } from "./common";

export function validarCalificacion(body: unknown): CalificarDto {
  const b = objeto(body);
  const puntaje = b.puntaje;
  if (typeof puntaje !== "number" || !Number.isInteger(puntaje) || puntaje < 1 || puntaje > 5) {
    throw new BadRequestError("El campo 'puntaje' es obligatorio y debe ser un entero entre 1 y 5");
  }
  const comentario = textoOpcional(b, "comentario");
  if (comentario !== undefined && comentario.length > 500) {
    throw new BadRequestError("El comentario no puede superar los 500 caracteres");
  }
  return { puntaje, comentario: comentario || undefined };
}
