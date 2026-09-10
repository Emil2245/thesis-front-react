import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getValidado } from "@/api/request";
import { logActividadSchema, paginaDe } from "@/api/schemas";
import { qk } from "@/api/queryKeys";

/**
 * `LogActividadResource` (SUPER_ADMIN) vive en `/admin/logs`. Mismo molde que
 * `useValoresReferencia` (plan 079): el interceptor de `client.ts` normaliza
 * `{items,total}` → `{contenido,totalElementos}` una sola vez. Es sólo
 * lectura: no hay mutaciones en este recurso.
 */
const listaDeLogs = paginaDe(logActividadSchema);

type FiltrosLogs = {
  usuarioId?: string;
  evento?: string;
  desde?: string;
  hasta?: string;
  page?: number;
  size?: number;
};

/**
 * Sólo se serializan los filtros presentes: un `evento=""` no casa
 * `^[a-z0-9._-]+$` en el backend y sería un 400 gratis (§09 del plan 080).
 */
export function useLogsActividad(filtros: FiltrosLogs = {}) {
  const params = {
    ...(filtros.usuarioId ? { usuarioId: filtros.usuarioId } : {}),
    ...(filtros.evento ? { evento: filtros.evento } : {}),
    ...(filtros.desde ? { desde: filtros.desde } : {}),
    ...(filtros.hasta ? { hasta: filtros.hasta } : {}),
    page: filtros.page ?? 0,
    size: filtros.size ?? 25,
  };
  return useQuery({
    queryKey: qk.adminLogs(params),
    queryFn: () => getValidado("/admin/logs", listaDeLogs, params),
    placeholderData: keepPreviousData,
  });
}
