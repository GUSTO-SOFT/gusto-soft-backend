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
http://localhost:3000/docs
```

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
