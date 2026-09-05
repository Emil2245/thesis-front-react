import { useMutation, useQueryClient } from "@tanstack/react-query";
import { post, put, del } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { InsumoResponse, InsumoCrearRequest, InsumoEditarRequest } from "@/api/contract";

export function useCrearInsumo(proyectoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: InsumoCrearRequest) =>
      post<InsumoResponse>(`/proyectos/${proyectoId}/insumos`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.insumos(proyectoId) });
    },
  });
}

export function useEditarInsumo(proyectoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: InsumoEditarRequest }) =>
      put<InsumoResponse>(`/proyectos/${proyectoId}/insumos/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.insumos(proyectoId) });
    },
  });
}

export function useEliminarInsumo(proyectoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/proyectos/${proyectoId}/insumos/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.insumos(proyectoId) });
    },
  });
}
