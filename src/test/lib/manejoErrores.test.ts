import { describe, expect, it, vi, beforeEach } from "vitest";
import { toast } from "sonner";
import { notificarError } from "@/lib/manejoErrores";
import { ApiError } from "@/api/problem";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("notificarError", () => {
  beforeEach(() => vi.mocked(toast.error).mockClear());

  it("muestra el `mensaje` del backend, que es lo único legible que manda", () => {
    notificarError(
      new ApiError({ codigo: "codigo-duplicado", mensaje: "El código ya existe" }, 400),
    );
    expect(toast.error).toHaveBeenCalledWith("El código ya existe");
  });

  /**
   * Se callaba los 400 suponiendo que el formulario los pintaría campo a campo
   * desde `errores[]`. Ese array no existe en `ErrorPayload`, así que el
   * usuario se quedaba sin ninguna señal de por qué había fallado.
   */
  it("también notifica los de validación", () => {
    notificarError(
      new ApiError({ codigo: "validacion", mensaje: "Las contraseñas no coinciden" }, 400),
    );
    expect(toast.error).toHaveBeenCalledWith("Las contraseñas no coinciden");
  });

  it("usa el fallback cuando el error no es del API", () => {
    notificarError(new Error("boom"), "No se pudo guardar");
    expect(toast.error).toHaveBeenCalledWith("No se pudo guardar");
  });
});
