import type { UseFormSetError, FieldValues, Path } from "react-hook-form";
import { ApiError } from "@/api/problem";

export function aplicarErroresDeApi<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): boolean {
  if (!(error instanceof ApiError) || !error.is("validacion")) return false;
  for (const { campo, mensaje } of error.camposConError) {
    setError(campo as Path<T>, { type: "server", message: mensaje });
  }
  return error.camposConError.length > 0;
}
