import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";

import { crearQueryClient } from "@/test/render";
import { server } from "@/test/server";
import { espiar, ultima } from "@/test/espia";
import { PRESUPUESTO_V1, PRESUPUESTO_V2 } from "@/test/fixtures/presupuesto";
import type { ApiError } from "@/api/problem";
import type { FormatoExportCronograma } from "@/api/contract";
import {
  useValidacionExport,
  useExportar,
  usePreflightCronograma,
} from "@/features/exportar/hooks/useExportar";
import { toast } from "sonner";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

const API = "*/api/v1";
const RUTA = "/api/v1";
const CRONO = `/documentos/cronograma/${PRESUPUESTO_V2}`;

let cliente: QueryClient;
// Cada `<a download>` que fabrica el hook se anota aquí en vez de navegar:
// jsdom no implementa la descarga y el click real solo produce ruido.
let clicks: Array<{ href: string; download: string }>;

beforeEach(() => {
  vi.clearAllMocks();
  cliente = crearQueryClient();
  clicks = [];
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clicks.push({ href: this.href, download: this.download });
  });
});

afterEach(() => vi.restoreAllMocks());

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}

// El test hermano (useExportar.test.tsx) mira la *forma de la respuesta* de
// validación. Aquí se mira la *petición que sale*: una URL de export mal
// escrita es un 404 silencioso para el usuario, y el mock nunca lo delata.
describe("useValidacionExport — contrato de salida", () => {
  it("pide GET /presupuestos/{id}/validacion con el UUID del presupuesto", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useValidacionExport(PRESUPUESTO_V2), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(ultima(peticiones, "GET", "/validacion")?.ruta).toBe(
      `${RUTA}/presupuestos/${PRESUPUESTO_V2}/validacion`,
    );
  });

  it("no dispara nada sin presupuestoId (guard `enabled`)", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useValidacionExport(""), { wrapper });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(peticiones).toHaveLength(0);
  });
});

