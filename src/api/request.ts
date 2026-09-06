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

export const put = async <T>(url: string, body?: unknown): Promise<T> =>
  (await http.put<T>(url, body)).data;

export const patch = async <T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> => (await http.patch<T>(url, body, config)).data;

export const del = async <T = void>(url: string): Promise<T> => (await http.delete<T>(url)).data;

export const descargar = async (url: string, params?: unknown): Promise<Blob> =>
  (await http.get(url, { params, responseType: "blob" })).data;
