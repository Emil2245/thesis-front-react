import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { getValidado, postValidado, putValidado, del } from "@/api/request";
import { plantillaProyectoAdminSchema, paginaDe } from "@/api/schemas";
import { qk } from "@/api/queryKeys";
import type {
  PlantillaProyectoAdminEditarRequest,
  PlantillaProyectoSistemaCrearRequest,
} from "@/api/contract";
import { toast } from "sonner";

const mostrarError = (error: unknown) =>
  toast.error(error instanceof Error ? error.message : "Ocurrió un error inesperado");

/**
 * `PlantillaProyectoAdminResource` (SUPER_ADMIN, plan 044 del backend) vive en
 * `/admin/plantillas-proyecto`. Mismo molde que `usePlantillasAdmin`. Al
 * cambiar una SISTEMA también cambia el listado de `/plantillas-proyecto`,
 * que la incluye para todos los usuarios.
 */
const listaDePlantillas = paginaDe(plantillaProyectoAdminSchema);

const invalidar = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: qk.adminPlantillasProyectoFamilia() });
  qc.invalidateQueries({ queryKey: qk.plantillasProyecto() });
};

export function usePlantillasProyectoAdmin(filtros: { q?: string; page?: number } = {}) {
  const params = { q: filtros.q || undefined, page: filtros.page ?? 0, size: 25 };
  return useQuery({
    queryKey: qk.adminPlantillasProyecto(params),
    queryFn: () => getValidado("/admin/plantillas-proyecto", listaDePlantillas, params),
    placeholderData: keepPreviousData,
  });
}

export function useCrearPlantillaProyectoAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PlantillaProyectoSistemaCrearRequest) =>
      postValidado("/admin/plantillas-proyecto", plantillaProyectoAdminSchema, body),
    onSuccess: () => {
      invalidar(qc);
      toast.success("Plantilla creada");
    },
    onError: mostrarError,
  });
}

/** Semántica de presencia: sólo viajan las claves que cambian. */
export function useEditarPlantillaProyectoAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...cambios }: { id: string } & PlantillaProyectoAdminEditarRequest) =>
      putValidado(`/admin/plantillas-proyecto/${id}`, plantillaProyectoAdminSchema, cambios),
    onSuccess: () => {
      invalidar(qc);
      toast.success("Plantilla actualizada");
    },
    onError: mostrarError,
  });
}

export function useEliminarPlantillaProyectoAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/admin/plantillas-proyecto/${id}`),
    onSuccess: () => {
      invalidar(qc);
      toast.success("Plantilla eliminada");
    },
    onError: mostrarError,
  });
}
