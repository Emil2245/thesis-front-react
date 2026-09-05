import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type {
  Page,
  ProyectoResponse,
  ProyectoDetalleResponse,
  ProyectoCrearRequest,
  ProyectoEditarRequest,
  ProyectoDuplicarRequest,
} from "@/api/contract";

export function useProyectos(filtros?: Record<string, unknown>) {
  return useQuery({
    queryKey: qk.proyectos(filtros),
    queryFn: () => get<Page<ProyectoResponse>>("/proyectos", filtros),
    placeholderData: keepPreviousData,
  });
}

export function useProyecto(id: string | null) {
  return useQuery({
    queryKey: qk.proyecto(id ?? ""),
    queryFn: () => get<ProyectoDetalleResponse>(`/proyectos/${id}`),
    enabled: id != null,
  });
}

export function useCrearProyecto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProyectoCrearRequest) => post<ProyectoDetalleResponse>("/proyectos", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.proyectos() });
    },
  });
}

export function useEditarProyecto(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProyectoEditarRequest) =>
      put<ProyectoDetalleResponse>(`/proyectos/${id}`, body),
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.proyectos() });
    },
  });
}

export function useDuplicarProyecto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ProyectoDuplicarRequest }) =>
      post<ProyectoDetalleResponse>(`/proyectos/${id}/duplicar`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.proyectos() });
    },
  });
}
