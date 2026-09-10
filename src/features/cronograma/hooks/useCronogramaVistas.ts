import { useQuery } from "@tanstack/react-query";
import { getValidado } from "@/api/request";
import { ApiError } from "@/api/problem";
import { cronogramaVistasSchema } from "@/api/schemas";
import { qk } from "@/api/queryKeys";

/**
 * Loads the read-only projection used by the Gantt, valued schedule, and S curve.
 * The backend builds all three blocks from one projection, so this hook makes one
 * request and never derives a second view on the client.
 */
export function useCronogramaVistas(cronogramaId: string) {
  return useQuery({
    queryKey: qk.cronogramaVistas(cronogramaId),
    enabled: Boolean(cronogramaId),
    queryFn: async () => {
      try {
        return await getValidado(`/cronogramas/${cronogramaId}/vistas`, cronogramaVistasSchema);
      } catch (error) {
        // A cronograma can disappear between the lookup and this projection read.
        // Keep that state distinct from a transport or contract failure.
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
  });
}
