import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, patch } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type {
  CronogramaResponse,
  CronogramaConfigurarRequest,
  ActividadAvanceRequest,
} from "@/api/contract";
import { toast } from "sonner";

export function useCronograma(presupuestoId: number) {
  return useQuery({
    queryKey: qk.cronograma(presupuestoId),
    queryFn: () => get<CronogramaResponse>(`/presupuestos/${presupuestoId}/cronograma`),
    enabled: presupuestoId > 0,
  });
}

export function useCrearCronograma(presupuestoId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CronogramaConfigurarRequest) =>
      post<CronogramaResponse>(`/presupuestos/${presupuestoId}/cronograma`, body),
    onSuccess: (data) => {
      qc.setQueryData(qk.cronograma(presupuestoId), data);
      toast.success("Cronograma creado");
    },
    onError: () => toast.error("Error al crear cronograma"),
  });
}

export function useConfigurarCronograma(presupuestoId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CronogramaConfigurarRequest) =>
      put<CronogramaResponse>(`/presupuestos/${presupuestoId}/cronograma`, body),
    onSuccess: (data) => {
      qc.setQueryData(qk.cronograma(presupuestoId), data);
      toast.success("Cronograma actualizado");
    },
    onError: () => toast.error("Error al configurar cronograma"),
  });
}

export function useActualizarAvance(cronogramaId: number, presupuestoId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ actividadId, body }: { actividadId: number; body: ActividadAvanceRequest }) =>
      patch<CronogramaResponse>(`/cronograma/${cronogramaId}/actividades/${actividadId}`, body),
    onSuccess: (data) => {
      qc.setQueryData(qk.cronograma(presupuestoId), data);
      toast.success("Avance actualizado");
    },
    onError: () => toast.error("Error al actualizar avance"),
  });
}

export function useRevisarCronograma(cronogramaId: number, presupuestoId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => put<CronogramaResponse>(`/cronograma/${cronogramaId}/revisar`),
    onSuccess: (data) => {
      qc.setQueryData(qk.cronograma(presupuestoId), data);
      toast.success("Cronograma revisado");
    },
    onError: () => toast.error("Error al revisar cronograma"),
  });
}
