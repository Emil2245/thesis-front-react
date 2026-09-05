import { useQuery } from "@tanstack/react-query";
import { get } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { InsumoBusquedaResponse, Page } from "@/api/contract";

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
      get<Page<InsumoBusquedaResponse>>(`/proyectos/${proyectoId}/insumos/selector`, params),
    enabled: !!proyectoId,
  });
}
