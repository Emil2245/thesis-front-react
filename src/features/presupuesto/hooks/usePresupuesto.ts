import { useQuery } from "@tanstack/react-query";
import { getValidado } from "@/api/request";
import { qk } from "@/api/queryKeys";
import { ordenarCapitulos } from "@/lib/ordenItem";
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
    // El backend ordena por `item` como cadena (PresupuestoMapper), así que
    // "1.12" le sale antes que "1.2". El plan 033 del backend lo corrige en el
    // origen; esto deja la pantalla correcta contra cualquier versión del
    // servidor y es idempotente cuando ya viene ordenado.
    select: (p) => ({ ...p, capitulos: ordenarCapitulos(p.capitulos) }),
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
