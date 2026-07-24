import type { TokenResponse, UsuarioResponse } from "@/api/contract";

export const usuarioFixture: UsuarioResponse = {
  id: 1,
  nombre: "Ana Torres",
  email: "ana@ejemplo.ec",
  rol: "USUARIO",
  emailVerificado: true,
};

export const adminFixture: UsuarioResponse = {
  id: 2,
  nombre: "Admin Root",
  email: "admin@ejemplo.ec",
  rol: "SUPER_ADMIN",
  emailVerificado: true,
};

export const tokenFixture: TokenResponse = {
  accessToken: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.test",
  expiraEnSegundos: 3600,
  refreshToken: "rt-test",
  usuario: usuarioFixture,
};
