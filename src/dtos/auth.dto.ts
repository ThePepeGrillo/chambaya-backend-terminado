import { Rol } from "../models/usuario";

export interface RegisterDto {
  nombre: string;
  correo: string;
  password: string;
  rol: Rol;
  nit?: string;
  direccion?: string;
  habilidades?: string[];
  disponibilidad?: string;
}

export interface LoginDto {
  correo: string;
  password: string;
}

export interface OlvidePasswordDto {
  correo: string;
}

export interface RestablecerPasswordDto {
  token: string;
  password: string;
}
