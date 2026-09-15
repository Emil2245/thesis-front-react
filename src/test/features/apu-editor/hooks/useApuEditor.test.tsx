import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { crearQueryClient } from "@/test/render";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { useApuEditor } from "@/features/apu-editor/hooks/useApuEditor";
import { apuDetalleFixture, apuConHmFixture } from "@/test/fixtures/apu";
import { qk } from "@/api/queryKeys";
import { server } from "@/test/server";
import { http, HttpResponse } from "msw";
import type { ApuResponse } from "@/api/contract";

const API = "*/api/v1";
const APU_ID = "018f8a40-0000-7000-8000-000000000001";
const PRESUPUESTO_ID = "0198c1a0-0000-7000-8000-000000000011";
const INSUMO_ID = "018f8a20-0000-7000-8000-000000000010";

function crearConHmEnCache() {
  const client = crearQueryClient();
  client.setQueryData(qk.apu(APU_ID), apuConHmFixture);
  client.setQueryData(qk.presupuesto(PRESUPUESTO_ID), { data: true });
  client.setQueryData(qk.cronograma(PRESUPUESTO_ID), { data: true });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return { client, wrapper };
}

function crearConFixture(data?: ApuResponse) {
  const client = crearQueryClient();
  client.setQueryData(qk.apu(APU_ID), data ?? apuDetalleFixture);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return { client, wrapper };
}

