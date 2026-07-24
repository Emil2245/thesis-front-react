import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { FirmanteResponse } from "@/api/contract";

export function useFirmantes(proyectoId: number | null) {
  return useQuery({
    queryKey: qk.firmantes(proyectoId ?? 0),
    queryFn: () => get<FirmanteResponse[]>(`/proyectos/${proyectoId}/firmantes`),
    enabled: proyectoId != null,
  });
}

export function useCrearFirmante(proyectoId: number) {
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

export function useEditarFirmante(proyectoId: number, firmanteId: number) {
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

export function useEliminarFirmante(proyectoId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (firmanteId: number) => del(`/proyectos/${proyectoId}/firmantes/${firmanteId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.firmantes(proyectoId) });
    },
  });
}
