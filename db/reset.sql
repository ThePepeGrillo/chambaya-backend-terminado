-- CUIDADO: borra todas las tablas de ChambaYa y sus datos.
-- Úsalo solo en desarrollo, para volver a empezar y luego ejecutar schema.sql de nuevo.
DROP VIEW  IF EXISTS vista_calificacion_promedio;
DROP TABLE IF EXISTS restablecimientos_password CASCADE;
DROP TABLE IF EXISTS notificaciones      CASCADE;
DROP TABLE IF EXISTS calificaciones      CASCADE;
DROP TABLE IF EXISTS postulaciones       CASCADE;
DROP TABLE IF EXISTS ofertas             CASCADE;
DROP TABLE IF EXISTS perfiles_trabajador CASCADE;
DROP TABLE IF EXISTS perfiles_empleador  CASCADE;
DROP TABLE IF EXISTS usuarios            CASCADE;
DROP TYPE  IF EXISTS tipo_notificacion;
DROP TYPE  IF EXISTS estado_postulacion;
DROP TYPE  IF EXISTS estado_oferta;
DROP TYPE  IF EXISTS rol_usuario;
