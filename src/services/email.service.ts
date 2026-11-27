import { AppConfig } from "../config/env";

export interface DestinoCorreo {
  nombre: string;
  correo: string;
}

export interface DatosAceptacionPostulacion {
  nombreTrabajador: string;
  tituloOferta: string;
  fechaOferta: string;
  ubicacion: string;
}

export interface EmailService {
  enviarRestablecimiento(destino: DestinoCorreo, enlace: string): Promise<void>;
  enviarAceptacionPostulacion(destino: DestinoCorreo, datos: DatosAceptacionPostulacion): Promise<void>;
}

// Para desarrollo y demos: no envía nada, escribe el enlace en la terminal del backend
export class ConsoleEmailService implements EmailService {
  async enviarRestablecimiento(destino: DestinoCorreo, enlace: string): Promise<void> {
    console.log(`\n[correo simulado] Para: ${destino.correo}`);
    console.log(`Enlace para restablecer la contraseña (vale 30 minutos):\n${enlace}\n`);
  }
  async enviarAceptacionPostulacion(destino: DestinoCorreo, datos: DatosAceptacionPostulacion): Promise<void> {
    console.log(`\\n[correo simulado] Aviso de postulación aceptada para: ${destino.correo}`);
    console.log(`Candidato: ${datos.nombreTrabajador} | Oferta: ${datos.tituloOferta} | Fecha: ${datos.fechaOferta} | Lugar: ${datos.ubicacion}\\n`);
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
  async enviarAceptacionPostulacion(destino: DestinoCorreo, datos: DatosAceptacionPostulacion): Promise<void> {
    const nombre = escaparHtml(datos.nombreTrabajador);
    const oferta = escaparHtml(datos.tituloOferta);
    const fecha = escaparHtml(datos.fechaOferta);
    const ubicacion = escaparHtml(datos.ubicacion);
    const respuesta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: this.remitente,
        to: [destino.correo],
        subject: `ChambaYa: postulación aceptada para "${datos.tituloOferta}"`,
        text: `Un empleador aceptó una postulación en ChambaYa.\\n\\nCandidato: ${datos.nombreTrabajador}\\nOferta: ${datos.tituloOferta}\\nFecha del trabajo: ${datos.fechaOferta}\\nLugar: ${datos.ubicacion}`,
        html: `<h2>¡Nueva postulación aceptada!</h2><p>Un empleador aceptó una postulación en ChambaYa.</p><ul><li><strong>Candidato:</strong> ${nombre}</li><li><strong>Oferta:</strong> ${oferta}</li><li><strong>Fecha del trabajo:</strong> ${fecha}</li><li><strong>Lugar:</strong> ${ubicacion}</li></ul>`,
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
