import { CrearOfertaDto, FiltrosOfertasDto } from "../dtos/oferta.dto";
import { BadRequestError } from "../errors/app-error";
import { numeroPositivo, objeto, queryEntero, queryTexto, texto } from "./common";

// Valida el formato de los datos. Las reglas de negocio (como "fecha futura") van en el servicio.
export function validarCrearOferta(body: unknown): CrearOfertaDto {
  const b = objeto(body);
  const fecha = texto(b, "fecha");
  const ms = Date.parse(fecha);
  if (Number.isNaN(ms)) throw new BadRequestError("El campo 'fecha' debe ser una fecha ISO 8601 válida");

  const cupos = b.cupos;
  if (typeof cupos !== "number" || !Number.isInteger(cupos) || cupos < 1) {
    throw new BadRequestError("El campo 'cupos' es obligatorio y debe ser un entero mayor o igual a 1");
  }

  return {
    titulo: texto(b, "titulo"),
    tipo: texto(b, "tipo"),
    descripcion: texto(b, "descripcion"),
    fecha: new Date(ms).toISOString(),
    duracionHoras: numeroPositivo(b, "duracionHoras"),
    pago: numeroPositivo(b, "pago"),
    ubicacion: texto(b, "ubicacion"),
    cupos,
  };
}

export function validarFiltrosOfertas(query: Record<string, unknown>): FiltrosOfertasDto {
  const fecha = queryTexto(query.fecha, "fecha");
  if (fecha !== undefined && (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(Date.parse(fecha)))) {
    throw new BadRequestError("El parámetro 'fecha' debe tener formato YYYY-MM-DD");
  }
  return {
    fecha,
    ubicacion: queryTexto(query.ubicacion, "ubicacion"),
    tipo: queryTexto(query.tipo, "tipo"),
    page: queryEntero(query.page, 1, "page", 1_000_000),
    limit: queryEntero(query.limit, 10, "limit", 50),
  };
}
