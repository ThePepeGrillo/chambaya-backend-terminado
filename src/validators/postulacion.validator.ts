import { CambiarEstadoDto, CancelarDto } from "../dtos/postulacion.dto";
import { BadRequestError } from "../errors/app-error";
import { EstadoPostulacion } from "../models/postulacion";
import { objeto, queryTexto, texto } from "./common";

export function validarCambioEstado(body: unknown): CambiarEstadoDto {
  const b = objeto(body);
  if (b.estado !== "aceptada" && b.estado !== "rechazada") {
    throw new BadRequestError("El campo 'estado' debe ser 'aceptada' o 'rechazada'");
  }
  return { estado: b.estado };
}

export function validarCancelacion(body: unknown): CancelarDto {
  const motivo = texto(objeto(body), "motivo");
  if (motivo.length > 200) throw new BadRequestError("El motivo no puede superar los 200 caracteres");
  return { motivo };
}

export function validarFiltroEstado(query: Record<string, unknown>): EstadoPostulacion | undefined {
  const estado = queryTexto(query.estado, "estado");
  if (estado !== undefined && !["pendiente", "aceptada", "rechazada", "cancelada"].includes(estado)) {
    throw new BadRequestError("El parámetro 'estado' no es válido");
  }
  return estado as EstadoPostulacion | undefined;
}
