import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import type { ApuManualCompletoRequest } from "@/api/contract";
import { ApiError } from "@/api/problem";
import { qk } from "@/api/queryKeys";
import { asDecimal } from "@/lib/decimal";
import { useCrearApuCompleto } from "@/features/apu-editor/hooks/useApus";
import { useAgregarDesdePlantillas } from "@/features/presupuesto/hooks/useRubroMutaciones";
import { espiar, ultima, cuerpoInvalido } from "@/test/espia";
import {
  apuDetalleFixture,
  PLANTILLA_APU_1,
  PLANTILLA_APU_2,
  PLANTILLA_LOTE_ERROR,
} from "@/test/fixtures/apu";
import { PRESUPUESTO_V2, presupuestoFixture } from "@/test/fixtures/presupuesto";
import { server } from "@/test/server";
const INSUMO_ID = "018f8a20-0000-7000-8000-000000000001";

function crearWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function crearClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

describe("altas atómicas de presupuesto", () => {
  it("preserva el orden, omite capituloId y actualiza el cache tras éxito", async () => {
    const peticiones = espiar();
    const client = crearClient();
    client.setQueryData(qk.presupuesto(PRESUPUESTO_V2), { anterior: true });
    const { result } = renderHook(() => useAgregarDesdePlantillas(PRESUPUESTO_V2), {
      wrapper: crearWrapper(client),
    });

    await result.current.mutateAsync({ plantillaIds: [PLANTILLA_APU_2, PLANTILLA_APU_1] });

    const peticion = ultima(
      peticiones,
      "POST",
      `/presupuestos/${PRESUPUESTO_V2}/rubros/desde-plantillas`,
    );
    await waitFor(() =>
      expect(peticion?.cuerpo).toEqual({ plantillaIds: [PLANTILLA_APU_2, PLANTILLA_APU_1] }),
    );
    expect(client.getQueryData(qk.presupuesto(PRESUPUESTO_V2))).toEqual(presupuestoFixture);
  });

  it("conserva intacto el cache cuando falla el lote", async () => {
    const client = crearClient();
    const anterior = { ...presupuestoFixture, totalGeneral: "123.000000" };
    client.setQueryData(qk.presupuesto(PRESUPUESTO_V2), anterior);
    const { result } = renderHook(() => useAgregarDesdePlantillas(PRESUPUESTO_V2), {
      wrapper: crearWrapper(client),
    });

    await expect(
      result.current.mutateAsync({ plantillaIds: [PLANTILLA_LOTE_ERROR] }),
    ).rejects.toThrow();
    expect(client.getQueryData(qk.presupuesto(PRESUPUESTO_V2))).toEqual(anterior);
  });

  it("rechaza una respuesta de lote no estricta sin tocar el cache", async () => {
    server.use(
      http.post("*/api/v1/presupuestos/:id/rubros/desde-plantillas", () =>
        HttpResponse.json({ presupuesto: presupuestoFixture, resultados: [], extra: true }),
      ),
    );
    const client = crearClient();
    const anterior = { ...presupuestoFixture, totalGeneral: "123.000000" };
    client.setQueryData(qk.presupuesto(PRESUPUESTO_V2), anterior);
    const { result } = renderHook(() => useAgregarDesdePlantillas(PRESUPUESTO_V2), {
      wrapper: crearWrapper(client),
    });

    await expect(
      result.current.mutateAsync({ plantillaIds: [PLANTILLA_APU_1] }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(client.getQueryData(qk.presupuesto(PRESUPUESTO_V2))).toEqual(anterior);
  });

  it("crea el APU completo con el allowlist exacto y actualiza ambos caches", async () => {
    const peticiones = espiar();
    const client = crearClient();
    const { result } = renderHook(() => useCrearApuCompleto(PRESUPUESTO_V2), {
      wrapper: crearWrapper(client),
    });
    const body: ApuManualCompletoRequest = {
      descripcion: "Hormigón manual",
      unidad: "m3",
      porcentajeIndirecto: 0.15,
      detalles: [
        {
          seccionTipo: "MATERIAL",
          insumoId: INSUMO_ID,
          cantidad: asDecimal("1.000000"),
        },
      ],
    };

    const respuesta = await result.current.mutateAsync(body);
    const peticion = ultima(peticiones, "POST", `/presupuestos/${PRESUPUESTO_V2}/apus/completo`);
    await waitFor(() => expect(peticion?.cuerpo).toEqual(body));
    expect(client.getQueryData(qk.apu(respuesta.apu.id))).toEqual(respuesta.apu);
    expect(client.getQueryData(qk.presupuesto(PRESUPUESTO_V2))).toEqual(presupuestoFixture);
  });

  it("rechaza una respuesta manual no estricta sin poblar caches", async () => {
    server.use(
      http.post("*/api/v1/presupuestos/:id/apus/completo", () =>
        HttpResponse.json({
          apu: apuDetalleFixture,
          presupuesto: presupuestoFixture,
          extra: true,
        }),
      ),
    );
    const client = crearClient();
    const { result } = renderHook(() => useCrearApuCompleto(PRESUPUESTO_V2), {
      wrapper: crearWrapper(client),
    });

    await expect(
      result.current.mutateAsync({
        descripcion: "Hormigón manual",
        unidad: "m3",
        detalles: [
          {
            seccionTipo: "MATERIAL",
            insumoId: INSUMO_ID,
            cantidad: asDecimal("1.000000"),
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(client.getQueryData(qk.presupuesto(PRESUPUESTO_V2))).toBeUndefined();
  });

  it("rechaza campos calculados enviados en el alta manual", async () => {
    const client = crearClient();
    const { result } = renderHook(() => useCrearApuCompleto(PRESUPUESTO_V2), {
      wrapper: crearWrapper(client),
    });

    await expect(
      result.current.mutateAsync(
        cuerpoInvalido({
          descripcion: "No válido",
          unidad: "u",
          costoDirecto: "99.000000",
          detalles: [{ seccionTipo: "MATERIAL", insumoId: INSUMO_ID, cantidad: "1.000000" }],
        }),
      ),
    ).rejects.toThrow();
  });
});
