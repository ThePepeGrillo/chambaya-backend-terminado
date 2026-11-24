export type EstadoPostulacion = "pendiente" | "aceptada" | "rechazada" | "cancelada";

export interface Postulacion {
  id: number;
  ofertaId: number;
  trabajadorId: number;
  estado: EstadoPostulacion;
  fechaPostulacion: string;
  cancelacionTardia: boolean;
  motivoCancelacion: string | null;
  // Cada parte confirma por separado que el trabajo se realizó; con las dos confirmaciones se puede calificar
  confirmadaPorEmpleador: boolean;
  confirmadaPorTrabajador: boolean;
}

// Qué puede hacer el usuario con una postulación aceptada (lo calcula el servidor)
export interface AccionesPostulacion {
  puedeConfirmar: boolean; // falta que este usuario confirme que el trabajo se completó
  puedeCalificar: boolean; // ya confirmaron las dos partes y este usuario todavía no califica
}

// Postulación vista por el trabajador, con un resumen de la oferta
export interface PostulacionDelTrabajador {
  id: number;
  estado: EstadoPostulacion;
  fechaPostulacion: string;
  cancelacionTardia: boolean;
  confirmadaPorEmpleador: boolean;
  confirmadaPorTrabajador: boolean;
  calificado: boolean; // el trabajador ya calificó al empleador
  calificacionRecibida: number | null; // puntaje que el empleador le dio al trabajador
  oferta: {
    id: number;
    titulo: string;
    tipo: string;
    fecha: string;
    ubicacion: string;
    pago: number;
    duracionHoras: number;
    empleadorNombre: string;
  };
}

// Postulación vista por el empleador, con los datos del trabajador
export interface Postulante {
  id: number;
  estado: EstadoPostulacion;
  fechaPostulacion: string;
  confirmadaPorEmpleador: boolean;
  confirmadaPorTrabajador: boolean;
  calificado: boolean; // el empleador ya calificó a este trabajador
  trabajador: {
    id: number;
    nombre: string;
    habilidades: string[];
    disponibilidad: string | null;
    calificacionPromedio: number | null;
    calificacionesTotal: number;
  };
}
