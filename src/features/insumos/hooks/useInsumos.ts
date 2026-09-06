import { useQuery } from "@tanstack/react-query";
import { getValidado } from "@/api/request";
import { qk } from "@/api/queryKeys";
import { paginaDe, insumoSchema } from "@/api/schemas";

export function useInsumos(proyectoId: string, filtros?: Record<string, unknown>) {
  return useQuery({
    queryKey: qk.insumos(proyectoId, filtros),
    queryFn: () => getValidado(`/proyectos/${proyectoId}/insumos`, paginaDe(insumoSchema), filtros),
  });
}
