import { toast } from "sonner";
import { ApiError } from "@/api/problem";

export function notificarError(error: unknown, fallback = "Ocurrió un error inesperado") {
  if (error instanceof ApiError) {
    if (error.is("validacion")) return;
    toast.error(error.problem.title, { description: error.problem.detail });
    return;
  }
  toast.error(fallback);
}
