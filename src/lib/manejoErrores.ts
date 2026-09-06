import { toast } from "sonner";
import { ApiError } from "@/api/problem";

/**
 * `mensaje` es lo único legible que manda el backend: `ErrorPayload` son dos
 * strings y `GlobalExceptionMapper` ya lo traduce a lenguaje de dominio.
 *
 * Se cayó el `if (is("validacion")) return`: callaba el error suponiendo que el
 * formulario lo pintaría campo a campo con `errores[]`, un array que el backend
 * no manda. Sin ese array, tragarse el 400 dejaba al usuario sin ninguna señal.
 */
export function notificarError(error: unknown, fallback = "Ocurrió un error inesperado") {
  toast.error(error instanceof ApiError ? error.problem.mensaje || fallback : fallback);
}
