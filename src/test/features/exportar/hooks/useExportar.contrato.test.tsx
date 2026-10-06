import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";

import { crearQueryClient } from "@/test/render";
import { server } from "@/test/server";
import { espiar, ultima } from "@/test/espia";
import { PRESUPUESTO_V1, PRESUPUESTO_V2 } from "@/test/fixtures/presupuesto";
import { getAccessToken, setAccessToken } from "@/api/client";
import { PRESUPUESTO_BLOQUEADO } from "@/test/handlers";
import { descargar } from "@/api/request";
import type { ApiError } from "@/api/problem";
import type { FormatoExportCronograma } from "@/api/contract";
import {
  useValidacionExport,
  useExportar,
  usePreflightCronograma,
} from "@/features/exportar/hooks/useExportar";
import { toast } from "sonner";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const API = "*/api/v1";
const RUTA = "/api/v1";
const ET = `/documentos/especificaciones-tecnicas/${PRESUPUESTO_V2}`;
const CRONO = `/documentos/cronograma/${PRESUPUESTO_V2}`;

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

// Plan 051: el backend expone UN endpoint de export, la especificación técnica
// en DOCX. Las cuatro opciones que ofrecía la UI (presupuesto PDF/Excel, APUs,
// cronograma) apuntaban a rutas inventadas y se borraron: no existen en main.
describe("useExportar — papel PDF cronograma", () => {
  it("envía papel explícito solo PDF y conserva A4 por ausencia en llamadas antiguas", async () => {
    const consultas: Array<Array<[string, string]>> = [];
    server.use(
      http.get(`${API}/documentos/cronograma/${PRESUPUESTO_V1}`, ({ request }) => {
        expect(request.method).toBe("GET");
        consultas.push([...new URL(request.url).searchParams.entries()].sort());
        return HttpResponse.arrayBuffer(new ArrayBuffer(8), {
          headers: { "Content-Type": "application/octet-stream" },
        });
      }),
    );
    const { result } = renderHook(() => useExportar(), { wrapper });
    await result.current.descargarCronograma(PRESUPUESTO_V1, "pdf", "a3");
    expect(consultas).toEqual([
      [
        ["formato", "pdf"],
        ["papel", "a3"],
      ],
    ]);
    await result.current.descargarCronograma(PRESUPUESTO_V1, "pdf");
    await result.current.descargarCronograma(PRESUPUESTO_V1, "pdf", "a4");
    await result.current.descargarCronograma(PRESUPUESTO_V1, "xlsx", "a3");
    await result.current.descargarCronograma(PRESUPUESTO_V1, "mspdi", "a3");
    expect(consultas).toEqual([
      [
        ["formato", "pdf"],
        ["papel", "a3"],
      ],
      [["formato", "pdf"]],
      [
        ["formato", "pdf"],
        ["papel", "a4"],
      ],
      [["formato", "xlsx"]],
      [["formato", "mspdi"]],
    ]);
    expect(clicks.map((click) => click.download)).toEqual([
      "cronograma.pdf",
      "cronograma.pdf",
      "cronograma.pdf",
      "cronograma.xlsx",
      "cronograma.xml",
    ]);
    expect(revocadas).toHaveLength(5);
  });
});

