export interface User {
  userId: number;
  emailId: string;
  fullName: string;
  mobileNo: string;
  createdDate?: string;
  projectName?: string;
  extraId?: number;
  // No incluimos password por seguridad
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
