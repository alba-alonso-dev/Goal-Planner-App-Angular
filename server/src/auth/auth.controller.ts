import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { User } from '../users/user.entity.js';
import { toUserResponse, UserResponse } from '../users/user.mapper.js';
import { AuthService } from './auth.service.js';
import { CurrentUserId } from './current-user.decorator.js';
import { ChangePasswordDto, ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from './dto/auth.dto.js';
import { PasswordResetService } from './password-reset.service.js';
import { Public } from './public.decorator.js';
import { SESSION_COOKIE, sessionCookieOptions } from './session.js';

// Límite estricto contra fuerza bruta: por defecto 10 intentos por minuto y cliente (AUTH_RATE_LIMIT)
const AUTH_THROTTLE = { default: { limit: () => Number(process.env['AUTH_RATE_LIMIT'] ?? 10), ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(PasswordResetService) private readonly passwordReset: PasswordResetService,
    @Inject(APP_CONFIG) private readonly config: AppConfig
  ) {}

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) response: Response): Promise<UserResponse> {
    const user = await this.auth.register(dto);
    await this.startSession(response, user);
    return toUserResponse(user);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response): Promise<UserResponse> {
    const user = await this.auth.login(dto);
    await this.startSession(response, user);
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

  /** Cambia la contraseña: cierra las demás sesiones y renueva la de este dispositivo. */
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('change-password')
  async changePassword(
    @CurrentUserId() userId: number,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) response: Response
  ): Promise<void> {
    await this.startSession(response, await this.auth.changePassword(userId, dto));
  }

  /** Siempre 204: no revela si el email tiene cuenta. */
  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    await this.passwordReset.request(dto.emailId, dto.locale);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.passwordReset.reset(dto.token, dto.newPassword);
  }

  private async startSession(response: Response, user: User): Promise<void> {
    const token = await this.auth.signSession(user);
    response.cookie(SESSION_COOKIE, token, sessionCookieOptions(this.config));
  }
}
