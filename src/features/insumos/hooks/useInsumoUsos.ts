import { useQuery } from "@tanstack/react-query";
import { getValidado } from "@/api/request";
import { z } from "zod";
import { insumoUsoSchema } from "@/api/schemas";
import { qk } from "@/api/queryKeys";

export function useInsumoUsos(
  proyectoId: string,
  insumoId: string,
  { habilitado = true }: { habilitado?: boolean } = {},
) {
  return useQuery({
    queryKey: qk.insumoUso(proyectoId, insumoId),
    queryFn: () =>
      getValidado(`/proyectos/${proyectoId}/insumos/${insumoId}/usos`, z.array(insumoUsoSchema)),
    enabled: habilitado,
  });
}
