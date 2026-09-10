import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getEspecificacionTecnica, putEspecificacionTecnica } from "@/api/apus";
import { qk } from "@/api/queryKeys";

type GuardarEspecificacionVariables = {
  apuId: string;
  texto: string;
};

/**
 * Loads and saves an APU technical specification for a workspace consumer.
 * The consumer supplies only the selected APU id and connects `guardar` to the
 * existing specification panel; WorkspacePage should not add another query or
 * mutation for this resource.
 */
export function useEspecificacionTecnica(apuId: string | null, presupuestoId?: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: presupuestoId
      ? qk.apuEspecificacionWorkspace(presupuestoId, apuId ?? "")
      : qk.apuEspecificacion(apuId ?? ""),
    queryFn: () => {
      if (!apuId) throw new Error("No hay un APU seleccionado.");
      return getEspecificacionTecnica(apuId);
    },
    enabled: Boolean(apuId),
  });

  const mutation = useMutation({
    mutationKey: presupuestoId
      ? qk.apuEspecificacionWorkspace(presupuestoId, apuId ?? "")
      : qk.apuEspecificacion(apuId ?? ""),
    mutationFn: ({ apuId: targetApuId, texto }: GuardarEspecificacionVariables) =>
      putEspecificacionTecnica(targetApuId, texto),
    onSuccess: async (_response, variables) => {
      await queryClient.invalidateQueries({
        queryKey: presupuestoId
          ? qk.apuEspecificacionWorkspace(presupuestoId, variables.apuId)
          : qk.apuEspecificacion(variables.apuId),
      });
    },
  });

  const { mutateAsync } = mutation;
  const guardar = useCallback(
    async (texto: string): Promise<void> => {
      if (!apuId) return;
      await mutateAsync({ apuId, texto });
    },
    [apuId, mutateAsync],
  );

  return { query, mutation, guardar };
}
