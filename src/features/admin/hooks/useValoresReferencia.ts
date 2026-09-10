import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { getValidado, putValidadoConEstado, del } from "@/api/request";
import { valorReferenciaSchema, paginaDe } from "@/api/schemas";
import { qk } from "@/api/queryKeys";
import type { ValorReferenciaEditarRequest } from "@/api/contract";
import { toast } from "sonner";

const mostrarError = (error: unknown) =>
  toast.error(error instanceof Error ? error.message : "Ocurrió un error inesperado");

const CLAVE_FAMILIA_VALORES = qk.adminValoresFamilia();

/**
 * `ValorReferenciaAdminResource` (SUPER_ADMIN) vive en
 * `/admin/valores-referencia`. Mismo molde que `usePlantillasAdmin` (plan
 * 078): el interceptor de `client.ts` normaliza `{items,total}` →
 * `{contenido,totalElementos}` una sola vez.
 *
 * El recurso sólo admite `page`/`size` — no hay `q`, no lo inventes (§5 del
 * plan 079).
 */
const listaDeValores = paginaDe(valorReferenciaSchema);

type FiltrosValores = { page?: number; size?: number };

export function useValoresReferencia(filtros: FiltrosValores = {}) {
  const params = { page: filtros.page ?? 0, size: filtros.size ?? 25 };
  return useQuery({
    queryKey: qk.adminValores(params),
    queryFn: () => getValidado("/admin/valores-referencia", listaDeValores, params),
    placeholderData: keepPreviousData,
  });
}

/**
 * `PUT /admin/valores-referencia/{clave}` es un upsert: 201 si la clave no
 * existía, 200 si ya existía (§9bis del plan 079). El backend lo señala
 * únicamente por el status — nunca lo infieras mirando si la clave ya estaba
 * en la lista cargada, eso es adivinar. `putValidadoConEstado` expone `creado`
 * para que la UI distinga el mensaje.
 */
export function useGuardarValorReferencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ clave, ...body }: { clave: string } & ValorReferenciaEditarRequest) =>
      putValidadoConEstado(
        `/admin/valores-referencia/${encodeURIComponent(clave)}`,
        valorReferenciaSchema,
        body,
      ),
    onSuccess: ({ creado }) => {
      qc.invalidateQueries({ queryKey: CLAVE_FAMILIA_VALORES });
      toast.success(creado ? "Valor creado" : "Valor actualizado");
    },
    onError: mostrarError,
  });
}

export function useEliminarValorReferencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (clave: string) => del(`/admin/valores-referencia/${encodeURIComponent(clave)}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CLAVE_FAMILIA_VALORES });
      toast.success("Valor eliminado");
    },
    onError: mostrarError,
  });
}
