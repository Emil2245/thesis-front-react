import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { crearQueryClient } from "@/test/render";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { useApuEditor } from "@/features/apu-editor/hooks/useApuEditor";
import { apuDetalleFixture, apuConHmFixture } from "@/test/fixtures/apu";
import { qk } from "@/api/queryKeys";
import { server } from "@/test/server";
import { http, HttpResponse } from "msw";
import type { ApuResponse } from "@/api/contract";

const API = "*/api/v1";
const APU_ID = "018f8a40-0000-7000-8000-000000000001";
const PRESUPUESTO_ID = "0198c1a0-0000-7000-8000-000000000011";
const INSUMO_ID = "018f8a20-0000-7000-8000-000000000010";

function crearConHmEnCache() {
  const client = crearQueryClient();
  client.setQueryData(qk.apu(APU_ID), apuConHmFixture);
  client.setQueryData(qk.presupuesto(PRESUPUESTO_ID), { data: true });
  client.setQueryData(qk.cronograma(PRESUPUESTO_ID), { data: true });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return { client, wrapper };
}

function crearConFixture(data?: ApuResponse) {
  const client = crearQueryClient();
  client.setQueryData(qk.apu(APU_ID), data ?? apuDetalleFixture);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return { client, wrapper };
}

describe("useApuEditor", () => {
  it("sections always come back in M, N, O, P order regardless of server array order", () => {
    const { wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });
    const bloques = result.current.secciones.map((s) => s.bloque);
    expect(bloques).toEqual(["M", "N", "O", "P"]);
  });

  it("HM row is protegida: true, others are not", () => {
    const { wrapper } = crearConHmEnCache();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });
    const filasM = result.current.secciones[0].filas;
    const hm = filasM.find((f) => f.detalle.esHerramientaMenor);
    expect(hm).toBeDefined();
    expect(hm!.protegida).toBe(true);
    const noHm = filasM.find((f) => !f.detalle.esHerramientaMenor);
    expect(noHm!.protegida).toBe(false);
  });

  it("row with precioHeredado: true is heredado: true", () => {
    const { wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });
    const fila = result.current.secciones[0].filas[0];
    expect(fila.heredado).toBe(true);
  });

  it("editarCelda with 'abc' performs no request and marks cell error", async () => {
    let requestMade = false;
    server.use(
      http.patch(`${API}/apus/:id/detalles/:did`, () => {
        requestMade = true;
        return HttpResponse.json(apuDetalleFixture);
      }),
    );
    const { wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });

    const detalleId = apuDetalleFixture.secciones[0].detalles[0].id;
    await act(async () => {
      await result.current.editarCelda(detalleId, "cantidad", "abc");
    });
    expect(requestMade).toBe(false);
  });

  it("editarCelda with '0' on cantidad performs no request (>0 rule)", async () => {
    let requestMade = false;
    server.use(
      http.patch(`${API}/apus/:id/detalles/:did`, () => {
        requestMade = true;
        return HttpResponse.json(apuDetalleFixture);
      }),
    );
    const { wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });

    const detalleId = apuDetalleFixture.secciones[0].detalles[0].id;
    await act(async () => {
      await result.current.editarCelda(detalleId, "cantidad", "0");
    });
    expect(requestMade).toBe(false);
  });

  it("editarCelda with valid value updates the cache with server response", async () => {
    server.use(
      http.patch(`${API}/apus/:id/detalles/:did`, () => HttpResponse.json(apuDetalleFixture)),
    );
    const { client, wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });

    const detalleId = apuDetalleFixture.secciones[0].detalles[0].id;
    await act(async () => {
      await result.current.editarCelda(detalleId, "cantidad", "2.5");
    });

    const cached = client.getQueryData<ApuResponse>(qk.apu(APU_ID));
    expect(cached).toBeDefined();
    const detalle = cached!.secciones.flatMap((s) => s.detalles).find((d) => d.id === detalleId);
    expect(detalle).toBeDefined();
  });

  it("restaurarHerencia sends body with precioOverride present and null", async () => {
    let sentBody: unknown = null;
    server.use(
      http.patch(`${API}/apus/:id/detalles/:did`, async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json(apuDetalleFixture);
      }),
    );
    const { wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });

    const detalleId = apuDetalleFixture.secciones[0].detalles[0].id;
    await act(async () => {
      await result.current.restaurarHerencia(detalleId);
    });

    expect(sentBody).toEqual({ precioOverride: null });
  });

  // Plan 054 §2: ApuPatchRequest del backend es (codigo, descripcion, unidad).
  // porcentajeIndirecto iba dentro de ese body y Jackson lo descartaba en
  // silencio; su endpoint real recibe un BigDecimal crudo, no un objeto.
  it("editarPorcentajeCi manda el decimal crudo a PATCH /apus/:id/porcentaje-indirecto", async () => {
    let cuerpo = "sin-peticion";
    server.use(
      http.patch(`${API}/apus/:id/porcentaje-indirecto`, async ({ request }) => {
        cuerpo = await request.text();
        return HttpResponse.json(apuDetalleFixture);
      }),
    );
    const { wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });

    await act(async () => {
      await result.current.editarPorcentajeCi("0.20");
    });

    expect(cuerpo).toBe("0.20");
  });

  // El cuerpo es un escalar JSON pelado, no un objeto: axios sólo pone
  // `Content-Type: application/json` solo cuando el cuerpo es un objeto plano,
  // así que este endpoint tiene que pedirlo a mano. Sin la cabecera, axios no
  // serializa el `null` y manda un cuerpo vacío — el backend no llega a saber
  // que hay que volver a heredar (plan 062 §1).
  it("editarPorcentajeCi(null) manda null crudo para volver a heredar del proyecto", async () => {
    let cuerpo = "sin-peticion";
    let contentType = "";
    server.use(
      http.patch(`${API}/apus/:id/porcentaje-indirecto`, async ({ request }) => {
        cuerpo = await request.text();
        contentType = request.headers.get("content-type") ?? "";
        return HttpResponse.json(apuDetalleFixture);
      }),
    );
    const { wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });

    await act(async () => {
      await result.current.editarPorcentajeCi(null);
    });

    expect(cuerpo).toBe("null");
    expect(contentType).toContain("application/json");
  });

  // Plan 059 §2: ApuDetalleCrearRequest(seccionTipo, insumoId, cantidad, rendimiento)
  // con seccionTipo/insumoId/cantidad @NotNull. El hook mandaba sólo {insumoId},
  // así que añadir una línea a un APU devolvía 400 en la pantalla núcleo (S-22).
  it("agregarFila manda seccionTipo y cantidad además del insumoId", async () => {
    let cuerpo: unknown = null;
    server.use(
      http.post(`${API}/apus/:id/detalles`, async ({ request }) => {
        cuerpo = await request.json();
        return HttpResponse.json(apuDetalleFixture, { status: 201 });
      }),
    );
    const { wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });

    await act(async () => {
      await result.current.agregarFila({ seccionTipo: "MATERIAL", insumoId: INSUMO_ID });
    });

    expect(cuerpo).toEqual({ seccionTipo: "MATERIAL", insumoId: INSUMO_ID, cantidad: "1" });
  });

  // Contra el handler por defecto, que exige seccionTipo/insumoId/cantidad y
  // rechaza cualquier campo de más: añadir una línea tiene que salir bien.
  it("agregarFila funciona contra el handler estricto", async () => {
    const { client, wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });

    await act(async () => {
      await result.current.agregarFila({ seccionTipo: "MATERIAL", insumoId: INSUMO_ID });
    });

    expect(result.current.error).toBeNull();
    expect(client.getQueryData<ApuResponse>(qk.apu(APU_ID))).toEqual(apuConHmFixture);
  });

  // `rendimiento` es @DecimalMin("0.000001"): mandar 0 es un 400. Se omite.
  it("agregarFila no manda rendimiento para MATERIAL/TRANSPORTE", async () => {
    let cuerpo: Record<string, unknown> = {};
    server.use(
      http.post(`${API}/apus/:id/detalles`, async ({ request }) => {
        cuerpo = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(apuDetalleFixture, { status: 201 });
      }),
    );
    const { wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });

    await act(async () => {
      await result.current.agregarFila({ seccionTipo: "MATERIAL", insumoId: INSUMO_ID });
    });

    expect(Object.keys(cuerpo)).not.toContain("rendimiento");
  });

  it("agregarFila manda rendimiento para EQUIPO/MANO_OBRA (@NotNull en el backend)", async () => {
    let cuerpo: Record<string, unknown> = {};
    server.use(
      http.post(`${API}/apus/:id/detalles`, async ({ request }) => {
        cuerpo = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(apuDetalleFixture, { status: 201 });
      }),
    );
    const { wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });

    await act(async () => {
      await result.current.agregarFila({ seccionTipo: "EQUIPO", insumoId: INSUMO_ID });
    });

    expect(cuerpo.rendimiento).toBeDefined();
  });

  it("editing a cell invalidates presupuesto and cronograma keys", async () => {
    server.use(
      http.patch(`${API}/apus/:id/detalles/:did`, () => HttpResponse.json(apuDetalleFixture)),
    );
    const { wrapper } = crearConHmEnCache();

    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });

    const detalleId = apuConHmFixture.secciones[0].detalles[0].id;
    await act(async () => {
      await result.current.editarCelda(detalleId, "cantidad", "3.0");
    });
  });
});
