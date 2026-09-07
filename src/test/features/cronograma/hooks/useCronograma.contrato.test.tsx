import { asDecimal } from "@/lib/decimal";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";

import { crearQueryClient } from "@/test/render";
import { server } from "@/test/server";
import { espiar, ultima, cuerpoInvalido } from "@/test/espia";
import { ApiError } from "@/api/problem";
import { qk } from "@/api/queryKeys";
import {
  useCronograma,
  useCrearCronograma,
  useConfigurarCronograma,
  useProgramarActividad,
  useRevisarCronograma,
} from "@/features/cronograma/hooks/useCronograma";
import {
  ACTIVIDAD_1,
  ACTIVIDAD_3,
  CRONOGRAMA_ID,
  cronogramaFixture,
  perdidasFixture,
} from "@/test/fixtures/cronograma";
import { PRESUPUESTO_V1, PRESUPUESTO_V2 } from "@/test/fixtures/presupuesto";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// Patrón de MSW vs. pathname real: el primero necesita el comodín de host, las
// aserciones de ruta se hacen sobre el segundo.
const API = "*/api/v1";
const RUTA = "/api/v1";

const CONFIG_VALIDA = { unidadTiempo: "MES", numeroPeriodos: 4 } as const;

let cliente: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  cliente = crearQueryClient();
});

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}

// Plan 057 §«qué es un test de hook»: aquí se afirma la *petición que sale*
// (método, ruta exacta, cuerpo exacto), no `isSuccess`. El mock siempre
// responde bien, así que asertar el resultado no detecta ninguno de los
// defectos de ruta ni de nombre de campo que el plan 055 documenta.
describe("useCronograma — contrato de salida", () => {
  it("lee el cronograma del presupuesto por su UUID", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useCronograma(PRESUPUESTO_V2), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(ultima(peticiones, "GET", "/cronograma")?.ruta).toBe(
      `${RUTA}/presupuestos/${PRESUPUESTO_V2}/cronograma`,
    );
  });

  // El cronograma no se crea solo: el GET da 404 hasta el POST. Eso es el
  // estado vacío de la página, no un error que deba reventar la UI.
  it("un 404 es «todavía no hay cronograma», no un error", async () => {
    const { result } = renderHook(() => useCronograma(PRESUPUESTO_V1), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  // La otra mitad de «distinguirlo explícitamente»: si todo error se tragara
  // como estado vacío, una caída del backend se vería como «sin cronograma».
  it("un 500 sí es un error, no un estado vacío", async () => {
    server.use(
      http.get(`${API}/presupuestos/:id/cronograma`, () => HttpResponse.json({}, { status: 500 })),
    );

    const { result } = renderHook(() => useCronograma(PRESUPUESTO_V2), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as ApiError).status).toBe(500);
  });

  it("crea el cronograma con unidadTiempo y numeroPeriodos, y nada más", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useCrearCronograma(PRESUPUESTO_V2), { wrapper });
    await result.current.mutateAsync({ unidadTiempo: "SEMANA", numeroPeriodos: 12 });

    await waitFor(() => {
      const p = ultima(peticiones, "POST", `/presupuestos/${PRESUPUESTO_V2}/cronograma`);
      expect(p?.ruta).toBe(`${RUTA}/presupuestos/${PRESUPUESTO_V2}/cronograma`);
      expect(p?.cuerpo).toEqual({ unidadTiempo: "SEMANA", numeroPeriodos: 12 });
    });
  });

  // La ruta del backend lleva `/configuracion`; sin ese sufijo es un 404. Y el
  // PUT es un reemplazo completo: los dos campos son obligatorios.
  it("configura con PUT a /cronogramas/{id}/configuracion y los dos campos obligatorios", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useConfigurarCronograma(CRONOGRAMA_ID, PRESUPUESTO_V2), {
      wrapper,
    });
    await result.current.mutateAsync({ ...CONFIG_VALIDA, confirmarPerdida: true });

    await waitFor(() => {
      const p = ultima(peticiones, "PUT", /\/configuracion$/);
      expect(p?.ruta).toBe(`${RUTA}/cronogramas/${CRONOGRAMA_ID}/configuracion`);
      expect(p?.cuerpo).toEqual({ ...CONFIG_VALIDA, confirmarPerdida: true });
    });
  });

  it("marca revisado con POST y sin cuerpo", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useRevisarCronograma(CRONOGRAMA_ID, PRESUPUESTO_V2), {
      wrapper,
    });
    await result.current.mutateAsync();

    await waitFor(() => {
      const p = ultima(peticiones, "POST", `/cronogramas/${CRONOGRAMA_ID}/revisado`);
      expect(p?.ruta).toBe(`${RUTA}/cronogramas/${CRONOGRAMA_ID}/revisado`);
      expect(p?.cuerpo).toBeUndefined();
    });
  });

  // Sin esto el seam no distingue un campo mal nombrado de uno correcto: el
  // backend lo descarta en silencio y devuelve 200.
  it("el seam rechaza un campo que el backend no acepta", async () => {
    const { result } = renderHook(() => useCrearCronograma(PRESUPUESTO_V2), { wrapper });

    await expect(
      result.current.mutateAsync(
        cuerpoInvalido({
          unidadTiempo: "MES",
          periodos: 4,
        }),
      ),
    ).rejects.toThrow();
  });
});

