export interface AppConfig {
  port: number;
  databaseUrl?: string;
  jwtSecret: string;
  corsOrigins: string[];
  usarMemoria: boolean;
  frontendUrl: string; // para armar los enlaces de los correos (recuperar contraseña)
  completarSinEsperar: boolean; // solo para demos y pruebas: permite confirmar el trabajo antes de su fecha
  resendApiKey?: string; // si existe, los correos se envían de verdad con Resend
  emailFrom?: string;
  emailNotificacionesTo?: string; // correo del administrador que recibe avisos de aceptaciones
  exponerEnlaceRecuperacion: boolean; // solo en desarrollo, cuando no hay proveedor de correo
}

const SECRETO_DESARROLLO = "chambaya-dev-secret-cambiar-en-produccion";

export function loadConfig(argv: string[] = process.argv): AppConfig {
  // Lee el archivo .env (si existe) antes de usar las variables
  try {
    process.loadEnvFile();
  } catch {
    /* sin .env: se usan las variables del sistema */
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret && process.env.NODE_ENV === "production") {
    throw new Error("Falta JWT_SECRET en producción");
  }
  if (!jwtSecret) console.warn("Aviso: no hay JWT_SECRET, se usa una clave de desarrollo.");

  const corsOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  return {
    port: Number(process.env.PORT) || 3000,
    databaseUrl: process.env.DATABASE_URL,
    jwtSecret: jwtSecret ?? SECRETO_DESARROLLO,
    corsOrigins,
    usarMemoria: argv.includes("--memoria"),
    frontendUrl: (process.env.FRONTEND_URL ?? corsOrigins[0] ?? "http://localhost:5173").replace(/\/+$/, ""),
    completarSinEsperar: process.env.COMPLETAR_SIN_ESPERAR === "true",
    resendApiKey: process.env.RESEND_API_KEY || undefined,
    emailFrom: process.env.EMAIL_FROM || undefined,
    emailNotificacionesTo: process.env.EMAIL_NOTIFICACIONES_TO?.trim() || undefined,
    exponerEnlaceRecuperacion: process.env.NODE_ENV !== "production" && !process.env.RESEND_API_KEY,
  };
}