describe("useExportar — especificaciones técnicas", () => {
  it("pide el único endpoint que existe, sin inventar `formato` ni títulos vacíos", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useExportar(), { wrapper });
    await result.current.descargarEspecificacionesTecnicas(PRESUPUESTO_V2);

    const p = ultima(peticiones, "GET", ET);
    expect(p?.ruta).toBe(`${RUTA}${ET}`);
    // Mandar `titulo1=` vacío no es lo mismo que omitirlo: acaba en la portada.
    expect([...(p?.url.searchParams.keys() ?? [])]).toEqual([]);
  });

  it("guarda el archivo con el nombre que manda el backend en Content-Disposition", async () => {
    server.use(
      http.get(`${API}/documentos/especificaciones-tecnicas/:id`, () =>
        HttpResponse.arrayBuffer(new ArrayBuffer(8), {
          headers: {
            "Content-Disposition": 'attachment; filename="ET-Proyecto Norte-v2.docx"',
          },
        }),
      ),
    );

    const { result } = renderHook(() => useExportar(), { wrapper });
    await result.current.descargarEspecificacionesTecnicas(PRESUPUESTO_V2);

    expect(clicks).toEqual([{ href: "blob:apu/1", download: "ET-Proyecto Norte-v2.docx" }]);
    expect(toast.success).toHaveBeenCalledWith("Descarga iniciada");
  });

  it("si el backend no manda la cabecera, cae a un nombre propio", async () => {
    server.use(
      http.get(`${API}/documentos/especificaciones-tecnicas/:id`, () =>
        HttpResponse.arrayBuffer(new ArrayBuffer(8)),
      ),
    );

    const { result } = renderHook(() => useExportar(), { wrapper });
    await result.current.descargarEspecificacionesTecnicas(PRESUPUESTO_V2);

    expect(clicks[0].download).toBe("especificaciones-tecnicas.docx");
  });

  it("recibe un Blob real y lo libera tras el click", async () => {
    const { result } = renderHook(() => useExportar(), { wrapper });
    await result.current.descargarEspecificacionesTecnicas(PRESUPUESTO_V2);

    expect(blobs).toHaveLength(1);
    expect(blobs[0]).toBeInstanceOf(Blob);
    expect(blobs[0].size).toBe(8);
    // El enlace se retira del DOM y el object URL se revoca: si no, cada
    // export deja un blob vivo en memoria para el resto de la sesión.
    expect(document.querySelector("a[download]")).toBeNull();
    expect(revocadas).toEqual(["blob:apu/1"]);
  });

  it("un fallo del backend avisa con toast y no fabrica ningún enlace", async () => {
    server.use(
      http.get(`${API}/documentos/especificaciones-tecnicas/:id`, () =>
        HttpResponse.json({ title: "Boom" }, { status: 500 }),
      ),
    );

    const { result } = renderHook(() => useExportar(), { wrapper });
    await result.current.descargarEspecificacionesTecnicas(PRESUPUESTO_V2);

    expect(toast.error).toHaveBeenCalledWith("Error al descargar");
    expect(clicks).toHaveLength(0);
  });

  // El hook no manda `formato`, así que este 400 es inalcanzable desde la UI —
  // que es justamente lo que hay que sostener: no hay botón «PDF» que cablear.
  it("el backend rechaza con 400 cualquier formato que no sea docx", async () => {
    await expect(descargar(ET, { formato: "pdf" })).rejects.toMatchObject({ status: 400 });
    await expect(descargar(ET, { formato: "docx" })).resolves.toBeDefined();
  });
});

