import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getValidado, postValidado, putValidado, del } from "@/api/request";
import { qk } from "@/api/queryKeys";
import { paginaDe, proyectoSchema } from "@/api/schemas";
import type { ProyectoCrearRequest, ProyectoEditarRequest } from "@/api/contract";

export function useProyectos(filtros?: Record<string, unknown>) {
  return useQuery({
    queryKey: qk.proyectos(filtros),
    queryFn: () => getValidado("/proyectos", paginaDe(proyectoSchema), filtros),
    placeholderData: keepPreviousData,
  });
}

export function useProyecto(id: string | null) {
  return useQuery({
    queryKey: qk.proyecto(id ?? ""),
    queryFn: () => getValidado(`/proyectos/${id}`, proyectoSchema),
    enabled: id != null,
  });
}

export function useCrearProyecto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProyectoCrearRequest) => postValidado("/proyectos", proyectoSchema, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.proyectos() }),
  });
}

export function useEditarProyecto(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProyectoEditarRequest) =>
      putValidado(`/proyectos/${id}`, proyectoSchema, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.proyectos() });
      qc.invalidateQueries({ queryKey: qk.proyecto(id) });
    },
  });
}

export function useEliminarProyecto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/proyectos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.proyectos() }),
  });
}
