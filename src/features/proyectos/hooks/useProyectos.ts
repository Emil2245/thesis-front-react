import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type {
  ProyectoResponse,
  ProyectoDetalleResponse,
  ProyectoCrearRequest,
  ProyectoEditarRequest,
  ProyectoDuplicarRequest,
} from "@/api/contract";

export function useProyectos(filtros?: Record<string, unknown>) {
  return useQuery({
    queryKey: qk.proyectos(filtros),
    queryFn: () => get<{ contenido: ProyectoResponse[] }>("/proyectos", filtros),
  });
}

export function useProyecto(id: number | null) {
  return useQuery({
    queryKey: qk.proyecto(id ?? 0),
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

export function useEditarProyecto(id: number) {
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
    mutationFn: (id: number) => del(`/proyectos/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.proyectos() });
    },
  });
}

export function useDuplicarProyecto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: ProyectoDuplicarRequest }) =>
      post<ProyectoDetalleResponse>(`/proyectos/${id}/duplicar`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.proyectos() });
    },
  });
}
