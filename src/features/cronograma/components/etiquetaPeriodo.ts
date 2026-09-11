import type { UnidadTiempo } from "@/api/contract";

export function etiquetaPeriodo(unidadTiempo: UnidadTiempo, periodo: number) {
  return `${unidadTiempo === "SEMANA" ? "S" : "M"}${periodo}`;
}
