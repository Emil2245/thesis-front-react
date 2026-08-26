import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, patch } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type {
  CronogramaResponse,
  CronogramaCrearRequest,
  CronogramaConfigurarRequest,
  ActividadAvanceRequest,
} from "@/api/contract";
import { ApiError } from "@/api/problem";
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
    mutationFn: (body: CronogramaCrearRequest) =>
      post<CronogramaResponse>(`/presupuestos/${presupuestoId}/cronograma`, body),
    onSuccess: (data) => {
      qc.setQueryData(qk.cronograma(presupuestoId), data);
      toast.success("Cronograma creado");
    },
    onError: () => toast.error("Error al crear cronograma"),
  });
}

export function useConfigurarCronograma(
  cronogramaId: number,
  presupuestoId: number,
  on409?: (periodosAfectados: string[]) => void,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CronogramaConfigurarRequest) =>
      put<CronogramaResponse>(`/cronogramas/${cronogramaId}`, body),
    onSuccess: (data) => {
      qc.setQueryData(qk.cronograma(presupuestoId), data);
      toast.success("Cronograma actualizado");
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409 && on409) {
        const periodos = (err.problem as Record<string, unknown>).periodosAfectados;
        on409(Array.isArray(periodos) ? (periodos as string[]) : []);
      } else {
        toast.error("Error al configurar cronograma");
      }
    },
  });
}

export function useActualizarAvance(cronogramaId: number, presupuestoId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ actividadId, body }: { actividadId: number; body: ActividadAvanceRequest }) =>
      patch<CronogramaResponse>(`/cronogramas/${cronogramaId}/actividades/${actividadId}`, body),
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
    mutationFn: () => post<CronogramaResponse>(`/cronogramas/${cronogramaId}/revisado`),
    onSuccess: (data) => {
      qc.setQueryData(qk.cronograma(presupuestoId), data);
      toast.success("Cronograma revisado");
    },
    onError: () => toast.error("Error al revisar cronograma"),
  });
}
