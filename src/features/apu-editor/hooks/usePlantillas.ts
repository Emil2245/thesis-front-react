import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getValidado, putValidado, del, postValidado } from "@/api/request";
import { qk } from "@/api/queryKeys";
import { paginaDe, plantillaApuResumenSchema, plantillaApuDetalleSchema } from "@/api/schemas";
import { z } from "zod";
import type {
  BuscarPlantillasParams,
  PlantillaApuCrearRequest,
  PlantillaApuEditarRequest,
} from "@/api/contract";

export function usePlantillas(tipo?: string) {
  return useQuery({
    queryKey: qk.plantillas(tipo ? { tipo } : undefined),
    queryFn: () => {
      const params = tipo ? `?tipo=${tipo}` : "";
      return getValidado(`/plantillas-apu${params}`, z.array(plantillaApuResumenSchema));
    },
  });
}

export function useBusquedaPlantillas({ q, tipos, page = 0, size = 20 }: BuscarPlantillasParams) {
  return useQuery({
    queryKey: qk.busquedaPlantillas({ q, tipos, page, size }),
    queryFn: () => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      tipos.forEach((tipo) => params.append("tipo", tipo));
      params.set("page", String(page));
      params.set("size", String(size));
      return getValidado("/plantillas-apu/busqueda", paginaDe(plantillaApuResumenSchema), params);
    },
    enabled: tipos.length > 0,
    placeholderData: keepPreviousData,
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