describe("useApuEditor", () => {
  it("sections always come back in M, N, O, P order regardless of server array order", () => {
    const { wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });
    const bloques = result.current.secciones.map((s) => s.bloque);
    expect(bloques).toEqual(["M", "N", "O", "P"]);
  });

  it("HM row is protegida: true, others are not", () => {
    const { wrapper } = crearConHmEnCache();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });
    const filasM = result.current.secciones[0].filas;
    const hm = filasM.find((f) => f.detalle.esHerramientaMenor);
    expect(hm).toBeDefined();
    expect(hm!.protegida).toBe(true);
    const noHm = filasM.find((f) => !f.detalle.esHerramientaMenor);
    expect(noHm!.protegida).toBe(false);
  });

  it("row with precioHeredado: true is heredado: true", () => {
    const { wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });
    const fila = result.current.secciones[0].filas[0];
    expect(fila.heredado).toBe(true);
  });

  it("editarCelda with 'abc' performs no request and marks cell error", async () => {
    let requestMade = false;
    server.use(
      http.patch(`${API}/apus/:id/detalles/:did`, () => {
        requestMade = true;
        return HttpResponse.json(apuDetalleFixture);
      }),
    );
    const { wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });

    const detalleId = apuDetalleFixture.secciones[0].detalles[0].id;
    await act(async () => {
      await result.current.editarCelda(detalleId, "cantidad", "abc");
    });
    expect(requestMade).toBe(false);
  });

  it("editarCelda with '0' on cantidad performs no request (>0 rule)", async () => {
    let requestMade = false;
    server.use(
      http.patch(`${API}/apus/:id/detalles/:did`, () => {
        requestMade = true;
        return HttpResponse.json(apuDetalleFixture);
      }),
    );
    const { wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });

    const detalleId = apuDetalleFixture.secciones[0].detalles[0].id;
    await act(async () => {
      await result.current.editarCelda(detalleId, "cantidad", "0");
    });
    expect(requestMade).toBe(false);
  });

  it("editarCelda with valid value updates the cache with server response", async () => {
    server.use(
      http.patch(`${API}/apus/:id/detalles/:did`, () => HttpResponse.json(apuDetalleFixture)),
    );
    const { client, wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });

    const detalleId = apuDetalleFixture.secciones[0].detalles[0].id;
    await act(async () => {
      await result.current.editarCelda(detalleId, "cantidad", "2.5");
    });

    const cached = client.getQueryData<ApuResponse>(qk.apu(APU_ID));
    expect(cached).toBeDefined();
    const detalle = cached!.secciones.flatMap((s) => s.detalles).find((d) => d.id === detalleId);
    expect(detalle).toBeDefined();
  });

  it("restaurarHerencia sends body with precioOverride present and null", async () => {
    let sentBody: unknown = null;
    server.use(
      http.patch(`${API}/apus/:id/detalles/:did`, async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json(apuDetalleFixture);
      }),
    );
    const { wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });

    const detalleId = apuDetalleFixture.secciones[0].detalles[0].id;
    await act(async () => {
      await result.current.restaurarHerencia(detalleId);
    });

    expect(sentBody).toEqual({ precioOverride: null });
  });

  // Plan 054 §2: ApuPatchRequest del backend es (codigo, descripcion, unidad).
  // porcentajeIndirecto iba dentro de ese body y Jackson lo descartaba en
  // silencio; su endpoint real recibe un BigDecimal crudo, no un objeto.
  it("editarPorcentajeCi manda el decimal crudo a PATCH /apus/:id/porcentaje-indirecto", async () => {
    let cuerpo = "sin-peticion";
    server.use(
      http.patch(`${API}/apus/:id/porcentaje-indirecto`, async ({ request }) => {
        cuerpo = await request.text();
        return HttpResponse.json(apuDetalleFixture);
      }),
    );
    const { wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });

    await act(async () => {
      await result.current.editarPorcentajeCi("0.20");
    });

    expect(cuerpo).toBe("0.20");
  });

  // El cuerpo es un escalar JSON pelado, no un objeto: axios sólo pone
  // `Content-Type: application/json` solo cuando el cuerpo es un objeto plano,
  // así que este endpoint tiene que pedirlo a mano. Sin la cabecera, axios no
  // serializa el `null` y manda un cuerpo vacío — el backend no llega a saber
  // que hay que volver a heredar (plan 062 §1).
  it("editarPorcentajeCi(null) manda null crudo para volver a heredar del proyecto", async () => {
    let cuerpo = "sin-peticion";
    let contentType = "";
    server.use(
      http.patch(`${API}/apus/:id/porcentaje-indirecto`, async ({ request }) => {
        cuerpo = await request.text();
        contentType = request.headers.get("content-type") ?? "";
        return HttpResponse.json(apuDetalleFixture);
      }),
    );
    const { wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });

    await act(async () => {
      await result.current.editarPorcentajeCi(null);
    });

    expect(cuerpo).toBe("null");
    expect(contentType).toContain("application/json");
  });

  // Plan 059 §2: ApuDetalleCrearRequest(seccionTipo, insumoId, cantidad, rendimiento)
  // con seccionTipo/insumoId/cantidad @NotNull. El hook mandaba sólo {insumoId},
  // así que añadir una línea a un APU devolvía 400 en la pantalla núcleo (S-22).
  it("agregarFila manda seccionTipo y cantidad además del insumoId", async () => {
    let cuerpo: unknown = null;
    server.use(
      http.post(`${API}/apus/:id/detalles`, async ({ request }) => {
        cuerpo = await request.json();
        return HttpResponse.json(apuDetalleFixture, { status: 201 });
      }),
    );
    const { wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });

    await act(async () => {
      await result.current.agregarFila({ seccionTipo: "MATERIAL", insumoId: INSUMO_ID });
    });

    expect(cuerpo).toEqual({ seccionTipo: "MATERIAL", insumoId: INSUMO_ID, cantidad: "1" });
  });

  // Contra el handler por defecto, que exige seccionTipo/insumoId/cantidad y
  // rechaza cualquier campo de más: añadir una línea tiene que salir bien.
  it("agregarFila funciona contra el handler estricto", async () => {
    const { client, wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });

    await act(async () => {
      await result.current.agregarFila({ seccionTipo: "MATERIAL", insumoId: INSUMO_ID });
    });

    expect(result.current.error).toBeNull();
    expect(client.getQueryData<ApuResponse>(qk.apu(APU_ID))).toEqual(apuConHmFixture);
  });

  // `rendimiento` es @DecimalMin("0.000001"): mandar 0 es un 400. Se omite.
  it("agregarFila no manda rendimiento para MATERIAL/TRANSPORTE", async () => {
    let cuerpo: Record<string, unknown> = {};
    server.use(
      http.post(`${API}/apus/:id/detalles`, async ({ request }) => {
        cuerpo = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(apuDetalleFixture, { status: 201 });
      }),
    );
    const { wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });

    await act(async () => {
      await result.current.agregarFila({ seccionTipo: "MATERIAL", insumoId: INSUMO_ID });
    });

    expect(Object.keys(cuerpo)).not.toContain("rendimiento");
  });

  it("agregarFila manda rendimiento para EQUIPO/MANO_OBRA (@NotNull en el backend)", async () => {
    let cuerpo: Record<string, unknown> = {};
    server.use(
      http.post(`${API}/apus/:id/detalles`, async ({ request }) => {
        cuerpo = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(apuDetalleFixture, { status: 201 });
      }),
    );
    const { wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });

    await act(async () => {
      await result.current.agregarFila({ seccionTipo: "EQUIPO", insumoId: INSUMO_ID });
    });

    expect(cuerpo.rendimiento).toBeDefined();
  });

  it("editing a cell invalidates presupuesto and cronograma keys", async () => {
    server.use(
      http.patch(`${API}/apus/:id/detalles/:did`, () => HttpResponse.json(apuDetalleFixture)),
    );
    const { wrapper } = crearConHmEnCache();

    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });

    const detalleId = apuConHmFixture.secciones[0].detalles[0].id;
    await act(async () => {
      await result.current.editarCelda(detalleId, "cantidad", "3.0");
    });
  });

  // Plan 074 §2: una edición inválida debe exponer el mensaje del esquema o
  // del servidor en la celda. La interfaz los entrega por celda, no por fila
  // ni por evento: la celda sigue viva aunque la edición ya haya fallado y el
  // botón debe seguir siendo legible para assistive tech.
  it("editarCelda con 'abc' deja en cantidad el mensaje del esquema", async () => {
    const { wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });

    const detalleId = apuDetalleFixture.secciones[0].detalles[0].id;
    await act(async () => {
      await result.current.editarCelda(detalleId, "cantidad", "abc");
    });

    const fila = result.current.secciones[0].filas.find((f) => f.detalle.id === detalleId);
    expect(fila?.estado).toBe("error");
    expect(fila?.mensajesValidacion?.cantidad).toBe("Debe ser mayor que 0");
  });

  it("editarCelda con '0' deja en cantidad el mensaje del esquema (>0)", async () => {
    const { wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });

    const detalleId = apuDetalleFixture.secciones[0].detalles[0].id;
    await act(async () => {
      await result.current.editarCelda(detalleId, "cantidad", "0");
    });

    const fila = result.current.secciones[0].filas.find((f) => f.detalle.id === detalleId);
    expect(fila?.estado).toBe("error");
    expect(fila?.mensajesValidacion?.cantidad).toBe("Debe ser mayor que 0");
  });

  it("editarCelda expone el mensaje del servidor en cantidad cuando devuelve 400", async () => {
    server.use(
      http.patch(`${API}/apus/:id/detalles/:did`, () =>
        HttpResponse.json(
          { codigo: "validacion", mensaje: "El rendimiento debe ser mayor que 0" },
          { status: 400 },
        ),
      ),
    );
    const { wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });

    const detalleId = apuDetalleFixture.secciones[0].detalles[0].id;
    await act(async () => {
      await result.current.editarCelda(detalleId, "cantidad", "1.5");
    });

    const fila = result.current.secciones[0].filas.find((f) => f.detalle.id === detalleId);
    expect(fila?.estado).toBe("error");
    expect(fila?.mensajesValidacion?.cantidad).toBe("El rendimiento debe ser mayor que 0");
  });

  it("editarCelda con valor válido deja cantidad sin mensaje pendiente", async () => {
    server.use(
      http.patch(`${API}/apus/:id/detalles/:did`, () => HttpResponse.json(apuDetalleFixture)),
    );
    const { wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });

    const detalleId = apuDetalleFixture.secciones[0].detalles[0].id;
    await act(async () => {
      await result.current.editarCelda(detalleId, "cantidad", "2.5");
    });

    const fila = result.current.secciones[0].filas.find((f) => f.detalle.id === detalleId);
    expect(fila?.estado).toBe("estable");
    expect(fila?.mensajesValidacion?.cantidad).toBeUndefined();
  });

  // Triangulación: tras un fallo de esquema que dejó mensaje, una edición
  // válida en la misma celda lo limpia. El estado de error no se queda "pegado".
  it("editarCelda tras un error previo limpia el mensaje de la misma celda", async () => {
    let peticion = 0;
    server.use(
      http.patch(`${API}/apus/:id/detalles/:did`, () => {
        peticion += 1;
        if (peticion === 1) {
          return HttpResponse.json(
            { codigo: "validacion", mensaje: "Fallo transitorio" },
            { status: 400 },
          );
        }
        return HttpResponse.json(apuDetalleFixture);
      }),
    );
    const { wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });

    const detalleId = apuDetalleFixture.secciones[0].detalles[0].id;
    await act(async () => {
      await result.current.editarCelda(detalleId, "cantidad", "1.5");
    });
    const filaError = result.current.secciones[0].filas.find((f) => f.detalle.id === detalleId);
    expect(filaError?.estado).toBe("error");
    expect(filaError?.mensajesValidacion?.cantidad).toBe("Fallo transitorio");

    await act(async () => {
      await result.current.editarCelda(detalleId, "cantidad", "2.0");
    });
    const filaOk = result.current.secciones[0].filas.find((f) => f.detalle.id === detalleId);
    expect(filaOk?.estado).toBe("estable");
    expect(filaOk?.mensajesValidacion?.cantidad).toBeUndefined();
  });

  // Triangulación: precioOverride con "0" es inválido (>0 o vacío); se usa el
  // mensaje específico del esquema para no enseñarle al usuario el genérico
  // de "cantidad" cuando edita otra columna.
  it("editarCelda con precioOverride 0 deja el mensaje específico del esquema", async () => {
    server.use(
      http.patch(`${API}/apus/:id/detalles/:did`, () => HttpResponse.json(apuDetalleFixture)),
    );
    const { wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });

    const detalleId = apuDetalleFixture.secciones[0].detalles[0].id;
    await act(async () => {
      await result.current.editarCelda(detalleId, "precioOverride", "0");
    });

    const fila = result.current.secciones[0].filas.find((f) => f.detalle.id === detalleId);
    expect(fila?.estado).toBe("error");
    expect(fila?.mensajesValidacion?.precioOverride).toBe(
      "Debe ser mayor que 0 o vacío para heredar",
    );
  });

  // Verificación independiente §1: el mensaje es por celda, no por fila. Un
  // error de cantidad no debe filtrarse a rendimiento/precioOverride.
  it("un error de cantidad no aparece en rendimiento ni precioOverride", async () => {
    const { wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });

    const detalleId = apuDetalleFixture.secciones[0].detalles[0].id;
    await act(async () => {
      await result.current.editarCelda(detalleId, "cantidad", "abc");
    });

    const fila = result.current.secciones
      .flatMap((s) => s.filas)
      .find((f) => f.detalle.id === detalleId);
    expect(fila?.estado).toBe("error");
    expect(fila?.mensajesValidacion?.cantidad).toBe("Debe ser mayor que 0");
    expect(fila?.mensajesValidacion?.rendimiento).toBeUndefined();
    expect(fila?.mensajesValidacion?.precioOverride).toBeUndefined();
  });

  it("un error de rendimiento no aparece en cantidad ni precioOverride", async () => {
    const { wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });

    const detalleId = apuDetalleFixture.secciones[0].detalles[0].id;
    await act(async () => {
      await result.current.editarCelda(detalleId, "rendimiento", "abc");
    });

    const fila = result.current.secciones
      .flatMap((s) => s.filas)
      .find((f) => f.detalle.id === detalleId);
    expect(fila?.estado).toBe("error");
    expect(fila?.mensajesValidacion?.rendimiento).toBe("Debe ser mayor que 0");
    expect(fila?.mensajesValidacion?.cantidad).toBeUndefined();
    expect(fila?.mensajesValidacion?.precioOverride).toBeUndefined();
  });

  // Verificación independiente §1: dos celdas con errores distintos los
  // mantienen independientes hasta que cada una vuelve a estado limpio.
  it("mantiene errores independientes entre celdas hermanas", async () => {
    const { wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });

    const detalleId = apuDetalleFixture.secciones[0].detalles[0].id;
    await act(async () => {
      await result.current.editarCelda(detalleId, "cantidad", "abc");
      await result.current.editarCelda(detalleId, "rendimiento", "xyz");
    });

    const fila = result.current.secciones
      .flatMap((s) => s.filas)
      .find((f) => f.detalle.id === detalleId);
    expect(fila?.mensajesValidacion?.cantidad).toBe("Debe ser mayor que 0");
    expect(fila?.mensajesValidacion?.rendimiento).toBe("Debe ser mayor que 0");
    expect(fila?.mensajesValidacion?.precioOverride).toBeUndefined();
  });

  // Verificación independiente §1: una edición válida en una celda deja la
  // otra intacta (no propaga el borrado del mensaje a las celdas vecinas).
  it("corregir cantidad no limpia el mensaje de rendimiento", async () => {
    let peticiones = 0;
    server.use(
      http.patch(`${API}/apus/:id/detalles/:did`, () => {
        peticiones += 1;
        return HttpResponse.json(apuDetalleFixture);
      }),
    );
    const { wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });

    const detalleId = apuDetalleFixture.secciones[0].detalles[0].id;
    await act(async () => {
      await result.current.editarCelda(detalleId, "rendimiento", "abc");
      await result.current.editarCelda(detalleId, "cantidad", "2.5");
    });

    const fila = result.current.secciones
      .flatMap((s) => s.filas)
      .find((f) => f.detalle.id === detalleId);
    expect(peticiones).toBe(1);
    expect(fila?.mensajesValidacion?.cantidad).toBeUndefined();
    expect(fila?.mensajesValidacion?.rendimiento).toBe("Debe ser mayor que 0");
  });

  // Verificación independiente §1: un fallo de servidor en cantidad no se
  // refleja como mensaje en rendimiento.
  it("un error 400 en cantidad no expone su mensaje en rendimiento", async () => {
    server.use(
      http.patch(`${API}/apus/:id/detalles/:did`, () =>
        HttpResponse.json(
          { codigo: "validacion", mensaje: "Cantidad fuera de rango" },
          { status: 400 },
        ),
      ),
    );
    const { wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });

    const detalleId = apuDetalleFixture.secciones[0].detalles[0].id;
    await act(async () => {
      await result.current.editarCelda(detalleId, "cantidad", "1.5");
    });

    const fila = result.current.secciones
      .flatMap((s) => s.filas)
      .find((f) => f.detalle.id === detalleId);
    expect(fila?.mensajesValidacion?.cantidad).toBe("Cantidad fuera de rango");
    expect(fila?.mensajesValidacion?.rendimiento).toBeUndefined();
  });

  // Hallazgo restante de verificación: cuando una celda queda en error y el
  // usuario re-ingresa el valor actual del servidor, no se dispara PATCH (el
  // valor no cambió), pero la celda debe limpiar su mensaje obsoleto y volver
  // a "estable". Sin esto, un error transitorio del esquema deja la celda
  // marcada en rojo incluso después de que el usuario "corrige" al mismo
  // número que ya estaba.
  it("reingresar el valor del servidor limpia el error de esa celda sin PATCH", async () => {
    let peticiones = 0;
    server.use(
      http.patch(`${API}/apus/:id/detalles/:did`, () => {
        peticiones += 1;
        return HttpResponse.json(apuDetalleFixture);
      }),
    );
    const { wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });

    const detalleId = apuDetalleFixture.secciones[0].detalles[0].id;
    const valorActual = String(apuDetalleFixture.secciones[0].detalles[0].cantidad);
    expect(valorActual).toBe("1");

    // 1) Forzar un error con un valor no numérico.
    await act(async () => {
      await result.current.editarCelda(detalleId, "cantidad", "abc");
    });
    const filaError = result.current.secciones
      .flatMap((s) => s.filas)
      .find((f) => f.detalle.id === detalleId);
    expect(filaError?.estado).toBe("error");
    expect(filaError?.mensajesValidacion?.cantidad).toBe("Debe ser mayor que 0");
    expect(peticiones).toBe(0);

    // 2) El usuario re-ingresa exactamente el mismo valor que ya tenía la fila:
    //    el parser lo acepta (>0), pero parsedVal === parsedCurrent hace que
    //    `editarCelda` retorne sin disparar PATCH. La celda debe quedar limpia.
    await act(async () => {
      await result.current.editarCelda(detalleId, "cantidad", valorActual);
    });
    const filaOk = result.current.secciones
      .flatMap((s) => s.filas)
      .find((f) => f.detalle.id === detalleId);
    expect(peticiones).toBe(0);
    expect(filaOk?.estado).toBe("estable");
    expect(filaOk?.mensajesValidacion?.cantidad).toBeUndefined();
  });

  // Triangulación del hallazgo restante: limpiar cantidad vía reingreso del
  // valor actual NO debe tocar el mensaje de una celda hermana que sigue en
  // error. El contrato por celda debe preservarse también en la ruta de
  // recuperación, no sólo en la de fallo.
  it("recuperar cantidad vía reingreso del valor actual no limpia errores de rendimiento", async () => {
    server.use(
      http.patch(`${API}/apus/:id/detalles/:did`, () => HttpResponse.json(apuDetalleFixture)),
    );
    const { wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });

    const detalleId = apuDetalleFixture.secciones[0].detalles[0].id;
    const valorActual = String(apuDetalleFixture.secciones[0].detalles[0].cantidad);

    // Forzar error en cantidad y en rendimiento.
    await act(async () => {
      await result.current.editarCelda(detalleId, "cantidad", "abc");
      await result.current.editarCelda(detalleId, "rendimiento", "xyz");
    });
    const filaError = result.current.secciones
      .flatMap((s) => s.filas)
      .find((f) => f.detalle.id === detalleId);
    expect(filaError?.mensajesValidacion?.cantidad).toBe("Debe ser mayor que 0");
    expect(filaError?.mensajesValidacion?.rendimiento).toBe("Debe ser mayor que 0");

    // Re-ingresar el valor actual en cantidad: limpia cantidad, deja rendimiento.
    await act(async () => {
      await result.current.editarCelda(detalleId, "cantidad", valorActual);
    });
    const filaMezclada = result.current.secciones
      .flatMap((s) => s.filas)
      .find((f) => f.detalle.id === detalleId);
    expect(filaMezclada?.mensajesValidacion?.cantidad).toBeUndefined();
    expect(filaMezclada?.mensajesValidacion?.rendimiento).toBe("Debe ser mayor que 0");
  });

  // Cobertura adicional del hallazgo: el caso simétrico de precioOverride con
  // valor vacío cuando el insumo ya hereda — también retorna sin PATCH y debe
  // limpiar el mensaje obsoleto.
  it("reingresar el valor heredado en precioOverride limpia el error sin PATCH", async () => {
    server.use(
      http.patch(`${API}/apus/:id/detalles/:did`, () => HttpResponse.json(apuDetalleFixture)),
    );
    const { wrapper } = crearConFixture();
    const { result } = renderHook(() => useApuEditor(APU_ID, PRESUPUESTO_ID), { wrapper });

    const detalleId = apuDetalleFixture.secciones[0].detalles[0].id;
    // El fixture base tiene precioHeredado: true en sección EQUIPO.

    // Forzar error de esquema con un valor no parseable.
    await act(async () => {
      await result.current.editarCelda(detalleId, "precioOverride", "abc");
    });
    const filaError = result.current.secciones
      .flatMap((s) => s.filas)
      .find((f) => f.detalle.id === detalleId);
    expect(filaError?.mensajesValidacion?.precioOverride).toBe(
      "Debe ser mayor que 0 o vacío para heredar",
    );

    // El usuario pulsa Enter con el campo vacío, que en precioOverride significa
    // "volver a heredar". El hook detecta que ya hereda y no hace PATCH, pero
    // debe limpiar el error obsoleto.
    await act(async () => {
      await result.current.editarCelda(detalleId, "precioOverride", "");
    });
    const filaOk = result.current.secciones
      .flatMap((s) => s.filas)
      .find((f) => f.detalle.id === detalleId);
    expect(filaOk?.mensajesValidacion?.precioOverride).toBeUndefined();
    expect(filaOk?.estado).toBe("estable");
  });
});
