import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";

import { crearQueryClient } from "@/test/render";
import { server } from "@/test/server";
import { espiar, ultima } from "@/test/espia";
import { ApiError } from "@/api/problem";
import {
  useCronograma,
  useCrearCronograma,
  useConfigurarCronograma,
  useActualizarAvance,
  useRevisarCronograma,
} from "@/features/cronograma/hooks/useCronograma";
import { CRONOGRAMA_ID, actividadesFixture } from "@/test/fixtures/cronograma";
import { PRESUPUESTO_V1, PRESUPUESTO_V2 } from "@/test/fixtures/presupuesto";
import { toast } from "sonner";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Patrón de MSW vs. pathname real: el primero necesita el comodín de host, las
// aserciones de ruta se hacen sobre el segundo.
const API = "*/api/v1";
const RUTA = "/api/v1";

const ACTIVIDAD = actividadesFixture[0].id;

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
  it("un 404 es «todavía no hay cronograma», no una excepción en la UI", async () => {
    const { result } = renderHook(() => useCronograma(PRESUPUESTO_V1), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
    expect((result.current.error as ApiError).status).toBe(404);
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

  // ponytail: la ruta real del backend es `/cronogramas/{id}/configuracion`; el
  // frontend manda `/cronogramas/{id}`. Se fija lo que el código hace HOY para
  // que este test se ponga rojo cuando el plan 055 mueva la ruta y obligue a
  // actualizarlo junto con el handler.
  it("configura el cronograma con PUT a /cronogramas/{id} (ruta que el plan 055 mueve)", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useConfigurarCronograma(CRONOGRAMA_ID, PRESUPUESTO_V2), {
      wrapper,
    });
    await result.current.mutateAsync({ numeroPeriodos: 6, confirmarPerdida: true });

    await waitFor(() => {
      const p = ultima(peticiones, "PUT", `/cronogramas/${CRONOGRAMA_ID}`);
      expect(p?.ruta).toBe(`${RUTA}/cronogramas/${CRONOGRAMA_ID}`);
      expect(p?.cuerpo).toEqual({ numeroPeriodos: 6, confirmarPerdida: true });
    });
  });

  it("actualiza el avance de una actividad con PATCH y solo avancePorPeriodo", async () => {
    const peticiones = espiar();

    const { result } = renderHook(() => useActualizarAvance(CRONOGRAMA_ID, PRESUPUESTO_V2), {
      wrapper,
    });
    await result.current.mutateAsync({
      actividadId: ACTIVIDAD,
      body: { avancePorPeriodo: { "1": "100.000000" as never } },
    });

    await waitFor(() => {
      const p = ultima(
        peticiones,
        "PATCH",
        `/cronogramas/${CRONOGRAMA_ID}/actividades/${ACTIVIDAD}`,
      );
      expect(p?.ruta).toBe(`${RUTA}/cronogramas/${CRONOGRAMA_ID}/actividades/${ACTIVIDAD}`);
      expect(p?.cuerpo).toEqual({ avancePorPeriodo: { "1": "100.000000" } });
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
      result.current.mutateAsync({
        unidadTiempo: "MES",
        periodos: 4,
      } as never),
    ).rejects.toThrow();
  });
});

// Los tres 409 del módulo (plan 055 §«tres 409 distintos»): solo el de creación
// pasa por GlobalExceptionMapper; los otros dos traen `codigo`/`mensaje` y no
// `type`/`title`. Hoy el hook no mira `codigo` en ninguno de los tres.
describe("useCronograma — los tres 409", () => {
  it("409 cronograma-ya-existe: hoy sale como error genérico, no como «recarga»", async () => {
    server.use(
      http.post(`${API}/presupuestos/:id/cronograma`, () =>
        HttpResponse.json(
          { type: "/problemas/cronograma-ya-existe", title: "Ya existe", status: 409 },
          { status: 409 },
        ),
      ),
    );

    const { result } = renderHook(() => useCrearCronograma(PRESUPUESTO_V2), { wrapper });
    await expect(
      result.current.mutateAsync({ unidadTiempo: "MES", numeroPeriodos: 4 }),
    ).rejects.toBeInstanceOf(ApiError);

    // ponytail: el plan 055 lo convierte en invalidar+recargar; mientras tanto
    // se fija el toast genérico para que el cambio salga en rojo aquí.
    expect(toast.error).toHaveBeenCalledWith("Error al crear cronograma");
  });

  it("409 de configuración: on409 recibe [] porque lee un campo que no existe", async () => {
    const perdidas = [{ actividadId: ACTIVIDAD, periodo: 7, valor: "12.5000" }];
    server.use(
      http.put(`${API}/cronogramas/:id`, () =>
        HttpResponse.json(
          {
            codigo: "configuracion-cronograma-requiere-confirmacion",
            mensaje: "Se perderán avances",
            perdidas,
          },
          { status: 409 },
        ),
      ),
    );

    const on409 = vi.fn();
    const { result } = renderHook(
      () => useConfigurarCronograma(CRONOGRAMA_ID, PRESUPUESTO_V2, on409),
      { wrapper },
    );
    await expect(result.current.mutateAsync({ numeroPeriodos: 2 })).rejects.toBeInstanceOf(
      ApiError,
    );

    // ponytail: el hook lee `problem.periodosAfectados`, que el backend no
    // manda; el dato real está en `perdidas`. El diálogo de confirmación se
    // abre vacío y el usuario confirma a ciegas. Lo arregla el plan 055; aquí
    // se fija el comportamiento de hoy.
    await waitFor(() => expect(on409).toHaveBeenCalledWith([]));
    expect(on409).not.toHaveBeenCalledWith(perdidas);
  });

  it("409 segmento-solapado: hoy cae en el toast genérico de avance", async () => {
    server.use(
      http.patch(`${API}/cronogramas/:id/actividades/:actId`, () =>
        HttpResponse.json(
          { codigo: "segmento-solapado", mensaje: "El segmento se solapa" },
          { status: 409 },
        ),
      ),
    );

    const { result } = renderHook(() => useActualizarAvance(CRONOGRAMA_ID, PRESUPUESTO_V2), {
      wrapper,
    });
    await expect(
      result.current.mutateAsync({
        actividadId: ACTIVIDAD,
        body: { avancePorPeriodo: { "1": "100.000000" as never } },
      }),
    ).rejects.toBeInstanceOf(ApiError);

    // ponytail: el plan 055 le da un toast propio leyendo `codigo`.
    expect(toast.error).toHaveBeenCalledWith("Error al actualizar avance");
  });
});
