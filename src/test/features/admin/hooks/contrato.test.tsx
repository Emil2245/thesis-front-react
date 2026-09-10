import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { http, HttpResponse } from "msw";

import { crearQueryClient } from "@/test/render";
import { espiar, ultima, cuerpoInvalido } from "@/test/espia";
import {
  basesCentralesFixtureAdmin,
  parametrosSistemaFixture,
  usuariosAdminFixture,
} from "@/test/fixtures/admin";
import { ApiError } from "@/api/problem";
import { server } from "@/test/server";
import {
  useAdminBases,
  useAdminBase,
  useCrearBase,
  useEliminarBase,
  useArchivarBase,
  useRenombrarBase,
} from "@/features/admin/hooks/useAdminBases";
import {
  useParametrosSistema,
  useActualizarParametros,
} from "@/features/admin/hooks/useParametrosSistema";
import {
  useUsuariosAdmin,
  useInvitarUsuario,
  useEditarUsuario,
  useEliminarUsuario,
} from "@/features/admin/hooks/useUsuariosAdmin";
import { USUARIO_CON_PROYECTOS } from "@/test/handlers";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// El patrón de MSW necesita comodín de host; el pathname que se afirma no.
const RUTA = "/api/v1";
const BASE_ID = basesCentralesFixtureAdmin[0].id;

let cliente: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  cliente = crearQueryClient();
});

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}

// Plan 057 §5: se afirma la *petición que sale* (verbo, ruta exacta, params y
// cuerpo exacto), no solo `isSuccess`. Bases está activa y su contrato se prueba
// también en el hook para detectar deriva antes del render.
describe("contrato de useAdminBases", () => {
  // La ruta real del backend es `/admin/bases-centrales` (AdminBaseCentralResource).
  // `/admin/bases` nunca existió: era la deriva que arrastraba el plan 027.
  it("lista con GET /admin/bases-centrales y manda los filtros como query params", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useAdminBases({ incluirArchivadas: true }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const p = ultima(peticiones, "GET", "/admin/bases-centrales");
    expect(p?.ruta).toBe(`${RUTA}/admin/bases-centrales`);
    expect(p?.url.searchParams.get("incluirArchivadas")).toBe("true");
  });

  // El backend devuelve Page y el interceptor traduce `items/total` al contrato
  // interno `contenido/totalElementos` antes de que el schema valide la respuesta.
  it("devuelve la página normalizada y excluye archivadas por defecto", async () => {
    const { result } = renderHook(() => useAdminBases(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const activas = basesCentralesFixtureAdmin.filter((base) => !base.archivada);
    expect(result.current.data?.contenido).toHaveLength(activas.length);
    expect(result.current.data?.totalElementos).toBe(activas.length);
    expect(result.current.data?.contenido[0].nombre).toBe(activas[0].nombre);
  });

  it("manda siempre page y size explícitos", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useAdminBases(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const p = ultima(peticiones, "GET", "/admin/bases-centrales");
    expect(p?.url.searchParams.get("page")).toBe("0");
    expect(p?.url.searchParams.get("size")).toBe("25");
  });

  it("busca secuencialmente por páginas con tamaño 200 sin GET por id", async () => {
    const peticiones = espiar();
    const target = basesCentralesFixtureAdmin[1];
    server.use(
      http.get("*/api/v1/admin/bases-centrales", ({ request }) => {
        const params = new URL(request.url).searchParams;
        const page = Number(params.get("page"));
        return HttpResponse.json({
          items: page === 0 ? [basesCentralesFixtureAdmin[0]] : [target],
          total: 201,
          page,
          size: 200,
          totalPaginas: 2,
        });
      }),
    );

    const { result } = renderHook(() => useAdminBase(target.id), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe(target.id);
    expect(
      peticiones
        .filter((p) => p.metodo === "GET" && p.ruta === `${RUTA}/admin/bases-centrales`)
        .map((p) => [p.url.searchParams.get("page"), p.url.searchParams.get("size")]),
    ).toEqual([
      ["0", "200"],
      ["1", "200"],
    ]);
  });

  it("crea con POST /admin/bases-centrales y un cuerpo de solo `nombre`", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useCrearBase(), { wrapper });
    await result.current.mutateAsync({ nombre: "Base Cámara 2027" });

    const p = ultima(peticiones, "POST", "/admin/bases-centrales");
    expect(p?.ruta).toBe(`${RUTA}/admin/bases-centrales`);
    await waitFor(() => expect(p?.cuerpo).toEqual({ nombre: "Base Cámara 2027" }));
  });

  it("invalida también la caché de búsquedas secuenciales al crear una base", async () => {
    const lookupKey = ["admin", "bases-centrales", BASE_ID, "lookup"] as const;
    cliente.setQueryData(lookupKey, basesCentralesFixtureAdmin[0]);

    const { result } = renderHook(() => useCrearBase(), { wrapper });
    await result.current.mutateAsync({ nombre: "Base Cámara 2027" });

    expect(cliente.getQueryState(lookupKey)?.isInvalidated).toBe(true);
  });

  // PUT /admin/bases-centrales/{id} existe en el backend y no tenía hook.
  it("renombra con PUT /admin/bases-centrales/{id} y un cuerpo de solo `nombre`", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useRenombrarBase(), { wrapper });
    await result.current.mutateAsync({ id: BASE_ID, nombre: "Base Cámara 2028" });

    const p = ultima(peticiones, "PUT", `/admin/bases-centrales/${BASE_ID}`);
    expect(p?.ruta).toBe(`${RUTA}/admin/bases-centrales/${BASE_ID}`);
    await waitFor(() => expect(p?.cuerpo).toEqual({ nombre: "Base Cámara 2028" }));
  });

  // El backend descarta en silencio lo que no conoce (Jackson) y devuelve 200.
  // El handler estricto lo convierte en 400 para que el seam lo vea.
  it("un campo de más en el alta de base es un 400, no un éxito silencioso", async () => {
    const { result } = renderHook(() => useCrearBase(), { wrapper });

    const error = await result.current
      .mutateAsync(cuerpoInvalido({ nombre: "Base", tipo: "CENTRAL" }))
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
  });

  it("elimina con DELETE /admin/bases-centrales/{id} usando el UUID de la base", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useEliminarBase(), { wrapper });
    await result.current.mutateAsync(BASE_ID);

    expect(ultima(peticiones, "DELETE", `/admin/bases-centrales/${BASE_ID}`)?.ruta).toBe(
      `${RUTA}/admin/bases-centrales/${BASE_ID}`,
    );
  });

  // Un solo endpoint archiva y restaura (toggle) y no recibe cuerpo: si
  // alguien le añade `{ archivada: true }`, el backend lo rechaza.
  it("archiva/restaura con POST /admin/bases-centrales/{id}/archivar y sin cuerpo", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useArchivarBase(), { wrapper });
    await result.current.mutateAsync(BASE_ID);

    const p = ultima(peticiones, "POST", "/archivar");
    expect(p?.ruta).toBe(`${RUTA}/admin/bases-centrales/${BASE_ID}/archivar`);
    expect(p?.cuerpo).toBeUndefined();
  });
});

