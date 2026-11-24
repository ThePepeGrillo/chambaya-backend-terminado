export type EstadoOferta = "abierta" | "cubierta";

export interface Oferta {
  id: number;
  empleadorId: number;
  titulo: string;
  tipo: string;
  descripcion: string;
  fecha: string; // ISO 8601
  duracionHoras: number;
  pago: number;
  ubicacion: string;
  cupos: number;
  estado: EstadoOferta;
}

export interface OfertaConAceptados extends Oferta {
  aceptados: number;
}
