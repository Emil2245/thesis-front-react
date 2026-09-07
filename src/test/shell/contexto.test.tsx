import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

import { crearQueryClient } from "@/test/render";
import { useVersionActiva } from "@/shell/contexto";
import { PRESUPUESTO_V1, PRESUPUESTO_V2 } from "@/test/fixtures/presupuesto";

const PROYECTO = "01927f4e-1a2b-7c3d-8e4f-000000000001";

/**
 * `useVersionActiva` lee el id del proyecto de la ruta y la versión de `?v=`,
 * así que el wrapper tiene que montar una ruta real, no sólo un router.
 */
function wrapperEn(ruta: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    const client = crearQueryClient();
    return (
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[ruta]}>
          <Routes>
            <Route path="/proyectos/:id" element={<>{children}</>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

/** El hook más la URL, para poder afirmar sobre la corrección del `?v=`. */
const useSonda = () => ({ ...useVersionActiva(), busqueda: useLocation().search });

describe("useVersionActiva", () => {
  it("sin ?v= elige la versión vigente", async () => {
    const { result } = renderHook(useSonda, { wrapper: wrapperEn(`/proyectos/${PROYECTO}`) });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.activa?.presupuestoId).toBe(PRESUPUESTO_V2);
    expect(result.current.presupuestoId).toBe(PRESUPUESTO_V2);
    // Sin `?v=` no se toca la URL: el usuario no pidió ninguna versión.
    expect(result.current.busqueda).toBe("");
  });

  it("con ?v= de una versión existente elige ésa, no la vigente", async () => {
    const { result } = renderHook(useSonda, {
      wrapper: wrapperEn(`/proyectos/${PROYECTO}?v=${PRESUPUESTO_V1}`),
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    expect(result.current.activa?.presupuestoId).toBe(PRESUPUESTO_V1);
    expect(result.current.busqueda).toBe(`?v=${PRESUPUESTO_V1}`);
  });

  it("con ?v= de una versión que no existe cae a la vigente y corrige la URL", async () => {
    const FANTASMA = "0198c1a0-0000-7000-8000-0000000000ff";
    const { result } = renderHook(useSonda, {
      wrapper: wrapperEn(`/proyectos/${PROYECTO}?v=${FANTASMA}`),
    });

    await waitFor(() => expect(result.current.busqueda).toBe(`?v=${PRESUPUESTO_V2}`));

    expect(result.current.activa?.presupuestoId).toBe(PRESUPUESTO_V2);
  });

  it("cambiar() reescribe el ?v= sin perder el resto de la query", async () => {
    const { result } = renderHook(useSonda, {
      wrapper: wrapperEn(`/proyectos/${PROYECTO}?tab=resumen`),
    });

    await waitFor(() => expect(result.current.isPending).toBe(false));

    result.current.cambiar(PRESUPUESTO_V1);

    await waitFor(() => expect(result.current.busqueda).toContain(`v=${PRESUPUESTO_V1}`));
    expect(result.current.busqueda).toContain("tab=resumen");
  });
});
