import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC } from './public.decorator.js';
import { AuthenticatedRequest } from './current-user.decorator.js';
import { SESSION_COOKIE } from './session.js';

interface SessionPayload {
  sub: number;
}

/** Guard global: exige una cookie de sesión con un JWT válido salvo en los endpoints @Public. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(Reflector) private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token: unknown = request.cookies?.[SESSION_COOKIE];
    if (typeof token !== 'string' || !token) throw new UnauthorizedException();

    try {
      const payload = await this.jwt.verifyAsync<SessionPayload>(token);
      request.user = { userId: payload.sub };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
