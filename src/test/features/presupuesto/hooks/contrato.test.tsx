import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";

import { crearQueryClient } from "@/test/render";
import { espiar, ultima, type Peticion } from "@/test/espia";
import {
  usePresupuesto,
  useResumen,
  useValidacion,
  useVersiones,
  useComparacion,
} from "@/features/presupuesto/hooks/usePresupuesto";
import { useCapituloMutaciones } from "@/features/presupuesto/hooks/useCapituloMutaciones";
import { useRubroMutaciones } from "@/features/presupuesto/hooks/useRubroMutaciones";
import { useVersionMutaciones } from "@/features/presupuesto/hooks/useVersionMutaciones";
import {
  PRESUPUESTO_V1,
  PRESUPUESTO_V2,
  CAPITULO_1,
  CAPITULO_1_1,
  RUBRO_1_1_1,
} from "@/test/fixtures/presupuesto";

const PROYECTO = "0198c1a3-0000-7000-8000-000000000001";
const APU = "018f8a40-0000-7000-8000-000000000001";

function wrapper({ children }: { children: ReactNode }) {
  const client = crearQueryClient();
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

/** La petición que casa, esperando a que el cuerpo se haya rellenado. */
async function esperarPeticion(peticiones: Peticion[], metodo: string, ruta: string | RegExp) {
  let encontrada: Peticion | undefined;
  await waitFor(() => {
    encontrada = ultima(peticiones, metodo, ruta);
    expect(encontrada).toBeDefined();
  });
  return encontrada!;
}

// El mock siempre responde bien, así que afirmar sobre `isSuccess` no ve
// ninguno de los defectos reales del seam (ruta mal armada, método cambiado,
// campo renombrado, id que se cuela en el cuerpo). Aquí se afirma sobre la
// *petición saliente*.
describe("contrato saliente de presupuesto", () => {
  describe("queries", () => {
    it("usePresupuesto pide GET /presupuestos/{id}", async () => {
      const peticiones = espiar();
      renderHook(() => usePresupuesto(PRESUPUESTO_V2), { wrapper });
      const p = await esperarPeticion(peticiones, "GET", `/presupuestos/${PRESUPUESTO_V2}`);
      expect(p.ruta).toMatch(new RegExp(`/presupuestos/${PRESUPUESTO_V2}$`));
    });

    it("useResumen pide GET /presupuestos/{id}/resumen", async () => {
      const peticiones = espiar();
      renderHook(() => useResumen(PRESUPUESTO_V2), { wrapper });
      await esperarPeticion(peticiones, "GET", `/presupuestos/${PRESUPUESTO_V2}/resumen`);
    });

    it("useValidacion pide GET /presupuestos/{id}/validacion", async () => {
      const peticiones = espiar();
      renderHook(() => useValidacion(PRESUPUESTO_V2), { wrapper });
      await esperarPeticion(peticiones, "GET", `/presupuestos/${PRESUPUESTO_V2}/validacion`);
    });

    // El endpoint devuelve un array pelado, no una página: si alguien mete
    // `?page=0` o espera `{ contenido }`, esto se cae.
    it("useVersiones pide GET /proyectos/{id}/presupuestos y recibe un array", async () => {
      const peticiones = espiar();
      const { result } = renderHook(() => useVersiones(PROYECTO), { wrapper });
      const p = await esperarPeticion(peticiones, "GET", `/proyectos/${PROYECTO}/presupuestos`);
      expect([...p.url.searchParams.keys()]).toEqual([]);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(Array.isArray(result.current.data)).toBe(true);
    });

    // La otra versión viaja como query param `con=`, no como segundo segmento
    // de ruta ni como cuerpo.
    it("useComparacion pide GET /presupuestos/{id}/comparar?con={otro}", async () => {
      const peticiones = espiar();
      renderHook(() => useComparacion(PRESUPUESTO_V2, PRESUPUESTO_V1), { wrapper });
      const p = await esperarPeticion(
        peticiones,
        "GET",
        `/presupuestos/${PRESUPUESTO_V2}/comparar`,
      );
      expect(p.url.searchParams.get("con")).toBe(PRESUPUESTO_V1);
    });

    // Un guard numérico heredado del tipado `number` (`id > 0`) dejaría estas
    // queries apagadas con un UUID; los tests de arriba prueban que disparan.
    // Este prueba lo contrario: con id vacío no sale nada.
    it("las queries quedan apagadas con id vacío", async () => {
      const peticiones = espiar();
      const { result } = renderHook(
        () => ({
          presupuesto: usePresupuesto(""),
          resumen: useResumen(""),
          validacion: useValidacion(""),
          versiones: useVersiones(""),
          comparacion: useComparacion(PRESUPUESTO_V2, undefined),
        }),
        { wrapper },
      );
      expect(result.current.presupuesto.fetchStatus).toBe("idle");
      expect(result.current.comparacion.fetchStatus).toBe("idle");
      await new Promise((r) => setTimeout(r, 20));
      expect(peticiones).toEqual([]);
    });
  });

  describe("mutaciones de capítulo", () => {
    it("crear manda POST /presupuestos/{pid}/capitulos con solo la descripción", async () => {
      const peticiones = espiar();
      const { result } = renderHook(() => useCapituloMutaciones(PRESUPUESTO_V2), { wrapper });
      result.current.crear.mutate({ descripcion: "Obra civil" });
      const p = await esperarPeticion(
        peticiones,
        "POST",
        `/presupuestos/${PRESUPUESTO_V2}/capitulos`,
      );
      await waitFor(() => expect(p.cuerpo).toEqual({ descripcion: "Obra civil" }));
    });

    it("editar manda PUT /capitulos/{id} con solo la descripción", async () => {
      const peticiones = espiar();
      const { result } = renderHook(() => useCapituloMutaciones(PRESUPUESTO_V2), { wrapper });
      result.current.editar.mutate({ capituloId: CAPITULO_1, descripcion: "Preliminares" });
      const p = await esperarPeticion(
        peticiones,
        "PUT",
        `/presupuestos/${PRESUPUESTO_V2}/capitulos/${CAPITULO_1}`,
      );
      await waitFor(() => expect(p.cuerpo).toEqual({ descripcion: "Preliminares" }));
    });

    it("mover manda PATCH /capitulos/{id}/mover con parentId y orden", async () => {
      const peticiones = espiar();
      const { result } = renderHook(() => useCapituloMutaciones(PRESUPUESTO_V2), { wrapper });
      result.current.mover.mutate({
        capituloId: CAPITULO_1_1,
        body: { parentId: CAPITULO_1, orden: 2 },
      });
      const p = await esperarPeticion(
        peticiones,
        "PATCH",
        `/presupuestos/${PRESUPUESTO_V2}/capitulos/${CAPITULO_1_1}/mover`,
      );
      await waitFor(() => expect(p.cuerpo).toEqual({ parentId: CAPITULO_1, orden: 2 }));
    });

    it("eliminar manda DELETE /capitulos/{id}", async () => {
      const peticiones = espiar();
      const { result } = renderHook(() => useCapituloMutaciones(PRESUPUESTO_V2), { wrapper });
      result.current.eliminar.mutate(CAPITULO_1);
      await esperarPeticion(
        peticiones,
        "DELETE",
        `/presupuestos/${PRESUPUESTO_V2}/capitulos/${CAPITULO_1}`,
      );
    });

    // El handler rechaza campos que el backend no acepta; sin esto, un campo
    // de más (o mal nombrado) se descartaba en silencio con un 200 de vuelta.
    it("un campo desconocido en el cuerpo lo rechaza el backend con 400", async () => {
      const { result } = renderHook(() => useCapituloMutaciones(PRESUPUESTO_V2), { wrapper });
      result.current.crear.mutate({ descripcion: "Obra civil", nombre: "Obra civil" } as never);
      await waitFor(() => expect(result.current.crear.isError).toBe(true));
    });
  });

  describe("mutaciones de rubro", () => {
    // `capituloId` es segmento de ruta: si se cuela en el cuerpo, el handler
    // estricto devuelve 400 y este test se cae.
    it("agregar manda POST /capitulos/{cid}/rubros con solo apuId y cantidad", async () => {
      const peticiones = espiar();
      const { result } = renderHook(() => useRubroMutaciones(PRESUPUESTO_V2), { wrapper });
      result.current.agregar.mutate({ capituloId: CAPITULO_1_1, apuId: APU, cantidad: "5.000000" });
      const p = await esperarPeticion(
        peticiones,
        "POST",
        `/presupuestos/${PRESUPUESTO_V2}/capitulos/${CAPITULO_1_1}/rubros`,
      );
      await waitFor(() => expect(p.cuerpo).toEqual({ apuId: APU, cantidad: "5.000000" }));
    });

    it("actualizarCantidad manda PATCH /rubros/{id} con solo la cantidad", async () => {
      const peticiones = espiar();
      const { result } = renderHook(() => useRubroMutaciones(PRESUPUESTO_V2), { wrapper });
      result.current.actualizarCantidad.mutate({
        capituloId: CAPITULO_1_1,
        rubroId: RUBRO_1_1_1,
        cantidad: "7.000000",
      });
      const p = await esperarPeticion(
        peticiones,
        "PATCH",
        `/presupuestos/${PRESUPUESTO_V2}/capitulos/${CAPITULO_1_1}/rubros/${RUBRO_1_1_1}`,
      );
      await waitFor(() => expect(p.cuerpo).toEqual({ cantidad: "7.000000" }));
    });

    it("eliminar manda DELETE /rubros/{id}", async () => {
      const peticiones = espiar();
      const { result } = renderHook(() => useRubroMutaciones(PRESUPUESTO_V2), { wrapper });
      result.current.eliminar.mutate({ capituloId: CAPITULO_1_1, rubroId: RUBRO_1_1_1 });
      await esperarPeticion(
        peticiones,
        "DELETE",
        `/presupuestos/${PRESUPUESTO_V2}/capitulos/${CAPITULO_1_1}/rubros/${RUBRO_1_1_1}`,
      );
    });
  });

  describe("mutaciones de versión", () => {
    it("crear manda POST /proyectos/{id}/presupuestos con origenId y notas", async () => {
      const peticiones = espiar();
      const { result } = renderHook(() => useVersionMutaciones(PROYECTO), { wrapper });
      result.current.crear.mutate({ origenId: PRESUPUESTO_V2, notas: "Ajuste de precios" });
      const p = await esperarPeticion(peticiones, "POST", `/proyectos/${PROYECTO}/presupuestos`);
      await waitFor(() =>
        expect(p.cuerpo).toEqual({ origenId: PRESUPUESTO_V2, notas: "Ajuste de precios" }),
      );
    });

    // La ruta cuelga del presupuesto, no del proyecto, y no lleva cuerpo.
    it("marcarVigente manda POST /presupuestos/{id}/vigente sin cuerpo", async () => {
      const peticiones = espiar();
      const { result } = renderHook(() => useVersionMutaciones(PROYECTO), { wrapper });
      result.current.marcarVigente.mutate(PRESUPUESTO_V1);
      const p = await esperarPeticion(
        peticiones,
        "POST",
        `/presupuestos/${PRESUPUESTO_V1}/vigente`,
      );
      await waitFor(() => expect(result.current.marcarVigente.isSuccess).toBe(true));
      expect(p.cuerpo).toBeUndefined();
    });

    it("eliminar manda DELETE /presupuestos/{id}", async () => {
      const peticiones = espiar();
      const { result } = renderHook(() => useVersionMutaciones(PROYECTO), { wrapper });
      result.current.eliminar.mutate(PRESUPUESTO_V1);
      await esperarPeticion(peticiones, "DELETE", `/presupuestos/${PRESUPUESTO_V1}`);
      await waitFor(() => expect(result.current.eliminar.isSuccess).toBe(true));
    });

    it("eliminar la versión vigente falla con 409 version-vigente-protegida", async () => {
      const { result } = renderHook(() => useVersionMutaciones(PROYECTO), { wrapper });
      result.current.eliminar.mutate(PRESUPUESTO_V2);
      await waitFor(() => expect(result.current.eliminar.isError).toBe(true));
      expect(result.current.eliminar.error).toMatchObject({
        status: 409,
        problem: { codigo: "version-vigente-protegida" },
      });
    });
  });
});
