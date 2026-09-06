import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { crearQueryClient } from "@/test/render";
import { useValidacionExport } from "@/features/exportar/hooks/useExportar";

const PRESUPUESTO_ID = "0198c1a0-0000-7000-8000-000000000011";

function crearWrapper() {
  const client = crearQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

// Plan 059 §4: RubroRefResponse(UUID id, item, codigo, descripcion). El frontend
// leía `rubroId`, que no existe: BannerIntegridad y las listas de defectos
// (P-32 / US-27) pintaban la alerta con la referencia en `undefined`.
describe("useValidacionExport", () => {
  it("los rubros con defecto vienen identificados por `id`", async () => {
    const { result } = renderHook(() => useValidacionExport(PRESUPUESTO_ID), {
      wrapper: crearWrapper(),
    });
    await waitFor(() => expect(result.current.data).toBeDefined());

    const defectos = [
      ...result.current.data!.itemsPuCero,
      ...result.current.data!.itemsCantidadCero,
      ...result.current.data!.itemsSinActividad,
    ];
    expect(defectos.length).toBeGreaterThan(0);
    for (const r of defectos) {
      expect(r.id).toBeDefined();
      expect(Object.keys(r)).toEqual(["id", "item", "codigo", "descripcion"]);
    }
  });
});