describe("useExportar — ciclo de clave privada", () => {
  it("no navega si la respuesta contiene un ticket externo", async () => {
    server.use(
      http.post(`${API}/documentos/apus/${PRESUPUESTO_V1}/exportaciones`, () =>
        HttpResponse.json({
          operationId: PRESUPUESTO_V1,
          downloadUrl: "https://external.invalid/ticket",
          expiresAt: "2026-01-01T00:05:00Z",
          objectExpiresAt: "2026-01-02T00:00:00Z",
          filename: "apu.pdf",
          mediaType: "application/pdf",
          sizeBytes: 1,
          sha256: `${"a".repeat(43)}=`,
          warnings: [],
        }),
      ),
    );
    const { result } = renderHook(() => useExportar(), { wrapper });
    await act(async () => {
      await expect(
        result.current.exportarPrivado("apus", PRESUPUESTO_V1, { formato: "pdf" }),
      ).rejects.toBeDefined();
    });
    expect(clicks).toHaveLength(0);
  });

  it("envía opciones distintas para presupuesto PDF y APUs XLSX", async () => {
    const requests: Array<{ documento: string; body: unknown; key: string | null }> = [];
    server.use(
      http.post(
        `${API}/documentos/:documento/${PRESUPUESTO_V1}/exportaciones`,
        async ({ params, request }) => {
          requests.push({
            documento: String(params.documento),
            body: await request.json(),
            key: request.headers.get("Idempotency-Key"),
          });
          return HttpResponse.json({
            operationId: PRESUPUESTO_V1,
            downloadUrl: `/api/v1/documentos/descargas/${"a".repeat(43)}`,
            expiresAt: "2026-01-01T00:05:00Z",
            objectExpiresAt: "2026-01-02T00:00:00Z",
            filename: "documento.pdf",
            mediaType: "application/pdf",
            sizeBytes: 1,
            sha256: `${"a".repeat(43)}=`,
            warnings: [],
          });
        },
      ),
    );
    const { result } = renderHook(() => useExportar(), { wrapper });
    await act(async () => {
      await result.current.exportarPrivado("presupuesto", PRESUPUESTO_V1, {
        formato: "pdf",
        orientacion: "horizontal",
      });
    });
    await act(async () => {
      await result.current.exportarPrivado("apus", PRESUPUESTO_V1, {
        formato: "xlsx",
        layout: "apilado",
      });
    });
    expect(requests.map(({ documento, body }) => ({ documento, body }))).toEqual([
      { documento: "presupuesto", body: { formato: "pdf", orientacion: "horizontal" } },
      { documento: "apus", body: { formato: "xlsx", layout: "apilado" } },
    ]);
    expect(requests[0].key).not.toBe(requests[1].key);
    expect(clicks).toHaveLength(2);
  });
  it.each([
    ["idempotencia-conflicto", 409, true],
    ["exportacion-expirada", 409, true],
    ["exportacion-en-curso", 409, false],
    ["servidor", 500, false],
    ["red", 0, false],
  ])("%s %i: nueva clave = %s solo en el siguiente gesto", async (codigo, status, nueva) => {
    const claves: string[] = [];
    server.use(
      http.post(`${API}/documentos/presupuesto/${PRESUPUESTO_V1}/exportaciones`, ({ request }) => {
        claves.push(request.headers.get("Idempotency-Key") ?? "");
        return status === 0
          ? HttpResponse.error()
          : HttpResponse.json({ codigo, mensaje: "error" }, { status });
      }),
    );
    const { result } = renderHook(() => useExportar(), { wrapper });
    const ejecutar = () =>
      result.current.exportarPrivado("presupuesto", PRESUPUESTO_V1, { formato: "xlsx" });
    await act(async () => {
      await expect(ejecutar()).rejects.toBeDefined();
    });
    expect(claves).toHaveLength(1);
    expect(clicks).toHaveLength(0);
    await act(async () => {
      await expect(ejecutar()).rejects.toBeDefined();
    });
    expect(claves).toHaveLength(2);
    expect(claves[0]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    if (nueva) expect(claves[1]).not.toBe(claves[0]);
    else expect(claves[1]).toBe(claves[0]);
    expect(clicks).toHaveLength(0);
  });
});

// Plan 051: el backend expone UN endpoint de export, la especificación técnica
// en DOCX. Las cuatro opciones que ofrecía la UI (presupuesto PDF/Excel, APUs,
// cronograma) apuntaban a rutas inventadas y se borraron: no existen en main.
describe("useExportar — papel PDF cronograma", () => {
  it("reintenta con la misma clave y muestra advertencia de captura", async () => {
    const claves: string[] = [];
    server.use(
      http.post(`${API}/documentos/cronograma/${PRESUPUESTO_V1}/exportaciones`, ({ request }) => {
        claves.push(request.headers.get("Idempotency-Key") ?? "");
        if (claves.length === 1)
          return HttpResponse.json({ codigo: "error", mensaje: "Error" }, { status: 500 });
        return HttpResponse.json({
          operationId: PRESUPUESTO_V1,
          downloadUrl: `/api/v1/documentos/descargas/${"a".repeat(43)}`,
          expiresAt: "2026-01-01T00:05:00Z",
          objectExpiresAt: "2026-01-02T00:00:00Z",
          filename: "cronograma.xml",
          mediaType: "application/xml",
          sizeBytes: 1,
          sha256: `${"a".repeat(43)}=`,
          warnings: [{ codigo: "stale", detalle: "Cronograma desactualizado" }],
        });
      }),
    );
    const { result } = renderHook(() => useExportar(), { wrapper });
    await act(async () => {
      await result.current.descargarCronograma(PRESUPUESTO_V1, "mspdi");
    });
    expect(clicks).toHaveLength(0);
    await act(async () => {
      await result.current.descargarCronograma(PRESUPUESTO_V1, "mspdi");
    });
    expect(claves).toHaveLength(2);
    expect(claves[0]).toBe(claves[1]);
    expect(clicks).toHaveLength(1);
    expect(toast.warning).toHaveBeenCalledWith("Cronograma desactualizado", { duration: Infinity });
  });
  it("envía papel explícito solo PDF y conserva A4 por ausencia en llamadas antiguas", async () => {
    const consultas: unknown[] = [];
    server.use(
      http.post(
        `${API}/documentos/cronograma/${PRESUPUESTO_V1}/exportaciones`,
        async ({ request }) => {
          const body = (await request.json()) as { formato: string };
          consultas.push(body);
          return HttpResponse.json({
            operationId: PRESUPUESTO_V1,
            downloadUrl: `/api/v1/documentos/descargas/${"a".repeat(43)}`,
            expiresAt: "2026-01-01T00:05:00Z",
            objectExpiresAt: "2026-01-02T00:00:00Z",
            filename: "cronograma.pdf",
            mediaType:
              body.formato === "pdf"
                ? "application/pdf"
                : body.formato === "mspdi"
                  ? "application/xml"
                  : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            sizeBytes: 1,
            sha256: `${"a".repeat(43)}=`,
            warnings: [],
          });
        },
      ),
    );
    const { result } = renderHook(() => useExportar(), { wrapper });
    await result.current.descargarCronograma(PRESUPUESTO_V1, "pdf", "a3");
    expect(consultas).toEqual([{ formato: "pdf", papel: "a3" }]);
    await result.current.descargarCronograma(PRESUPUESTO_V1, "pdf");
    await result.current.descargarCronograma(PRESUPUESTO_V1, "pdf", "a4");
    await result.current.descargarCronograma(PRESUPUESTO_V1, "xlsx", "a3");
    await result.current.descargarCronograma(PRESUPUESTO_V1, "mspdi", "a3");
    expect(consultas).toEqual([
      { formato: "pdf", papel: "a3" },
      { formato: "pdf" },
      { formato: "pdf", papel: "a4" },
      { formato: "xlsx" },
      { formato: "mspdi" },
    ]);
    expect(clicks).toHaveLength(5);
    // Navega al ticket de Core; nunca fabrica un Object URL de un Blob.
    expect(clicks.every((c) => !c.href.startsWith("blob:"))).toBe(true);
  });
});

// Etapa 05: las descargas de bytes (GET + Blob) se retiraron del backend; toda
// exportación pasa por POST /exportaciones y el ticket de un solo uso de Core.
describe("useExportar — sin descargas de bytes legadas", () => {
  it("no expone las funciones GET/Blob retiradas", () => {
    const { result } = renderHook(() => useExportar(), { wrapper });
    for (const retirada of [
      "descargarPresupuesto",
      "descargarApus",
      "descargarEspecificacionesTecnicas",
    ]) {
      expect(result.current).not.toHaveProperty(retirada);
    }
    expect(result.current).toHaveProperty("exportarPrivado", expect.any(Function));
    expect(result.current).toHaveProperty("descargarCronograma", expect.any(Function));
  });
});

// Plan 031 del backend: `GET /documentos/cronograma/{id}/preflight?formato=`.
// `formato` es obligatorio y uno de tres; uno de más o de menos es un 400.
describe("usePreflightCronograma — contrato de salida", () => {
  it("pide el preflight con `formato` y nada más en la query", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => usePreflightCronograma(PRESUPUESTO_V2, "xlsx"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const p = ultima(peticiones, "GET", `${CRONO}/preflight`);
    expect(p?.ruta).toBe(`${RUTA}${CRONO}/preflight`);
    expect([...(p?.url.searchParams.keys() ?? [])]).toEqual(["formato"]);
    expect(p?.url.searchParams.get("formato")).toBe("xlsx");
  });

  it("no dispara nada sin presupuestoId (guard `enabled`)", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => usePreflightCronograma("", "xlsx"), { wrapper });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(peticiones).toHaveLength(0);
  });

  // El `formato` va dentro de la clave de query: si no, `mspdi` reusaría el
  // preflight de `xlsx` y enseñaría bloqueos ajenos sin volver a preguntar.
  it("cambiar de formato dispara una petición nueva con el formato nuevo", async () => {
    const peticiones = espiar();

    const { result, rerender } = renderHook(
      ({ formato }: { formato: FormatoExportCronograma }) =>
        usePreflightCronograma(PRESUPUESTO_V2, formato),
      { wrapper, initialProps: { formato: "xlsx" as FormatoExportCronograma } },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    rerender({ formato: "mspdi" });

    await waitFor(() =>
      expect(ultima(peticiones, "GET", `${CRONO}/preflight`)?.url.searchParams.get("formato")).toBe(
        "mspdi",
      ),
    );
    expect(peticiones.filter((p) => p.ruta.endsWith("/preflight"))).toHaveLength(2);
  });

  it("un preflight con la forma equivocada falla con `respuesta-invalida`", async () => {
    server.use(http.get(`${API}/documentos/cronograma/:id/preflight`, () => HttpResponse.json({})));

    const { result } = renderHook(() => usePreflightCronograma(PRESUPUESTO_V2, "xlsx"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).problem.codigo).toBe("respuesta-invalida");
  });
});

