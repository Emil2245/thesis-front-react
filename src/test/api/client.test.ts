import { http as mswHttp, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { server } from "@/test/server";
import { get } from "@/api/request";
import { setAccessToken, setOnSesionExpirada, setRefrescador } from "@/api/client";

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
