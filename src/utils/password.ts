import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Hash de contraseñas con scrypt y una sal aleatoria distinta para cada una
export function hashPassword(password: string): string {
  const sal = randomBytes(16).toString("hex");
  const hash = scryptSync(password, sal, 64).toString("hex");
  return `${sal}:${hash}`;
}

export function verifyPassword(password: string, guardado: string): boolean {
  const [sal, hash] = guardado.split(":");
  if (!sal || !hash) return false;
  const calculado = scryptSync(password, sal, 64);
  const esperado = Buffer.from(hash, "hex");
  return calculado.length === esperado.length && timingSafeEqual(calculado, esperado);
}