// La trampa de esta ruta: el backend expone los parámetros de sistema en el
// recurso de *proyectos*, sin rol de admin (plan 027). Parece un error de copia
// dentro de un hook de admin y alguien lo va a «corregir» a `/admin/…`.
describe("contrato de useParametrosSistema", () => {
  it("lee de /proyectos/parametros-sistema y nunca de /admin", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useParametrosSistema(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(peticiones.map((p) => p.ruta)).toEqual([`${RUTA}/proyectos/parametros-sistema`]);
  });

  // `ParametrosSistemaEditarRequest` declara 10 campos `@NotNull` de los 11
  // numéricos: mandar solo 4, como hacía la pantalla, devuelve 400. Y son
  // `BigDecimal` serializados como número JSON, no como decimal string.
  it("escribe con PUT /proyectos/parametros-sistema los 11 campos como números", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useActualizarParametros(), { wrapper });
    await result.current.mutateAsync({ ...parametrosSistemaFixture });

    const p = ultima(peticiones, "PUT", "/parametros-sistema");
    expect(p?.ruta).toBe(`${RUTA}/proyectos/parametros-sistema`);
    await waitFor(() =>
      expect(p?.cuerpo).toEqual({
        porcentajeHerramientaMenor: 0.05,
        porcentajeIndirecto: 0.15,
        iva: 0.12,
        rangoHmMin: 0,
        rangoHmMax: 0.2,
        rangoCiMin: 0,
        rangoCiMax: 1,
        rangoDescuentoMin: 0,
        rangoDescuentoMax: 0.5,
        rangoIvaMin: 0,
        rangoIvaMax: 0.3,
        moneda: "USD",
      }),
    );
  });

  it("un campo mal nombrado en los parámetros es un 400", async () => {
    const { result } = renderHook(() => useActualizarParametros(), { wrapper });

    const error = await result.current
      .mutateAsync(cuerpoInvalido({ porcentajeHm: "0.050000" }))
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
  });
});

