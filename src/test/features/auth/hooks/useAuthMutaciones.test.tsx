import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";

import { crearQueryClient } from "@/test/render";
import { server } from "@/test/server";
import { espiar, ultima } from "@/test/espia";
import { problema } from "@/test/handlers";
import { usuarioFixture } from "@/test/fixtures/auth";
import { ApiError } from "@/api/problem";
import { getAccessToken, setAccessToken, setOnSesionExpirada, setRefrescador } from "@/api/client";
import { get, post } from "@/api/request";
import { useSesionStore } from "@/features/auth/sesion";
import { useBootstrapSesion } from "@/features/auth/hooks/useSesion";
import {
  useLogin,
  useRegistro,
  useVerificarEmail,
  useReenviarVerificacion,
  useRecuperarPassword,
  useRestablecerPassword,
  useCerrarSesion,
  useActualizarPerfil,
  useCambiarPassword,
} from "@/features/auth/hooks/useAuthMutaciones";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const API = "*/api/v1";
const RUTA = "/api/v1";

let cliente: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  cliente = crearQueryClient();
  localStorage.clear();
  sessionStorage.clear();
  useSesionStore.setState({ usuario: null, refreshToken: null, cargando: true });
});

afterEach(() => {
  setAccessToken(null);
  setRefrescador(null);
  setOnSesionExpirada(null);
});

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={cliente}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

