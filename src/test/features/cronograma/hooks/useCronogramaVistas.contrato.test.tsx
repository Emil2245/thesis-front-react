import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { ApiError } from "@/api/problem";
import { useCronogramaVistas } from "@/features/cronograma/hooks/useCronogramaVistas";
import { crearQueryClient } from "@/test/render";
import { server } from "@/test/server";
import { cronogramaVistasFixture, CRONOGRAMA_ID } from "@/test/fixtures/cronograma";
import { espiar } from "@/test/espia";

const API = "*/api/v1";

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={crearQueryClient()}>{children}</QueryClientProvider>;
}

describe("useCronogramaVistas — contrato de lectura", () => {
  it("hace una sola GET exacta y conserva los Decimal del servidor", async () => {
    const peticiones = espiar();
    const { result } = renderHook(() => useCronogramaVistas(CRONOGRAMA_ID), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const vistas = result.current.data;
    expect(vistas?.cronogramaId).toBe(CRONOGRAMA_ID);
    expect(vistas?.gantt.capitulos[0].rubros[0].actividad?.segmentos).toEqual([
      { inicio: 2, fin: 2 },
      { inicio: 4, fin: 4 },
    ]);
    expect(vistas?.valorizado.periodos[0].porcentajeParcial).toBe("4.9550");
    expect(vistas?.valorizado.totales.montoTotalGeneral).toBe("18500.000000");
    expect(vistas?.curvaS.puntos[3].montoAcumulado).toBe("18500.000000");

    const lecturas = peticiones.filter(
      (peticion) =>
        peticion.metodo === "GET" && peticion.ruta.endsWith(`/cronogramas/${CRONOGRAMA_ID}/vistas`),
    );
    expect(lecturas).toHaveLength(1);
    expect(peticiones.some((peticion) => ["POST", "PUT", "PATCH"].includes(peticion.metodo))).toBe(
      false,
    );
  });

  it("no hace una petición con un id vacío", () => {
    const peticiones = espiar();
    const { result } = renderHook(() => useCronogramaVistas(""), { wrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(peticiones).toHaveLength(0);
  });

  it("propaga un 400 de validación", async () => {
    server.use(
      http.get(`${API}/cronogramas/:id/vistas`, () =>
        HttpResponse.json({ codigo: "validacion", mensaje: "id inválido" }, { status: 400 }),
      ),
    );
    const { result } = renderHook(() => useCronogramaVistas(CRONOGRAMA_ID), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).status).toBe(400);
  });

  it("convierte el 404 de la proyección en estado sin vistas", async () => {
    const idInexistente = "0198c1a3-0000-7000-8000-000000000099";
    const { result } = renderHook(() => useCronogramaVistas(idInexistente), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it("propaga un 500 en lugar de mostrar estado vacío", async () => {
    server.use(
      http.get(`${API}/cronogramas/:id/vistas`, () =>
        HttpResponse.json({ codigo: "servidor", mensaje: "fallo" }, { status: 500 }),
      ),
    );
    const { result } = renderHook(() => useCronogramaVistas(CRONOGRAMA_ID), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
    expect((result.current.error as ApiError).status).toBe(500);
  });

  it("rechaza la respuesta completa si falta un bloque obligatorio", async () => {
    const { valorizado: _valorizado, ...sinValorizado } = cronogramaVistasFixture;
    server.use(http.get(`${API}/cronogramas/:id/vistas`, () => HttpResponse.json(sinValorizado)));
    const { result } = renderHook(() => useCronogramaVistas(CRONOGRAMA_ID), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).problem.codigo).toBe("respuesta-invalida");
  });
});
