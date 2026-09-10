import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { getValidado, postValidado, putValidado, del } from "@/api/request";
import { plantillaApuAdminSchema, paginaDe } from "@/api/schemas";
import { qk } from "@/api/queryKeys";
import type { PlantillaSistemaCrearRequest, PlantillaApuAdminEditarRequest } from "@/api/contract";
import { toast } from "sonner";

const mostrarError = (error: unknown) =>
  toast.error(error instanceof Error ? error.message : "Ocurrió un error inesperado");

const CLAVE_FAMILIA_PLANTILLAS = qk.adminPlantillasFamilia();

/**
 * `PlantillaApuAdminResource` (SUPER_ADMIN) vive en `/admin/plantillas-apu`.
 * Mismo molde que `useUsuariosAdmin` (plan 077): el interceptor de
 * `client.ts` normaliza `{items,total}` → `{contenido,totalElementos}` una
 * sola vez.
 */
const listaDePlantillas = paginaDe(plantillaApuAdminSchema);

type FiltrosPlantillas = { q?: string; page?: number; size?: number };

export function usePlantillasAdmin(filtros: FiltrosPlantillas = {}) {
  const params = {
    q: filtros.q || undefined,
    // El recurso sólo admite "SISTEMA": cualquier otro valor es 400. Es
    // además el `@DefaultValue`, pero se manda explícito para que el
    // contrato saliente no dependa del default del servidor.
    tipo: "SISTEMA",
    page: filtros.page ?? 0,
    size: filtros.size ?? 25,
  };
  return useQuery({
    queryKey: qk.adminPlantillas(params),
    queryFn: () => getValidado("/admin/plantillas-apu", listaDePlantillas, params),
    placeholderData: keepPreviousData,
  });
}

export function useCrearPlantillaAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PlantillaSistemaCrearRequest) =>
      postValidado("/admin/plantillas-apu", plantillaApuAdminSchema, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CLAVE_FAMILIA_PLANTILLAS });
      toast.success("Plantilla creada");
    },
    onError: mostrarError,
  });
}

/**
 * `PUT /admin/plantillas-apu/{id}` es semántica de presencia (Patrón C en el
 * request): el llamante sólo debe incluir las claves que cambian.
 * `{ id, ...cambios }` reparte tal cual — no rellena `nombre` ni
 * `descripcionRubro` si el llamante no los puso.
 */
export function useEditarPlantillaAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...cambios }: { id: string } & PlantillaApuAdminEditarRequest) =>
      putValidado(`/admin/plantillas-apu/${id}`, plantillaApuAdminSchema, cambios),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CLAVE_FAMILIA_PLANTILLAS });
      toast.success("Plantilla actualizada");
    },
    onError: mostrarError,
  });
}

export function useEliminarPlantillaAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/admin/plantillas-apu/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CLAVE_FAMILIA_PLANTILLAS });
      toast.success("Plantilla eliminada");
    },
    onError: mostrarError,
  });
}
