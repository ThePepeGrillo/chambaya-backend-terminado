import { CrearOfertaDto, FiltrosOfertasDto } from "../dtos/oferta.dto";
import { Calificacion } from "../models/calificacion";
import { TipoNotificacion } from "../models/notificacion";
import { EstadoOferta, Oferta, OfertaConAceptados } from "../models/oferta";
import { EstadoPostulacion, Postulacion, PostulacionDelTrabajador, Postulante } from "../models/postulacion";
import { Rol, UsuarioConHash, UsuarioPublico } from "../models/usuario";

export interface NuevoUsuario {
  nombre: string;
  correo: string;
  passwordHash: string;
  rol: Rol;
  nit?: string;
  direccion?: string;
  habilidades?: string[];
  disponibilidad?: string;
}

export interface UsuarioRepository {
  crear(u: NuevoUsuario): Promise<UsuarioPublico>;
  porCorreo(correo: string): Promise<UsuarioConHash | null>;
  nombrePorId(id: number): Promise<string | null>;
  cambiarPassword(id: number, passwordHash: string): Promise<void>;
}

export interface OfertaRepository {
  crear(empleadorId: number, dto: CrearOfertaDto): Promise<OfertaConAceptados>;
  listar(filtros: FiltrosOfertasDto): Promise<{ data: OfertaConAceptados[]; total: number }>;
  porId(id: number): Promise<OfertaConAceptados | null>;
  /** Todas las ofertas de un empleador, abiertas y cubiertas */
  listarPorEmpleador(empleadorId: number): Promise<OfertaConAceptados[]>;
  /** Dentro de una transacción: bloquea la fila para que dos personas no cambien los cupos a la vez */
  bloquear(id: number): Promise<Oferta | null>;
  contarAceptados(id: number): Promise<number>;
  actualizarEstado(id: number, estado: EstadoOferta): Promise<void>;
}

export interface PostulacionRepository {
  crear(ofertaId: number, trabajadorId: number): Promise<Postulacion>;
  porId(id: number): Promise<Postulacion | null>;
  existeActiva(ofertaId: number, trabajadorId: number): Promise<boolean>;
  listarPorOferta(ofertaId: number, estado?: EstadoPostulacion): Promise<Postulante[]>;
  listarPorTrabajador(trabajadorId: number): Promise<PostulacionDelTrabajador[]>;
  actualizarEstado(id: number, estado: EstadoPostulacion): Promise<void>;
  cancelar(id: number, motivo: string, tardia: boolean): Promise<void>;
  /** Registra que una de las dos partes confirmó que el trabajo se completó */
  confirmar(id: number, parte: "empleador" | "trabajador"): Promise<void>;
}

export interface CalificacionRepository {
  crear(postulacionId: number, autorId: number, destinatarioId: number, puntaje: number, comentario: string | null): Promise<Calificacion>;
  existe(postulacionId: number, autorId: number): Promise<boolean>;
}

export interface NotificacionRepository {
  crear(usuarioId: number, tipo: TipoNotificacion, mensaje: string): Promise<void>;
}

export interface RestablecimientoPasswordRepository {
  crear(usuarioId: number, tokenHash: string, expiraEn: Date): Promise<void>;
  /** Busca un enlace de recuperación que no se haya usado ni vencido */
  buscarVigente(tokenHash: string): Promise<{ id: number; usuarioId: number } | null>;
  marcarUsado(id: number): Promise<void>;
  /** Deja sin efecto los enlaces anteriores de un usuario */
  invalidarDelUsuario(usuarioId: number): Promise<void>;
}

// Todos los repositorios juntos
export interface Repos {
  usuarios: UsuarioRepository;
  ofertas: OfertaRepository;
  postulaciones: PostulacionRepository;
  calificaciones: CalificacionRepository;
  notificaciones: NotificacionRepository;
  restablecimientos: RestablecimientoPasswordRepository;
}

export interface Db {
  repos: Repos;
  /** Ejecuta varias operaciones juntas: o se guardan todas o no se guarda ninguna */
  transaction<T>(fn: (repos: Repos) => Promise<T>): Promise<T>;
  cerrar(): Promise<void>;
}
