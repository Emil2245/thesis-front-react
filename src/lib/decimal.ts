export type Decimal = string & { readonly __brand: "Decimal" };

export const asDecimal = (v: string): Decimal => v as Decimal;

export const DECIMAL_ZERO = asDecimal("0.000000");

const LOCALE = "es-EC";

export function formatearMoneda(valor: Decimal | number | null | undefined, dp = 2): string {
  if (valor == null || valor === "") return "—";
  const n = Number(valor);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  }).format(n);
}

export function formatearNumero(
  valor: Decimal | number | null | undefined,
  { min = 2, max = 4 }: { min?: number; max?: number } = {},
): string {
  if (valor == null || valor === "") return "—";
  const n = Number(valor);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  }).format(n);
}

export function formatearPorcentaje(valor: Decimal | number | null | undefined, dp = 2): string {
  if (valor == null || valor === "") return "—";
  const n = Number(valor);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(LOCALE, {
    style: "percent",
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  }).format(n);
}

export function parsearEntradaDecimal(entrada: string): Decimal | null {
  const limpio = entrada.trim().replace(/\s/g, "").replace(",", ".");
  if (limpio === "") return null;
  if (!/^-?\d+(\.\d+)?$/.test(limpio)) return null;
  return asDecimal(limpio);
}

// Escalas que fija el backend: dinero 6 decimales, porcentajes y avances 4.
export const ESCALA_DINERO = 6;
export const ESCALA_PORCENTAJE = 4;

// Un porcentaje a escala 4 (12,3456 %) es una fracción a escala 6 (0,123456).
const ESCALA_FRACCION = ESCALA_PORCENTAJE + 2;

/**
 * Recorta la cola que arrastra cualquier operación en float64:
 * `395115.32 - 355603.788` da `39511.53200000001`, no `39511.532`.
 *
 * Este módulo es el único sitio del repo autorizado a usar `toFixed`/`parseFloat` (ADR 9).
 */
export const cuantizar = (valor: number, escala: number): number => Number(valor.toFixed(escala));

/** Frontera de entrada: lo que teclea el usuario se cuantiza una sola vez, aquí. */
export function parsearEntradaNumerica(entrada: string, escala: number): number | null {
  const decimal = parsearEntradaDecimal(entrada);
  return decimal === null ? null : cuantizar(Number(decimal), escala);
}

/** 12,5 % → 0.125 */
export const porcentajeAFraccion = (porcentaje: number): number =>
  cuantizar(porcentaje / 100, ESCALA_FRACCION);

/** 12,5 % → "0.125000", para los endpoints que exigen decimal string. */
export const porcentajeAFraccionDecimal = (porcentaje: number): Decimal =>
  asDecimal(porcentajeAFraccion(porcentaje).toFixed(ESCALA_DINERO));

/** 0.125 → 12,5 % */
export const fraccionAPorcentaje = (fraccion: Decimal | number): number =>
  cuantizar(Number(fraccion) * 100, ESCALA_PORCENTAJE);

export function compararDecimal(a: Decimal, b: Decimal): number {
  const na = Number(a);
  const nb = Number(b);
  return na === nb ? 0 : na < nb ? -1 : 1;
}

export function esCero(valor: Decimal | number | null | undefined): boolean {
  if (valor == null) return true;
  if (typeof valor === "number") return valor === 0;
  return /^-?0+(\.0+)?$/.test(valor.trim());
}
