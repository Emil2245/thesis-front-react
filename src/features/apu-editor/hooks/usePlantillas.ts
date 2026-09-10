import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getValidado, putValidado, del, postValidado } from "@/api/request";
import { qk } from "@/api/queryKeys";
import { plantillaApuResumenSchema, plantillaApuDetalleSchema } from "@/api/schemas";
import { z } from "zod";
import type { PlantillaApuCrearRequest, PlantillaApuEditarRequest } from "@/api/contract";

export function usePlantillas(tipo?: string) {
  return useQuery({
    queryKey: qk.plantillas(tipo ? { tipo } : undefined),
    queryFn: () => {
      const params = tipo ? `?tipo=${tipo}` : "";
      return getValidado(`/plantillas-apu${params}`, z.array(plantillaApuResumenSchema));
    },
  });
}

export function usePlantillaDetalle(id: string | null) {
  return useQuery({
    queryKey: ["plantilla-apu", id],
    queryFn: () => getValidado(`/plantillas-apu/${id}`, plantillaApuDetalleSchema),
    enabled: !!id,
  });
}

export function useRenombrarPlantilla() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PlantillaApuEditarRequest }) =>
      putValidado(`/plantillas-apu/${id}`, plantillaApuResumenSchema, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plantillas-apu"] });
    },
  });
}

export function useEliminarPlantilla() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/plantillas-apu/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plantillas-apu"] });
    },
  });
}

export function useGuardarPlantilla(apuId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PlantillaApuCrearRequest) =>
      postValidado(`/apus/${apuId}/guardar-plantilla`, plantillaApuResumenSchema, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plantillas-apu"] });
    },
  });
}
