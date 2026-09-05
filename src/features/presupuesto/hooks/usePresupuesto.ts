import { useQuery } from "@tanstack/react-query";
import { get } from "@/api/request";
import { ApiError } from "@/api/problem";
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
    queryFn: async () => {
      try {
        return await get<PresupuestoVersionResponse[]>(`/proyectos/${proyectoId}/presupuestos`);
      } catch (e) {
        // El backend aún no expone esta ruta para proyectos sin presupuestos.
        if (e instanceof ApiError && e.status === 404) return [];
        throw e;
      }
    },
    enabled: proyectoId > 0,
  });
}

export function useComparacion(presupuestoId: number, conPresupuestoId?: number) {
  return useQuery({
    queryKey: [...qk.presupuesto(presupuestoId), "comparar", conPresupuestoId] as const,
    queryFn: () =>
      get<ComparacionVersionesResponse>(
        `/presupuestos/${presupuestoId}/comparar`,
        { con: conPresupuestoId },
      ),
    enabled: presupuestoId > 0 && !!conPresupuestoId,
  });
}
