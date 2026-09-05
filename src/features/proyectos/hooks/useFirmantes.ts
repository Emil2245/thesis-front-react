import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { FirmanteResponse } from "@/api/contract";

export function useFirmantes(proyectoId: string | null) {
  return useQuery({
    queryKey: qk.firmantes(proyectoId ?? ""),
    queryFn: () => get<FirmanteResponse[]>(`/proyectos/${proyectoId}/firmantes`),
    enabled: proyectoId != null,
  });
}

export function useCrearFirmante(proyectoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      nombre: string;
      cargo: string;
      rol: "CONSOLIDADO" | "APROBADO";
      orden: number;
    }) => post<FirmanteResponse>(`/proyectos/${proyectoId}/firmantes`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.firmantes(proyectoId) });
    },
  });
}

export function useEditarFirmante(proyectoId: string, firmanteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      nombre?: string;
      cargo?: string;
      rol?: "CONSOLIDADO" | "APROBADO";
      orden?: number;
    }) => put<FirmanteResponse>(`/proyectos/${proyectoId}/firmantes/${firmanteId}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.firmantes(proyectoId) });
    },
  });
}

export function useEliminarFirmante(proyectoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (firmanteId: string) => del(`/proyectos/${proyectoId}/firmantes/${firmanteId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.firmantes(proyectoId) });
    },
  });
}
