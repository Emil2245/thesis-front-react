import type { CapituloResponse } from "@/api/contract";

export const CAPITULO_AL_FINAL = "__al-final__";

export interface OpcionCapitulo {
  capitulo: CapituloResponse;
  profundidad: number;
}

export function aplanarCapitulos(capitulos: CapituloResponse[], profundidad = 0): OpcionCapitulo[] {
  return capitulos.flatMap((capitulo) => [
    { capitulo, profundidad },
    ...aplanarCapitulos(capitulo.subcapitulos, profundidad + 1),
  ]);
}
