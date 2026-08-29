import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, del } from "@/api/request";
import { qk } from "@/api/queryKeys";
import { toast } from "sonner";
import type {
  PlantillaProyectoResponse,
  PlantillaProyectoCrearRequest,
  ProyectoDesdePlantillaRequest,
  ProyectoDetalleResponse,
} from "@/api/contract";

export function usePlantillasProyecto() {
  return useQuery({
    queryKey: qk.plantillasProyecto(),
    queryFn: () => get<PlantillaProyectoResponse[]>("/plantillas-proyecto"),
  });
}

export function useGuardarPlantillaProyecto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PlantillaProyectoCrearRequest) =>
      post<PlantillaProyectoResponse>("/plantillas-proyecto", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.plantillasProyecto() });
      toast.success("Plantilla guardada");
    },
    onError: () => toast.error("Error al guardar la plantilla"),
  });
}

export function useCrearDesdePlantilla() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      plantillaId,
      body,
    }: {
      plantillaId: number;
      body: ProyectoDesdePlantillaRequest;
    }) => post<ProyectoDetalleResponse>(`/proyectos/desde-plantilla/${plantillaId}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.proyectos() });
      toast.success("Proyecto creado desde la plantilla");
    },
    onError: () => toast.error("Error al crear el proyecto"),
  });
}

export function useEliminarPlantillaProyecto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => del(`/plantillas-proyecto/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.plantillasProyecto() });
      toast.success("Plantilla eliminada");
    },
    onError: () => toast.error("Error al eliminar la plantilla"),
  });
}
