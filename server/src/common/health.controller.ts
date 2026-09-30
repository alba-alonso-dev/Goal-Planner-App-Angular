import { Controller, Get, Inject } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import { Public } from '../auth/public.decorator.js';

@Controller('health')
export class HealthController {
  constructor(@Inject(DataSource) private readonly dataSource: DataSource) {}

  /** Para balanceadores y orquestadores: comprueba también la base de datos. */
  @Public()
  @SkipThrottle()
  @Get()
  async check(): Promise<{ status: 'ok' }> {
    await this.dataSource.query('SELECT 1');
    return { status: 'ok' };
  }
}
