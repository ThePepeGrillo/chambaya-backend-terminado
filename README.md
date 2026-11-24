# ChambaYa Backend

API REST de ChambaYa, la plataforma para conseguir trabajos temporales (proyecto del semestre de Construcción de Software, UAN). Está hecha con Node.js, TypeScript, Express y PostgreSQL.

Es la evolución de la API del Taller 3: los mismos endpoints, pero ahora los datos se guardan en una base de datos y el código está organizado por capas.

## Cómo correrlo

Hace falta Node.js 20 o superior y una base de datos PostgreSQL (nosotros usamos Neon).

1. Instalar las dependencias:
   ```
   npm install
   ```
2. Copiar `.env.example` como `.env` y completar los valores, sobre todo `DATABASE_URL` con la cadena de conexión de Neon. El archivo `.env` no se sube a GitHub.
3. Crear las tablas ejecutando `db/schema.sql` en la base (en Neon: SQL Editor, pegar el contenido y Run). Solo se hace una vez.
   Si la base ya existía de antes, en lugar de `schema.sql` ejecuta `db/migraciones/002_calificaciones_y_recuperacion.sql`, que agrega lo nuevo sin borrar datos.
4. Encender el servidor:
   ```
   npm run dev
   ```

Queda en `http://localhost:3000/api/v1`.

Si no hay base de datos a mano se puede probar igual con `npm run start:memoria`, que guarda todo en memoria y lo borra al apagar.

## Scripts

- `npm run dev`: servidor que se reinicia al guardar cambios
- `npm start`: servidor normal
- `npm run dev:memoria` y `npm run start:memoria`: lo mismo, sin base de datos
- `npm run build`: compila a la carpeta `dist`
- `npm run start:prod`: corre el código compilado
- `npm run typecheck`: revisa los tipos

## Variables de entorno

- `DATABASE_URL`: cadena de conexión de PostgreSQL
- `JWT_SECRET`: frase secreta para firmar los tokens
- `PORT`: puerto del servidor (3000 por defecto)
- `CORS_ORIGIN`: direcciones del frontend que pueden llamar a la API, separadas por coma (por defecto `http://localhost:5173`)
- `FRONTEND_URL`: dirección del frontend para armar el enlace de recuperar contraseña
- `RESEND_API_KEY` y `EMAIL_FROM`: opcionales, para enviar los correos de verdad (ver más abajo). Sin clave, en desarrollo se muestra un botón para abrir el enlace directamente; en producción siempre debe configurarse un proveedor de correo.
- `COMPLETAR_SIN_ESPERAR`: solo para demos, ver "Confirmación y calificaciones"

## Arquitectura

El código está separado en capas, y cada una solo se comunica con la siguiente. Una petición recorre este camino:

```
ruta -> controlador -> servicio -> repositorio -> base de datos
```

- **Rutas:** dicen qué URL llama a qué controlador y qué permisos pide (token y rol).
- **Controladores:** capa HTTP. Leen la petición, la validan y devuelven la respuesta. No tienen reglas de negocio ni SQL.
- **Servicios:** las reglas del negocio (cupos, oferta cubierta, cancelación tardía). No saben nada de HTTP ni de SQL.
- **Repositorios:** las consultas a la base de datos y nada más. Los servicios los usan a través de interfaces, así que se puede cambiar PostgreSQL por la versión en memoria sin tocar el resto.

Las capas se conectan en `app.ts`, que crea cada pieza y se la pasa a la siguiente.

## Estructura

```
src/
  server.ts            arranca el servidor
  app.ts               arma la aplicación y conecta las capas
  config/              variables de entorno y elección de la base de datos
  routes/              rutas de auth, ofertas y postulaciones
  controllers/         capa HTTP
  services/            reglas del negocio
  repositories/
    interfaces.ts      qué operaciones tiene cada repositorio
    postgres/          implementación con PostgreSQL
    memory/            implementación en memoria (para pruebas)
  middlewares/         autenticación, roles, CORS, errores y ruta no encontrada
  validators/          validación de los datos que llegan
  dtos/                forma de los datos de entrada
  models/              entidades del dominio (usuario, oferta, postulación)
  errors/              errores propios (BadRequest, NotFound, Conflict...)
  utils/               hash de contraseñas, tokens y helper para controladores async
db/
  schema.sql           tablas de la base de datos
  reset.sql            borra todo (solo para desarrollo)
postman/
  ChambaYa.postman_collection.json
```

