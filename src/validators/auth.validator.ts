import { LoginDto, OlvidePasswordDto, RegisterDto, RestablecerPasswordDto } from "../dtos/auth.dto";
import { BadRequestError } from "../errors/app-error";
import { objeto, texto, textoOpcional } from "./common";

export function validarRegister(body: unknown): RegisterDto {
  const b = objeto(body);
  const nombre = texto(b, "nombre");
  const correo = texto(b, "correo").toLowerCase();
  const password = texto(b, "password");
  const rol = b.rol;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw new BadRequestError("El correo no tiene un formato válido");
  if (password.length < 6) throw new BadRequestError("La contraseña debe tener mínimo 6 caracteres");
  if (rol !== "empleador" && rol !== "trabajador") {
    throw new BadRequestError("El campo 'rol' debe ser 'empleador' o 'trabajador'");
  }
  if (b.habilidades !== undefined && !(Array.isArray(b.habilidades) && b.habilidades.every((h) => typeof h === "string"))) {
    throw new BadRequestError("El campo 'habilidades' debe ser una lista de textos");
  }

  return {
    nombre,
    correo,
    password,
    rol,
    nit: textoOpcional(b, "nit"),
    direccion: textoOpcional(b, "direccion"),
    habilidades: b.habilidades as string[] | undefined,
    disponibilidad: textoOpcional(b, "disponibilidad"),
  };
}

export function validarLogin(body: unknown): LoginDto {
  const b = objeto(body);
  return { correo: texto(b, "correo").toLowerCase(), password: texto(b, "password") };
}

export function validarOlvidePassword(body: unknown): OlvidePasswordDto {
  const b = objeto(body);
  const correo = texto(b, "correo").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw new BadRequestError("El correo no tiene un formato válido");
  return { correo };
}

export function validarRestablecerPassword(body: unknown): RestablecerPasswordDto {
  const b = objeto(body);
  const token = texto(b, "token");
  const password = texto(b, "password");
  if (password.length < 6) throw new BadRequestError("La contraseña debe tener mínimo 6 caracteres");
  return { token, password };
}
