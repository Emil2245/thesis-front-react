import { describe, expect, it } from "vitest";
import { ApiError, PROBLEM_TYPES } from "@/api/problem";

describe("ApiError", () => {
  it("expone el slug sin el prefijo /problemas/", () => {
    const e = new ApiError({ type: "/problemas/insumo-en-uso", title: "En uso", status: 409 }, 409);
    expect(e.slug).toBe("insumo-en-uso");
    expect(e.is("insumo-en-uso")).toBe(true);
    expect(e.is("codigo-duplicado")).toBe(false);
  });

  it("devuelve [] cuando no hay errores de campo", () => {
    const e = new ApiError({ type: "/problemas/no-encontrado", title: "x", status: 404 }, 404);
    expect(e.camposConError).toEqual([]);
  });

  it("expone los errores de campo de /problemas/validacion", () => {
    const e = new ApiError(
      {
        type: "/problemas/validacion",
        title: "Datos inválidos",
        status: 400,
        errores: [{ campo: "porcentaje", mensaje: "Debe estar entre 0 % y 50 %" }],
      },
      400,
    );
    expect(e.camposConError).toHaveLength(1);
    expect(e.camposConError[0].campo).toBe("porcentaje");
  });

  it("no revienta cuando el cuerpo del error no trae type", () => {
    // `request.ts` castea sin validar: un `{}` del servidor llega hasta aquí.
    const e = new ApiError({} as never, 500);
    expect(e.slug).toBe("");
    expect(e.is("validacion")).toBe(false);
  });

  // Eran 15 hasta el plan 055: `reduccion-periodos-requiere-confirmacion` salía
  // de los docs §7 y no existe en el backend. El 409 de reconfigurar cronograma
  // se distingue por `codigo`, no por `type`, así que no entra en este catálogo.
  it("el catálogo de types coincide con architecture/07 §1", () => {
    expect(PROBLEM_TYPES).toHaveLength(14);
    expect(PROBLEM_TYPES).not.toContain("reduccion-periodos-requiere-confirmacion");
  });
});
