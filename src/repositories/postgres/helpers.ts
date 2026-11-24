import { Oferta } from "../../models/oferta";
import { Postulacion } from "../../models/postulacion";

// Función que ejecuta una consulta SQL (puede ser el pool o una conexión de una transacción)
export type Consulta = (texto: string, valores?: unknown[]) => Promise<{ rows: any[] }>;

export const OFERTA_COLS = `o.id, o.empleador_id, o.titulo, o.tipo, o.descripcion, o.fecha,
  o.duracion_horas::float8 AS duracion_horas, o.pago::float8 AS pago, o.ubicacion, o.cupos, o.estado`;

export const ACEPTADOS = `(SELECT COUNT(*)::int FROM postulaciones p
  WHERE p.oferta_id = o.id AND p.estado = 'aceptada') AS aceptados`;

export const POSTULACION_COLS = `p.id, p.oferta_id, p.trabajador_id, p.estado, p.fecha_postulacion,
  p.cancelacion_tardia, p.motivo_cancelacion, p.confirmada_por_empleador, p.confirmada_por_trabajador`;

export const iso = (valor: unknown): string => new Date(valor as string | Date).toISOString();

export const aOferta = (r: any): Oferta => ({
  id: r.id,
  empleadorId: r.empleador_id,
  titulo: r.titulo,
  tipo: r.tipo,
  descripcion: r.descripcion,
  fecha: iso(r.fecha),
  duracionHoras: r.duracion_horas,
  pago: r.pago,
  ubicacion: r.ubicacion,
  cupos: r.cupos,
  estado: r.estado,
});

export const aPostulacion = (r: any): Postulacion => ({
  id: r.id,
  ofertaId: r.oferta_id,
  trabajadorId: r.trabajador_id,
  estado: r.estado,
  fechaPostulacion: iso(r.fecha_postulacion),
  cancelacionTardia: r.cancelacion_tardia,
  motivoCancelacion: r.motivo_cancelacion,
  confirmadaPorEmpleador: r.confirmada_por_empleador,
  confirmadaPorTrabajador: r.confirmada_por_trabajador,
});

// Código de error de PostgreSQL para "valor duplicado" en una columna única
export const esDuplicado = (e: unknown): boolean => (e as { code?: string })?.code === "23505";

// Escapa % y _ para que el texto buscado se tome literal en un ILIKE
export const escaparLike = (s: string): string => s.replace(/[\\%_]/g, "\\$&");
