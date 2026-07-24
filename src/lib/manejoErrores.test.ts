import { describe, expect, it } from "vitest";
import { notificarError } from "./manejoErrores";
import { ApiError } from "@/api/problem";

describe("notificarError", () => {
  it("no muestra toast para errores de validación", () => {
    const error = new ApiError(
      { type: "/problemas/validacion", title: "Datos inválidos", status: 400 },
      400,
    );
    expect(() => notificarError(error)).not.toThrow();
  });

  it("lanza toast para otros errores de API", () => {
    const error = new ApiError(
      { type: "/problemas/codigo-duplicado", title: "Código duplicado", status: 409 },
      409,
    );
    expect(() => notificarError(error)).not.toThrow();
  });
});
