import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, del } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { BaseInsumosResponse, Page } from "@/api/contract";
import { toast } from "sonner";

export function useAdminBases(filtros?: Record<string, unknown>) {
  return useQuery({
    queryKey: qk.adminBases(filtros),
    queryFn: () => get<Page<BaseInsumosResponse>>("/admin/bases", filtros),
  });
}

export function useCrearBase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { nombre: string }) => post<BaseInsumosResponse>("/admin/bases", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminBases() });
      toast.success("Base creada");
    },
    onError: () => toast.error("Error al crear base"),
  });
}

export function useEliminarBase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/admin/bases/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminBases() });
      toast.success("Base eliminada");
    },
    onError: () => toast.error("Error al eliminar base"),
  });
}

export function useArchivarBase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => post<BaseInsumosResponse>(`/admin/bases/${id}/archivar`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminBases() });
      toast.success("Base archivada/restaurada");
    },
    onError: () => toast.error("Error al archivar/restaurar base"),
  });
}
