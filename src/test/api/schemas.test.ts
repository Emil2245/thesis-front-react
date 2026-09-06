import { describe, it, expect } from "vitest";
import { z } from "zod";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import { getValidado } from "@/api/request";
import { paginaDe } from "@/api/schemas";
import { ApiError } from "@/api/problem";

// Mismo comodín que src/test/handlers.ts: los handlers casan por patrón, no por host.
const API = "*/api/v1";

const paginaLaxa = paginaDe(z.unknown());
const paginaCompleta = { page: 0, size: 25, totalElementos: 1, totalPaginas: 1 };

describe("getValidado", () => {
  it("devuelve los datos cuando la respuesta casa con el schema", async () => {
    server.use(
      http.get(`${API}/cosas`, () =>
        HttpResponse.json({ contenido: [{ id: "a" }], ...paginaCompleta }),
      ),
    );

    const r = await getValidado("/cosas", paginaDe(z.object({ id: z.string() })));

    expect(r.contenido[0].id).toBe("a");
  });

  it("lanza ApiError cuando el listado no trae contenido", async () => {
    // Es exactamente lo que devolvía el catch-all de Playwright (plan 021): la
    // página reventaba con `Cannot read properties of undefined (reading 'length')`.
    server.use(http.get(`${API}/cosas`, () => HttpResponse.json({})));

    await expect(getValidado("/cosas", paginaLaxa)).rejects.toBeInstanceOf(ApiError);
  });

  it("el error nombra la URL y el campo que falta", async () => {
    server.use(http.get(`${API}/cosas`, () => HttpResponse.json({})));

    const err = (await getValidado("/cosas", paginaLaxa).catch((e: unknown) => e)) as ApiError;

    expect(err.problem.detail).toContain("/cosas");
    expect(err.problem.detail).toContain("contenido");
  });

  it("un item con el tipo equivocado también falla", async () => {
    server.use(
      http.get(`${API}/cosas`, () =>
        HttpResponse.json({ contenido: [{ id: 7 }], ...paginaCompleta }),
      ),
    );

    await expect(
      getValidado("/cosas", paginaDe(z.object({ id: z.string() }))),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("el fallo de validación no entra en el catálogo de PROBLEM_TYPES", async () => {
    // Un ApiError con un `type` desconocido no debe hacerse pasar por uno del
    // contrato: `is()` compara contra el catálogo y aquí tiene que dar false.
    server.use(http.get(`${API}/cosas`, () => HttpResponse.json({})));

    const err = (await getValidado("/cosas", paginaLaxa).catch((e: unknown) => e)) as ApiError;

    expect(err.is("validacion")).toBe(false);
    expect(err.slug).toBe("respuesta-invalida");
  });
});
