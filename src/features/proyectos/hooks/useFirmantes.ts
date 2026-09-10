import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getValidado, postValidado, putValidado, del } from "@/api/request";
import { qk } from "@/api/queryKeys";
import { firmanteSchema } from "@/api/schemas";
import { z } from "zod";

export function useFirmantes(proyectoId: string | null) {
  return useQuery({
    queryKey: qk.firmantes(proyectoId ?? ""),
    queryFn: () => getValidado(`/proyectos/${proyectoId}/firmantes`, z.array(firmanteSchema)),
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
    }) => postValidado(`/proyectos/${proyectoId}/firmantes`, firmanteSchema, body),
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
    }) => putValidado(`/proyectos/${proyectoId}/firmantes/${firmanteId}`, firmanteSchema, body),
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
