import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, put, del, post } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type {
  PlantillaApuResumenResponse,
  PlantillaApuDetalleResponse,
  PlantillaApuCrearRequest,
  PlantillaApuEditarRequest,
} from "@/api/contract";

export function usePlantillas(tipo?: string) {
  return useQuery({
    queryKey: qk.plantillas(tipo ? { tipo } : undefined),
    queryFn: () => {
      const params = tipo ? `?tipo=${tipo}` : "";
      return get<PlantillaApuResumenResponse[]>(`/plantillas-apu${params}`);
    },
  });
}

export function usePlantillaDetalle(id: string | null) {
  return useQuery({
    queryKey: ["plantilla-apu", id],
    queryFn: () => get<PlantillaApuDetalleResponse>(`/plantillas-apu/${id}`),
    enabled: !!id,
  });
}

export function useRenombrarPlantilla() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PlantillaApuEditarRequest }) =>
      put<PlantillaApuResumenResponse>(`/plantillas-apu/${id}`, body),
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
      post<PlantillaApuResumenResponse>(`/apus/${apuId}/guardar-plantilla`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plantillas-apu"] });
    },
  });
}
