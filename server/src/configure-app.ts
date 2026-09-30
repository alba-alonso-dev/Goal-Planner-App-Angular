import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

/** Configuración común de la aplicación HTTP (la usan main.ts y los tests e2e). */
export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      // Los campos que no están en el DTO (p. ej. userId) se descartan: el propietario sale del token
      whitelist: true,
      transform: true
    })
  );
  // Sin CORS: el frontend se sirve desde el mismo origen (proxy en desarrollo, mismo dominio en producción)
  app.enableShutdownHooks();
  return app;
}
