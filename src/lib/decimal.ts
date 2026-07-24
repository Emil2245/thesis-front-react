export type Decimal = string & { readonly __brand: "Decimal" };

export const asDecimal = (v: string): Decimal => v as Decimal;

export const DECIMAL_ZERO = asDecimal("0.000000");