// El PATCH no es «actualizar avances»: es una unión discriminada por
// `operacion`, y el parser rechaza toda propiedad fuera de la lista de la suya.
describe("useProgramarActividad — las cuatro operaciones", () => {
  const programar = () =>
    renderHook(() => useProgramarActividad(CRONOGRAMA_ID, PRESUPUESTO_V2), { wrapper });

  const cuerpoEnviado = async (peticiones: ReturnType<typeof espiar>, actividadId: string) => {
    let cuerpo: unknown;
    await waitFor(() => {
      const p = ultima(peticiones, "PATCH", `/actividades/${actividadId}`);
      expect(p?.ruta).toBe(`${RUTA}/cronogramas/${CRONOGRAMA_ID}/actividades/${actividadId}`);
      expect(p?.cuerpo).toBeDefined();
      cuerpo = p?.cuerpo;
    });
    return cuerpo;
  };

  it("REEMPLAZAR_AVANCES manda el mapa disperso con el discriminante", async () => {
    const peticiones = espiar();
    const { result } = programar();

    await result.current.mutateAsync({
      actividadId: ACTIVIDAD_1,
      body: {
        operacion: "REEMPLAZAR_AVANCES",
        avancePorPeriodo: { "1": asDecimal("3.6036"), "2": asDecimal("7.2072") },
      },
    });

    expect(await cuerpoEnviado(peticiones, ACTIVIDAD_1)).toEqual({
      operacion: "REEMPLAZAR_AVANCES",
      avancePorPeriodo: { "1": "3.6036", "2": "7.2072" },
    });
  });

  it("DISTRIBUIR_UNIFORME manda sólo la lista de períodos", async () => {
    const peticiones = espiar();
    const { result } = programar();

    await result.current.mutateAsync({
      actividadId: ACTIVIDAD_1,
      body: { operacion: "DISTRIBUIR_UNIFORME", periodos: [1, 2, 3] },
    });

    expect(await cuerpoEnviado(peticiones, ACTIVIDAD_1)).toEqual({
      operacion: "DISTRIBUIR_UNIFORME",
      periodos: [1, 2, 3],
    });
  });

  it("MOVER_SEGMENTO manda inicio, fin y delta", async () => {
    const peticiones = espiar();
    const { result } = programar();

    await result.current.mutateAsync({
      actividadId: ACTIVIDAD_1,
      body: { operacion: "MOVER_SEGMENTO", inicio: 1, fin: 3, delta: 1 },
    });

    expect(await cuerpoEnviado(peticiones, ACTIVIDAD_1)).toEqual({
      operacion: "MOVER_SEGMENTO",
      inicio: 1,
      fin: 3,
      delta: 1,
    });
  });

  it("REDIMENSIONAR_SEGMENTO manda el rango fuente y el nuevo", async () => {
    const peticiones = espiar();
    const { result } = programar();

    await result.current.mutateAsync({
      actividadId: ACTIVIDAD_1,
      body: {
        operacion: "REDIMENSIONAR_SEGMENTO",
        inicio: 1,
        fin: 3,
        nuevoInicio: 2,
        nuevoFin: 4,
      },
    });

    expect(await cuerpoEnviado(peticiones, ACTIVIDAD_1)).toEqual({
      operacion: "REDIMENSIONAR_SEGMENTO",
      inicio: 1,
      fin: 3,
      nuevoInicio: 2,
      nuevoFin: 4,
    });
  });

  it("el seam rechaza una propiedad que es de otra operación", async () => {
    const { result } = programar();

    await expect(
      result.current.mutateAsync({
        actividadId: ACTIVIDAD_1,
        body: cuerpoInvalido({ operacion: "DISTRIBUIR_UNIFORME", periodos: [1], delta: 2 }),
      }),
    ).rejects.toThrow();
  });

  // `"Valor de avance debe ser un decimal string"`: el parser rechaza el número
  // JSON, así que el diálogo nunca puede mandar `Number(...)`.
  it("un avance como número JSON es un 400, no un 200 silencioso", async () => {
    const { result } = programar();

    await expect(
      result.current.mutateAsync({
        actividadId: ACTIVIDAD_1,
        body: cuerpoInvalido({
          operacion: "REEMPLAZAR_AVANCES",
          avancePorPeriodo: { "1": 3.6036 },
        }),
      }),
    ).rejects.toThrow();
  });
});

