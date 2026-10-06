import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import type { DocumentoPreflightResponse } from "@/api/contract";
import * as exportarHooks from "@/features/exportar/hooks/useExportar";
import type { OpcionesApus, OpcionesPresupuesto } from "@/features/exportar/hooks/useExportar";
import { server } from "@/test/server";
import { espiar } from "@/test/espia";
import { PRESUPUESTO_V1, PRESUPUESTO_V2, RUBRO_1_1_1 } from "@/test/fixtures/presupuesto";

type Contexto = { presupuestoId: string | undefined | null } & (
  | { documento: "presupuesto"; opciones: OpcionesPresupuesto }
  | { documento: "apus"; opciones: OpcionesApus }
);
const inicial: Contexto = {
  presupuestoId: PRESUPUESTO_V1,
  documento: "presupuesto",
  opciones: { formato: "pdf", orientacion: "vertical" },
};
let cliente: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}
beforeEach(() => {
  expect(exportarHooks).toHaveProperty("usePreflightDocumento", expect.any(Function));
  cliente = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: Infinity } },
  });
});
afterEach(() => cliente?.clear());

// Forma de PreflightDocumento/OpcionesDocumento y detalles P-32 del backend actual.
function cuerpo(contexto: Contexto): DocumentoPreflightResponse {
  const identidad = {
    presupuestoId: contexto.presupuestoId ?? PRESUPUESTO_V1,
    version: contexto.presupuestoId === PRESUPUESTO_V2 ? 2 : 1,
    exportable: false,
    bloqueos: [
      {
        codigo: "presupuesto-sin-actividad",
        mensaje: "Existen rubros sin actividad (P-32)",
        rubros: [
          {
            id: RUBRO_1_1_1,
            item: "1.1.1",
            codigo: "APU-001",
            descripcion: "Excavación a máquina",
          },
        ],
      },
    ],
    warnings: [],
  };
  if (contexto.documento === "presupuesto") {
    return contexto.opciones.formato === "pdf"
      ? {
          ...identidad,
          documento: "presupuesto",
          formato: "pdf",
          opciones: { orientacion: contexto.opciones.orientacion ?? "vertical" },
        }
      : { ...identidad, documento: "presupuesto", formato: "xlsx", opciones: {} };
  }
  return contexto.opciones.formato === "xlsx"
    ? {
        ...identidad,
        documento: "apus",
        formato: "xlsx",
        opciones: { layout: contexto.opciones.layout ?? "pestanas" },
      }
    : { ...identidad, documento: "apus", formato: "pdf", opciones: {} };
}
function atender(contexto: Contexto, pendiente?: Promise<void>) {
  const respuesta = cuerpo(contexto);
  const peticiones: string[] = [];
  server.use(
    http.get(
      `*/api/v1/documentos/${contexto.documento}/${contexto.presupuestoId}/preflight`,
      async ({ request }) => {
        const url = new URL(request.url);
        peticiones.push(url.pathname + url.search);
        const recibidas = [...url.searchParams.entries()].sort();
        const esperadas = Object.entries(contexto.opciones).sort();
        // Los defaults efectivos pueden enviarse u omitirse; ninguna otra clave es válida.
        const explicitas = Object.entries({
          formato: respuesta.formato,
          ...respuesta.opciones,
        }).sort();
        if (
          ![esperadas, explicitas].some(
            (valores) => JSON.stringify(valores) === JSON.stringify(recibidas),
          )
        ) {
          return HttpResponse.json(
            { codigo: "validacion", mensaje: "Opciones inválidas" },
            { status: 400 },
          );
        }
        await pendiente;
        return HttpResponse.json(respuesta);
      },
    ),
  );
  return { respuesta, peticiones };
}
function montar(contexto: Contexto) {
  return renderHook((props: Contexto) => exportarHooks.usePreflightDocumento(props), {
    wrapper,
    initialProps: contexto,
  });
}
const cambios: Array<[string, Contexto]> = [
  ["UUID", { ...inicial, presupuestoId: PRESUPUESTO_V2 }],
  ["documento", { presupuestoId: PRESUPUESTO_V1, documento: "apus", opciones: { formato: "pdf" } }],
  ["formato", { ...inicial, opciones: { formato: "xlsx" } }],
  ["orientación", { ...inicial, opciones: { formato: "pdf", orientacion: "horizontal" } }],
  [
    "layout",
    {
      presupuestoId: PRESUPUESTO_V1,
      documento: "apus",
      opciones: { formato: "xlsx", layout: "apilado" },
    },
  ],
];

