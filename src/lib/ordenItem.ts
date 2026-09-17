import type { CapituloResponse } from "@/api/contract";

/**
 * Compara dos `item` de presupuesto ("1", "1.2", "1.12", "2.10") en orden
 * natural: segmento a segmento, numéricamente.
 *
 * El orden lexicográfico NO sirve aquí, aunque lo parezca con datos pequeños:
 * `"1.12" < "1.2"` como cadenas, porque compara `'1'` contra `'2'` en la
 * segunda posición. Con un presupuesto de más de nueve subcapítulos el árbol
 * sale barajado.
 *
 * Un segmento no numérico se compara como texto contra el otro segmento, para
 * que un item con letras no rompa el orden ni tire una excepción.
 */
export function compararItem(a: string, b: string): number {
  const sa = a.split(".");
  const sb = b.split(".");
  const n = Math.max(sa.length, sb.length);
  for (let i = 0; i < n; i++) {
    const pa = sa[i];
    const pb = sb[i];
    // El más corto va primero: "1" antes que "1.1".
    if (pa === undefined) return -1;
    if (pb === undefined) return 1;
    const na = Number(pa);
    const nb = Number(pb);
    if (Number.isInteger(na) && Number.isInteger(nb)) {
      if (na !== nb) return na - nb;
    } else {
      const c = pa.localeCompare(pb, "es");
      if (c !== 0) return c;
    }
  }
  return 0;
}

/** Ordena capítulos, subcapítulos y rubros por `item` natural, sin mutar la entrada. */
export function ordenarCapitulos(capitulos: CapituloResponse[]): CapituloResponse[] {
  return [...capitulos]
    .sort((a, b) => compararItem(a.item, b.item))
    .map((c) => ({
      ...c,
      subcapitulos: ordenarCapitulos(c.subcapitulos),
      rubros: [...c.rubros].sort((a, b) => compararItem(a.item, b.item)),
    }));
}
