-- ChambaYa: esquema de base de datos (PostgreSQL)
-- Sale del diagrama de clases del Taller 2.
-- Ejecutar sobre una base vacía (por ejemplo, una llamada "chambaya").

-- ---------- Tipos enumerados ----------
CREATE TYPE rol_usuario        AS ENUM ('empleador', 'trabajador');
CREATE TYPE estado_oferta      AS ENUM ('abierta', 'cubierta');
CREATE TYPE estado_postulacion AS ENUM ('pendiente', 'aceptada', 'rechazada', 'cancelada');
CREATE TYPE tipo_notificacion  AS ENUM ('aceptacion', 'rechazo', 'cancelacion', 'recordatorio');

-- ---------- Usuarios ----------
CREATE TABLE usuarios (
    id             SERIAL PRIMARY KEY,
    nombre         VARCHAR(120) NOT NULL,
    correo         VARCHAR(160) NOT NULL UNIQUE,
    password_hash  TEXT         NOT NULL,
    rol            rol_usuario  NOT NULL,
    verificado     BOOLEAN      NOT NULL DEFAULT FALSE,
    creado_en      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Datos propios de cada rol (un usuario tiene solo uno de los dos perfiles)
CREATE TABLE perfiles_empleador (
    usuario_id  INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    nit         VARCHAR(30),
    direccion   VARCHAR(200)
);

CREATE TABLE perfiles_trabajador (
    usuario_id      INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    habilidades     TEXT[] NOT NULL DEFAULT '{}',
    disponibilidad  VARCHAR(200)
);

-- ---------- Ofertas ----------
CREATE TABLE ofertas (
    id              SERIAL PRIMARY KEY,
    empleador_id    INTEGER        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    titulo          VARCHAR(150)   NOT NULL,
    tipo            VARCHAR(60)    NOT NULL,
    descripcion     TEXT           NOT NULL,
    fecha           TIMESTAMPTZ    NOT NULL,
    duracion_horas  NUMERIC(5,2)   NOT NULL CHECK (duracion_horas > 0),
    pago            NUMERIC(12,2)  NOT NULL CHECK (pago > 0),
    ubicacion       VARCHAR(200)   NOT NULL,
    cupos           INTEGER        NOT NULL CHECK (cupos >= 1),
    estado          estado_oferta  NOT NULL DEFAULT 'abierta',
    creado_en       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ofertas_estado_fecha ON ofertas (estado, fecha);
CREATE INDEX idx_ofertas_tipo         ON ofertas (tipo);
CREATE INDEX idx_ofertas_empleador    ON ofertas (empleador_id);

-- ---------- Postulaciones ----------
CREATE TABLE postulaciones (
    id                  SERIAL PRIMARY KEY,
    oferta_id           INTEGER             NOT NULL REFERENCES ofertas(id)  ON DELETE CASCADE,
    trabajador_id       INTEGER             NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    estado              estado_postulacion  NOT NULL DEFAULT 'pendiente',
    fecha_postulacion   TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    cancelacion_tardia  BOOLEAN             NOT NULL DEFAULT FALSE,
    motivo_cancelacion  VARCHAR(200),
    confirmada_por_empleador  BOOLEAN NOT NULL DEFAULT FALSE,
    confirmada_por_trabajador BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_postulaciones_oferta     ON postulaciones (oferta_id);
CREATE INDEX idx_postulaciones_trabajador ON postulaciones (trabajador_id);

-- Un trabajador no puede tener dos postulaciones activas a la misma oferta
-- (si cancela, puede volver a postularse)
CREATE UNIQUE INDEX uq_postulacion_activa
    ON postulaciones (oferta_id, trabajador_id)
    WHERE estado <> 'cancelada';

-- ---------- Calificaciones ----------
-- Cada postulación genera hasta 2 calificaciones: empleador -> trabajador y trabajador -> empleador
CREATE TABLE calificaciones (
    id               SERIAL PRIMARY KEY,
    postulacion_id   INTEGER      NOT NULL REFERENCES postulaciones(id) ON DELETE CASCADE,
    autor_id         INTEGER      NOT NULL REFERENCES usuarios(id)      ON DELETE CASCADE,
    destinatario_id  INTEGER      NOT NULL REFERENCES usuarios(id)      ON DELETE CASCADE,
    puntaje          SMALLINT     NOT NULL CHECK (puntaje BETWEEN 1 AND 5),
    comentario       TEXT,
    creado_en        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (postulacion_id, autor_id),
    CHECK (autor_id <> destinatario_id)
);

CREATE INDEX idx_calificaciones_destinatario ON calificaciones (destinatario_id);

-- Promedio de calificación por usuario (para mostrar en el perfil del postulante)
CREATE VIEW vista_calificacion_promedio AS
SELECT destinatario_id AS usuario_id,
       ROUND(AVG(puntaje)::numeric, 2) AS promedio,
       COUNT(*)                        AS total
FROM calificaciones
GROUP BY destinatario_id;

-- ---------- Notificaciones ----------
CREATE TABLE notificaciones (
    id          SERIAL PRIMARY KEY,
    usuario_id  INTEGER            NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo        tipo_notificacion  NOT NULL,
    mensaje     TEXT               NOT NULL,
    leida       BOOLEAN            NOT NULL DEFAULT FALSE,
    creado_en   TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notificaciones_usuario ON notificaciones (usuario_id, leida);

-- ---------- Recuperación de contraseña ----------
-- Se guarda solo la huella (hash) del token que se envía por correo, nunca el token
CREATE TABLE restablecimientos_password (
    id          SERIAL PRIMARY KEY,
    usuario_id  INTEGER      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash  TEXT         NOT NULL UNIQUE,
    expira_en   TIMESTAMPTZ  NOT NULL,
    usado       BOOLEAN      NOT NULL DEFAULT FALSE,
    creado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_restablecimientos_usuario ON restablecimientos_password (usuario_id);
