import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { getValidado, post, put, del } from "@/api/request";
import { baseCentralSchema } from "@/api/schemas";
import { qk } from "@/api/queryKeys";
import type { BaseInsumosResponse } from "@/api/contract";
import { toast } from "sonner";

/**
 * `AdminBaseCentralResource` (SUPER_ADMIN) vive en `/admin/bases-centrales`.
 * `/admin/bases` no existió nunca, y el listado devuelve una `List<T>` pelada:
 * tipado como `Page<T>`, la pantalla hacía `data.contenido.map` sobre
 * `undefined` y reventaba al montar.
 */
const listaDeBases = z.array(baseCentralSchema);

export function useAdminBases(filtros?: { incluirArchivadas?: boolean }) {
  return useQuery({
    queryKey: qk.adminBases(filtros),
    queryFn: () => getValidado("/admin/bases-centrales", listaDeBases, filtros),
  });
}

export function useCrearBase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { nombre: string }) =>
      post<BaseInsumosResponse>("/admin/bases-centrales", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminBases() });
      toast.success("Base creada");
    },
    onError: () => toast.error("Error al crear base"),
  });
}

export function useRenombrarBase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, nombre }: { id: string; nombre: string }) =>
      put<BaseInsumosResponse>(`/admin/bases-centrales/${id}`, { nombre }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminBases() });
      toast.success("Base renombrada");
    },
    onError: () => toast.error("Error al renombrar base"),
  });
}

export function useEliminarBase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/admin/bases-centrales/${id}`),
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
    mutationFn: (id: string) => post<BaseInsumosResponse>(`/admin/bases-centrales/${id}/archivar`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminBases() });
      toast.success("Base archivada/restaurada");
    },
    onError: () => toast.error("Error al archivar/restaurar base"),
  });
}
