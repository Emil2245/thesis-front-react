import { useQuery } from "@tanstack/react-query";
import { getValidado } from "@/api/request";
import { qk } from "@/api/queryKeys";
import { paginaDe, insumoSchema } from "@/api/schemas";
import type { DestinoInsumos } from "../destino";

export function useInsumos(proyectoId: string, filtros?: Record<string, unknown>) {
  return useQuery({
    queryKey: qk.insumos(proyectoId, filtros),
    queryFn: () => getValidado(`/proyectos/${proyectoId}/insumos`, paginaDe(insumoSchema), filtros),
  });
}

/** Listado paginado de cualquier base: proyecto, personal o central. */
export function useInsumosDeDestino(destino: DestinoInsumos, filtros?: Record<string, unknown>) {
  return useQuery({
    queryKey: destino.claveLista(filtros),
    queryFn: () => getValidado(destino.rutaLista, paginaDe(insumoSchema), filtros),
  });
}
