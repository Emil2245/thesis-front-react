import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, put, del, post } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type {
  PlantillaApuResponse,
  PlantillaApuDetalleResponse,
  PlantillaApuCrearRequest,
  PlantillaApuEditarRequest,
} from "@/api/contract";

export function usePlantillas(tipo?: string) {
  return useQuery({
    queryKey: qk.plantillas(tipo ? { tipo } : undefined),
    queryFn: () => {
      const params = tipo ? `?tipo=${tipo}` : "";
      return get<PlantillaApuResponse[]>(`/plantillas-apu${params}`);
    },
  });
}

export function usePlantillaDetalle(id: number) {
  return useQuery({
    queryKey: ["plantilla-apu", id],
    queryFn: () => get<PlantillaApuDetalleResponse>(`/plantillas-apu/${id}`),
    enabled: id > 0,
  });
}

export function useRenombrarPlantilla() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: PlantillaApuEditarRequest }) =>
      put<PlantillaApuResponse>(`/plantillas-apu/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plantillas-apu"] });
    },
  });
}

export function useEliminarPlantilla() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => del(`/plantillas-apu/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plantillas-apu"] });
    },
  });
}

export function useGuardarPlantilla(apuId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PlantillaApuCrearRequest) =>
      post<PlantillaApuResponse>(`/apus/${apuId}/guardar-plantilla`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plantillas-apu"] });
    },
  });
}
