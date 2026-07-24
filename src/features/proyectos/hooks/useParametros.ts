import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, put } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { ParametrosProyectoResponse } from "@/api/contract";

export function useParametros(proyectoId: number | null) {
  return useQuery({
    queryKey: qk.parametrosProyecto(proyectoId ?? 0),
    queryFn: () => get<ParametrosProyectoResponse>(`/proyectos/${proyectoId}/parametros`),
    enabled: proyectoId != null,
  });
}

export function useActualizarParametros(proyectoId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      put<ParametrosProyectoResponse>(`/proyectos/${proyectoId}/parametros`, body),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: qk.parametrosProyecto(proyectoId),
      });
      qc.invalidateQueries({ queryKey: qk.apus(0) });
      qc.invalidateQueries({ queryKey: ["presupuesto"] });
    },
  });
}
