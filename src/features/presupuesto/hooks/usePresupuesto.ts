import { useQuery } from "@tanstack/react-query";
import { getValidado } from "@/api/request";
import { qk } from "@/api/queryKeys";
import { z } from "zod";
import {
  presupuestoSchema,
  versionSchema,
  resumenComponentesSchema,
  validacionPresupuestoCompletaSchema,
  comparacionVersionesSchema,
} from "@/api/schemas";

export function usePresupuesto(presupuestoId: string) {
  return useQuery({
    queryKey: qk.presupuesto(presupuestoId),
    queryFn: () => getValidado(`/presupuestos/${presupuestoId}`, presupuestoSchema),
    enabled: !!presupuestoId,
  });
}

export function useResumen(presupuestoId: string) {
  return useQuery({
    queryKey: qk.presupuestoResumen(presupuestoId),
    queryFn: () => getValidado(`/presupuestos/${presupuestoId}/resumen`, resumenComponentesSchema),
    enabled: !!presupuestoId,
  });
}

export function useValidacion(presupuestoId: string) {
  return useQuery({
    queryKey: qk.presupuestoValidacion(presupuestoId),
    queryFn: () =>
      getValidado(`/presupuestos/${presupuestoId}/validacion`, validacionPresupuestoCompletaSchema),
    enabled: !!presupuestoId,
  });
}

export function useVersiones(proyectoId: string) {
  return useQuery({
    queryKey: qk.versiones(proyectoId),
    queryFn: () => getValidado(`/proyectos/${proyectoId}/presupuestos`, z.array(versionSchema)),
    enabled: !!proyectoId,
  });
}

export function useComparacion(presupuestoId: string, conPresupuestoId?: string) {
  return useQuery({
    queryKey: [...qk.presupuesto(presupuestoId), "comparar", conPresupuestoId] as const,
    queryFn: () =>
      getValidado(`/presupuestos/${presupuestoId}/comparar`, comparacionVersionesSchema, {
        con: conPresupuestoId,
      }),
    enabled: !!presupuestoId && !!conPresupuestoId,
  });
}
