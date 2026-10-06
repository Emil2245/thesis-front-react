import { expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { DocumentoPreflightError, getAccessToken, setAccessToken } from "@/api/client";
import { ApiError } from "@/api/problem";
import { descargar } from "@/api/request";
import { tokenFixture } from "@/test/fixtures/auth";
import { PRESUPUESTO_V2, RUBRO_1_1_1 } from "@/test/fixtures/presupuesto";
import { server } from "@/test/server";

it("conserva el preflight completo del 409 al descargar APUs PDF bloqueados por P-32", async () => {
  // PresupuestoApuDocumentoResource devuelve PreflightDocumento directamente,
  // sin envoltorio ni codigo/mensaje top-level. OpcionesDocumento: APUs PDF → {}.
  const preflight = {
    presupuestoId: PRESUPUESTO_V2,
    version: 2,
    documento: "apus",
    formato: "pdf",
    opciones: {},
    exportable: false,
    bloqueos: [
      {
        codigo: "presupuesto-pu-cero",
        mensaje: "Existen rubros con precio unitario cero (P-32)",
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
  const ruta = `/api/v1/documentos/apus/${PRESUPUESTO_V2}`;
  const peticiones: Request[] = [];
  server.use(
    http.get(`*${ruta}`, ({ request }) => {
      peticiones.push(request);
      const url = new URL(request.url);
      if (
        url.pathname !== ruta ||
        JSON.stringify([...url.searchParams.entries()]) !== JSON.stringify([["formato", "pdf"]]) ||
        request.headers.get("Authorization") !== `Bearer ${tokenFixture.accessToken}`
      ) {
        return HttpResponse.json(
          { codigo: "validacion", mensaje: "Petición fuera del contrato de descarga APUs PDF" },
          { status: 400 },
        );
      }
      return HttpResponse.json(preflight, { status: 409 });
    }),
  );

  const tokenAnterior = getAccessToken();
  setAccessToken(tokenFixture.accessToken);
  try {
    // Helper e interceptor reales: ninguna sustitución del seam de descarga.
    const error: unknown = await descargar(`/documentos/apus/${PRESUPUESTO_V2}`, {
      formato: "pdf",
    }).then(
      () => {
        throw new Error("La descarga bloqueada debe rechazar, no devolver un archivo");
      },
      (rechazo: unknown) => rechazo,
    );

    expect(peticiones).toHaveLength(1);
    const request = peticiones[0];
    expect(request.method).toBe("GET");
    expect(new URL(request.url).pathname).toBe(ruta);
    expect([...new URL(request.url).searchParams.entries()]).toEqual([["formato", "pdf"]]);
    expect(request.headers.get("Authorization")).toBe(`Bearer ${tokenFixture.accessToken}`);
    expect(error).toHaveProperty("status", 409);
    // Protege todos los rubros y mensajes autoritativos, no solo el rechazo HTTP.
    // No se inventa un código de Problem ni se importa una futura clase de error.
    expect(error).toHaveProperty("preflight", preflight);
  } finally {
    setAccessToken(tokenAnterior);
  }
});

it("conserva export-inconsistente como ApiError con el payload original", async () => {
  const payload = { codigo: "export-inconsistente", mensaje: "Captura inconsistente" };
  server.use(
    http.get(`*/documentos/apus/${PRESUPUESTO_V2}`, () =>
      HttpResponse.json(payload, { status: 409 }),
    ),
  );

  const error: unknown = await descargar(`/documentos/apus/${PRESUPUESTO_V2}`, {
    formato: "pdf",
  }).catch((rechazo: unknown) => rechazo);

  expect(error).toBeInstanceOf(ApiError);
  expect(error).not.toBeInstanceOf(DocumentoPreflightError);
  expect(error).toHaveProperty("status", 409);
  expect(error).toHaveProperty("problem", payload);
});

it("rechaza como preflight un cuerpo directo con opciones incompatibles", async () => {
  server.use(
    http.get(`*/documentos/apus/${PRESUPUESTO_V2}`, () =>
      HttpResponse.json(
        {
          presupuestoId: PRESUPUESTO_V2,
          version: 2,
          documento: "apus",
          formato: "pdf",
          opciones: { layout: "pestanas" },
          exportable: false,
          bloqueos: [],
          warnings: [],
        },
        { status: 409 },
      ),
    ),
  );

  const error: unknown = await descargar(`/documentos/apus/${PRESUPUESTO_V2}`, {
    formato: "pdf",
  }).catch((rechazo: unknown) => rechazo);

  expect(error).toBeInstanceOf(ApiError);
  expect(error).not.toBeInstanceOf(DocumentoPreflightError);
  expect(error).toHaveProperty("status", 409);
  expect(error).not.toHaveProperty("preflight");
});
