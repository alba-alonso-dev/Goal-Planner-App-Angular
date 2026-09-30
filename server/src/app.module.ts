import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module.js';
import { HealthController } from './common/health.controller.js';
import { ConfigModule } from './config/config.module.js';
import { APP_CONFIG, AppConfig } from './config/app-config.js';
import { typeOrmOptions } from './database/typeorm-options.js';
import { GoalsModule } from './goals/goals.module.js';
import { RemindersModule } from './reminders/reminders.module.js';
import { TasksModule } from './tasks/tasks.module.js';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => typeOrmOptions(config.databaseUrl)
    }),
    // Límite general por cliente; los endpoints de login/registro tienen uno más estricto
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 300 }]),
    AuthModule,
    TasksModule,
    GoalsModule,
    RemindersModule
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }]
})
export class AppModule {}
