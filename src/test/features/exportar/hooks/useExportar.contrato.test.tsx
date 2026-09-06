import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";

import { crearQueryClient } from "@/test/render";
import { server } from "@/test/server";
import { espiar, ultima } from "@/test/espia";
import { PRESUPUESTO_V2 } from "@/test/fixtures/presupuesto";
import {
  useValidacionExport,
  useExportar,
  opcionesExport,
} from "@/features/exportar/hooks/useExportar";
import { toast } from "sonner";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const API = "*/api/v1";
const RUTA = "/api/v1";

let cliente: QueryClient;
// Cada `<a download>` que fabrica el hook se anota aquí en vez de navegar:
// jsdom no implementa la descarga y el click real solo produce ruido.
let clicks: Array<{ href: string; download: string }>;
let blobs: Blob[];
let revocadas: string[];

beforeEach(() => {
  vi.clearAllMocks();
  cliente = crearQueryClient();
  clicks = [];
  blobs = [];
  revocadas = [];
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clicks.push({ href: this.href, download: this.download });
  });
  // jsdom no trae Object URLs; se sustituyen para poder mirar el Blob.
  URL.createObjectURL = vi.fn((b: Blob) => {
    blobs.push(b);
    return `blob:apu/${blobs.length}`;
  });
  URL.revokeObjectURL = vi.fn((u: string) => {
    revocadas.push(u);
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

describe("opcionesExport — las cuatro URLs del backend", () => {
  it.each(opcionesExport.map((o) => [o.key, o.endpoint(PRESUPUESTO_V2), o.nombre(PRESUPUESTO_V2)]))(
    "%s pide %s y guarda como %s",
    async (_key, endpoint, nombre) => {
      const peticiones = espiar();

      const { result } = renderHook(() => useExportar(), { wrapper });
      await result.current.descargarConFallback(endpoint, nombre);

      expect(ultima(peticiones, "GET", endpoint)?.ruta).toBe(`${RUTA}${endpoint}`);
      expect(clicks).toEqual([{ href: "blob:apu/1", download: nombre }]);
    },
  );

  it("las rutas y los nombres de archivo son exactamente los del contrato", () => {
    expect(
      opcionesExport.map((o) => [o.endpoint(PRESUPUESTO_V2), o.nombre(PRESUPUESTO_V2)]),
    ).toEqual([
      [`/presupuestos/${PRESUPUESTO_V2}/exportar/pdf`, `presupuesto_${PRESUPUESTO_V2}.pdf`],
      [`/presupuestos/${PRESUPUESTO_V2}/exportar/excel`, `presupuesto_${PRESUPUESTO_V2}.xlsx`],
      [`/presupuestos/${PRESUPUESTO_V2}/apus/exportar`, `apus_${PRESUPUESTO_V2}.pdf`],
      [`/presupuestos/${PRESUPUESTO_V2}/cronograma/exportar`, `cronograma_${PRESUPUESTO_V2}.pdf`],
    ]);
  });
});

describe("useExportar — descarga binaria", () => {
  it("recibe un Blob real y lo libera tras el click", async () => {
    const { result } = renderHook(() => useExportar(), { wrapper });
    await result.current.descargarConFallback(
      `/presupuestos/${PRESUPUESTO_V2}/exportar/pdf`,
      `presupuesto_${PRESUPUESTO_V2}.pdf`,
    );

    expect(blobs).toHaveLength(1);
    expect(blobs[0]).toBeInstanceOf(Blob);
    expect(blobs[0].size).toBe(8);
    // El enlace se retira del DOM y el object URL se revoca: si no, cada
    // export deja un blob vivo en memoria para el resto de la sesión.
    expect(document.querySelector("a[download]")).toBeNull();
    expect(revocadas).toEqual(["blob:apu/1"]);
    expect(toast.success).toHaveBeenCalledWith("Descarga iniciada");
  });

  // ponytail: el plan 057 §5 pide que el nombre salga de `Content-Disposition`.
  // Hoy NO lo lee: usa el `nombre` que le pasa el llamador y el header del
  // backend se ignora. Se fija el comportamiento actual; el plan 051 es el que
  // debe hacerlo leer la cabecera, y entonces este test se pone en rojo.
  it("ignora el filename de Content-Disposition y usa el nombre codificado", async () => {
    server.use(
      http.get(`${API}/presupuestos/:id/exportar/pdf`, () =>
        HttpResponse.arrayBuffer(new ArrayBuffer(8), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'attachment; filename="PRESUPUESTO-OFICIAL-2026.pdf"',
          },
        }),
      ),
    );

    const { result } = renderHook(() => useExportar(), { wrapper });
    await result.current.descargarConFallback(
      `/presupuestos/${PRESUPUESTO_V2}/exportar/pdf`,
      `presupuesto_${PRESUPUESTO_V2}.pdf`,
    );

    expect(clicks[0].download).toBe(`presupuesto_${PRESUPUESTO_V2}.pdf`);
    expect(clicks[0].download).not.toBe("PRESUPUESTO-OFICIAL-2026.pdf");
  });

  it("un fallo del backend avisa con toast y no fabrica ningún enlace", async () => {
    server.use(
      http.get(`${API}/presupuestos/:id/exportar/pdf`, () =>
        HttpResponse.json({ title: "Boom" }, { status: 500 }),
      ),
    );

    const { result } = renderHook(() => useExportar(), { wrapper });
    await result.current.descargarConFallback(
      `/presupuestos/${PRESUPUESTO_V2}/exportar/pdf`,
      `presupuesto_${PRESUPUESTO_V2}.pdf`,
    );

    expect(toast.error).toHaveBeenCalledWith("Error al descargar");
    expect(clicks).toHaveLength(0);
  });
});
