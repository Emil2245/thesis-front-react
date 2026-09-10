import type { PerfilResponse, TokenResponse, UsuarioResponse } from "@/api/contract";

export const usuarioFixture: UsuarioResponse = {
  id: 1,
  nombre: "Ana Torres",
  email: "ana@ejemplo.ec",
  rol: "USUARIO",
  emailVerificado: true,
};

/**
 * `GET/PUT /perfil` NO devuelve la misma forma que el usuario de la sesión:
 * trae `fechaCreacion` y **no** trae `emailVerificado`. Comprobado por `curl`
 * contra el backend real (`@ 2803575`):
 * `{"email":…,"fechaCreacion":"2026-09-10T03:56:41.070085Z","id":1,"nombre":…,"rol":"USUARIO"}`.
 * Los handlers devolvían `tokenFixture.usuario` y `perfilSchema` —que es
 * `.strict()`— los rechazaba.
 */
export const perfilFixture: PerfilResponse = {
  id: 1,
  nombre: "Ana Torres",
  email: "ana@ejemplo.ec",
  rol: "USUARIO",
  fechaCreacion: "2026-01-15T10:00:00Z",
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
