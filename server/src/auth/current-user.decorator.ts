import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';

export interface AuthenticatedUser {
  userId: number;
}

export type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

/** Id del usuario autenticado, tomado siempre del token (nunca de la petición). */
export const CurrentUserId = createParamDecorator((_data: unknown, context: ExecutionContext): number => {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.user!.userId;
});
