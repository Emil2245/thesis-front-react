import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { crearQueryClient } from "@/test/render";
import { espiar, ultima, cuerpoInvalido } from "@/test/espia";
import { APU_REFERENCIADO } from "@/test/handlers";
import { PRESUPUESTO_V2 } from "@/test/fixtures/presupuesto";
import { apuResumenFixture } from "@/test/fixtures/apu";
import { insumosFixture } from "@/test/fixtures/insumos";
import { ApiError } from "@/api/problem";
import {
  useApus,
  useCrearApu,
  useEliminarApu,
  useDuplicarApu,
} from "@/features/apu-editor/hooks/useApus";
import { useBusquedaParaApu } from "@/features/apu-editor/hooks/useBusquedaParaApu";

const APU_ID = apuResumenFixture[0].id;
const PLANTILLA_ID = "018f8a1e-0000-7000-8000-000000000001";
// El proyecto del selector no necesita fixture propio: solo viaja en la ruta.
const PROYECTO_ID = insumosFixture[0].id;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={crearQueryClient()}>{children}</QueryClientProvider>;
}

// Plan 057 §3: estos tests miran la *petición* que sale, no `isSuccess`. Un
// mock siempre responde bien; lo que se rompe en producción es la ruta, el
// verbo o el nombre del parámetro.
describe("contrato de useApus", () => {
  it("lista los APU del presupuesto y manda `filtros` como query params", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useApus(PRESUPUESTO_V2, { q: "exca" }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const p = ultima(peticiones, "GET", `/presupuestos/${PRESUPUESTO_V2}/apus`);
    expect(p).toBeDefined();
    expect(p?.url.searchParams.get("q")).toBe("exca");
  });

  it("no dispara nada con presupuestoId vacío (guard `enabled`)", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useApus(""), { wrapper });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(peticiones).toHaveLength(0);
  });

  it("crea con POST /presupuestos/{id}/apus y el cuerpo exacto del backend", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useCrearApu(PRESUPUESTO_V2), { wrapper });
    await result.current.mutateAsync({
      codigo: "APU-010",
      descripcion: "Encofrado",
      unidad: "m2",
      plantillaId: PLANTILLA_ID,
    });

    const p = ultima(peticiones, "POST", `/presupuestos/${PRESUPUESTO_V2}/apus`);
    await waitFor(() =>
      expect(p?.cuerpo).toEqual({
        codigo: "APU-010",
        descripcion: "Encofrado",
        unidad: "m2",
        plantillaId: PLANTILLA_ID,
      }),
    );
  });

  it("el seam rechaza un campo que el backend no acepta al crear", async () => {
    const { result } = renderHook(() => useCrearApu(PRESUPUESTO_V2), { wrapper });

    await expect(
      result.current.mutateAsync(
        cuerpoInvalido({
          codigo: "APU-010",
          descripcion: "Encofrado",
          unidad: "m2",
          plantilla: PLANTILLA_ID,
        }),
      ),
    ).rejects.toThrow();
  });

  it("borra en DELETE /apus/{apuId}, fuera del árbol de presupuesto", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useEliminarApu(PRESUPUESTO_V2), { wrapper });
    await result.current.mutateAsync(APU_ID);

    const p = ultima(peticiones, "DELETE", `/apus/${APU_ID}`);
    expect(p?.ruta).toBe(`/api/v1/apus/${APU_ID}`);
    expect(p?.ruta).not.toContain("/presupuestos/");
  });

  it("propaga el 409 `apu-referenciado` al llamador", async () => {
    const { result } = renderHook(() => useEliminarApu(PRESUPUESTO_V2), { wrapper });

    const error = await result.current.mutateAsync(APU_REFERENCIADO).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(409);
    expect((error as ApiError).is("apu-referenciado")).toBe(true);
  });

  it("duplica con POST /apus/{apuId}/duplicar y sin cuerpo", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useDuplicarApu(PRESUPUESTO_V2), { wrapper });
    await result.current.mutateAsync(APU_ID);

    const p = ultima(peticiones, "POST", `/apus/${APU_ID}/duplicar`);
    expect(p).toBeDefined();
    expect(p?.cuerpo).toBeUndefined();
  });
});

// Los nombres de estos params son el seam entero: el backend filtra por `q` y
// `soloCentrales`, y el hook los compone a partir de `fuente`.
describe("contrato de useBusquedaParaApu", () => {
  it("con fuente CENTRAL manda soloCentrales=true junto a q", async () => {
    const peticiones = espiar();

    const { result } = renderHook(
      () => useBusquedaParaApu({ proyectoId: PROYECTO_ID, fuente: "CENTRAL", q: "cemento" }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const p = ultima(peticiones, "GET", `/proyectos/${PROYECTO_ID}/insumos/selector`);
    expect(p?.url.searchParams.get("soloCentrales")).toBe("true");
    expect(p?.url.searchParams.get("q")).toBe("cemento");
  });

  it("con fuente LOCAL no manda soloCentrales", async () => {
    const peticiones = espiar();

    const { result } = renderHook(
      () => useBusquedaParaApu({ proyectoId: PROYECTO_ID, fuente: "LOCAL", q: "cemento" }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const p = ultima(peticiones, "GET", `/proyectos/${PROYECTO_ID}/insumos/selector`);
    expect(p?.url.searchParams.has("soloCentrales")).toBe(false);
  });

  it("sin q no manda el parámetro vacío", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useBusquedaParaApu({ proyectoId: PROYECTO_ID }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const p = ultima(peticiones, "GET", `/proyectos/${PROYECTO_ID}/insumos/selector`);
    expect(p?.url.search).toBe("");
  });

  it("no dispara nada con proyectoId vacío (guard `enabled`)", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useBusquedaParaApu({ proyectoId: "" }), { wrapper });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(peticiones).toHaveLength(0);
  });
});
