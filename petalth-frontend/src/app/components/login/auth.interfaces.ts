// 1. Lo que enviamos al servidor
export interface LoginRequest {
  email: string;
  password: string;
}

// 2. Lo que recibes del servidor (La estructura exacta de tu JSON)
export interface AuthResponse {
  token: string;
  email: string;
  rol: 'ADMIN' | 'USER' | 'VET';
  mensaje: string;
}
