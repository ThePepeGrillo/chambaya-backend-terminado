export interface Calificacion {
  id: number;
  postulacionId: number;
  autorId: number;
  destinatarioId: number;
  puntaje: number; // de 1 a 5
  comentario: string | null;
  fecha: string;
}
