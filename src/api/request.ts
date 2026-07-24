import { http } from "./client";

export const get = async <T>(url: string, params?: unknown): Promise<T> =>
  (await http.get<T>(url, { params })).data;

export const post = async <T>(url: string, body?: unknown): Promise<T> =>
  (await http.post<T>(url, body)).data;

export const put = async <T>(url: string, body?: unknown): Promise<T> =>
  (await http.put<T>(url, body)).data;

export const patch = async <T>(url: string, body?: unknown): Promise<T> =>
  (await http.patch<T>(url, body)).data;

export const del = async <T = void>(url: string): Promise<T> =>
  (await http.delete<T>(url)).data;

export const descargar = async (url: string, params?: unknown): Promise<Blob> =>
  (await http.get(url, { params, responseType: "blob" })).data;