// `UsuarioAdminResource` (plan 077): el gate `admin-usuarios` sigue cerrado
// (`MODULOS_SIN_BACKEND`), pero el contrato ya se prueba a nivel de hook,
// igual que Bases lo hizo mientras esperaba activarse.
describe("contrato de useUsuariosAdmin", () => {
  it("lista con GET /admin/usuarios y manda page y size explícitos", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useUsuariosAdmin(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const p = ultima(peticiones, "GET", "/admin/usuarios");
    expect(p?.ruta).toBe(`${RUTA}/admin/usuarios`);
    expect(p?.url.searchParams.get("page")).toBe("0");
    expect(p?.url.searchParams.get("size")).toBe("25");
  });

  it("devuelve la página normalizada con los usuarios del fixture", async () => {
    const { result } = renderHook(() => useUsuariosAdmin(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.contenido).toHaveLength(usuariosAdminFixture.length);
    expect(result.current.data?.totalElementos).toBe(usuariosAdminFixture.length);
  });

  it("manda el filtro q como query param", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useUsuariosAdmin({ q: "ana" }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(ultima(peticiones, "GET", "/admin/usuarios")?.url.searchParams.get("q")).toBe("ana");
  });

  it("invita con POST /admin/usuarios y un cuerpo de nombre, email y rol", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useInvitarUsuario(), { wrapper });
    await result.current.mutateAsync({
      nombre: "Nuevo Usuario",
      email: "nuevo@example.com",
      rol: "USUARIO",
    });

    const p = ultima(peticiones, "POST", "/admin/usuarios");
    expect(p?.ruta).toBe(`${RUTA}/admin/usuarios`);
    await waitFor(() =>
      expect(p?.cuerpo).toEqual({
        nombre: "Nuevo Usuario",
        email: "nuevo@example.com",
        rol: "USUARIO",
      }),
    );
  });

  // Un campo de más (aquí, un email en el alta con una clave distinta) es un
  // 400 del handler estricto, no un éxito silencioso.
  it("un campo desconocido al invitar es un 400, no un éxito silencioso", async () => {
    const { result } = renderHook(() => useInvitarUsuario(), { wrapper });

    const error = await result.current
      .mutateAsync(cuerpoInvalido({ nombre: "X", email: "x@x.com", rol: "USUARIO", activo: true }))
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
  });

  // El PUT nunca manda `email`: no es editable por este endpoint aunque el
  // backend real lo ignore en silencio si se lo mandan.
  it("edita con PUT /admin/usuarios/{id} sin mandar email nunca", async () => {
    const peticiones = espiar();
    const objetivo = usuariosAdminFixture[1];

    const { result } = renderHook(() => useEditarUsuario(), { wrapper });
    await result.current.mutateAsync({
      id: objetivo.id,
      nombre: "Editado",
      rol: "USUARIO",
      activo: true,
    });

    const p = ultima(peticiones, "PUT", `/admin/usuarios/${objetivo.id}`);
    expect(p?.ruta).toBe(`${RUTA}/admin/usuarios/${objetivo.id}`);
    await waitFor(() =>
      expect(p?.cuerpo).toEqual({ nombre: "Editado", rol: "USUARIO", activo: true }),
    );
  });

  it("elimina con DELETE /admin/usuarios/{id}", async () => {
    const peticiones = espiar();
    const objetivo = usuariosAdminFixture[1];

    const { result } = renderHook(() => useEliminarUsuario(), { wrapper });
    await result.current.mutateAsync(objetivo.id);

    expect(ultima(peticiones, "DELETE", `/admin/usuarios/${objetivo.id}`)?.ruta).toBe(
      `${RUTA}/admin/usuarios/${objetivo.id}`,
    );
  });

  // TC-12-P38-03: borrar un usuario con proyectos propios es un 409, no un
  // 204 silencioso.
  it("eliminar un usuario con proyectos propios es un 409 usuario-con-proyectos-impedido", async () => {
    const { result } = renderHook(() => useEliminarUsuario(), { wrapper });

    const error = await result.current.mutateAsync(USUARIO_CON_PROYECTOS).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(409);
    expect((error as ApiError).slug).toBe("usuario-con-proyectos-impedido");
  });
});
