import { z } from "zod";
import { parsearEntradaDecimal } from "@/lib/decimal";

export const celdaCantidadSchema = z
  .string()
  .refine(
    (v) => parsearEntradaDecimal(v) !== null && Number(parsearEntradaDecimal(v)) > 0,
    "Debe ser mayor que 0",
  );

export const celdaRendimientoSchema = z
  .string()
  .refine(
    (v) => parsearEntradaDecimal(v) !== null && Number(parsearEntradaDecimal(v)) > 0,
    "Debe ser mayor que 0",
  );

export const precioOverrideSchema = z
  .string()
  .refine(
    (v) => v === "" || (parsearEntradaDecimal(v) !== null && Number(parsearEntradaDecimal(v)) > 0),
    "Debe ser mayor que 0 o vacío para heredar",
  );
