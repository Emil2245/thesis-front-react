import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { getValidado, postValidado, putValidado, del } from "@/api/request";
import { usuarioAdminSchema, paginaDe } from "@/api/schemas";
import { qk } from "@/api/queryKeys";
import type { UsuarioInvitarRequest, UsuarioAdminEditarRequest } from "@/api/contract";
import { toast } from "sonner";

/**
 * `ApiError` construye `super(problem.mensaje)`, así que `error.message` ya es
 * el texto que manda el backend ("El correo ya está registrado", "No posee
 * los permisos necesarios…"). Se muestra tal cual: el DTO no lleva secretos
 * que filtrar (§1) y un mensaje genérico escondería el 409/400 real.
 */
const mostrarError = (error: unknown) =>
  toast.error(error instanceof Error ? error.message : "Ocurrió un error inesperado");

const CLAVE_FAMILIA_USUARIOS = qk.adminUsuariosFamilia();

/**
 * `UsuarioAdminResource` (SUPER_ADMIN) vive en `/admin/usuarios`. Mismo patrón
 * de página que `useAdminBases`: el interceptor de `client.ts` normaliza
 * `{items,total}` → `{contenido,totalElementos}` una sola vez.
 */
const listaDeUsuarios = paginaDe(usuarioAdminSchema);

type FiltrosUsuarios = { q?: string; activo?: boolean; page?: number; size?: number };

export function useUsuariosAdmin(filtros: FiltrosUsuarios = {}) {
  const params = {
    q: filtros.q || undefined,
    activo: filtros.activo,
    page: filtros.page ?? 0,
    size: filtros.size ?? 25,
  };
  return useQuery({
    queryKey: qk.adminUsuarios(params),
    queryFn: () => getValidado("/admin/usuarios", listaDeUsuarios, params),
    // Sin esto, cada tecla de la búsqueda cambia la queryKey, la página pierde
    // su `data` un instante y el componente entero —incluido el input con el
    // foco— se reemplaza por el esqueleto de carga: la siguiente tecla cae en
    // el vacío. Con `keepPreviousData` la tabla vieja se queda pintada (con
    // `isFetching` en verdad) mientras llega la nueva.
    placeholderData: keepPreviousData,
  });
}

export function useInvitarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UsuarioInvitarRequest) =>
      postValidado("/admin/usuarios", usuarioAdminSchema, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CLAVE_FAMILIA_USUARIOS });
      toast.success("Usuario invitado");
    },
    onError: mostrarError,
  });
}

export function useEditarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & UsuarioAdminEditarRequest) =>
      putValidado(`/admin/usuarios/${id}`, usuarioAdminSchema, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CLAVE_FAMILIA_USUARIOS });
      toast.success("Usuario actualizado");
    },
    onError: mostrarError,
  });
}

export function useDesactivarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      postValidado(`/admin/usuarios/${id}/desactivar`, usuarioAdminSchema),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CLAVE_FAMILIA_USUARIOS });
      toast.success("Usuario desactivado");
    },
    onError: mostrarError,
  });
}

export function useReactivarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postValidado(`/admin/usuarios/${id}/reactivar`, usuarioAdminSchema),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CLAVE_FAMILIA_USUARIOS });
      toast.success("Usuario reactivado");
    },
    onError: mostrarError,
  });
}

export function useEliminarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/admin/usuarios/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CLAVE_FAMILIA_USUARIOS });
      toast.success("Usuario eliminado");
    },
    onError: mostrarError,
  });
}
