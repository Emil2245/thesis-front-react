import { describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import { API_BASE_URL } from "@/lib/env";
import { DocumentoPreflightError } from "@/api/client";
import { ApiError } from "@/api/problem";
import {
  generarClaveExportacion,
  solicitarExportacion,
  navegarDescarga,
} from "@/api/exportaciones";

const ID = "0198c1a0-0000-7000-8000-000000000011";
const TOKEN = "A".repeat(43);
const DOWNLOAD = `/api/v1/documentos/descargas/${TOKEN}`;
const resultado = {
  operationId: ID,
  downloadUrl: DOWNLOAD,
  expiresAt: "2026-11-09T12:05:00Z",
  objectExpiresAt: "2026-11-10T12:00:00Z",
  filename: "presupuesto.pdf",
  mediaType: "application/pdf",
  sizeBytes: 10,
  sha256: `${"A".repeat(43)}=`,
  warnings: [],
};

describe("exportaciones privadas", () => {
  it("envía JSON autenticable con clave UUIDv7 y acepta únicamente un ticket Core relativo", async () => {
    const key = generarClaveExportacion();
    expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    const rutas: string[] = [];
    server.use(
      http.options(
        "*/api/v1/documentos/presupuesto/:id/exportaciones",
        () =>
          new HttpResponse(null, {
            status: 204,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "POST",
              "Access-Control-Allow-Headers": "Content-Type,Idempotency-Key,Authorization",
            },
          }),
      ),
      http.post("*/api/v1/documentos/presupuesto/:id/exportaciones", async ({ request }) => {
        expect(request.headers.get("Idempotency-Key")).toBe(key);
        expect(await request.json()).toEqual({ formato: "pdf", orientacion: "horizontal" });
        rutas.push(new URL(request.url).pathname);
        return HttpResponse.json(resultado, { headers: { "Access-Control-Allow-Origin": "*" } });
      }),
    );
    const response = await solicitarExportacion(
      `/documentos/presupuesto/${ID}/exportaciones`,
      { formato: "pdf", orientacion: "horizontal" },
      key,
    );
    expect(response.downloadUrl).toBe(DOWNLOAD);
    expect(rutas).toEqual([`/api/v1/documentos/presupuesto/${ID}/exportaciones`]);
  });

  it.each(["presupuesto", "apus"] as const)(
    "conserva el preflight 409 de %s y rechaza otro documento o id",
    async (documento) => {
      const preflight = {
        presupuestoId: ID,
        version: 1,
        documento,
        formato: "xlsx",
        opciones: documento === "apus" ? { layout: "pestanas" } : {},
        exportable: false,
        bloqueos: [
          {
            codigo: "pu-cero",
            mensaje: "Precio cero",
            rubros: [{ id: ID, item: "1", codigo: "R1", descripcion: "Rubro" }],
          },
        ],
        warnings: [],
      };
      let respuesta: Omit<typeof preflight, "opciones"> & {
        opciones: Record<string, string | undefined>;
      } = preflight;
      server.use(
        http.post(`*/api/v1/documentos/${documento}/${ID}/exportaciones`, () =>
          HttpResponse.json(respuesta, { status: 409 }),
        ),
      );
      const solicitar = () =>
        solicitarExportacion(
          `/documentos/${documento}/${ID}/exportaciones`,
          documento === "apus" ? { formato: "xlsx", layout: "pestanas" } : { formato: "xlsx" },
          ID,
        );
      const error = await solicitar().catch((e: unknown) => e);
      expect(error).toBeInstanceOf(DocumentoPreflightError);
      expect((error as DocumentoPreflightError).preflight).toEqual(preflight);
      respuesta = { ...preflight, documento: documento === "apus" ? "presupuesto" : "apus" };
      expect(await solicitar().catch((e: unknown) => e)).toBeInstanceOf(ApiError);
      respuesta = { ...preflight, presupuestoId: "0198c1a0-0000-7000-8000-000000000012" };
      expect(await solicitar().catch((e: unknown) => e)).toBeInstanceOf(ApiError);
      respuesta = {
        ...preflight,
        formato: "pdf",
        opciones: documento === "presupuesto" ? { orientacion: "vertical" } : {},
      };
      expect(await solicitar().catch((e: unknown) => e)).toBeInstanceOf(ApiError);
      if (documento === "apus") {
        respuesta = { ...preflight, opciones: { layout: "apilado" } };
        expect(await solicitar().catch((e: unknown) => e)).toBeInstanceOf(ApiError);
      }
    },
  );

  it.each(["idempotencia-conflicto", "exportacion-expirada"])(
    "conserva el código 409 %s",
    async (codigo) => {
      server.use(
        http.post(`*/api/v1/documentos/presupuesto/${ID}/exportaciones`, () =>
          HttpResponse.json({ codigo, mensaje: "Conflicto" }, { status: 409 }),
        ),
      );
      const error = await solicitarExportacion(
        `/documentos/presupuesto/${ID}/exportaciones`,
        { formato: "xlsx" },
        ID,
      ).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).problem.codigo).toBe(codigo);
    },
  );

  it("no navega hacia rutas externas o inválidas ni inserta enlaces antes del gesto", () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.href).toBe(new URL(API_BASE_URL).origin + DOWNLOAD);
      expect(this.rel).toContain("noreferrer");
    });
    try {
      const before = document.querySelectorAll("a").length;
      navegarDescarga(DOWNLOAD);
      expect(click).toHaveBeenCalledTimes(1);
      expect(document.querySelectorAll("a")).toHaveLength(before);
      expect(() => navegarDescarga("https://other.example/steal")).toThrow();
      expect(() => navegarDescarga("/api/v1/documentos/descargas/../other")).toThrow();
      expect(click).toHaveBeenCalledTimes(1);
    } finally {
      click.mockRestore();
    }
  });
});
