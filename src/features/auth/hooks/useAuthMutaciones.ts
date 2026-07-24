import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { post, put } from "@/api/request";
import { setAccessToken } from "@/api/client";
import { queryClient } from "@/api/queryClient";
import { aplicarErroresDeApi } from "@/lib/formErrors";
import type {
  LoginRequest,
  PerfilActualizarRequest,
  PasswordCambiarRequest,
  RegistroRequest,
  TokenResponse,
} from "@/api/contract";
import type { UseFormSetError, FieldValues } from "react-hook-form";
import { useSesionStore } from "../sesion";

export function useLogin() {
  const navigate = useNavigate();
  const iniciar = useSesionStore((s) => s.iniciar);

  return useMutation({
    mutationFn: (body: LoginRequest) => post<TokenResponse>("/auth/login", body),
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
    mutationFn: (body: RegistroRequest) => post<unknown>("/auth/registro", body),
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
    mutationFn: (body: { token: string; password: string }) =>
      post<void>("/auth/restablecer", body),
  });
}

export function useCerrarSesion() {
  const cerrar = useSesionStore((s) => s.cerrar);
  return useMutation({
    mutationFn: () => post<void>("/auth/logout", {}),
    onSettled: () => {
      setAccessToken(null);
      cerrar();
      queryClient.clear();
    },
  });
}

export function useActualizarPerfil<T extends FieldValues>(setError: UseFormSetError<T>) {
  return useMutation({
    mutationFn: (body: PerfilActualizarRequest) => put("/perfil", body),
    onError: (error) => {
      aplicarErroresDeApi(error, setError);
    },
  });
}

export function useCambiarPassword<T extends FieldValues>(
  setError: UseFormSetError<T>,
  onSuccess?: () => void,
) {
  return useMutation({
    mutationFn: (body: PasswordCambiarRequest) => put<void>("/perfil/password", body),
    onSuccess: () => {
      toast.success("Contraseña actualizada");
      onSuccess?.();
    },
    onError: (error) => {
      aplicarErroresDeApi(error, setError);
    },
  });
}
