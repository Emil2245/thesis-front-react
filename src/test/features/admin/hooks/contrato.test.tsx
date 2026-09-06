import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { crearQueryClient } from "@/test/render";
import { espiar, ultima } from "@/test/espia";
import { basesCentralesFixtureAdmin, parametrosSistemaFixture } from "@/test/fixtures/admin";
import { ApiError } from "@/api/problem";
import {
  useAdminBases,
  useCrearBase,
  useEliminarBase,
  useArchivarBase,
  useRenombrarBase,
} from "@/features/admin/hooks/useAdminBases";
import {
  useParametrosSistema,
  useActualizarParametros,
} from "@/features/admin/hooks/useParametrosSistema";

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

// Plan 057 §5: se afirma la *petición que sale* (verbo, ruta exacta, params,
// cuerpo exacto), no `isSuccess`. Estas pantallas están apagadas tras
// `<ModuloNoDisponible>` (MODULOS_SIN_BACKEND), así que el hook solo se puede
// probar directamente; es justamente donde la deriva de contrato no se ve.
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

  // El endpoint devuelve `List<AdminBaseCentralResponse>` pelada, no `Page<T>`.
  // Tipándolo como `Page` la página hacía `data.contenido.map` sobre
  // `undefined` y reventaba al montar.
  it("devuelve una lista pelada, no una página", async () => {
    const { result } = renderHook(() => useAdminBases(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(Array.isArray(result.current.data)).toBe(true);
    expect(result.current.data?.[0].nombre).toBe(basesCentralesFixtureAdmin[0].nombre);
  });

  it("sin filtros no manda ningún query param", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useAdminBases(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const p = ultima(peticiones, "GET", "/admin/bases-centrales");
    expect([...(p?.url.searchParams.keys() ?? [])]).toEqual([]);
  });

  it("crea con POST /admin/bases-centrales y un cuerpo de solo `nombre`", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useCrearBase(), { wrapper });
    await result.current.mutateAsync({ nombre: "Base Cámara 2027" });

    const p = ultima(peticiones, "POST", "/admin/bases-centrales");
    expect(p?.ruta).toBe(`${RUTA}/admin/bases-centrales`);
    await waitFor(() => expect(p?.cuerpo).toEqual({ nombre: "Base Cámara 2027" }));
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
      .mutateAsync({ nombre: "Base", tipo: "CENTRAL" } as unknown as { nombre: string })
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
      .mutateAsync({ porcentajeHm: "0.050000" } as never)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
  });
});
