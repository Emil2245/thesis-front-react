import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getValidado, putValidado } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { ParametrosProyectoCiRequest, ParametrosProyectoEditarRequest } from "@/api/contract";
import { parametrosProyectoCiSchema, parametrosProyectoSchema } from "@/api/schemas";

export function useParametros(proyectoId: string | null) {
  return useQuery({
    queryKey: qk.parametrosProyecto(proyectoId ?? ""),
    queryFn: () => getValidado(`/proyectos/${proyectoId}/parametros`, parametrosProyectoSchema),
    enabled: proyectoId != null,
  });
}

export function useParametrosCi(proyectoId: string | null) {
  return useQuery({
    queryKey: qk.parametrosProyectoCi(proyectoId ?? ""),
    queryFn: () => getValidado(`/proyectos/${proyectoId}/ci`, parametrosProyectoCiSchema),
    enabled: proyectoId != null,
  });
}

export function useGuardarParametrosCi(proyectoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ParametrosProyectoCiRequest) =>
      putValidado(`/proyectos/${proyectoId}/ci`, parametrosProyectoCiSchema, body),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["apu"] }),
        qc.invalidateQueries({ queryKey: ["presupuesto"] }),
        qc.invalidateQueries({ queryKey: ["cronograma"] }),
        qc.invalidateQueries({ queryKey: qk.parametrosProyecto(proyectoId) }),
        qc.invalidateQueries({ queryKey: qk.parametrosProyectoCi(proyectoId) }),
      ]);
    },
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
