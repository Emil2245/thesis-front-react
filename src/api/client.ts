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

// El backend pagina con { items, total }; el contrato interno usa { contenido, totalElementos }.
const normalizarPaginado = (data: unknown): unknown => {
  if (data !== null && typeof data === "object" && "items" in data && !("contenido" in data)) {
    const { items, total, ...resto } = data as { items: unknown; total?: number };
    if (!Array.isArray(items)) return data;
    return { ...resto, contenido: items, totalElementos: total ?? items.length };
  }
  return data;
};

http.interceptors.response.use(
  (r) => {
    r.data = normalizarPaginado(r.data);
    return r;
  },
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
