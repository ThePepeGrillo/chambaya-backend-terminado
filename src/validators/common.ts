import { BadRequestError, NotFoundError } from "../errors/app-error";

export function objeto(body: unknown): Record<string, unknown> {
  const valor = body ?? {};
  if (typeof valor !== "object" || Array.isArray(valor)) {
    throw new BadRequestError("El cuerpo debe ser un objeto JSON");
  }
  return valor as Record<string, unknown>;
}

export function texto(b: Record<string, unknown>, campo: string): string {
  const v = b[campo];
  if (typeof v !== "string" || v.trim() === "") {
    throw new BadRequestError(`El campo '${campo}' es obligatorio y debe ser texto`);
  }
  return v.trim();
}

export function textoOpcional(b: Record<string, unknown>, campo: string): string | undefined {
  const v = b[campo];
  if (v === undefined) return undefined;
  if (typeof v !== "string") throw new BadRequestError(`El campo '${campo}' debe ser texto`);
  return v.trim();
}

export function numeroPositivo(b: Record<string, unknown>, campo: string): number {
  const v = b[campo];
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) {
    throw new BadRequestError(`El campo '${campo}' es obligatorio y debe ser un número mayor que 0`);
  }
  return v;
}

// Un parámetro de la URL (?x=...) debe ser un solo texto
export function queryTexto(valor: unknown, nombre: string): string | undefined {
  if (valor === undefined) return undefined;
  if (typeof valor !== "string") throw new BadRequestError(`El parámetro '${nombre}' no es válido`);
  return valor;
}

export function queryEntero(valor: unknown, defecto: number, nombre: string, max: number): number {
  const raw = queryTexto(valor, nombre);
  if (raw === undefined) return defecto;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > max) {
    throw new BadRequestError(`El parámetro '${nombre}' debe ser un entero entre 1 y ${max}`);
  }
  return n;
}

// Los ids de la base son enteros: cualquier otra cosa se trata como "no encontrado"
export function idDe(raw: unknown, mensajeNoEncontrado: string): number {
  if (typeof raw !== "string" || !/^\d{1,9}$/.test(raw)) throw new NotFoundError(mensajeNoEncontrado);
  return Number(raw);
}
