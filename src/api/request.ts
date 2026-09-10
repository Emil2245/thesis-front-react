import type { AxiosRequestConfig } from "axios";
import type { z } from "zod";
import { http } from "./client";
import { errorDeRespuesta } from "./schemas";

export const get = async <T>(url: string, params?: unknown): Promise<T> =>
  (await http.get<T>(url, { params })).data;

/**
 * Como `get`, pero comprueba la forma de la respuesta antes de devolverla. El
 * tipo sale del esquema, así que —a diferencia de `get<T>`, que es un cast
 * puro— no puede mentir sobre lo que llegó por la red.
 *
 * Ve la respuesta ya normalizada por el interceptor de `client.ts`
 * (`{items,total}` → `{contenido,totalElementos}`): no la vuelvas a normalizar.
 */
export const getValidado = async <S extends z.ZodTypeAny>(
  url: string,
  schema: S,
  params?: unknown,
): Promise<z.infer<S>> => {
  const { data } = await http.get(url, { params });
  const r = schema.safeParse(data);
  if (!r.success) throw errorDeRespuesta(url, r.error);
  return r.data;
};

export const post = async <T>(url: string, body?: unknown): Promise<T> =>
  (await http.post<T>(url, body)).data;

export const postValidado = async <S extends z.ZodTypeAny>(
  url: string,
  schema: S,
  body?: unknown,
): Promise<z.infer<S>> => {
  const { data } = await http.post(url, body);
  const r = schema.safeParse(data);
  if (!r.success) throw errorDeRespuesta(url, r.error);
  return r.data;
};

export const put = async <T>(url: string, body?: unknown): Promise<T> =>
  (await http.put<T>(url, body)).data;

export const putValidado = async <S extends z.ZodTypeAny>(
  url: string,
  schema: S,
  body?: unknown,
): Promise<z.infer<S>> => {
  const { data } = await http.put(url, body);
  const r = schema.safeParse(data);
  if (!r.success) throw errorDeRespuesta(url, r.error);
  return r.data;
};

/**
 * Como `putValidado`, pero además dice si el `PUT` creó el recurso o lo
 * actualizó. Existe sólo para el upsert de valores de referencia (plan 079,
 * §9bis): el backend distingue creación de actualización únicamente por el
 * status (201 vs 200, mismo cuerpo), y ningún otro helper de este archivo
 * expone el status de la respuesta. Precedente: `descargar()` más abajo
 * también devuelve más que `.data` cuando el llamante lo necesita.
 */
export const putValidadoConEstado = async <S extends z.ZodTypeAny>(
  url: string,
  schema: S,
  body?: unknown,
): Promise<{ datos: z.infer<S>; creado: boolean }> => {
  const r = await http.put(url, body);
  const parsed = schema.safeParse(r.data);
  if (!parsed.success) throw errorDeRespuesta(url, parsed.error);
  return { datos: parsed.data, creado: r.status === 201 };
};

export const patch = async <T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> => (await http.patch<T>(url, body, config)).data;

export const patchValidado = async <S extends z.ZodTypeAny>(
  url: string,
  schema: S,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<z.infer<S>> => {
  const { data } = await http.patch(url, body, config);
  const r = schema.safeParse(data);
  if (!r.success) throw errorDeRespuesta(url, r.error);
  return r.data;
};

export const del = async <T = void>(url: string): Promise<T> => (await http.delete<T>(url)).data;

export const delValidado = async <S extends z.ZodTypeAny>(
  url: string,
  schema: S,
): Promise<z.infer<S>> => {
  const { data } = await http.delete(url);
  const r = schema.safeParse(data);
  if (!r.success) throw errorDeRespuesta(url, r.error);
  return r.data;
};

/**
 * El nombre del archivo lo pone el backend en `Content-Disposition`; el cliente
 * no lo inventa. Se devuelve `undefined` si la cabecera falta o no trae nombre,
 * para que el llamante elija su propio fallback.
 */
const nombreDeContentDisposition = (cabecera: unknown): string | undefined => {
  if (typeof cabecera !== "string") return undefined;
  const m = /filename\*=UTF-8''([^;]+)|filename="([^"]*)"|filename=([^;]+)/i.exec(cabecera);
  if (!m) return undefined;
  const bruto = m[1] ? decodeURIComponent(m[1]) : (m[2] ?? m[3]);
  // Solo el nombre base: la cabecera viene de la red y no decide rutas.
  return bruto.trim().split(/[/\\]/).pop() || undefined;
};

export const descargar = async (
  url: string,
  params?: unknown,
): Promise<{ blob: Blob; nombreArchivo: string | undefined }> => {
  const r = await http.get<Blob>(url, { params, responseType: "blob" });
  return {
    blob: r.data,
    nombreArchivo: nombreDeContentDisposition(r.headers["content-disposition"]),
  };
};
