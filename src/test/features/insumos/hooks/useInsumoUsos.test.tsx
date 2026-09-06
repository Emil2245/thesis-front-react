import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { crearQueryClient } from "@/test/render";
import { useInsumoUsos } from "@/features/insumos/hooks/useInsumoUsos";

const PROYECTO_ID = "0198c1a0-0000-7000-8000-000000000001";
const INSUMO_ID = "018f8a20-0000-7000-8000-000000000010";

function crearWrapper() {
  const client = crearQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

// Plan 059 §3: InsumoUsoResponse de main es {apuId, codigo, descripcion, bloque,
// override} y la ruta es `/usos` en plural. El frontend pedía `/uso` y leía
// {apuCodigo, apuDescripcion, detalleId, cantidad}: ni la ruta ni la forma
// existen en el backend.
describe("useInsumoUsos", () => {
  it("pide la ruta en plural /usos", async () => {
    const { result } = renderHook(() => useInsumoUsos(PROYECTO_ID, INSUMO_ID), {
      wrapper: crearWrapper(),
    });
    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.data).toBeDefined();
  });

  it("devuelve la forma de main: codigo, descripcion, bloque y override", async () => {
    const { result } = renderHook(() => useInsumoUsos(PROYECTO_ID, INSUMO_ID), {
      wrapper: crearWrapper(),
    });
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data![0]).toEqual({
      apuId: "018f8a40-0000-7000-8000-000000000001",
      codigo: "APU-001",
      descripcion: "Excavación a máquina",
      bloque: "M",
      override: true,
    });
  });
});
