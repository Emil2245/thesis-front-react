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

export function usePresupuesto(presupuestoId: number) {
  return useQuery({
    queryKey: qk.presupuesto(presupuestoId),
    queryFn: () => get<PresupuestoResponse>(`/presupuestos/${presupuestoId}`),
    enabled: presupuestoId > 0,
  });
}

export function useResumen(presupuestoId: number) {
  return useQuery({
    queryKey: qk.presupuestoResumen(presupuestoId),
    queryFn: () => get<ResumenComponentesResponse>(`/presupuestos/${presupuestoId}/resumen`),
    enabled: presupuestoId > 0,
  });
}

export function useValidacion(presupuestoId: number) {
  return useQuery({
    queryKey: qk.presupuestoValidacion(presupuestoId),
    queryFn: () => get<ValidacionPresupuestoResponse>(`/presupuestos/${presupuestoId}/validacion`),
    enabled: presupuestoId > 0,
  });
}

export function useVersiones(proyectoId: number) {
  return useQuery({
    queryKey: qk.versiones(proyectoId),
    queryFn: () => get<PresupuestoVersionResponse[]>(`/proyectos/${proyectoId}/presupuestos`),
    enabled: proyectoId > 0,
  });
}

export function useComparacion(presupuestoId: number, versionBId?: number) {
  return useQuery({
    queryKey: [...qk.presupuesto(presupuestoId), "comparar", versionBId] as const,
    queryFn: () =>
      get<ComparacionVersionesResponse>(
        `/presupuestos/${presupuestoId}/comparar`,
        versionBId ? { versionBId } : undefined,
      ),
    enabled: presupuestoId > 0 && !!versionBId,
  });
}
