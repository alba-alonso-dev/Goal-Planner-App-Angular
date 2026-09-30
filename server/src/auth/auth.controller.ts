import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { toUserResponse, UserResponse } from '../users/user.mapper.js';
import { AuthService } from './auth.service.js';
import { CurrentUserId } from './current-user.decorator.js';
import { LoginDto, RegisterDto } from './dto/auth.dto.js';
import { Public } from './public.decorator.js';
import { SESSION_COOKIE, sessionCookieOptions } from './session.js';

// Límite estricto contra fuerza bruta: por defecto 10 intentos por minuto y cliente (AUTH_RATE_LIMIT)
const AUTH_THROTTLE = { default: { limit: () => Number(process.env['AUTH_RATE_LIMIT'] ?? 10), ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(APP_CONFIG) private readonly config: AppConfig
  ) {}

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) response: Response): Promise<UserResponse> {
    const user = await this.auth.register(dto);
    await this.startSession(response, user.id);
    return toUserResponse(user);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response): Promise<UserResponse> {
    const user = await this.auth.login(dto);
    await this.startSession(response, user.id);
    return toUserResponse(user);
  }

  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response): void {
    const { maxAge: _maxAge, ...options } = sessionCookieOptions(this.config);
    response.clearCookie(SESSION_COOKIE, options);
  }

  @Get('me')
  async me(@CurrentUserId() userId: number): Promise<UserResponse> {
    return toUserResponse(await this.auth.findUser(userId));
  }

  private async startSession(response: Response, userId: number): Promise<void> {
    const token = await this.auth.signSession(userId);
    response.cookie(SESSION_COOKIE, token, sessionCookieOptions(this.config));
  }
}
