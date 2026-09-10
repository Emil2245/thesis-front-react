import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { post, postValidado, put, putValidado } from "@/api/request";
import { setAccessToken } from "@/api/client";
import { queryClient } from "@/api/queryClient";
import { notificarError } from "@/lib/manejoErrores";
import type {
  LoginRequest,
  PerfilActualizarRequest,
  PasswordCambiarRequest,
  RegistroRequest,
  RestablecerPasswordRequest,
} from "@/api/contract";
import { perfilSchema, tokenSchema, usuarioSchema } from "@/api/schemas";
import { leerRefreshGuardado } from "../sesion";
import { useSesionStore } from "../sesion";

export function useLogin() {
  const navigate = useNavigate();
  const iniciar = useSesionStore((s) => s.iniciar);

  return useMutation({
    mutationFn: (body: LoginRequest) => postValidado("/auth/login", tokenSchema, body),
    onSuccess: (r, vars) => {
      setAccessToken(r.accessToken);
      iniciar(r.usuario, r.refreshToken ?? null, vars.recordarSesion);
      const params = new URLSearchParams(window.location.search);
      navigate(params.get("retorno") ?? "/proyectos", { replace: true });
    },
  });
}

export function useRegistro() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (body: RegistroRequest) => postValidado("/auth/registro", usuarioSchema, body),
    onSuccess: (_data, vars) => {
      navigate(`/verificar-email?email=${encodeURIComponent(vars.email)}`);
    },
  });
}

export function useVerificarEmail() {
  return useMutation({
    mutationFn: (token: string) => post<void>("/auth/verificar-email", { token }),
  });
}

export function useReenviarVerificacion() {
  return useMutation({
    mutationFn: (email: string) => post<void>("/auth/reenviar-verificacion", { email }),
  });
}

export function useRecuperarPassword() {
  return useMutation({
    mutationFn: (email: string) => post<void>("/auth/recuperar", { email }),
  });
}

export function useRestablecerPassword() {
  return useMutation({
    mutationFn: (body: RestablecerPasswordRequest) => post<void>("/auth/restablecer", body),
  });
}

export function useCerrarSesion() {
  const cerrar = useSesionStore((s) => s.cerrar);
  return useMutation({
    mutationFn: () => {
      const refreshToken = useSesionStore.getState().refreshToken ?? leerRefreshGuardado();
      if (!refreshToken) return Promise.resolve();
      return post<void>("/auth/logout", { refreshToken });
    },
    onSettled: () => {
      setAccessToken(null);
      cerrar();
      queryClient.clear();
    },
  });
}

/**
 * Ya no recibe `setError`: `ErrorPayload` no trae `errores[]`, así que no hay
 * forma de saber a qué campo pertenece el fallo. `GlobalExceptionMapper` reduce
 * la `ConstraintViolationException` al *primer* mensaje y lo manda pelado.
 */
export function useActualizarPerfil() {
  return useMutation({
    mutationFn: (body: PerfilActualizarRequest) => putValidado("/perfil", perfilSchema, body),
    onError: (error) => {
      notificarError(error, "No se pudo actualizar el perfil");
    },
  });
}

export function useCambiarPassword(onSuccess?: () => void) {
  return useMutation({
    mutationFn: (body: PasswordCambiarRequest) => put<void>("/perfil/password", body),
    onSuccess: () => {
      toast.success("Contraseña actualizada");
      onSuccess?.();
    },
    onError: (error) => {
      notificarError(error, "No se pudo cambiar la contraseña");
    },
  });
}
