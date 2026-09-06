import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";

import { crearQueryClient } from "@/test/render";
import { espiar, ultima } from "@/test/espia";
import { server } from "@/test/server";
import { INSUMO_EN_USO } from "@/test/handlers";
import {
  insumosFixture,
  basesCentralesFixture,
  importResultadoFixture,
} from "@/test/fixtures/insumos";
import { ApiError } from "@/api/problem";
import { useInsumos } from "@/features/insumos/hooks/useInsumos";
import {
  useCrearInsumo,
  useEditarInsumo,
  useEliminarInsumo,
} from "@/features/insumos/hooks/useInsumoMutaciones";
import { useBasesCentrales } from "@/features/insumos/hooks/useBasesCentrales";
import { useImportarCsv } from "@/features/insumos/hooks/useImportCsv";
import { destinoProyecto } from "@/features/insumos/destino";

const API = "*/api/v1";
const PROYECTO_ID = "018f8a10-0000-7000-8000-000000000001";
const INSUMO_ID = insumosFixture[0].id;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={crearQueryClient()}>{children}</QueryClientProvider>;
}

// Plan 057 §3: se afirma sobre la *petición* que sale (verbo, ruta, params,
// cuerpo), no sobre `isSuccess`. El mock siempre responde bien.
describe("contrato de useInsumos", () => {
  it("lista con GET /proyectos/{id}/insumos y `filtros` como query params", async () => {
    const peticiones = espiar();

    const { result } = renderHook(
      () =>
        useInsumos(PROYECTO_ID, { tipo: "MATERIAL", q: "cemento", desactualizados: true, page: 2 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const p = ultima(peticiones, "GET", `/proyectos/${PROYECTO_ID}/insumos`);
    expect(p?.url.searchParams.get("tipo")).toBe("MATERIAL");
    expect(p?.url.searchParams.get("q")).toBe("cemento");
    expect(p?.url.searchParams.get("desactualizados")).toBe("true");
    expect(p?.url.searchParams.get("page")).toBe("2");
  });

  // ponytail: defecto pinchado, no arreglado. `useInsumos` no tiene guard
  // `enabled: !!proyectoId` (sí lo tienen `useApus` y `useBusquedaParaApu`), así
  // que con el id todavía sin resolver dispara `/proyectos//insumos`, que ningún
  // handler casa y en producción es un 404. El arreglo es una línea `enabled`
  // en src/features/insumos/hooks/useInsumos.ts.
  it("sin guard `enabled`, un proyectoId vacío dispara /proyectos//insumos", async () => {
    const peticiones = espiar();
    // Se declara el handler del agujero para que el fallo sea la aserción y no
    // el `onUnhandledRequest: "error"` de MSW.
    server.use(http.get(`${API}/proyectos//insumos`, () => HttpResponse.json({ items: [] })));

    renderHook(() => useInsumos(""), { wrapper });

    await waitFor(() => expect(peticiones).not.toHaveLength(0));
    expect(peticiones[0].ruta).toBe("/api/v1/proyectos//insumos");
  });
});

describe("contrato de las mutaciones de insumo", () => {
  it("crea con POST /proyectos/{id}/insumos y el cuerpo exacto del backend", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useCrearInsumo(destinoProyecto(PROYECTO_ID)), { wrapper });
    await result.current.mutateAsync({
      codigo: "M-010",
      tipo: "MATERIAL",
      descripcion: "Cal hidratada",
      unidad: "kg",
      precioUnitario: 3.75,
    });

    const p = ultima(peticiones, "POST", `/proyectos/${PROYECTO_ID}/insumos`);
    await waitFor(() =>
      expect(p?.cuerpo).toEqual({
        codigo: "M-010",
        tipo: "MATERIAL",
        descripcion: "Cal hidratada",
        unidad: "kg",
        precioUnitario: 3.75,
      }),
    );
  });

  it("el seam rechaza `precio`, que el backend descartaba en silencio", async () => {
    const { result } = renderHook(() => useCrearInsumo(destinoProyecto(PROYECTO_ID)), { wrapper });

    await expect(
      result.current.mutateAsync({
        codigo: "M-010",
        tipo: "MATERIAL",
        descripcion: "Cal hidratada",
        unidad: "kg",
        precio: 3.75,
      } as never),
    ).rejects.toThrow();
  });

  it("edita con PUT /proyectos/{id}/insumos/{insumoId} y solo los campos editables", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useEditarInsumo(destinoProyecto(PROYECTO_ID)), { wrapper });
    await result.current.mutateAsync({
      id: INSUMO_ID,
      body: { descripcion: "Cemento Portland Tipo IP", precioUnitario: 13.9 },
    });

    const p = ultima(peticiones, "PUT", `/proyectos/${PROYECTO_ID}/insumos/${INSUMO_ID}`);
    expect(p).toBeDefined();
    await waitFor(() =>
      expect(p?.cuerpo).toEqual({ descripcion: "Cemento Portland Tipo IP", precioUnitario: 13.9 }),
    );
  });

  it("borra con DELETE /proyectos/{id}/insumos/{insumoId}", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useEliminarInsumo(destinoProyecto(PROYECTO_ID)), {
      wrapper,
    });
    await result.current.mutateAsync(INSUMO_ID);

    const p = ultima(peticiones, "DELETE", `/proyectos/${PROYECTO_ID}/insumos/${INSUMO_ID}`);
    expect(p?.ruta).toBe(`/api/v1/proyectos/${PROYECTO_ID}/insumos/${INSUMO_ID}`);
  });

  /**
   * `insumo-en-uso` no existe: cero apariciones en el backend.
   * `InsumoCrudService.eliminar` rechaza el borrado con
   * `ProblemaException.validacion(...)` —400, código `validacion`— y mete el
   * conteo en el mensaje. El cuerpo no trae ni puede traer `usos[]`.
   */
  it("el borrado de un insumo referenciado vuelve como `validacion` con el motivo", async () => {
    const { result } = renderHook(() => useEliminarInsumo(destinoProyecto(PROYECTO_ID)), {
      wrapper,
    });

    const error = await result.current.mutateAsync(INSUMO_EN_USO).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
    expect((error as ApiError).is("validacion")).toBe(true);
    expect((error as ApiError).problem.mensaje).toMatch(/referenciado en 2 parte\(s\) de APU/);
    expect((error as ApiError).problem.usos).toBeUndefined();
  });
});

