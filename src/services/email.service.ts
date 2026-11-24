import { AppConfig } from "../config/env";

export interface DestinoCorreo {
  nombre: string;
  correo: string;
}

export interface EmailService {
  enviarRestablecimiento(destino: DestinoCorreo, enlace: string): Promise<void>;
}

// Para desarrollo y demos: no envía nada, escribe el enlace en la terminal del backend
export class ConsoleEmailService implements EmailService {
  async enviarRestablecimiento(destino: DestinoCorreo, enlace: string): Promise<void> {
    console.log(`\n[correo simulado] Para: ${destino.correo}`);
    console.log(`Enlace para restablecer la contraseña (vale 30 minutos):\n${enlace}\n`);
  }
}

const escaparHtml = (texto: string) => texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Envío real con la API de Resend (https://resend.com). Solo se usa si hay RESEND_API_KEY.
export class ResendEmailService implements EmailService {
  constructor(
    private readonly apiKey: string,
    private readonly remitente: string,
  ) {}

  async enviarRestablecimiento(destino: DestinoCorreo, enlace: string): Promise<void> {
    const respuesta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: this.remitente,
        to: [destino.correo],
        subject: "Restablece tu contraseña de ChambaYa",
        text: `Hola ${destino.nombre}, usa este enlace para elegir una contraseña nueva (vale 30 minutos): ${enlace}\n\nSi no lo pediste, ignora este mensaje.`,
        html: `<p>Hola ${escaparHtml(destino.nombre)},</p><p>Usa este enlace para elegir una contraseña nueva (vale 30 minutos):</p><p><a href="${enlace}">Restablecer mi contraseña</a></p><p>Si no lo pediste, ignora este mensaje.</p>`,
      }),
    });
    if (!respuesta.ok) throw new Error(`Resend respondió ${respuesta.status}`);
  }
}

export function crearEmailService(config: AppConfig): EmailService {
  if (config.resendApiKey) {
    return new ResendEmailService(config.resendApiKey, config.emailFrom ?? "ChambaYa <onboarding@resend.dev>");
  }
  return new ConsoleEmailService();
}
