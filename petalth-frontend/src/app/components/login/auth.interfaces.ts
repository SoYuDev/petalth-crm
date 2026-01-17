// 1. Lo que enviamos al servidor
export interface LoginRequest {
  email: string;
  password: string;
}

export enum Role {
  ADMIN = 'ADMIN',
  USER = 'OWNER',
  VET = 'VET',
}

// 2. Lo que recibes del servidor (La estructura exacta de tu JSON)
export interface AuthResponse {
  id: number;
  token: string;
  email: string;
  nombre: string;
  rol: Role;
  mensaje: string;
}