// F04-02: extensión mínima del objeto real de useExportar, sin exports ficticios.
// Reflect permite observar RED por capacidad ausente antes de invocar el método.
describe("useExportar — presupuesto/APUs de la versión seleccionada", () => {
  let tokenAnterior: string | null;
  beforeEach(() => {
    tokenAnterior = getAccessToken();
    setAccessToken("documentos-test");
  });
  afterEach(() => setAccessToken(tokenAnterior));

  const casos = [
    { documento: "presupuesto", metodo: "descargarPresupuesto", opciones: { formato: "xlsx" } },
    { documento: "presupuesto", metodo: "descargarPresupuesto", opciones: { formato: "pdf" } },
    {
      documento: "presupuesto",
      metodo: "descargarPresupuesto",
      opciones: { formato: "pdf", orientacion: "horizontal" },
    },
    { documento: "apus", metodo: "descargarApus", opciones: { formato: "xlsx" } },
    {
      documento: "apus",
      metodo: "descargarApus",
      opciones: { formato: "xlsx", layout: "apilado" },
    },
    { documento: "apus", metodo: "descargarApus", opciones: { formato: "pdf" } },
  ] as const;
  const mime = (formato: string) =>
    formato === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const contenido = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => resolve(String(lector.result));
      lector.onerror = () => reject(lector.error);
      lector.readAsText(blob);
    });

  it("descarga sólo las combinaciones cerradas con UUID no vigente, bytes y nombre del servidor", async () => {
    const { result } = renderHook(() => useExportar(), { wrapper });
    for (const [indice, caso] of casos.entries()) {
      expect(result.current).toHaveProperty(caso.metodo, expect.any(Function));
      const peticiones: string[] = [];
      const nombre = `${caso.documento}-Selected-${PRESUPUESTO_V1}-v1.${caso.opciones.formato}`;
      const cuerpo = `${PRESUPUESTO_V1}:v1:${JSON.stringify(caso.opciones)}`;
      const query = [...new URLSearchParams(caso.opciones).entries()].sort();
      server.use(
        http.get(`${API}/documentos/${caso.documento}/:id`, ({ request, params }) => {
          const url = new URL(request.url);
          peticiones.push(url.pathname);
          if (
            params.id !== PRESUPUESTO_V1 ||
            JSON.stringify([...url.searchParams.entries()].sort()) !== JSON.stringify(query)
          ) {
            return HttpResponse.json(
              { codigo: "validacion", mensaje: "Opciones inválidas" },
              { status: 400 },
            );
          }
          if (request.headers.get("Authorization") !== "Bearer documentos-test") {
            return new HttpResponse(null, { status: 401 });
          }
          return HttpResponse.arrayBuffer(new TextEncoder().encode(cuerpo).buffer, {
            headers: {
              "Content-Type": mime(caso.opciones.formato),
              "Content-Disposition": `attachment; filename="${nombre}"`,
            },
          });
        }),
      );
      const callback = Reflect.get(result.current, caso.metodo);
      expect(typeof callback).toBe("function");
      if (caso.metodo === "descargarPresupuesto") {
        await result.current.descargarPresupuesto(PRESUPUESTO_V1, caso.opciones);
      } else {
        await result.current.descargarApus(PRESUPUESTO_V1, caso.opciones);
      }
      expect(peticiones).toEqual([`${RUTA}/documentos/${caso.documento}/${PRESUPUESTO_V1}`]);
      expect(clicks[indice]?.download).toBe(nombre);
      expect(blobs[indice]?.type).toBe(mime(caso.opciones.formato));
      expect(await contenido(blobs[indice])).toBe(cuerpo);
    }
    expect(clicks).toHaveLength(casos.length);
    expect(revocadas).toEqual(clicks.map((click) => click.href));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("rechaza UUID no v7 o variante inválida sin HTTP ni guardar archivo", async () => {
    const peticiones = espiar();
    server.use(
      http.get(`${API}/documentos/:documento/:id`, () =>
        HttpResponse.arrayBuffer(new ArrayBuffer(8), {
          headers: { "Content-Type": "application/pdf" },
        }),
      ),
    );
    const { result } = renderHook(() => useExportar(), { wrapper });
    for (const id of [
      "01900000-0000-4000-8000-000000000001",
      "01900000-0000-7000-c000-000000000001",
    ]) {
      await result.current.descargarPresupuesto(id, { formato: "pdf" });
      await result.current.descargarApus(id, { formato: "pdf" });
    }
    expect(peticiones).toHaveLength(0);
    expect(clicks).toHaveLength(0);
    expect(blobs).toHaveLength(0);
    expect(revocadas).toHaveLength(0);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("conserva UUID y opciones capturados mientras cambia la selección con HTTP pendiente", async () => {
    let liberar: () => void = () => {};
    const pendiente = new Promise<void>((resolve) => {
      liberar = resolve;
    });
    const peticiones: string[] = [];
    const nombre = `presupuesto-Selected-${PRESUPUESTO_V1}-v1.pdf`;
    server.use(
      http.get(`${API}/documentos/presupuesto/:id`, async ({ request, params }) => {
        const url = new URL(request.url);
        if (
          params.id !== PRESUPUESTO_V1 ||
          JSON.stringify([...url.searchParams.entries()].sort()) !==
            JSON.stringify(
              [
                ["formato", "pdf"],
                ["orientacion", "horizontal"],
              ].sort(),
            )
        ) {
          return HttpResponse.json(
            { codigo: "validacion", mensaje: "Contexto incorrecto" },
            { status: 400 },
          );
        }
        if (request.headers.get("Authorization") !== "Bearer documentos-test") {
          return new HttpResponse(null, { status: 401 });
        }
        peticiones.push(url.pathname);
        await pendiente;
        return HttpResponse.arrayBuffer(
          new TextEncoder().encode(`${params.id}:v1:horizontal`).buffer,
          {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="${nombre}"`,
            },
          },
        );
      }),
    );
    const { result, rerender } = renderHook(
      ({ presupuestoId }) => ({ hook: useExportar(), presupuestoId }),
      { wrapper, initialProps: { presupuestoId: PRESUPUESTO_V1 } },
    );
    expect(result.current.hook).toHaveProperty("descargarPresupuesto", expect.any(Function));
    const callback = Reflect.get(result.current.hook, "descargarPresupuesto");
    expect(typeof callback).toBe("function");
    const descarga = callback(result.current.presupuestoId, {
      formato: "pdf",
      orientacion: "horizontal",
    });
    try {
      await waitFor(() => expect(peticiones).toHaveLength(1));
      rerender({ presupuestoId: PRESUPUESTO_V2 });
      expect(result.current.presupuestoId).toBe(PRESUPUESTO_V2);
      expect(clicks).toHaveLength(0);
    } finally {
      liberar();
      await descarga;
    }
    expect(peticiones).toEqual([`${RUTA}/documentos/presupuesto/${PRESUPUESTO_V1}`]);
    expect(clicks).toEqual([{ href: "blob:apu/1", download: nombre }]);
    expect(blobs[0].type).toBe("application/pdf");
    expect(await contenido(blobs[0])).toBe(`${PRESUPUESTO_V1}:v1:horizontal`);
    expect(revocadas).toEqual(["blob:apu/1"]);
    expect(toast.error).not.toHaveBeenCalled();
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

      const p = ultima(peticiones, "GET", CRONO);
      expect(p?.ruta).toBe(`${RUTA}${CRONO}`);
      expect([...(p?.url.searchParams.keys() ?? [])]).toEqual(["formato"]);
      expect(p?.url.searchParams.get("formato")).toBe(formato);
    },
  );

  it("guarda el archivo con el nombre que manda el backend en Content-Disposition", async () => {
    server.use(
      http.get(`${API}/documentos/cronograma/:id`, () =>
        HttpResponse.arrayBuffer(new ArrayBuffer(8), {
          headers: {
            "Content-Disposition": 'attachment; filename="PROY-A-Edificio_Principal-v3.xlsx"',
          },
        }),
      ),
    );

    const { result } = renderHook(() => useExportar(), { wrapper });
    await result.current.descargarCronograma(PRESUPUESTO_V2, "xlsx");

    expect(clicks[0].download).toBe("PROY-A-Edificio_Principal-v3.xlsx");
    expect(toast.success).toHaveBeenCalledWith("Descarga iniciada");
  });

  // MSPDI se sirve como XML: el fallback no puede inventar una extensión
  // `.mspdi` que ningún camino del backend produce.
  it("sin cabecera, mspdi cae a cronograma.xml", async () => {
    server.use(
      http.get(`${API}/documentos/cronograma/:id`, () =>
        HttpResponse.arrayBuffer(new ArrayBuffer(8)),
      ),
    );

    const { result } = renderHook(() => useExportar(), { wrapper });
    await result.current.descargarCronograma(PRESUPUESTO_V2, "mspdi");

    expect(clicks[0].download).toBe("cronograma.xml");
  });

  // Ata el arreglo del interceptor: con el cuerpo de error llegando como Blob
  // sin rehidratar, este mensaje sería el genérico «Error al descargar».
  it("el 409 avisa con el mensaje del backend y no fabrica ningún enlace", async () => {
    const { result } = renderHook(() => useExportar(), { wrapper });
    await result.current.descargarCronograma(PRESUPUESTO_BLOQUEADO, "xlsx");

    expect(toast.error).toHaveBeenCalledWith("Exportación bloqueada: 2 bloqueo(s)");
    expect(clicks).toHaveLength(0);
  });
});