describe("contrato de useBasesCentrales", () => {
  it("pide GET /bases-centrales sin anidar bajo proyecto y recibe un array", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useBasesCentrales(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(ultima(peticiones, "GET", "/bases-centrales")?.ruta).toBe("/api/v1/bases-centrales");
    expect(result.current.data).toHaveLength(basesCentralesFixture.length);
  });
});

// El parseo del CSV no vive en el hook: `AsistenteImportCsv.tsx` llama a
// `Papa.parse` solo para contar filas y manda el File crudo. El hook solo tiene
// el POST, así que aquí solo hay contrato de transporte.
describe("contrato de useImportarCsv", () => {
  it("sube a POST /proyectos/{id}/insumos/importar", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useImportarCsv(destinoProyecto(PROYECTO_ID)), { wrapper });
    const formData = new FormData();
    formData.append("archivo", new File(["codigo,descripcion\nM-001,Cemento\n"], "insumos.csv"));
    await result.current.mutateAsync({ formData });

    const p = ultima(peticiones, "POST", `/proyectos/${PROYECTO_ID}/insumos/importar`);
    expect(p?.ruta).toBe(`/api/v1/proyectos/${PROYECTO_ID}/insumos/importar`);
  });

  // Plan 062 §1: el CSV tiene que salir como multipart de verdad. Si alguien
  // vuelve a fijar `Content-Type: application/json` en la instancia axios
  // (src/api/client.ts), `transformRequest` serializa el FormData con
  // `formDataToJSON` y por el cable va `{"archivo":{}}` — el fichero se queda
  // en el suelo. Este test afirma lo contrario y se pone rojo si vuelve.
  //
  // ponytail: se mira el cuerpo crudo, no `request.formData()`. Techo del
  // entorno, no del código: en `environment: "jsdom"` el `File`/`FormData`
  // globales son los de jsdom y el `Request` es el de undici, que no reconoce
  // el `File` ajeno — pierde los bytes al serializar y `request.formData()`
  // revienta hasta con un multipart bien formado. Para leerlo como FormData
  // habría que sustituir `File`, `Blob` y `FormData` globales por los de Node
  // en el setup, y eso rompe `AsistenteImportCsv.test.tsx` (userEvent.upload y
  // FileReader quieren los de jsdom). La cabecera y el marco multipart bastan
  // para pinchar el defecto.
  it("manda el CSV como multipart, no como JSON", async () => {
    let contentType = "";
    let crudo = "";
    server.use(
      http.post(`${API}/proyectos/:id/insumos/importar`, async ({ request }) => {
        contentType = request.headers.get("content-type") ?? "";
        crudo = await request.text();
        return HttpResponse.json(importResultadoFixture);
      }),
    );

    const { result } = renderHook(() => useImportarCsv(destinoProyecto(PROYECTO_ID)), { wrapper });
    const formData = new FormData();
    formData.append("archivo", new File(["codigo,descripcion\nM-001,Cemento\n"], "insumos.csv"));
    await result.current.mutateAsync({ formData });

    expect(contentType).toMatch(/^multipart\/form-data; boundary=.+/);
    expect(crudo).toContain('name="archivo"');
    expect(crudo).not.toContain('{"archivo"');
  });
});
