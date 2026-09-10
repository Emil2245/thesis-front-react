import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getValidado, post, put, del } from "@/api/request";
import { baseCentralSchema, paginaDe } from "@/api/schemas";
import { qk } from "@/api/queryKeys";
import type { BaseInsumosResponse } from "@/api/contract";
import { toast } from "sonner";

const CLAVE_FAMILIA_BASES = qk.adminBasesFamilia();

/**
 * `AdminBaseCentralResource` (SUPER_ADMIN) vive en `/admin/bases-centrales`.
 * `/admin/bases` no existió nunca. El backend devuelve `Page<T>` con
 * `{items,total,page,size,totalPaginas}` y el interceptor la normaliza una sola
 * vez al contrato interno `{contenido,totalElementos,page,size,totalPaginas}`.
 */
const listaDeBases = paginaDe(baseCentralSchema);

type FiltrosBases = { incluirArchivadas?: boolean; page?: number; size?: number };

export function useAdminBases(filtros: FiltrosBases = {}) {
  const params = {
    incluirArchivadas: filtros.incluirArchivadas ?? false,
    page: filtros.page ?? 0,
    size: filtros.size ?? 25,
  };
  return useQuery({
    queryKey: qk.adminBases(params),
    queryFn: () => getValidado("/admin/bases-centrales", listaDeBases, params),
  });
}

/** Busca una base recorriendo la página real, sin inventar un GET por id. */
export function useAdminBase(id: string) {
  return useQuery({
    queryKey: [...qk.adminBase(id), "lookup"] as const,
    enabled: Boolean(id),
    queryFn: async () => {
      let page = 0;
      while (true) {
        const resultado = await getValidado("/admin/bases-centrales", listaDeBases, {
          incluirArchivadas: true,
          page,
          size: 200,
        });
        const base = resultado.contenido.find((item) => item.id === id);
        if (base || page + 1 >= resultado.totalPaginas) return base ?? null;
        page += 1;
      }
    },
  });
}

export function useCrearBase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { nombre: string }) =>
      post<BaseInsumosResponse>("/admin/bases-centrales", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CLAVE_FAMILIA_BASES });
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
      qc.invalidateQueries({ queryKey: CLAVE_FAMILIA_BASES });
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
      qc.invalidateQueries({ queryKey: CLAVE_FAMILIA_BASES });
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
      qc.invalidateQueries({ queryKey: CLAVE_FAMILIA_BASES });
      toast.success("Base archivada/restaurada");
    },
    onError: () => toast.error("Error al archivar/restaurar base"),
  });
}