// Plan 057 §6: lo que se afirma es la *petición que sale* (verbo, ruta, cuerpo
// exacto). Un nombre de campo equivocado aquí es un 400 en producción y un 200
// en el mock permisivo; el handler estricto y estas aserciones lo delatan.
describe("contrato de las mutaciones de auth", () => {
  it("login manda email, password y recordarSesion, y nada más", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useLogin(), { wrapper });
    await result.current.mutateAsync({
      email: "ana@ejemplo.ec",
      password: "abc12345",
      recordarSesion: true,
    });

    const p = ultima(peticiones, "POST", "/auth/login");
    expect(p?.ruta).toBe(`${RUTA}/auth/login`);
    await waitFor(() =>
      expect(p?.cuerpo).toEqual({
        email: "ana@ejemplo.ec",
        password: "abc12345",
        recordarSesion: true,
      }),
    );
  });

  // El backend lee `recordarSesion`; cualquier variante se descartaría en
  // silencio y la sesión no se recordaría sin ningún error visible.
  it("un campo mal nombrado en el login es un 400, no un login a medias", async () => {
    const { result } = renderHook(() => useLogin(), { wrapper });

    const error = await result.current
      .mutateAsync({ email: "ana@ejemplo.ec", password: "abc12345", recordar: true } as never)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
  });

  it("registro manda nombre, email, password y passwordConfirmacion", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useRegistro(), { wrapper });
    await result.current.mutateAsync({
      nombre: "Ana Torres",
      email: "ana@ejemplo.ec",
      password: "abc12345",
      passwordConfirmacion: "abc12345",
    });

    const p = ultima(peticiones, "POST", "/auth/registro");
    expect(p?.ruta).toBe(`${RUTA}/auth/registro`);
    await waitFor(() =>
      expect(p?.cuerpo).toEqual({
        nombre: "Ana Torres",
        email: "ana@ejemplo.ec",
        password: "abc12345",
        passwordConfirmacion: "abc12345",
      }),
    );
  });

  it("verificar email envuelve el token en `{ token }`", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useVerificarEmail(), { wrapper });
    await result.current.mutateAsync("tok-123");

    const p = ultima(peticiones, "POST", "/auth/verificar-email");
    expect(p?.ruta).toBe(`${RUTA}/auth/verificar-email`);
    await waitFor(() => expect(p?.cuerpo).toEqual({ token: "tok-123" }));
  });

  it("reenviar verificación envuelve el email en `{ email }`", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useReenviarVerificacion(), { wrapper });
    await result.current.mutateAsync("ana@ejemplo.ec");

    const p = ultima(peticiones, "POST", "/auth/reenviar-verificacion");
    expect(p?.ruta).toBe(`${RUTA}/auth/reenviar-verificacion`);
    await waitFor(() => expect(p?.cuerpo).toEqual({ email: "ana@ejemplo.ec" }));
  });

  it("recuperar password pide POST /auth/recuperar con `{ email }`", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useRecuperarPassword(), { wrapper });
    await result.current.mutateAsync("ana@ejemplo.ec");

    const p = ultima(peticiones, "POST", "/auth/recuperar");
    expect(p?.ruta).toBe(`${RUTA}/auth/recuperar`);
    await waitFor(() => expect(p?.cuerpo).toEqual({ email: "ana@ejemplo.ec" }));
  });

  it("restablecer manda token, password y passwordConfirmacion", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useRestablecerPassword(), { wrapper });
    await result.current.mutateAsync({
      token: "tok-abc",
      password: "nueva1234",
      passwordConfirmacion: "nueva1234",
    });

    const p = ultima(peticiones, "POST", "/auth/restablecer");
    expect(p?.ruta).toBe(`${RUTA}/auth/restablecer`);
    await waitFor(() =>
      expect(p?.cuerpo).toEqual({
        token: "tok-abc",
        password: "nueva1234",
        passwordConfirmacion: "nueva1234",
      }),
    );
  });

  it("actualizar perfil manda PUT /perfil con solo nombre y email", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useActualizarPerfil(vi.fn()), { wrapper });
    await result.current.mutateAsync({ nombre: "Ana T.", email: "ana2@ejemplo.ec" });

    const p = ultima(peticiones, "PUT", "/perfil");
    expect(p?.ruta).toBe(`${RUTA}/perfil`);
    await waitFor(() => expect(p?.cuerpo).toEqual({ nombre: "Ana T.", email: "ana2@ejemplo.ec" }));
  });

  // El Problem de validación trae `errores[{campo, mensaje}]`: si el backend
  // renombrara cualquiera de los dos, el formulario se quedaría mudo.
  it("un Problem de validación se reparte sobre los campos del formulario", async () => {
    server.use(
      http.put(`${API}/perfil`, () =>
        problema(400, "validacion", "Datos inválidos", {
          errores: [{ campo: "email", mensaje: "Ese correo ya está en uso" }],
        }),
      ),
    );
    const setError = vi.fn();

    const { result } = renderHook(() => useActualizarPerfil(setError), { wrapper });
    await result.current
      .mutateAsync({ nombre: "Ana", email: "ana@ejemplo.ec" })
      .catch(() => undefined);

    await waitFor(() =>
      expect(setError).toHaveBeenCalledWith("email", {
        type: "server",
        message: "Ese correo ya está en uso",
      }),
    );
  });

  it("cambiar password manda PUT /perfil/password con los tres campos", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useCambiarPassword(vi.fn()), { wrapper });
    await result.current.mutateAsync({
      passwordActual: "vieja1234",
      passwordNueva: "nueva1234",
      passwordConfirmacion: "nueva1234",
    });

    const p = ultima(peticiones, "PUT", "/perfil/password");
    expect(p?.ruta).toBe(`${RUTA}/perfil/password`);
    await waitFor(() =>
      expect(p?.cuerpo).toEqual({
        passwordActual: "vieja1234",
        passwordNueva: "nueva1234",
        passwordConfirmacion: "nueva1234",
      }),
    );
  });
});

describe("useCerrarSesion", () => {
  it("con refresh token guardado hace POST /auth/logout con `{ refreshToken }`", async () => {
    localStorage.setItem("apu.refresh", "rt-guardado");
    const peticiones = espiar();

    const { result } = renderHook(() => useCerrarSesion(), { wrapper });
    await result.current.mutateAsync();

    const p = ultima(peticiones, "POST", "/auth/logout");
    expect(p?.ruta).toBe(`${RUTA}/auth/logout`);
    await waitFor(() => expect(p?.cuerpo).toEqual({ refreshToken: "rt-guardado" }));
  });

  // La rama silenciosa: sin token no sale ninguna petición. Si alguien quita
  // la guarda, el backend recibe `{ refreshToken: null }` y responde 400
  // mientras la UI se comporta igual, así que solo este test lo ve.
  it("sin refresh token no llama al backend, pero igual limpia la sesión", async () => {
    setAccessToken("token-viejo");
    useSesionStore.setState({ usuario: usuarioFixture, refreshToken: null, cargando: false });
    const peticiones = espiar();

    const { result } = renderHook(() => useCerrarSesion(), { wrapper });
    await result.current.mutateAsync();

    expect(peticiones).toHaveLength(0);
    expect(getAccessToken()).toBeNull();
    expect(useSesionStore.getState().usuario).toBeNull();
  });
});

