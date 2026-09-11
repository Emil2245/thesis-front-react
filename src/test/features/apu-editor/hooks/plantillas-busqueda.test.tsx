import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { ApiError } from "@/api/problem";
import {
  useBusquedaPlantillas,
  usePlantillaDetalle,
  usePlantillas,
} from "@/features/apu-editor/hooks/usePlantillas";
import { espiar, ultima } from "@/test/espia";
import { PLANTILLA_APU_1 } from "@/test/fixtures/apu";
import { crearQueryClient } from "@/test/render";
import { server } from "@/test/server";

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={crearQueryClient()}>{children}</QueryClientProvider>;
}

describe("búsqueda paginada de plantillas", () => {
  it("preserva el listado legacy como arreglo en GET /plantillas-apu", async () => {
    const peticiones = espiar();
    const { result } = renderHook(() => usePlantillas(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(ultima(peticiones, "GET", "/plantillas-apu")?.url.pathname).not.toContain("/busqueda");
  });

  it("envía tipos repetidos y la primera página por defecto", async () => {
    const peticiones = espiar();
    const { result } = renderHook(() => useBusquedaPlantillas({ tipos: ["SISTEMA", "PERSONAL"] }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const peticion = ultima(peticiones, "GET", "/plantillas-apu/busqueda");
    expect(peticion?.url.searchParams.getAll("tipo")).toEqual(["SISTEMA", "PERSONAL"]);
    expect(peticion?.url.searchParams.get("page")).toBe("0");
    expect(peticion?.url.searchParams.get("size")).toBe("20");
    expect(result.current.data?.contenido).toHaveLength(1);
  });

  it("cambia la key y la petición al cambiar fuentes", async () => {
    const peticiones = espiar();
    const { result, rerender } = renderHook(
      ({ tipos }: { tipos: Array<"SISTEMA" | "PERSONAL"> }) => useBusquedaPlantillas({ tipos }),
      { initialProps: { tipos: ["SISTEMA", "PERSONAL"] }, wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    rerender({ tipos: ["PERSONAL"] });
    await waitFor(() => expect(peticiones).toHaveLength(2));
    expect(
      ultima(peticiones, "GET", "/plantillas-apu/busqueda")?.url.searchParams.getAll("tipo"),
    ).toEqual(["PERSONAL"]);
  });

  it("queda deshabilitada con cero fuentes", async () => {
    const peticiones = espiar();
    const { result } = renderHook(() => useBusquedaPlantillas({ tipos: [] }), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(peticiones).toEqual([]);
  });

  it("rechaza una página con forma ajena como respuesta-invalida", async () => {
    server.use(
      http.get("*/api/v1/plantillas-apu/busqueda", () =>
        HttpResponse.json({ items: [], total: 0, page: 0, size: 20, totalPaginas: 0, extra: true }),
      ),
    );
    const { result } = renderHook(() => useBusquedaPlantillas({ tipos: ["SISTEMA"] }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    const error = result.current.error;
    expect(error).toBeInstanceOf(ApiError);
    if (!(error instanceof ApiError)) throw error;
    expect(error.problem.codigo).toBe("respuesta-invalida");
  });

  it("valida y limpia campos legacy extra del snapshot de detalle", async () => {
    const { result } = renderHook(() => usePlantillaDetalle(PLANTILLA_APU_1), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.snapshotSecciones.secciones[0]?.lineas[0]).toEqual({
      insumoCodigo: "MAT-001",
      cantidad: "1.000000",
    });
  });
});
