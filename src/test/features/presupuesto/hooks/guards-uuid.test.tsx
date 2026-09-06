import { describe, expect, it, beforeEach } from "vitest";
import { renderHook, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";

import { crearQueryClient, renderConProviders } from "@/test/render";
import { server } from "@/test/server";
import { useSesionStore } from "@/features/auth/sesion";
import { usuarioFixture } from "@/test/fixtures/auth";
import { usePresupuesto } from "@/features/presupuesto/hooks/usePresupuesto";
import { useCapituloMutaciones } from "@/features/presupuesto/hooks/useCapituloMutaciones";
import { useValidacionExport } from "@/features/exportar/hooks/useExportar";
import { useCronograma } from "@/features/cronograma/hooks/useCronograma";
import { ExportPageActiva } from "@/features/exportar/pages/ExportPage";
import { CronogramaPage } from "@/features/cronograma/pages/CronogramaPage";
import {
  presupuestoFixture,
  validacionFixture,
  PRESUPUESTO_V2,
  CAPITULO_1,
} from "@/test/fixtures/presupuesto";
import { cronogramaFixture } from "@/test/fixtures/cronograma";

const API = "*/api/v1";

beforeEach(() => {
  useSesionStore.setState({ usuario: usuarioFixture, cargando: false });
});

function wrapper({ children }: { children: ReactNode }) {
  const client = crearQueryClient();
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

// Los ids de presupuesto/capítulo/rubro son UUIDv7 en el backend. Los guards
// numéricos que quedaron del tipado `number` (`presupuestoId > 0`,
// `Number(searchParams.get("v")) || 0`) evalúan a false/NaN con un UUID y
// dejan la query apagada en producción. Cada test de aquí falla si el guard
// vuelve a ser numérico.
describe("guards de id con UUID", () => {
  it("usePresupuesto dispara la petición con un presupuestoId UUID", async () => {
    const pedidos: string[] = [];
    server.use(
      http.get(`${API}/presupuestos/:id`, ({ request, params }) => {
        pedidos.push(String(params.id));
        void request;
        return HttpResponse.json(presupuestoFixture);
      }),
    );

    const { result } = renderHook(() => usePresupuesto(PRESUPUESTO_V2), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(pedidos).toContain(PRESUPUESTO_V2);
  });

  it("useValidacionExport dispara la petición con un presupuestoId UUID", async () => {
    const pedidos: string[] = [];
    server.use(
      http.get(`${API}/presupuestos/:id/validacion`, ({ params }) => {
        pedidos.push(String(params.id));
        return HttpResponse.json(validacionFixture);
      }),
    );

    const { result } = renderHook(() => useValidacionExport(PRESUPUESTO_V2), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(pedidos).toContain(PRESUPUESTO_V2);
  });

  it("useCronograma dispara la petición con un presupuestoId UUID", async () => {
    const pedidos: string[] = [];
    server.use(
      http.get(`${API}/presupuestos/:id/cronograma`, ({ params }) => {
        pedidos.push(String(params.id));
        return HttpResponse.json(cronogramaFixture);
      }),
    );

    const { result } = renderHook(() => useCronograma(PRESUPUESTO_V2), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(pedidos).toContain(PRESUPUESTO_V2);
  });

  it("ExportPage lee ?v= como UUID y no lo coerce a número", async () => {
    const pedidos: string[] = [];
    server.use(
      http.get(`${API}/presupuestos/:id/validacion`, ({ params }) => {
        pedidos.push(String(params.id));
        return HttpResponse.json(validacionFixture);
      }),
    );

    renderConProviders(
      <Routes>
        <Route path="/proyectos/:id/documentos" element={<ExportPageActiva />} />
      </Routes>,
      { ruta: `/proyectos/1/documentos?v=${PRESUPUESTO_V2}` },
    );

    await waitFor(() => expect(pedidos).toContain(PRESUPUESTO_V2));
  });

  it("CronogramaPage pide el cronograma de la versión activa UUID", async () => {
    const pedidos: string[] = [];
    server.use(
      http.get(`${API}/presupuestos/:id/cronograma`, ({ params }) => {
        pedidos.push(String(params.id));
        return HttpResponse.json(cronogramaFixture);
      }),
    );

    renderConProviders(
      <Routes>
        <Route path="/proyectos/:id/cronograma" element={<CronogramaPage />} />
      </Routes>,
      { ruta: `/proyectos/1/cronograma?v=${PRESUPUESTO_V2}` },
    );

    await waitFor(() => expect(screen.getByText("Cronograma")).toBeInTheDocument());
    await waitFor(() => expect(pedidos).toContain(PRESUPUESTO_V2));
  });

  // El backend espera `UUID parentId`. Mientras el tipo fue `number` el
  // diálogo mandaba el id del capítulo padre coercido a número (NaN) y
  // Jackson lo descartaba en silencio.
  it("crear subcapítulo manda parentId como el UUID del capítulo padre", async () => {
    let cuerpo: unknown = null;
    server.use(
      http.post(`${API}/presupuestos/:id/capitulos`, async ({ request }) => {
        cuerpo = await request.json();
        return HttpResponse.json(presupuestoFixture, { status: 201 });
      }),
    );

    const { result } = renderHook(() => useCapituloMutaciones(PRESUPUESTO_V2), { wrapper });

    result.current.crear.mutate({ descripcion: "Subcapítulo", parentId: CAPITULO_1 });

    await waitFor(() => expect(cuerpo).not.toBeNull());
    expect(cuerpo).toEqual({ descripcion: "Subcapítulo", parentId: CAPITULO_1 });
  });
});
