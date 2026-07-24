import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, patch, del } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type {
  UsuarioAdminResponse,
  UsuarioInvitarRequest,
  UsuarioAdminEditarRequest,
  Page,
} from "@/api/contract";
import { toast } from "sonner";

export function useAdminUsuarios(filtros?: Record<string, unknown>) {
  return useQuery({
    queryKey: qk.adminUsuarios(filtros),
    queryFn: () => get<Page<UsuarioAdminResponse>>("/admin/usuarios", filtros),
  });
}

export function useInvitarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UsuarioInvitarRequest) => post("/admin/usuarios/invitar", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminUsuarios() });
      toast.success("Usuario invitado");
    },
    onError: () => toast.error("Error al invitar usuario"),
  });
}

export function useEditarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UsuarioAdminEditarRequest }) =>
      patch<UsuarioAdminResponse>(`/admin/usuarios/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminUsuarios() });
      toast.success("Usuario actualizado");
    },
    onError: () => toast.error("Error al actualizar usuario"),
  });
}

export function useEliminarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => del(`/admin/usuarios/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminUsuarios() });
      toast.success("Usuario desactivado");
    },
    onError: () => toast.error("Error al desactivar usuario"),
  });
}

export function useRestaurarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => post(`/admin/usuarios/${id}/restaurar`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminUsuarios() });
      toast.success("Usuario restaurado");
    },
    onError: () => toast.error("Error al restaurar usuario"),
  });
}
