import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postValidado, putValidado, del } from "@/api/request";
import { copiaBaseResultadoSchema, insumoSchema } from "@/api/schemas";
import type { CopiarBaseRequest, InsumoCrearRequest, InsumoEditarRequest } from "@/api/contract";
import { qk } from "@/api/queryKeys";
import type { DestinoInsumos } from "../destino";

export function useCrearInsumo(destino: DestinoInsumos) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: InsumoCrearRequest) => postValidado(destino.ruta, insumoSchema, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: destino.clave });
    },
  });
}

export function useEditarInsumo(destino: DestinoInsumos) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: InsumoEditarRequest }) =>
      putValidado(`${destino.ruta}/${id}`, insumoSchema, body),
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

export function useCopiarBase(proyectoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CopiarBaseRequest) =>
      postValidado(`/proyectos/${proyectoId}/insumos/copiar`, copiaBaseResultadoSchema, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.insumos(proyectoId) });
    },
  });
}
