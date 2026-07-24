import { http, HttpResponse } from "msw";
import type { Page, ProyectoResponse } from "@/api/contract";
import type { Problem } from "@/api/problem";

const API = "*/api/v1";

export const problema = (
  status: number,
  type: string,
  title: string,
  extra: Partial<Problem> = {},
) =>
  HttpResponse.json<Problem>(
    { type: `/problemas/${type}`, title, status, ...extra },
    { status, headers: { "Content-Type": "application/problem+json" } },
  );

export const pagina = <T>(contenido: T[]): Page<T> => ({
  contenido,
  page: 0,
  size: 25,
  totalElementos: contenido.length,
  totalPaginas: 1,
});

export const handlers = [
  http.get(`${API}/proyectos`, () => HttpResponse.json(pagina<ProyectoResponse>([]))),
];
