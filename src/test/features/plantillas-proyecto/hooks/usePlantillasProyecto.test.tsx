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
import { PROYECTO_DESDE_PLANTILLA } from "@/test/handlers";

const PLANTILLA_ID = "018f8a60-0000-7000-8000-000000000001";

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={crearQueryClient()}>{children}</QueryClientProvider>;
}

// Se afirma la petición que sale, no `isSuccess`: la respuesta del mock está
// bien por construcción y no puede delatar una ruta o un campo equivocados.
describe("usePlantillasProyecto", () => {
  it("lista las plantillas con GET /plantillas-proyecto", async () => {
    const peticiones = espiar();
    const { result } = renderHook(() => usePlantillasProyecto(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(ultima(peticiones, "GET", "/plantillas-proyecto")).toBeDefined();
  });

  // El proyecto va en la ruta (PlantillaProyectoGuardarResource), no en el cuerpo.
  it("guarda la plantilla con POST /proyectos/{id}/guardar-plantilla", async () => {
    const peticiones = espiar();
    const { result } = renderHook(() => useGuardarPlantillaProyecto(PROYECTO_1), { wrapper });
    const body = { nombre: "Base vial", descripcion: "Estructura estándar" };

    await result.current.mutateAsync(body);

    const p = ultima(peticiones, "POST", `/proyectos/${PROYECTO_1}/guardar-plantilla`);
    await waitFor(() => expect(p?.cuerpo).toEqual(body));
  });

  it("el seam rechaza un campo que el backend de plantillas no acepta", async () => {
    const { result } = renderHook(() => useGuardarPlantillaProyecto(PROYECTO_1), { wrapper });

    await expect(
      result.current.mutateAsync({
        nombre: "Base vial",
        proyectoId: PROYECTO_1,
      } as never),
    ).rejects.toThrow();
  });

  it("useCrearDesdePlantilla lleva el plantillaId en la ruta y devuelve el envoltorio", async () => {
    const peticiones = espiar();
    const { result } = renderHook(() => useCrearDesdePlantilla(), { wrapper });

    const salida = await result.current.mutateAsync({
      plantillaId: PLANTILLA_ID,
      body: { nombre: "Proyecto nuevo" },
    });

    expect(salida.proyecto.id).toBe(PROYECTO_DESDE_PLANTILLA);

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
