import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getValidado, putValidado } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { ParametrosProyectoEditarRequest } from "@/api/contract";
import { parametrosProyectoSchema } from "@/api/schemas";

export function useParametros(proyectoId: string | null) {
  return useQuery({
    queryKey: qk.parametrosProyecto(proyectoId ?? ""),
    queryFn: () => getValidado(`/proyectos/${proyectoId}/parametros`, parametrosProyectoSchema),
    enabled: proyectoId != null,
  });
}

export function useActualizarParametros(proyectoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ParametrosProyectoEditarRequest) =>
      putValidado(`/proyectos/${proyectoId}/parametros`, parametrosProyectoSchema, {
        porcentajeHerramientaMenor: body.porcentajeHerramientaMenor,
        ...(body.porcentajeIndirecto !== undefined && {
          porcentajeIndirecto: body.porcentajeIndirecto,
        }),
        iva: body.iva,
        ...(body.moneda !== undefined && { moneda: body.moneda }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.parametrosProyecto(proyectoId) });
      qc.invalidateQueries({ queryKey: ["presupuesto"] });
    },
  });
}
