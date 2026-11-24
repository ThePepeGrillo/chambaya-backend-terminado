-- Migración 002: confirmación del trabajo (para poder calificar) y recuperación de contraseña.
-- Ejecutar UNA vez en la base que ya existe (SQL Editor de Neon). Se puede repetir sin problema.

-- Cada parte confirma por separado que el trabajo se completó
ALTER TABLE postulaciones ADD COLUMN IF NOT EXISTS confirmada_por_empleador BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE postulaciones ADD COLUMN IF NOT EXISTS confirmada_por_trabajador BOOLEAN NOT NULL DEFAULT FALSE;

-- Enlaces de recuperación de contraseña (se guarda solo la huella del token, nunca el token)
CREATE TABLE IF NOT EXISTS restablecimientos_password (
    id          SERIAL PRIMARY KEY,
    usuario_id  INTEGER      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash  TEXT         NOT NULL UNIQUE,
    expira_en   TIMESTAMPTZ  NOT NULL,
    usado       BOOLEAN      NOT NULL DEFAULT FALSE,
    creado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restablecimientos_usuario ON restablecimientos_password (usuario_id);
