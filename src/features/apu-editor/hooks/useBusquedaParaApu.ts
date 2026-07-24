import { useQuery } from "@tanstack/react-query";
import { get } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { InsumoBusquedaResponse } from "@/api/contract";

interface BusquedaParams {
  proyectoId: number;
  fuente?: string;
  q?: string;
  tipo?: string;
}

export function useBusquedaParaApu({ proyectoId, fuente, q, tipo }: BusquedaParams) {
  const params: Record<string, unknown> = {};
  if (fuente) params.fuente = fuente;
  if (q) params.q = q;
  if (tipo) params.tipo = tipo;

  return useQuery({
    queryKey: [...qk.insumos(proyectoId, params), "busqueda"],
    queryFn: () =>
      get<InsumoBusquedaResponse[]>(`/proyectos/${proyectoId}/insumos/busqueda`, params),
    enabled: proyectoId > 0,
  });
}
