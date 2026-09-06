import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, del } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { Page, ApuResumenResponse, ApuResponse, ApuCrearRequest } from "@/api/contract";

export function useApus(presupuestoId: string, filtros?: Record<string, unknown>) {
  return useQuery({
    queryKey: qk.apus(presupuestoId, filtros),
    queryFn: () => get<Page<ApuResumenResponse>>(`/presupuestos/${presupuestoId}/apus`, filtros),
    enabled: !!presupuestoId,
  });
}

export function useCrearApu(presupuestoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ApuCrearRequest) =>
      post<ApuResponse>(`/presupuestos/${presupuestoId}/apus`, body),
    onSuccess: (data) => {
      qc.setQueryData(qk.apu(data.id), data);
      qc.invalidateQueries({ queryKey: qk.apus(presupuestoId) });
    },
  });
}

export function useEliminarApu(presupuestoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (apuId: string) => del(`/apus/${apuId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.apus(presupuestoId) });
    },
  });
}

export function useDuplicarApu(presupuestoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (apuId: string) => post<ApuResponse>(`/apus/${apuId}/duplicar`),
    onSuccess: (data) => {
      qc.setQueryData(qk.apu(data.id), data);
      qc.invalidateQueries({ queryKey: qk.apus(presupuestoId) });
    },
  });
}
