import { http as mswHttp, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { server } from "@/test/server";
import { get } from "./request";
import { setAccessToken, setOnSesionExpirada, setRefrescador } from "./client";

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
