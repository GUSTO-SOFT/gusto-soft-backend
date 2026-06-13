# Gusto Soft Backend

Backend en NestJS + TypeScript para mesas, asignacion de meseros, menu, pedidos, KDS y notificaciones.

## Requisitos

- Node.js 20+
- MySQL 8+

## Configuracion

```bash
npm install
npm run seed
npm run start:dev
```

Configura tus variables reales en el archivo `.env` de la raiz del proyecto antes de ejecutar el seed o levantar el servidor.

Las carpetas del backend y los nombres fisicos de tablas/columnas en MySQL estan en ingles. Si ya levantaste una version anterior que creo tablas en espanol, usa una base limpia o elimina esas tablas antiguas antes de ejecutar `npm run seed`.

Swagger queda disponible en:

```text
http://localhost:3000/api
```

## Despliegue del backend en Render con Docker y GitHub Actions

Este repositorio ya incluye `Dockerfile`, `.dockerignore`, `render.yaml` y el workflow `.github/workflows/backend-ci-cd.yml` para desplegar solo el backend.

En Render crea un Web Service desde este repo usando Docker. Si usas el blueprint `render.yaml`, deja `autoDeploy: false` para que el despliegue lo dispare GitHub Actions despues de validar tests, build y construccion de la imagen Docker.

Variables requeridas en Render:

```text
NODE_ENV=production
FRONTEND_ORIGIN=https://tu-frontend
DB_HOST=...
DB_PORT=3306
DB_USERNAME=...
DB_PASSWORD=...
DB_DATABASE=...
DB_SYNC=false
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false
JWT_SECRET=...
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
```

Para Aiven MySQL, usa los datos del panel asi:

```text
DB_HOST=mysql-1c377fbe-task-flow-maria.a.aivencloud.com
DB_PORT=17314
DB_USERNAME=avnadmin
DB_PASSWORD=pega-la-contrasena-en-render
DB_DATABASE=defaultdb
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false
```

Si vas a validar con el certificado CA de Aiven, puedes pegarlo en `DB_SSL_CA` y usar `DB_SSL_REJECT_UNAUTHORIZED=true`.

Para activar CI/CD:

1. En Render abre el servicio del backend y copia el Deploy Hook.
2. En GitHub ve a `Settings > Secrets and variables > Actions`.
3. Crea el secreto `RENDER_DEPLOY_HOOK_URL` con ese Deploy Hook.
4. Haz push a `main` o `master`; GitHub Actions ejecutara tests, build, validara Docker y luego llamara a Render.

No subas `.env`, `node_modules`, `dist` ni archivos de `uploads`; ya estan cubiertos por `.gitignore` y `.dockerignore`.

## Probar Docker localmente

El `Dockerfile` no copia `.env` por seguridad. Para probar la imagen localmente debes pasar las variables al contenedor:

```bash
docker build -t gusto-soft-backend:local .
docker run --rm --env-file .env -p 3000:3000 gusto-soft-backend:local
```

Tambien puedes usar Docker Compose para evitar olvidar el `--env-file`:

```bash
docker compose up --build
```

Para verificar que el contenedor recibio las variables:

```bash
docker run --rm --env-file .env gusto-soft-backend:local printenv
```

Si ejecutas el contenedor sin `--env-file` o sin variables `-e`, el backend usara los valores por defecto (`DB_HOST=localhost`, `DB_PORT=3306`) y normalmente fallara con `ECONNREFUSED`.

## Usuarios seed

Todos usan password `REMOVED_SEED_PASSWORD`.

- `admin@gustosoft.local` rol `ADMIN`
- `mesero@gustosoft.local` rol `MESERO`
- `chef@gustosoft.local` rol `CHEF`

## WebSockets

El gateway publica eventos por Socket.IO con paths:

- `/mesas/estado` evento `mesa.estado`
- `/cocina/eventos` eventos `pedido.creado`, `pedido.estado`
- `/notificaciones` evento `pedido.listo`
