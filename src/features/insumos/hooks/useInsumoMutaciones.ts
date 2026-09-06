import { useMutation, useQueryClient } from "@tanstack/react-query";
import { post, put, del } from "@/api/request";
import type { InsumoResponse, InsumoCrearRequest, InsumoEditarRequest } from "@/api/contract";
import type { DestinoInsumos } from "../destino";

export function useCrearInsumo(destino: DestinoInsumos) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: InsumoCrearRequest) => post<InsumoResponse>(destino.ruta, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: destino.clave });
    },
  });
}

export function useEditarInsumo(destino: DestinoInsumos) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: InsumoEditarRequest }) =>
      put<InsumoResponse>(`${destino.ruta}/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: destino.clave });
    },
  });
}

export function useEliminarInsumo(destino: DestinoInsumos) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`${destino.ruta}/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: destino.clave });
    },
  });
}
