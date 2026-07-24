import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, del } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { PlantillaApuResponse } from "@/api/contract";
import { toast } from "sonner";

export function useAdminPlantillas() {
  return useQuery({
    queryKey: qk.adminPlantillas(),
    queryFn: () => get<PlantillaApuResponse[]>("/admin/plantillas"),
  });
}

export function useCrearPlantillaSistema() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { nombre: string; descripcion?: string }) =>
      post<PlantillaApuResponse>("/admin/plantillas", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminPlantillas() });
      toast.success("Plantilla creada");
    },
    onError: () => toast.error("Error al crear plantilla"),
  });
}

export function useEliminarPlantillaSistema() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => del(`/admin/plantillas/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminPlantillas() });
      toast.success("Plantilla eliminada");
    },
    onError: () => toast.error("Error al eliminar plantilla"),
  });
}
