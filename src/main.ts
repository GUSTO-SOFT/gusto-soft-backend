async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Gusto Soft API')
    .setDescription('API para mesas, menu, pedidos, cocina y notificaciones')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('api', app, document);
  SwaggerModule.setup('docs', app, document);

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

  const port = envNumber('PORT', 3000);
  await app.listen(port);
}