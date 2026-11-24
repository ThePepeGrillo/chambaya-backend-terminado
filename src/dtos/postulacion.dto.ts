export interface CambiarEstadoDto {
  estado: "aceptada" | "rechazada";
}

export interface CancelarDto {
  motivo: string;
}
