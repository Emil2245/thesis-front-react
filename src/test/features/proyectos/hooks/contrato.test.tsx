import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { crearQueryClient } from "@/test/render";
import { espiar, ultima, cuerpoInvalido } from "@/test/espia";
import type { ParametrosProyectoEditarRequest } from "@/api/contract";
import {
  useProyectos,
  useProyecto,
  useCrearProyecto,
  useEditarProyecto,
  useEliminarProyecto,
} from "@/features/proyectos/hooks/useProyectos";
import {
  useFirmantes,
  useCrearFirmante,
  useEditarFirmante,
  useEliminarFirmante,
} from "@/features/proyectos/hooks/useFirmantes";
import { useParametros, useActualizarParametros } from "@/features/proyectos/hooks/useParametros";
import { PROYECTO_1, FIRMANTE_2 } from "@/test/fixtures/proyectos";

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
      result.current.mutateAsync(
        cuerpoInvalido({
          nombreProyecto: "Puente Nuevo",
          anio: 2026,
          plazoEjecucion: 8,
          plazoUnidad: "MES",
          direccionInstitucional: "MTOP",
          nombre: "Puente Nuevo",
        }),
      ),
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

  // El defecto que este test cazaba **está corregido**. Cuando se escribió (plan
  // 057), `useActualizarParametros` tipaba el cuerpo como `Record<string, unknown>`
  // y reenviaba lo que le dieran, así que un parámetro inventado llegaba a la red
  // y sólo fallaba en runtime. Hoy tipa `ParametrosProyectoEditarRequest` y
  // reenvía **sólo** los cuatro campos del contrato, de modo que el campo de más
  // ya no compila ni sale del cliente.
  //
  // La garantía es la misma y sigue probada, ahora por la vía buena: se le pasa un
  // campo que el backend no conoce y se afirma que el PUT **no lo lleva**. El cast
  // es deliberado —simula a quien le pase el objeto leído tal cual— y es la única
  // forma de ejercitar el filtro desde TypeScript.
  it("el seam no reenvía un parámetro que el backend no conoce", async () => {
    const peticiones = espiar();
    const { result } = renderHook(() => useActualizarParametros(PROYECTO_1), { wrapper });

    await result.current.mutateAsync({
      porcentajeHerramientaMenor: 0.05,
      iva: 0.15,
      mostrarSeccionesVacias: true,
    } as unknown as ParametrosProyectoEditarRequest);

    const p = ultima(peticiones, "PUT", `/proyectos/${PROYECTO_1}/parametros`);
    const cuerpo = p?.cuerpo as Record<string, unknown>;
    expect(cuerpo).not.toHaveProperty("mostrarSeccionesVacias");
    expect(Object.keys(cuerpo).sort()).toEqual(["iva", "porcentajeHerramientaMenor"]);
  });
});