describe("useExportar — cronograma valorizado", () => {
  it.each(["xlsx", "pdf", "mspdi"] as const)(
    "pide /documentos/cronograma/{id} con formato=%s y nada más",
    async (formato) => {
      const peticiones = espiar();

      const { result } = renderHook(() => useExportar(), { wrapper });
      await result.current.descargarCronograma(PRESUPUESTO_V2, formato);

      const p = ultima(peticiones, "POST", `${CRONO}/exportaciones`);
      expect(p?.ruta).toBe(`${RUTA}${CRONO}/exportaciones`);
      expect(p?.cuerpo).toEqual({ formato });
    },
  );

  // El 409 `export-bloqueado` del POST trae el recuento en `mensaje`: sin él,
  // el toast sería el genérico «Error al descargar».
  it("el 409 avisa con el mensaje del backend y no fabrica ningún enlace", async () => {
    const invalidar = vi.spyOn(cliente, "invalidateQueries");
    server.use(
      http.post(`${API}/documentos/cronograma/${PRESUPUESTO_V1}/exportaciones`, () =>
        HttpResponse.json(
          {
            presupuestoId: PRESUPUESTO_V1,
            formato: "xlsx",
            codigo: "export-bloqueado",
            mensaje: "Exportación bloqueada: 2 bloqueo(s)",
            bloqueos: [],
            warnings: [],
          },
          { status: 409 },
        ),
      ),
    );
    const { result } = renderHook(() => useExportar(), { wrapper });
    await act(async () => {
      await result.current.descargarCronograma(PRESUPUESTO_V1, "xlsx");
    });
    expect(invalidar).toHaveBeenCalledWith({
      queryKey: ["presupuesto", PRESUPUESTO_V1, "export-cronograma", "xlsx"],
      exact: true,
    });
    expect(toast.error).toHaveBeenCalledWith("Exportación bloqueada: 2 bloqueo(s)");
    expect(clicks).toHaveLength(0);
  });
});
