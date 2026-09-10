import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getValidado, putValidado } from "@/api/request";
import { qk } from "@/api/queryKeys";
import { apuSchema, especificacionTecnicaSchema } from "@/api/schemas";

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
export function useEspecificacionTecnica(apuId: string | null) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: qk.apuEspecificacion(apuId ?? ""),
    queryFn: () => {
      if (!apuId) throw new Error("No hay un APU seleccionado.");
      return getValidado(`/apus/${apuId}/especificacion-tecnica`, especificacionTecnicaSchema);
    },
    enabled: Boolean(apuId),
  });

  const mutation = useMutation({
    mutationKey: qk.apuEspecificacion(apuId ?? ""),
    mutationFn: ({ apuId: targetApuId, texto }: GuardarEspecificacionVariables) =>
      putValidado(`/apus/${targetApuId}/especificacion-tecnica`, apuSchema, { texto }),
    onSuccess: async (_response, variables) => {
      await queryClient.invalidateQueries({
        queryKey: qk.apuEspecificacion(variables.apuId),
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
