/** Perfil público del usuario autenticado (el backend nunca devuelve la contraseña). */
export interface User {
  userId: number;
  emailId: string;
  fullName: string;
  mobileNo: string;
  createdDate?: string;
}

export interface LoginData {
  emailId: string;
  password: string;
}

export interface RegisterData {
  fullName: string;
  emailId: string;
  password: string;
  mobileNo: string;
}
