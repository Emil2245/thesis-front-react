import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getValidado, postValidado, del } from "@/api/request";
import { qk } from "@/api/queryKeys";
import { toast } from "sonner";
import { z } from "zod";
import { plantillaProyectoSchema, proyectoDesdePlantillaSchema } from "@/api/schemas";
import type { PlantillaProyectoCrearRequest, ProyectoDesdePlantillaRequest } from "@/api/contract";

export function usePlantillasProyecto() {
  return useQuery({
    queryKey: qk.plantillasProyecto(),
    queryFn: () => getValidado("/plantillas-proyecto", z.array(plantillaProyectoSchema)),
  });
}

/** El proyecto va en la ruta: sin él no hay endpoint, así que es argumento del hook. */
export function useGuardarPlantillaProyecto(proyectoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PlantillaProyectoCrearRequest) =>
      postValidado(`/proyectos/${proyectoId}/guardar-plantilla`, plantillaProyectoSchema, body),
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
      plantillaId: string;
      body: ProyectoDesdePlantillaRequest;
      // Se devuelve el envoltorio sin aplanar: `advertencias` es información real
      // y la pantalla debe poder mostrarla más adelante.
    }) =>
      postValidado(`/proyectos/desde-plantilla/${plantillaId}`, proyectoDesdePlantillaSchema, body),
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
    mutationFn: (id: string) => del(`/plantillas-proyecto/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.plantillasProyecto() });
      toast.success("Plantilla eliminada");
    },
    onError: () => toast.error("Error al eliminar la plantilla"),
  });
}
