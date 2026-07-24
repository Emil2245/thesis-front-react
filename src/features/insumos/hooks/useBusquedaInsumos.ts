import { useQuery } from "@tanstack/react-query";
import { get } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { InsumoBusquedaResponse } from "@/api/contract";

export function useBusquedaInsumos(
  proyectoId: number,
  params: { fuente?: string; q?: string; tipo?: string },
) {
  return useQuery({
    queryKey: [...qk.insumos(proyectoId), "busqueda", params],
    queryFn: () =>
      get<InsumoBusquedaResponse[]>(`/proyectos/${proyectoId}/insumos/busqueda`, params),
    enabled: !!params.q,
  });
}
