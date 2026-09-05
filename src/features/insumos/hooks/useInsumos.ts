import { useQuery } from "@tanstack/react-query";
import { get } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { Page, InsumoResponse } from "@/api/contract";

export function useInsumos(proyectoId: string, filtros?: Record<string, unknown>) {
  return useQuery({
    queryKey: qk.insumos(proyectoId, filtros),
    queryFn: () => get<Page<InsumoResponse>>(`/proyectos/${proyectoId}/insumos`, filtros),
  });
}
