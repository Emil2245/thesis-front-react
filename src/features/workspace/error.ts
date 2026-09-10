import { ApiError } from "@/api/problem";

export function mensajeCarga(error: unknown, recurso: string): string {
  if (error instanceof ApiError) {
    if (error.status === 401)
      return `Error 401: no tienes una sesión válida para consultar ${recurso}.`;
    if (error.status === 403) return `Error 403: no tienes permiso para consultar ${recurso}.`;
    if (error.status === 404) return `Error 404: no se encontró ${recurso}.`;
    if (error.slug === "respuesta-invalida") {
      return `Respuesta inválida para ${recurso}: ${error.message}`;
    }
    if (error.status >= 500) {
      return `Error ${error.status}: ${error.message || `el servidor no pudo cargar ${recurso}.`}`;
    }
    if (error.status === 0 || error.slug === "sin-respuesta") {
      return `Error de red: no se pudo conectar para cargar ${recurso}.`;
    }
    return error.message || `No se pudo cargar ${recurso}.`;
  }
  if (error instanceof Error && error.message) return error.message;
  return `No se pudo cargar ${recurso} por un error de respuesta o red.`;
}
