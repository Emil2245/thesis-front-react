import { useQuery } from "@tanstack/react-query";
import { get } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type {
  PresupuestoResponse,
  PresupuestoVersionResponse,
  ValidacionPresupuestoResponse,
  ResumenComponentesResponse,
  ComparacionVersionesResponse,
} from "@/api/contract";

export function usePresupuesto(presupuestoId: string) {
  return useQuery({
    queryKey: qk.presupuesto(presupuestoId),
    queryFn: () => get<PresupuestoResponse>(`/presupuestos/${presupuestoId}`),
    enabled: !!presupuestoId,
  });
}

export function useResumen(presupuestoId: string) {
  return useQuery({
    queryKey: qk.presupuestoResumen(presupuestoId),
    queryFn: () => get<ResumenComponentesResponse>(`/presupuestos/${presupuestoId}/resumen`),
    enabled: !!presupuestoId,
  });
}

export function useValidacion(presupuestoId: string) {
  return useQuery({
    queryKey: qk.presupuestoValidacion(presupuestoId),
    queryFn: () => get<ValidacionPresupuestoResponse>(`/presupuestos/${presupuestoId}/validacion`),
    enabled: !!presupuestoId,
  });
}

export function useVersiones(proyectoId: string) {
  return useQuery({
    queryKey: qk.versiones(proyectoId),
    queryFn: () => get<PresupuestoVersionResponse[]>(`/proyectos/${proyectoId}/presupuestos`),
    enabled: !!proyectoId,
  });
}

export function useComparacion(presupuestoId: string, conPresupuestoId?: string) {
  return useQuery({
    queryKey: [...qk.presupuesto(presupuestoId), "comparar", conPresupuestoId] as const,
    queryFn: () =>
      get<ComparacionVersionesResponse>(`/presupuestos/${presupuestoId}/comparar`, {
        con: conPresupuestoId,
      }),
    enabled: !!presupuestoId && !!conPresupuestoId,
  });
}
