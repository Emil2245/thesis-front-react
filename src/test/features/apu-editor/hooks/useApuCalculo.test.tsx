import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { crearQueryClient } from "@/test/render";
import { useApuCalculo } from "@/features/apu-editor/hooks/useApuCalculo";

const APU_ID = "018f8a40-0000-7000-8000-000000000001";

function crearWrapper() {
  const client = crearQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

// Plan 059 §1: ApuCalculoResponse del backend es
// {apuId, codigo, parametros, secciones[{tipo, subtotal, operacion, resultado,
// lineas[]}], resumen{cd, ci, ct}}. El frontend leía {formulas, subtotales, cd,
// cdAjustado, ci, ct}, un objeto que main no produce: el desglose (P-27) salía
// vacío sin que nada fallara.
describe("useApuCalculo", () => {
  it("devuelve el resumen {cd, ci, ct} del backend", async () => {
    const { result } = renderHook(() => useApuCalculo(APU_ID), { wrapper: crearWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data!.resumen).toEqual({ cd: 800, ci: 120, ct: 920 });
  });

  it("cada sección trae su `operacion` en texto ya compuesta por el backend", async () => {
    const { result } = renderHook(() => useApuCalculo(APU_ID), { wrapper: crearWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    const equipo = result.current.data!.secciones.find((s) => s.tipo === "EQUIPO");
    expect(equipo).toBeDefined();
    expect(equipo!.operacion).toBe("400.000000");
  });

  it("cada línea trae su `operacion`, el desglose no la compone a mano", async () => {
    const { result } = renderHook(() => useApuCalculo(APU_ID), { wrapper: crearWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    const linea = result.current.data!.secciones.flatMap((s) => s.lineas)[0];
    expect(linea.operacion).toBe("1.000000 × 45.000000 × 0.050000");
  });

  it("los parámetros efectivos traen hm y el %CI aplicado", async () => {
    const { result } = renderHook(() => useApuCalculo(APU_ID), { wrapper: crearWrapper() });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data!.parametros.ciAplicado).toBe(0.15);
  });
});
