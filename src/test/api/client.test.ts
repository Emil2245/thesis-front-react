import { http as mswHttp, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { server } from "@/test/server";
import { descargar, get } from "@/api/request";
import { setAccessToken, setOnSesionExpirada, setRefrescador } from "@/api/client";
import { ApiError } from "@/api/problem";

afterEach(() => {
  setAccessToken(null);
  setRefrescador(null);
  setOnSesionExpirada(null);
});

describe("interceptor de 401", () => {
  it("refresca una vez y reintenta la petición original", async () => {
    let llamadas = 0;
    server.use(
      mswHttp.get("*/perfil", () => {
        llamadas += 1;
        if (llamadas === 1) {
          return HttpResponse.json(
            { type: "/problemas/token-invalido-o-expirado", title: "x", status: 401 },
            { status: 401 },
          );
        }
        return HttpResponse.json({ id: 1, nombre: "Ana" });
      }),
    );
    const refrescar = vi.fn().mockResolvedValue("token-nuevo");
    setRefrescador(refrescar);

    await expect(get("/perfil")).resolves.toMatchObject({ id: 1 });
    expect(refrescar).toHaveBeenCalledTimes(1);
    expect(llamadas).toBe(2);
  });

  it("avisa de sesión expirada cuando el refresh falla", async () => {
    server.use(
      mswHttp.get("*/perfil", () =>
        HttpResponse.json(
          { type: "/problemas/token-invalido-o-expirado", title: "x", status: 401 },
          { status: 401 },
        ),
      ),
    );
    setRefrescador(vi.fn().mockResolvedValue(null));
    const expirada = vi.fn();
    setOnSesionExpirada(expirada);

    await expect(get("/perfil")).rejects.toThrow();
    expect(expirada).toHaveBeenCalledTimes(1);
  });
});

describe("normalización de paginado", () => {
  it("mapea { items, total } del backend a { contenido, totalElementos }", async () => {
    server.use(
      mswHttp.get("*/proyectos", () =>
        HttpResponse.json({
          items: [{ id: 1 }, { id: 2 }],
          page: 0,
          size: 25,
          total: 2,
          totalPaginas: 1,
        }),
      ),
    );

    await expect(get("/proyectos")).resolves.toEqual({
      contenido: [{ id: 1 }, { id: 2 }],
      page: 0,
      size: 25,
      totalElementos: 2,
      totalPaginas: 1,
    });
  });

  it("deja intactas las respuestas que ya traen contenido o son arreglos", async () => {
    server.use(
      mswHttp.get("*/bases-centrales", () => HttpResponse.json([{ id: 1 }])),
      mswHttp.get("*/otros", () =>
        HttpResponse.json({ contenido: [{ id: 5 }], totalElementos: 1 }),
      ),
    );

    await expect(get("/bases-centrales")).resolves.toEqual([{ id: 1 }]);
    await expect(get("/otros")).resolves.toEqual({ contenido: [{ id: 5 }], totalElementos: 1 });
  });
});

// Con `responseType: "blob"` axios entrega también el cuerpo de ERROR como
// Blob, así que el `safeParse` del interceptor fallaba siempre y CUALQUIER
// fallo de descarga se degradaba a `sin-respuesta`: el 409 `export-bloqueado`
// del cronograma perdía sus `bloqueos[]`, que son justo lo que el usuario
// necesita para desbloquear la exportación.
describe("cuerpo de error de una descarga (responseType: blob)", () => {
  it("rehidrata el JSON del Blob y conserva el superconjunto del contrato", async () => {
    const bloqueos = [
      { codigo: "presupuesto-pu-cero", actividadId: null, detalle: "Rubros con PU cero" },
      {
        codigo: "cronograma-desviacion",
        actividadId: "0198c1a4-0000-7000-8000-000000000100",
        detalle: "Desviación distinta de 0.0000",
      },
    ];
    server.use(
      mswHttp.get("*/documentos/cronograma/:id", () =>
        HttpResponse.json(
          {
            presupuestoId: "0198c1a0-0000-7000-8000-000000000011",
            formato: "xlsx",
            codigo: "export-bloqueado",
            mensaje: "Exportación bloqueada: 2 bloqueo(s)",
            bloqueos,
            warnings: [],
          },
          { status: 409 },
        ),
      ),
    );

    const error = await descargar("/documentos/cronograma/x", { formato: "xlsx" }).then(
      () => null,
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(ApiError);
    const api = error as ApiError;
    expect(api.status).toBe(409);
    expect(api.slug).toBe("export-bloqueado");
    expect(api.problem.mensaje).toBe("Exportación bloqueada: 2 bloqueo(s)");
    expect(api.problem.bloqueos).toHaveLength(bloqueos.length);
  });

  it("cae al problema sintético cuando el Blob no es JSON", async () => {
    server.use(
      mswHttp.get("*/documentos/cronograma/:id", () =>
        HttpResponse.arrayBuffer(new ArrayBuffer(8), { status: 500 }),
      ),
    );

    const error = await descargar("/documentos/cronograma/x", { formato: "pdf" }).then(
      () => null,
      (e: unknown) => e,
    );

    expect((error as ApiError).problem.codigo).toBe("sin-respuesta");
  });
});
