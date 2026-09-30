import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { APP_CONFIG, AppConfig } from './config/app-config.js';
import { configureApp } from './configure-app.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<AppConfig>(APP_CONFIG);
  // IP real del cliente (X-Forwarded-For) cuando hay un proxy delante
  if (config.trustProxy > 0) app.set('trust proxy', config.trustProxy);
  // SIGTERM (docker stop): se paran el planificador y las conexiones a la base de datos
  app.enableShutdownHooks();
  configureApp(app);
  await app.listen(config.port);
}
await bootstrap();
