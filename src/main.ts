import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { envNumber } from './config/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use((req: { url: string }, _res: unknown, next: () => void) => {
    if (req.url.startsWith('/api/')) {
      req.url = req.url.slice('/api'.length);
    }
    next();
  });

  app.enableCors({
    origin: ['https://gusto-soft.netlify.app', 'http://localhost:5173'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Gusto Soft API')
    .setDescription('API para mesas, menu, pedidos, cocina y notificaciones')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  const port = envNumber('PORT', 3000);
  await app.listen(port);
}

void bootstrap();