## Endpoints

Todas las rutas empiezan con `/api/v1`. Las protegidas piden `Authorization: Bearer <token>`, y el token sale del login.

```
POST   /auth/register                  registrar empleador o trabajador
POST   /auth/login                     iniciar sesión (devuelve el token)
POST   /auth/forgot-password           pedir el enlace para recuperar la contraseña
POST   /auth/reset-password            elegir una contraseña nueva con el enlace
POST   /ofertas                        publicar oferta (empleador)
GET    /ofertas                        listar ofertas abiertas, con filtros
GET    /ofertas/mias                   mis ofertas, abiertas y cubiertas (empleador)
GET    /ofertas/:id                    detalle de una oferta
POST   /ofertas/:id/postulaciones      postularse (trabajador)
GET    /ofertas/:id/postulaciones      ver postulantes (empleador dueño)
GET    /postulaciones/mias             mis postulaciones con su oferta (trabajador)
PATCH  /postulaciones/:id/estado       aceptar o rechazar (empleador dueño)
PATCH  /postulaciones/:id/cancelar     cancelar participación (trabajador)
PATCH  /postulaciones/:id/completar    confirmar que el trabajo se completó (empleador o trabajador)
POST   /postulaciones/:id/calificaciones   calificar a la otra parte (empleador o trabajador)
```

Los ids son números (1, 2, 3...) porque los asigna la base de datos.

## Confirmación y calificaciones

Cuando un trabajador es aceptado, el empleador y el trabajador confirman **por separado** que el trabajo se completó. Solo cuando las dos partes confirmaron, cada una puede calificar a la otra una vez, con un puntaje de 1 a 5 y un comentario opcional. La confirmación se permite desde las 00:00 del día del trabajo (zona horaria de Colombia), sin esperar a la hora exacta publicada.

Para probarlo en una demo sin esperar a la fecha, inicia el backend con `COMPLETAR_SIN_ESPERAR=true` (en el `.env` o `COMPLETAR_SIN_ESPERAR=true npm run dev`). No la dejes activa en el uso normal.

## Recuperar la contraseña

1. `POST /auth/forgot-password` con el correo. La respuesta es siempre la misma, exista o no el correo, para que nadie pueda averiguar quién tiene cuenta.
2. El backend crea un token aleatorio de un solo uso que vale 30 minutos. En la base solo se guarda su huella (hash), nunca el token. Un enlace nuevo deja sin efecto a los anteriores.
3. El enlace `FRONTEND_URL/restablecer?token=...` se envía por correo si configuras `RESEND_API_KEY`. En desarrollo, si no hay clave, la respuesta incluye un enlace de prueba que aparece como botón en la pantalla para abrir directamente el formulario. En producción no se expone el token en la respuesta: debes configurar el envío de correo.
4. `POST /auth/reset-password` con el token y la contraseña nueva. El enlace queda usado.

Las sesiones que ya estaban abiertas siguen valiendo hasta que su token venza (2 horas).

## Pruebas

En `postman` está la colección. Con el servidor encendido se importa en Postman y se corren las carpetas 1, 2 y 3 con "Run collection". Si todo está bien pasan las carpetas 1, 2 y 3 (47 verificaciones). La carpeta 4 prueba la confirmación y las calificaciones y necesita `COMPLETAR_SIN_ESPERAR=true`. Como los datos se guardan, cada corrida deja usuarios y ofertas nuevos en la base; no pasa nada porque los correos son distintos cada vez.

## Si algo falla

- **"Falta DATABASE_URL":** no existe el archivo `.env` o está vacío.
- **Error de conexión con Neon:** revisar que la cadena esté completa y sin espacios. Si el error menciona `channel_binding`, borrar `&channel_binding=require` del final de la cadena.
- **El frontend no puede llamar a la API (error de CORS):** agregar la dirección del frontend en `CORS_ORIGIN`.
