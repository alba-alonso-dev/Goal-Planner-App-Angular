import { User } from './user.entity.js';

/** Forma pública de un usuario (nunca incluye el hash de la contraseña). */
export interface UserResponse {
  userId: number;
  emailId: string;
  fullName: string;
  mobileNo: string;
  createdDate: string;
}

export function toUserResponse(user: User): UserResponse {
  return {
    userId: user.id,
    emailId: user.email,
    fullName: user.fullName,
    mobileNo: user.mobileNo,
    createdDate: user.createdAt.toISOString()
  };
}
