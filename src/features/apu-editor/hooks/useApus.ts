import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, del } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { Page, ApuResumenResponse, ApuResponse, ApuCrearRequest } from "@/api/contract";

export function useApus(presupuestoId: number, filtros?: Record<string, unknown>) {
  return useQuery({
    queryKey: qk.apus(presupuestoId, filtros),
    queryFn: () => get<Page<ApuResumenResponse>>(`/presupuestos/${presupuestoId}/apus`, filtros),
    enabled: presupuestoId > 0,
  });
}

export function useCrearApu(presupuestoId: number) {
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

export function useEliminarApu(presupuestoId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (apuId: number) => del(`/apus/${apuId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.apus(presupuestoId) });
    },
  });
}

export function useDuplicarApu(presupuestoId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (apuId: number) => post<ApuResponse>(`/apus/${apuId}/duplicar`),
    onSuccess: (data) => {
      qc.setQueryData(qk.apu(data.id), data);
      qc.invalidateQueries({ queryKey: qk.apus(presupuestoId) });
    },
  });
}