// La parte más delicada del seam (plan 057): un 401 en cualquier ruta que no
// sea `/auth/` refresca y reintenta la original UNA vez. `client.test.ts` ya
// cubre el camino feliz y el aviso de expiración; lo que faltaba es el token
// del reintento, la exención de `/auth/*` y que no haya bucle.
describe("interceptor de refresh", () => {
  it("el reintento lleva el Bearer nuevo y la original sale exactamente dos veces", async () => {
    const autorizaciones: (string | null)[] = [];
    let llamadas = 0;
    server.use(
      http.get(`${API}/perfil`, ({ request }) => {
        autorizaciones.push(request.headers.get("authorization"));
        llamadas += 1;
        if (llamadas === 1) {
          return problema(401, "token-invalido-o-expirado", "Expirado");
        }
        return HttpResponse.json(usuarioFixture);
      }),
    );
    setAccessToken("token-viejo");
    const refrescar = vi.fn().mockResolvedValue("token-nuevo");
    setRefrescador(refrescar);
    const peticiones = espiar();

    await expect(get("/perfil")).resolves.toMatchObject({ id: usuarioFixture.id });

    expect(autorizaciones).toEqual(["Bearer token-viejo", "Bearer token-nuevo"]);
    expect(peticiones.filter((p) => p.ruta === `${RUTA}/perfil`)).toHaveLength(2);
    expect(refrescar).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBe("token-nuevo");
  });

  // Refrescar un login caducado con el propio login sería un bucle: las rutas
  // de `/auth/` quedan fuera del reintento a propósito.
  it("un 401 en /auth/* no refresca ni reintenta", async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        problema(401, "credenciales-invalidas", "Credenciales inválidas"),
      ),
    );
    const refrescar = vi.fn().mockResolvedValue("token-nuevo");
    setRefrescador(refrescar);
    const peticiones = espiar();

    await expect(post("/auth/login", { email: "a@a.ec", password: "x" })).rejects.toBeInstanceOf(
      ApiError,
    );

    expect(refrescar).not.toHaveBeenCalled();
    expect(peticiones.filter((p) => p.ruta === `${RUTA}/auth/login`)).toHaveLength(1);
  });

  it("si el refresh falla se avisa de sesión expirada y no se reintenta en bucle", async () => {
    server.use(
      http.get(`${API}/perfil`, () => problema(401, "token-invalido-o-expirado", "Expirado")),
    );
    setRefrescador(vi.fn().mockResolvedValue(null));
    const expirada = vi.fn();
    setOnSesionExpirada(expirada);
    const peticiones = espiar();

    await expect(get("/perfil")).rejects.toBeInstanceOf(ApiError);

    expect(expirada).toHaveBeenCalledTimes(1);
    expect(peticiones.filter((p) => p.ruta === `${RUTA}/perfil`)).toHaveLength(1);
  });

  it("el refrescador real pide POST /auth/refresh con `{ refreshToken }`", async () => {
    localStorage.setItem("apu.refresh", "rt-guardado");
    const peticiones = espiar();

    renderHook(() => useBootstrapSesion(), { wrapper });

    await waitFor(() => expect(useSesionStore.getState().cargando).toBe(false));
    const p = ultima(peticiones, "POST", "/auth/refresh");
    expect(p?.ruta).toBe(`${RUTA}/auth/refresh`);
    await waitFor(() => expect(p?.cuerpo).toEqual({ refreshToken: "rt-guardado" }));
  });
});
