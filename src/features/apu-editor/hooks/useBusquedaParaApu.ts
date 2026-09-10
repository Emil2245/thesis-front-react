import { useQuery } from "@tanstack/react-query";
import { getValidado } from "@/api/request";
import { qk } from "@/api/queryKeys";
import { paginaDe, insumoBusquedaSchema } from "@/api/schemas";

interface BusquedaParams {
  proyectoId: string;
  fuente?: string;
  q?: string;
}

export function useBusquedaParaApu({ proyectoId, fuente, q }: BusquedaParams) {
  const params: Record<string, unknown> = {};
  if (q) params.q = q;
  if (fuente === "CENTRAL") params.soloCentrales = true;

  return useQuery({
    queryKey: [...qk.insumos(proyectoId, params), "selector"],
    queryFn: () =>
      getValidado(
        `/proyectos/${proyectoId}/insumos/selector`,
        paginaDe(insumoBusquedaSchema),
        params,
      ),
    enabled: !!proyectoId,
  });
}
