import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { envNumber, envString } from './config/env';

const apiCompatiblePrefixes = [
  '/auth',
  '/usuarios',
  '/mesas',
  '/inventario',
  '/menu',
  '/pedidos',
  '/cuentas',
  '/facturas',
  '/empresa',
  '/reportes',
  '/cocina',
  '/notificaciones',
];

const defaultCorsOrigins = [
  'https://gusto-soft.netlify.app',
  'https://gusto-soft2.netlify.app',
  'http://localhost:5173',
];

function normalizeOrigin(origin: string) {
  try {
    return new URL(origin).origin;
  } catch {
    return origin.trim().replace(/\/$/, '');
  }
}

function corsOrigins() {
  const envOrigins = envString('FRONTEND_ORIGIN', '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return Array.from(
    new Set([...defaultCorsOrigins, ...envOrigins].map(normalizeOrigin)),
  );
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use((req: { url: string }, _res: unknown, next: () => void) => {
    if (
      apiCompatiblePrefixes.some(
        (prefix) =>
          req.url === `/api${prefix}` ||
          req.url.startsWith(`/api${prefix}/`),
      )
    ) {
      req.url = req.url.slice('/api'.length);
    }
    next();
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Gusto Soft API')
    .setDescription('API para mesas, menu, pedidos, cocina y notificaciones')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('api', app, document);
  SwaggerModule.setup('docs', app, document);

  const allowedOrigins = corsOrigins();
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(normalizeOrigin(origin))) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = envNumber('PORT', 3000);
  await app.listen(port);
}

void bootstrap();
