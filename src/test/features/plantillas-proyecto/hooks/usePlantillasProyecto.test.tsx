import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { crearQueryClient } from "@/test/render";
import { espiar, ultima } from "@/test/espia";
import {
  usePlantillasProyecto,
  useGuardarPlantillaProyecto,
  useCrearDesdePlantilla,
  useEliminarPlantillaProyecto,
} from "@/features/plantillas-proyecto/hooks/usePlantillasProyecto";
import { PROYECTO_1 } from "@/test/fixtures/proyectos";

const PLANTILLA_ID = "018f8a60-0000-7000-8000-000000000001";

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={crearQueryClient()}>{children}</QueryClientProvider>;
}

// El módulo está tapado por `<ModuloNoDisponible>` (plan 049), así que el hook
// se prueba directo. Se afirma la petición que sale, no `isSuccess`.
describe("usePlantillasProyecto", () => {
  it("lista las plantillas con GET /plantillas-proyecto", async () => {
    const peticiones = espiar();
    const { result } = renderHook(() => usePlantillasProyecto(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(ultima(peticiones, "GET", "/plantillas-proyecto")).toBeDefined();
  });

  // ponytail: la ruta de guardado es hoy `POST /plantillas-proyecto`, pero el
  // handoff dice que el backend la expone en `POST /proyectos/{id}/guardar-plantilla`.
  // Este test fija la ruta de hoy a propósito: cuando el plan 049 la mueva, se
  // pone en rojo y avisa. El arreglo es del 049, no de aquí.
  it("guarda la plantilla con el cuerpo y la ruta de hoy", async () => {
    const peticiones = espiar();
    const { result } = renderHook(() => useGuardarPlantillaProyecto(), { wrapper });
    const body = {
      nombre: "Base vial",
      descripcion: "Estructura estándar",
      proyectoId: PROYECTO_1,
    };

    await result.current.mutateAsync(body);

    const p = ultima(peticiones, "POST", "/plantillas-proyecto");
    await waitFor(() => expect(p?.cuerpo).toEqual(body));
  });

  it("el seam rechaza un campo que el backend de plantillas no acepta", async () => {
    const { result } = renderHook(() => useGuardarPlantillaProyecto(), { wrapper });

    await expect(
      result.current.mutateAsync({
        nombre: "Base vial",
        proyectoId: PROYECTO_1,
        snapshotEstructura: {},
      } as never),
    ).rejects.toThrow();
  });

  it("useCrearDesdePlantilla lleva el plantillaId en la ruta y solo `nombre` en el cuerpo", async () => {
    const peticiones = espiar();
    const { result } = renderHook(() => useCrearDesdePlantilla(), { wrapper });

    await result.current.mutateAsync({
      plantillaId: PLANTILLA_ID,
      body: { nombre: "Proyecto nuevo" },
    });

    const p = ultima(peticiones, "POST", `/proyectos/desde-plantilla/${PLANTILLA_ID}`);
    await waitFor(() => expect(p?.cuerpo).toEqual({ nombre: "Proyecto nuevo" }));
  });

  it("useEliminarPlantillaProyecto hace DELETE /plantillas-proyecto/{id}", async () => {
    const peticiones = espiar();
    const { result } = renderHook(() => useEliminarPlantillaProyecto(), { wrapper });

    await result.current.mutateAsync(PLANTILLA_ID);

    expect(ultima(peticiones, "DELETE", `/plantillas-proyecto/${PLANTILLA_ID}`)).toBeDefined();
  });
});
