import axios, { AxiosError } from "axios";
import { API_BASE_URL } from "@/lib/env";
import { ApiError, problemDesconocido, type Problem } from "./problem";
import { errorPayloadSchema } from "./schemas";

// Sin `Content-Type` por defecto a propósito: axios lo pone solo (JSON para
// objetos planos, multipart con boundary para FormData). Fijarlo aquí hacía que
// `transformRequest` serializara todo FormData a JSON y perdiera el fichero.
export const http = axios.create({
  baseURL: API_BASE_URL,
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

    // Con `responseType: "blob"` —el helper `descargar()`— axios entrega
    // también el cuerpo de ERROR como Blob, así que `safeParse` fallaba
    // siempre y cualquier fallo de descarga se degradaba a `sin-respuesta`:
    // el 409 `export-bloqueado` del cronograma perdía sus `bloqueos[]`, que
    // son justo lo que el usuario necesita para desbloquear la exportación.
    let datos: unknown = error.response?.data;
    if (datos instanceof Blob) {
      try {
        datos = JSON.parse(await datos.text());
      } catch {
        // Un Blob de bytes binarios (un PDF a medias, un proxy que devuelve
        // HTML) no es JSON: ahí el fallback sintético es lo correcto.
        datos = undefined;
      }
    }

    // El cuerpo de error también es frontera de confianza: se valida en vez de
    // castearse. Si no trae `{codigo, mensaje}` no se hace pasar por un error
    // del contrato —`is()` daría false contra un código inventado— y cae a uno
    // sintético del cliente.
    const cuerpo = errorPayloadSchema.safeParse(datos);
    throw new ApiError(
      cuerpo.success ? cuerpo.data : problemDesconocido(status, error.message),
      status,
    );
  },
);
