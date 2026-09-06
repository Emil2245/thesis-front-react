import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { crearQueryClient } from "@/test/render";
import { useRenombrarPlantilla } from "@/features/apu-editor/hooks/usePlantillas";
import type { ReactNode } from "react";

const PLANTILLA_ID = "018f8a1e-0000-7000-8000-000000000002";

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={crearQueryClient()}>{children}</QueryClientProvider>;
}

// Plan 054 §3: el request de plantilla declaraba `descripcion`, pero el backend
// espera `descripcionRubro`. Salía 200 con el campo en el suelo. El handler de
// PUT /plantillas-apu/:id rechaza ahora propiedades desconocidas con 400, así
// que el nombre viejo rompe el test en vez de pasar en silencio.
describe("useRenombrarPlantilla", () => {
  it("edita la descripción con el nombre de campo que el backend acepta", async () => {
    const { result } = renderHook(() => useRenombrarPlantilla(), { wrapper });

    await expect(
      result.current.mutateAsync({
        id: PLANTILLA_ID,
        body: { nombre: "Renombrada", descripcionRubro: "Nueva descripción" },
      }),
    ).resolves.toBeDefined();
  });

  it("el seam rechaza `descripcion`, que el backend descartaba en silencio", async () => {
    const { result } = renderHook(() => useRenombrarPlantilla(), { wrapper });

    await expect(
      result.current.mutateAsync({
        id: PLANTILLA_ID,
        body: { nombre: "Renombrada", descripcion: "Nueva descripción" } as never,
      }),
    ).rejects.toThrow();
  });
});
