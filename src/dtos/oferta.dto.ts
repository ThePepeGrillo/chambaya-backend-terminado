export interface CrearOfertaDto {
  titulo: string;
  tipo: string;
  descripcion: string;
  fecha: string; // ISO 8601
  duracionHoras: number;
  pago: number;
  ubicacion: string;
  cupos: number;
}

export interface FiltrosOfertasDto {
  fecha?: string; // YYYY-MM-DD
  ubicacion?: string;
  tipo?: string;
  page: number;
  limit: number;
}
