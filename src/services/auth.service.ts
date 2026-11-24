import { randomBytes } from "node:crypto";
import { LoginDto, OlvidePasswordDto, RegisterDto, RestablecerPasswordDto } from "../dtos/auth.dto";
import { BadRequestError, ConflictError, UnauthorizedError } from "../errors/app-error";
import { Db } from "../repositories/interfaces";
import { hashPassword, verifyPassword } from "../utils/password";
import { huellaDeToken, TokenService } from "../utils/token";
import { EmailService } from "./email.service";

// Los enlaces de recuperación valen 30 minutos
const VIGENCIA_ENLACE_MS = 30 * 60 * 1000;

export class AuthService {
  constructor(
    private readonly db: Db,
    private readonly tokens: TokenService,
    private readonly correos: EmailService,
    private readonly frontendUrl: string,
    private readonly exponerEnlaceRecuperacion = false,
  ) {}

  async register(dto: RegisterDto) {
    const usuario = await this.db.transaction(async (r) => {
      if (await r.usuarios.porCorreo(dto.correo)) throw new ConflictError("Ya existe un usuario con ese correo");
      return r.usuarios.crear({
        nombre: dto.nombre,
        correo: dto.correo,
        passwordHash: hashPassword(dto.password),
        rol: dto.rol,
        nit: dto.nit,
        direccion: dto.direccion,
        habilidades: dto.habilidades,
        disponibilidad: dto.disponibilidad,
      });
    });

    const perfil =
      dto.rol === "empleador"
        ? { nit: dto.nit, direccion: dto.direccion }
        : { habilidades: dto.habilidades ?? [], disponibilidad: dto.disponibilidad };
    return { ...usuario, ...perfil };
  }

  async login(dto: LoginDto) {
    const usuario = await this.db.repos.usuarios.porCorreo(dto.correo);
    if (!usuario || !verifyPassword(dto.password, usuario.passwordHash)) {
      throw new UnauthorizedError("Correo o contraseña incorrectos");
    }
    return {
      token: this.tokens.sign(usuario.id, usuario.rol),
      usuario: { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol },
    };
  }

  // Siempre responde lo mismo, exista o no el correo: así nadie puede averiguar quién tiene cuenta
  async olvidePassword(dto: OlvidePasswordDto) {
    const mensaje = "Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.";
    const usuario = await this.db.repos.usuarios.porCorreo(dto.correo);
    if (!usuario) return { mensaje };

    const token = randomBytes(32).toString("hex"); // este valor solo viaja en el correo
    await this.db.transaction(async (r) => {
      await r.restablecimientos.invalidarDelUsuario(usuario.id); // el enlace nuevo deja sin efecto a los anteriores
      await r.restablecimientos.crear(usuario.id, huellaDeToken(token), new Date(Date.now() + VIGENCIA_ENLACE_MS));
    });

    const enlace = `${this.frontendUrl}/restablecer?token=${token}`;
    try {
      await this.correos.enviarRestablecimiento({ nombre: usuario.nombre, correo: usuario.correo }, enlace);
    } catch (e) {
      // No se le cuenta al usuario si el envío falló (evita revelar datos); queda en el registro del servidor
      console.error("No se pudo enviar el correo de recuperación:", e instanceof Error ? e.message : e);
    }
    return this.exponerEnlaceRecuperacion
      ? { mensaje, enlaceRecuperacion: enlace }
      : { mensaje };
  }

  async restablecerPassword(dto: RestablecerPasswordDto) {
    await this.db.transaction(async (r) => {
      const vigente = await r.restablecimientos.buscarVigente(huellaDeToken(dto.token));
      if (!vigente) throw new BadRequestError("El enlace no es válido o ya venció. Pide uno nuevo.");
      await r.usuarios.cambiarPassword(vigente.usuarioId, hashPassword(dto.password));
      await r.restablecimientos.invalidarDelUsuario(vigente.usuarioId); // el enlace queda usado
    });
    return { mensaje: "Contraseña actualizada. Ya puedes iniciar sesión." };
  }
}
