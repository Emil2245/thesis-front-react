import { z } from "zod";
import { parsearEntradaDecimal } from "@/lib/decimal";

const precioPositivo = z
  .string()
  .refine((v) => parsearEntradaDecimal(v) !== null, "Ingresa un número válido")
  .refine((v) => Number(parsearEntradaDecimal(v)) > 0, "El precio debe ser mayor que 0");

const base = {
  codigo: z.string().min(1, "El código es obligatorio"),
  descripcion: z.string().min(1, "La descripción es obligatoria"),
};

export const insumoSchema = z.discriminatedUnion("tipo", [
  z.object({
    ...base,
    tipo: z.literal("MANO_OBRA"),
    unidad: z.literal("h"),
    precioUnitario: precioPositivo,
  }),
  z.object({
    ...base,
    tipo: z.literal("EQUIPO"),
    unidad: z.literal("h"),
    precioUnitario: precioPositivo,
  }),
  z.object({
    ...base,
    tipo: z.literal("MATERIAL"),
    unidad: z.string().min(1, "La unidad es obligatoria"),
    precioUnitario: precioPositivo,
  }),
  z.object({
    ...base,
    tipo: z.literal("TRANSPORTE"),
    unidad: z.string().min(1, "La unidad es obligatoria"),
    precioUnitario: precioPositivo,
  }),
]);

export type InsumoFormData = z.input<typeof insumoSchema>;

export const csvRowSchema = z.object({
  codigo: z.string().min(1),
  descripcion: z.string().min(1),
  tipo: z.enum(["EQUIPO", "MANO_OBRA", "MATERIAL", "TRANSPORTE"]),
  unidad: z.string().min(1),
  precio: z.string().min(1),
});

export type CsvRow = z.infer<typeof csvRowSchema>;