describe("usePreflightDocumento — contexto seleccionado y recuperación de 409", () => {
  it.each(cambios)(
    "aísla %s aunque la respuesta anterior llegue al final",
    async (eje, siguiente) => {
      const anterior: Contexto =
        eje === "layout"
          ? {
              presupuestoId: PRESUPUESTO_V1,
              documento: "apus",
              opciones: { formato: "xlsx", layout: "pestanas" },
            }
          : inicial;
      let liberar = () => {};
      const pendiente = new Promise<void>((resolve) => {
        liberar = resolve;
      });
      const vieja = atender(anterior, pendiente);
      const { result, rerender } = montar(anterior);
      try {
        await waitFor(() => expect(vieja.peticiones).toHaveLength(1));
        // Registrar después de observar la petición antigua evita colisiones de pathname MSW.
        const nueva = atender(siguiente);
        rerender(siguiente);
        await waitFor(() => expect(result.current.data).toEqual(nueva.respuesta));
        await act(async () => liberar());
        await waitFor(() =>
          expect(
            cliente
              .getQueryCache()
              .getAll()
              .some((q) => JSON.stringify(q.state.data) === JSON.stringify(vieja.respuesta)),
          ).toBe(true),
        );
        expect(result.current.data).toEqual(nueva.respuesta);
        expect(nueva.peticiones).toHaveLength(1);
        expect(cliente.getQueryCache().getAll()).toHaveLength(2);
      } finally {
        liberar();
      }
    },
  );

  it.each([
    undefined,
    null,
    "bad",
    "01900000-0000-4000-8000-000000000001",
    "01900000-0000-7000-c000-000000000001",
  ])("sin UUID válido (%s) queda idle, sin HTTP ni datos anteriores", async (id) => {
    const peticiones = espiar();
    const valida = atender(inicial);
    const { result, rerender } = montar({ ...inicial, presupuestoId: id });
    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.data).toBeUndefined();
    expect(peticiones).toHaveLength(0);
    rerender(inicial);
    await waitFor(() => expect(result.current.data).toEqual(valida.respuesta));
    const cantidad = peticiones.length;
    rerender({ ...inicial, presupuestoId: id });
    await act(async () => {});
    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.data).toBeUndefined();
    expect(peticiones).toHaveLength(cantidad);
  });

  it.each(["presupuesto", "apus"] as const)(
    "%s comparte caché entre default omitido y explícito",
    async (documento) => {
      const omitido: Contexto =
        documento === "presupuesto"
          ? { ...inicial, opciones: { formato: "pdf" } }
          : { presupuestoId: PRESUPUESTO_V1, documento: "apus", opciones: { formato: "xlsx" } };
      const explicito: Contexto =
        documento === "presupuesto"
          ? inicial
          : { ...omitido, documento: "apus", opciones: { formato: "xlsx", layout: "pestanas" } };
      const atendida = atender(omitido);
      const { result, rerender } = montar(omitido);
      await waitFor(() => expect(result.current.data).toEqual(atendida.respuesta));
      const clave = cliente.getQueryCache().getAll()[0].queryKey;
      rerender(explicito);
      await act(async () => {});
      expect(result.current.data).toEqual(atendida.respuesta);
      expect(
        cliente
          .getQueryCache()
          .getAll()
          .map((q) => q.queryKey),
      ).toEqual([clave]);
      expect(atendida.peticiones).toHaveLength(1);
    },
  );

  it("invalidar capturado antes de descargar invalida sólo la clave antigua, no la nueva selección", async () => {
    const vieja = atender(inicial);
    const siguiente: Contexto = {
      ...inicial,
      presupuestoId: PRESUPUESTO_V2,
      opciones: { formato: "pdf", orientacion: "horizontal" },
    };
    const nueva = atender(siguiente);
    const { result, rerender } = montar(inicial);
    await waitFor(() => expect(result.current.data).toEqual(vieja.respuesta));
    const antigua = cliente.getQueryCache().getAll()[0];
    const invalidar = result.current.invalidar;
    rerender(siguiente);
    await waitFor(() => expect(result.current.data).toEqual(nueva.respuesta));
    const actual = cliente
      .getQueryCache()
      .getAll()
      .find((q) => q !== antigua);
    expect(actual).toBeDefined();
    // Simula sólo el recovery del 409; el decoder y la descarga tienen pruebas propias.
    await act(async () => {
      await invalidar();
    });
    expect(antigua.state.isInvalidated).toBe(true);
    expect(actual?.state.isInvalidated).toBe(false);
    expect(nueva.peticiones).toHaveLength(1);
    expect(result.current.data).toEqual(nueva.respuesta);
  });
});
