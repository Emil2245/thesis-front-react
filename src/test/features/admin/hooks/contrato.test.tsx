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
  // ponytail: la ruta real del backend es `/admin/bases-centrales`. Aquí se
  // fija la de hoy (`/admin/bases`) a propósito: el plan 050 la mueve, y
  // cuando lo haga estos tests se ponen en rojo y hay que moverlos con ella.
  it("lista con GET /admin/bases y manda los filtros como query params", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useAdminBases({ incluirArchivadas: true }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const p = ultima(peticiones, "GET", "/admin/bases");
    expect(p?.ruta).toBe(`${RUTA}/admin/bases`);
    expect(p?.url.searchParams.get("incluirArchivadas")).toBe("true");
  });

  it("sin filtros no manda ningún query param", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useAdminBases(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const p = ultima(peticiones, "GET", "/admin/bases");
    expect([...(p?.url.searchParams.keys() ?? [])]).toEqual([]);
  });

  it("crea con POST /admin/bases y un cuerpo de solo `nombre`", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useCrearBase(), { wrapper });
    await result.current.mutateAsync({ nombre: "Base Cámara 2027" });

    const p = ultima(peticiones, "POST", "/admin/bases");
    expect(p?.ruta).toBe(`${RUTA}/admin/bases`);
    await waitFor(() => expect(p?.cuerpo).toEqual({ nombre: "Base Cámara 2027" }));
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

  it("elimina con DELETE /admin/bases/{id} usando el UUID de la base", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useEliminarBase(), { wrapper });
    await result.current.mutateAsync(BASE_ID);

    expect(ultima(peticiones, "DELETE", `/admin/bases/${BASE_ID}`)?.ruta).toBe(
      `${RUTA}/admin/bases/${BASE_ID}`,
    );
  });

  // Un solo endpoint archiva y restaura (toggle) y no recibe cuerpo: si
  // alguien le añade `{ archivada: true }`, el backend lo rechaza.
  it("archiva/restaura con POST /admin/bases/{id}/archivar y sin cuerpo", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useArchivarBase(), { wrapper });
    await result.current.mutateAsync(BASE_ID);

    const p = ultima(peticiones, "POST", "/archivar");
    expect(p?.ruta).toBe(`${RUTA}/admin/bases/${BASE_ID}/archivar`);
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

  // El botón «Guardar» de AdminParametrosPage está deshabilitado a mano, así
  // que esta mutación no se dispara nunca en la app: sin este test su contrato
  // no lo mira nadie.
  it("escribe con PUT /proyectos/parametros-sistema y el cuerpo exacto", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useActualizarParametros(), { wrapper });
    await result.current.mutateAsync({
      porcentajeHerramientaMenor: parametrosSistemaFixture.porcentajeHerramientaMenor,
      porcentajeIndirecto: parametrosSistemaFixture.porcentajeIndirecto,
      iva: parametrosSistemaFixture.iva,
      moneda: "USD",
    });

    const p = ultima(peticiones, "PUT", "/parametros-sistema");
    expect(p?.ruta).toBe(`${RUTA}/proyectos/parametros-sistema`);
    await waitFor(() =>
      expect(p?.cuerpo).toEqual({
        porcentajeHerramientaMenor: "0.050000",
        porcentajeIndirecto: "0.150000",
        iva: "0.120000",
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
