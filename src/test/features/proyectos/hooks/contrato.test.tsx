import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";

import { crearQueryClient } from "@/test/render";
import { server } from "@/test/server";
import { espiar, ultima } from "@/test/espia";
import {
  useProyectos,
  useProyecto,
  useCrearProyecto,
  useEditarProyecto,
  useEliminarProyecto,
  useDuplicarProyecto,
} from "@/features/proyectos/hooks/useProyectos";
import { useSubirLogo } from "@/features/proyectos/hooks/useProyecto";
import {
  useFirmantes,
  useCrearFirmante,
  useEditarFirmante,
  useEliminarFirmante,
} from "@/features/proyectos/hooks/useFirmantes";
import { useParametros, useActualizarParametros } from "@/features/proyectos/hooks/useParametros";
import {
  usePreviewDescuento,
  useAplicarDescuento,
} from "@/features/proyectos/hooks/useDescuentoGlobal";
import { PROYECTO_1, FIRMANTE_2 } from "@/test/fixtures/proyectos";
import { PRESUPUESTO_V2 } from "@/test/fixtures/presupuesto";
import { asDecimal } from "@/lib/decimal";

const API = "*/api/v1";

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={crearQueryClient()}>{children}</QueryClientProvider>;
}

// Tests de contrato (plan 057): afirman la *petición* que sale del seam —método,
// ruta, query y cuerpo—, no `isSuccess`. Varios de estos hooks están tapados en
// la app por `<ModuloNoDisponible>`; se prueban directos con `renderHook` para
// fijar el contrato antes de que se enciendan.
describe("contrato de proyectos", () => {
  it("useProyectos manda los filtros como query params", async () => {
    const peticiones = espiar();
    const { result } = renderHook(
      () => useProyectos({ q: "puente", estado: "EN_PROCESO", page: 0 }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const p = ultima(peticiones, "GET", "/proyectos");
    expect(p?.url.searchParams.get("q")).toBe("puente");
    expect(p?.url.searchParams.get("estado")).toBe("EN_PROCESO");
    expect(p?.url.searchParams.get("page")).toBe("0");
  });

  it("useProyecto pide el detalle por UUID y no dispara con id null", async () => {
    const peticiones = espiar();
    const { result } = renderHook(() => useProyecto(null), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");

    const detalle = renderHook(() => useProyecto(PROYECTO_1), { wrapper });
    await waitFor(() => expect(detalle.result.current.isSuccess).toBe(true));
    expect(ultima(peticiones, "GET", `/proyectos/${PROYECTO_1}`)).toBeDefined();
  });

  it("useCrearProyecto hace POST /proyectos con el cuerpo exacto", async () => {
    const peticiones = espiar();
    const { result } = renderHook(() => useCrearProyecto(), { wrapper });
    const body = {
      nombreProyecto: "Puente Nuevo",
      codigo: "PN-001",
      descripcion: "Obra de prueba",
      anio: 2026,
      fechaInicio: "2026-01-15",
      plazoEjecucion: 8,
      plazoUnidad: "MES",
      direccionInstitucional: "MTOP",
      subdireccionInstitucional: "Zona 3",
    };

    await result.current.mutateAsync(body);

    await waitFor(() => expect(ultima(peticiones, "POST", "/proyectos")?.cuerpo).toEqual(body));
  });

  it("el seam rechaza un campo que el backend de proyectos no acepta", async () => {
    const { result } = renderHook(() => useCrearProyecto(), { wrapper });

    await expect(
      result.current.mutateAsync({
        nombreProyecto: "Puente Nuevo",
        anio: 2026,
        plazoEjecucion: 8,
        plazoUnidad: "MES",
        direccionInstitucional: "MTOP",
        nombre: "Puente Nuevo",
      } as never),
    ).rejects.toThrow();
  });

  it("useEditarProyecto hace PUT /proyectos/{id}", async () => {
    const peticiones = espiar();
    const { result } = renderHook(() => useEditarProyecto(PROYECTO_1), { wrapper });
    const body = { nombreProyecto: "Puente Editado", direccionInstitucional: "MTOP" };

    await result.current.mutateAsync(body);

    const p = ultima(peticiones, "PUT", `/proyectos/${PROYECTO_1}`);
    await waitFor(() => expect(p?.cuerpo).toEqual(body));
  });

  it("useEliminarProyecto hace DELETE /proyectos/{id}", async () => {
    const peticiones = espiar();
    const { result } = renderHook(() => useEliminarProyecto(), { wrapper });

    await result.current.mutateAsync(PROYECTO_1);

    expect(ultima(peticiones, "DELETE", `/proyectos/${PROYECTO_1}`)).toBeDefined();
  });

  it("useDuplicarProyecto manda solo nombre y codigo, y el id va en la ruta", async () => {
    const peticiones = espiar();
    const { result } = renderHook(() => useDuplicarProyecto(), { wrapper });

    await result.current.mutateAsync({
      id: PROYECTO_1,
      body: { nombre: "Copia", codigo: "AMB-002" },
    });

    const p = ultima(peticiones, "POST", `/proyectos/${PROYECTO_1}/duplicar`);
    await waitFor(() => expect(p?.cuerpo).toEqual({ nombre: "Copia", codigo: "AMB-002" }));
  });

  // Plan 062 §1: el logo tiene que salir como multipart de verdad. Con un
  // `Content-Type: application/json` fijado en la instancia axios, axios 1.x
  // serializa el FormData a `{"logo":{}}` y el fichero se pierde entero.
  // Sobre por qué se mira el cuerpo crudo y no `request.formData()`, ver la
  // nota de `src/test/features/insumos/hooks/contrato.test.tsx`: jsdom y
  // undici no comparten `File`, así que el FormData no sobrevive al viaje.
  it("useSubirLogo manda el fichero como multipart en PUT /proyectos/{id}/logo", async () => {
    let contentType = "";
    let crudo = "";
    server.use(
      http.put(`${API}/proyectos/:id/logo`, async ({ request }) => {
        contentType = request.headers.get("content-type") ?? "";
        crudo = await request.text();
        return HttpResponse.json(null, { status: 204 });
      }),
    );
    const peticiones = espiar();
    const { result } = renderHook(() => useSubirLogo(PROYECTO_1), { wrapper });

    await result.current.mutateAsync(new File(["x"], "logo.png", { type: "image/png" }));

    expect(ultima(peticiones, "PUT", `/proyectos/${PROYECTO_1}/logo`)).toBeDefined();
    expect(contentType).toMatch(/^multipart\/form-data; boundary=.+/);
    expect(crudo).toContain('name="logo"');
    expect(crudo).not.toContain('{"logo"');
  });
});

// Plan 057 marca `useFirmantes` como el caso con backend completo y cero tests.
describe("contrato de firmantes", () => {
  it("useFirmantes lista por proyecto y no dispara con id null", async () => {
    const peticiones = espiar();
    const { result } = renderHook(() => useFirmantes(null), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");

    const lista = renderHook(() => useFirmantes(PROYECTO_1), { wrapper });
    await waitFor(() => expect(lista.result.current.isSuccess).toBe(true));
    expect(lista.result.current.data).toHaveLength(2);
    expect(ultima(peticiones, "GET", `/proyectos/${PROYECTO_1}/firmantes`)).toBeDefined();
  });

  it("useCrearFirmante hace POST con nombre, cargo, rol y orden", async () => {
    const peticiones = espiar();
    const { result } = renderHook(() => useCrearFirmante(PROYECTO_1), { wrapper });
    const body = { nombre: "Ing. Ana", cargo: "Fiscalizadora", rol: "APROBADO" as const, orden: 2 };

    await result.current.mutateAsync(body);

    const p = ultima(peticiones, "POST", `/proyectos/${PROYECTO_1}/firmantes`);
    await waitFor(() => expect(p?.cuerpo).toEqual(body));
  });

  it("useEditarFirmante toma el firmanteId del hook, no de las variables", async () => {
    const peticiones = espiar();
    const { result } = renderHook(() => useEditarFirmante(PROYECTO_1, FIRMANTE_2), { wrapper });

    await result.current.mutateAsync({ cargo: "Supervisor" });

    const p = ultima(peticiones, "PUT", `/proyectos/${PROYECTO_1}/firmantes/${FIRMANTE_2}`);
    expect(p).toBeDefined();
    await waitFor(() => expect(p?.cuerpo).toEqual({ cargo: "Supervisor" }));
  });

  it("useEliminarFirmante hace DELETE con el firmanteId de la variable", async () => {
    const peticiones = espiar();
    const { result } = renderHook(() => useEliminarFirmante(PROYECTO_1), { wrapper });

    await result.current.mutateAsync(FIRMANTE_2);

    expect(
      ultima(peticiones, "DELETE", `/proyectos/${PROYECTO_1}/firmantes/${FIRMANTE_2}`),
    ).toBeDefined();
  });
});

describe("contrato de parámetros de proyecto", () => {
  it("useParametros pide los parámetros y no dispara con id null", async () => {
    const peticiones = espiar();
    const { result } = renderHook(() => useParametros(null), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");

    const params = renderHook(() => useParametros(PROYECTO_1), { wrapper });
    await waitFor(() => expect(params.result.current.isSuccess).toBe(true));
    expect(ultima(peticiones, "GET", `/proyectos/${PROYECTO_1}/parametros`)).toBeDefined();
  });

  it("useActualizarParametros hace PUT con los cuatro campos que acepta el backend", async () => {
    const peticiones = espiar();
    const { result } = renderHook(() => useActualizarParametros(PROYECTO_1), { wrapper });
    const body = {
      porcentajeHerramientaMenor: 0.05,
      porcentajeIndirecto: 0.15,
      iva: 0.15,
      moneda: "USD",
    };

    await result.current.mutateAsync(body);

    const p = ultima(peticiones, "PUT", `/proyectos/${PROYECTO_1}/parametros`);
    await waitFor(() => expect(p?.cuerpo).toEqual(body));
  });

  // ponytail: `useActualizarParametros` tipa el cuerpo como `Record<string, unknown>`
  // en vez de `ParametrosProyectoActualizarRequest`, así que TypeScript deja pasar
  // cualquier campo y el error solo aparece en runtime. Defecto de producción, no
  // se arregla aquí (plan 057 solo añade tests).
  it("el seam rechaza un parámetro que el backend no conoce", async () => {
    const { result } = renderHook(() => useActualizarParametros(PROYECTO_1), { wrapper });

    await expect(
      result.current.mutateAsync({ iva: 0.15, mostrarSeccionesVacias: true }),
    ).rejects.toThrow();
  });
});

describe("contrato de descuento global", () => {
  it("usePreviewDescuento hace GET con el porcentaje en la query", async () => {
    const peticiones = espiar();
    const { result } = renderHook(() => usePreviewDescuento(PRESUPUESTO_V2), { wrapper });

    await result.current.mutateAsync(0.05);

    const p = ultima(peticiones, "GET", "/descuento-global/preview");
    expect(p?.ruta).toContain(`/presupuestos/${PRESUPUESTO_V2}/`);
    expect(p?.url.searchParams.get("porcentaje")).toBe("0.05");
  });

  // ponytail: defecto de producción. `usePreviewDescuento` es un `useMutation`,
  // así que no tiene el `enabled:` que apaga las queries con id null: con
  // `presupuestoId === null` pide literalmente `/presupuestos/null/...`. Se fija
  // el comportamiento de hoy; el arreglo (guard o id no nulo) no toca a este plan.
  it("usePreviewDescuento con id null mete la cadena `null` en la ruta", async () => {
    const peticiones = espiar();
    const { result } = renderHook(() => usePreviewDescuento(null), { wrapper });

    await result.current.mutateAsync(0.05);

    expect(ultima(peticiones, "GET", "/descuento-global/preview")?.ruta).toContain(
      "/presupuestos/null/",
    );
  });

  it("useAplicarDescuento no filtra presupuestoId al cuerpo", async () => {
    const peticiones = espiar();
    const { result } = renderHook(() => useAplicarDescuento(), { wrapper });

    await result.current.mutateAsync({
      presupuestoId: PRESUPUESTO_V2,
      porcentaje: asDecimal("0.05"),
    });

    const p = ultima(peticiones, "POST", `/presupuestos/${PRESUPUESTO_V2}/descuento-global`);
    await waitFor(() => expect(p?.cuerpo).toEqual({ porcentaje: "0.05" }));
  });
});
