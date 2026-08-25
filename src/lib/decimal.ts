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
