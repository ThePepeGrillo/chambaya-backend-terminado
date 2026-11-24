import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { Rol } from "../models/usuario";

export interface TokenPayload {
  sub: string; // id del usuario
  rol: Rol;
  exp: number; // segundos desde epoch
}

const b64 = (data: string | Buffer) => Buffer.from(data).toString("base64url");

// Token firmado con HS256, igual que un JWT
export class TokenService {
  constructor(
    private readonly secreto: string,
    private readonly duracionSegundos = 60 * 60 * 2,
  ) {}

  private firmar(contenido: string): string {
    return createHmac("sha256", this.secreto).update(contenido).digest("base64url");
  }

  sign(usuarioId: number, rol: Rol): string {
    const header = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload: TokenPayload = {
      sub: String(usuarioId),
      rol,
      exp: Math.floor(Date.now() / 1000) + this.duracionSegundos,
    };
    const cuerpo = `${header}.${b64(JSON.stringify(payload))}`;
    return `${cuerpo}.${this.firmar(cuerpo)}`;
  }

  verify(token: string): TokenPayload | null {
    const partes = token.split(".");
    if (partes.length !== 3) return null;
    const [header, payload, firma] = partes;
    const a = Buffer.from(firma);
    const b = Buffer.from(this.firmar(`${header}.${payload}`));
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    try {
      const datos = JSON.parse(Buffer.from(payload, "base64url").toString()) as TokenPayload;
      if (typeof datos.exp !== "number" || datos.exp < Math.floor(Date.now() / 1000)) return null;
      return datos;
    } catch {
      return null;
    }
  }
}

// Huella (SHA-256) de un token de un solo uso: en la base se guarda la huella, nunca el token
export function huellaDeToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
