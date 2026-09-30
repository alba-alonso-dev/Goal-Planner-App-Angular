import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { APP_CONFIG, AppConfig } from './config/app-config.js';
import { configureApp } from './configure-app.js';

async function bootstrap() {
  const app = configureApp(await NestFactory.create(AppModule));
  const config = app.get<AppConfig>(APP_CONFIG);
  await app.listen(config.port);
}
await bootstrap();