// Los tres 409 del módulo se distinguen por `codigo`, nunca por `status`: el
// backend no habla Problem+JSON, emite `{codigo, mensaje}`.
describe("useCronograma — los tres 409", () => {
  it("409 cronograma-ya-existe: invalida y recarga, no muestra error", async () => {
    server.use(
      http.post(`${API}/presupuestos/:id/cronograma`, () =>
        HttpResponse.json(
          {
            codigo: "cronograma-ya-existe",
            mensaje: "El presupuesto ya tiene un cronograma configurado",
          },
          { status: 409 },
        ),
      ),
    );
    cliente.setQueryData(qk.cronograma(PRESUPUESTO_V2), cronogramaFixture);

    const { result } = renderHook(() => useCrearCronograma(PRESUPUESTO_V2), { wrapper });
    await expect(
      result.current.mutateAsync({ unidadTiempo: "MES", numeroPeriodos: 4 }),
    ).rejects.toBeInstanceOf(ApiError);

    await waitFor(() =>
      expect(cliente.getQueryState(qk.cronograma(PRESUPUESTO_V2))?.isInvalidated).toBe(true),
    );
    expect(toast.error).not.toHaveBeenCalled();
  });

  // Lo dispara el handler real al reducir períodos sin confirmar, que es la
  // regla del backend, y trae `perdidas[]` — no `periodosAfectados`.
  it("409 de configuración: on409 recibe las perdidas, no una lista vacía", async () => {
    const on409 = vi.fn();
    const { result } = renderHook(
      () => useConfigurarCronograma(CRONOGRAMA_ID, PRESUPUESTO_V2, on409),
      { wrapper },
    );

    await expect(
      result.current.mutateAsync({ unidadTiempo: "MES", numeroPeriodos: 2 }),
    ).rejects.toBeInstanceOf(ApiError);

    await waitFor(() => expect(on409).toHaveBeenCalledWith(perdidasFixture));
    expect(toast.error).not.toHaveBeenCalled();
  });

  // ACTIVIDAD_3 tiene dos segmentos, [2,2] y [4,4]: mover el primero dos
  // períodos a la derecha aterriza justo encima del segundo.
  it("409 segmento-solapado: toast propio, no el genérico", async () => {
    const { result } = renderHook(() => useProgramarActividad(CRONOGRAMA_ID, PRESUPUESTO_V2), {
      wrapper,
    });

    await expect(
      result.current.mutateAsync({
        actividadId: ACTIVIDAD_3,
        body: { operacion: "MOVER_SEGMENTO", inicio: 2, fin: 2, delta: 2 },
      }),
    ).rejects.toBeInstanceOf(ApiError);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/solapa/i)));
  });
});
