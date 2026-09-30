import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { IS_PUBLIC } from './public.decorator.js';
import { AuthenticatedRequest } from './current-user.decorator.js';
import { SESSION_COOKIE } from './session.js';

interface SessionPayload {
  sub: number;
  /** Versión de la sesión del usuario al emitir el token (ausente en tokens antiguos: 0). */
  ver?: number;
}

/**
 * Guard global: exige una cookie de sesión con un JWT válido salvo en los endpoints @Public.
 * Además comprueba que la sesión no se haya revocado al cambiar la contraseña.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthService) private readonly auth: AuthService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token: unknown = request.cookies?.[SESSION_COOKIE];
    if (typeof token !== 'string' || !token) throw new UnauthorizedException();

    let payload: SessionPayload;
    try {
      payload = await this.jwt.verifyAsync<SessionPayload>(token);
    } catch {
      throw new UnauthorizedException();
    }
    if (!(await this.auth.isSessionCurrent(payload.sub, payload.ver ?? 0))) throw new UnauthorizedException();
    request.user = { userId: payload.sub };
    return true;
  }
}
