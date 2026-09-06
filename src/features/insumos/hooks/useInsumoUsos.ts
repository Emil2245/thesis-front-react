import { useQuery } from "@tanstack/react-query";
import { get } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { InsumoUsoResponse } from "@/api/contract";

export function useInsumoUsos(
  proyectoId: string,
  insumoId: string,
  { habilitado = true }: { habilitado?: boolean } = {},
) {
  return useQuery({
    queryKey: qk.insumoUso(proyectoId, insumoId),
    queryFn: () => get<InsumoUsoResponse[]>(`/proyectos/${proyectoId}/insumos/${insumoId}/usos`),
    enabled: habilitado,
  });
}
