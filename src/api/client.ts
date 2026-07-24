import axios, { AxiosError } from "axios";
import { API_BASE_URL } from "@/lib/env";
import { ApiError, problemDesconocido, type Problem } from "./problem";

export const http = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

let accessToken: string | null = null;
export const setAccessToken = (t: string | null) => {
  accessToken = t;
};
export const getAccessToken = () => accessToken;

let refrescar: (() => Promise<string | null>) | null = null;
export const setRefrescador = (f: typeof refrescar) => {
  refrescar = f;
};

let onSesionExpirada: (() => void) | null = null;
export const setOnSesionExpirada = (f: typeof onSesionExpirada) => {
  onSesionExpirada = f;
};

http.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

http.interceptors.response.use(
  (r) => r,
  async (error: AxiosError<Problem>) => {
    const original = error.config as typeof error.config & { _reintentado?: boolean };
    const status = error.response?.status ?? 0;

    if (status === 401 && original && !original._reintentado && !original.url?.includes("/auth/")) {
      original._reintentado = true;
      const nuevo = refrescar ? await refrescar() : null;
      if (nuevo) {
        setAccessToken(nuevo);
        return http(original);
      }
      onSesionExpirada?.();
    }

    const problem = error.response?.data ?? problemDesconocido(status, error.message);
    throw new ApiError(problem, status);
  },
);
