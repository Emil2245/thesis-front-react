import { z } from "zod";
import { porcentajeAFraccion } from "@/lib/decimal";

export const proyectoSchema = z.object({
  nombreProyecto: z.string().min(1, "El nombre es obligatorio").max(200),
  codigo: z.string().max(50).optional(),
  descripcion: z.string().max(2000).optional(),
  anio: z.number().int().min(2000, "Año inválido").max(2100, "Año inválido").optional(),
  fechaInicio: z.string().optional(),
  plazoEjecucion: z.number().int().min(1, "Plazo inválido").max(600, "Plazo inválido").optional(),
  plazoUnidad: z.enum(["SEMANA", "MES"]).optional(),
  direccionInstitucional: z.string().max(200).optional(),
  subdireccionInstitucional: z.string().max(200).optional(),
  duplicarDesde: z
    .discriminatedUnion("tipo", [
      z.object({ tipo: z.literal("SISTEMA"), baseId: z.number() }),
      z.object({ tipo: z.literal("PROYECTO"), proyectoId: z.number() }),
    ])
    .optional(),
});

export interface RangosValidacion {
  hmMax: number;
  ciMax: number;
  ivaMax: number;
  descuentoMax: number;
}

const RANGOS_DEFAULT: RangosValidacion = {
  hmMax: 20,
  ciMax: 100,
  ivaMax: 30,
  descuentoMax: 50,
};

export function crearParametrosSchema(r: RangosValidacion = RANGOS_DEFAULT) {
  return z
    .object({
      porcentajeHerramientaMenor: z
        .number()
        .min(0, "Mínimo 0 %")
        .max(r.hmMax, `Máximo ${r.hmMax} %`),
      porcentajeIndirecto: z
        .number()
        .min(0, "Mínimo 0 %")
        .max(r.ciMax, `Máximo ${r.ciMax} %`)
        .nullable(),
      iva: z.number().min(0, "Mínimo 0 %").max(r.ivaMax, `Máximo ${r.ivaMax} %`),
      moneda: z.string().min(1),
      mostrarSeccionesVacias: z.boolean(),
      sufijosSeccionActivos: z.boolean(),
      mostrarSubtotalesSeccion: z.boolean(),
      mostrarSubtotalesPie: z.boolean(),
      mostrarNombreProyectoHeader: z.boolean(),
      enumerarApus: z.boolean(),
      mensajeFooter: z.string().max(200).optional(),
      modoCodigoRubro: z.enum(["AUTOGENERADO", "MANUAL"]),
    })
    .transform((v) => ({
      ...v,
      porcentajeHerramientaMenor: porcentajeAFraccion(v.porcentajeHerramientaMenor),
      porcentajeIndirecto:
        v.porcentajeIndirecto != null ? porcentajeAFraccion(v.porcentajeIndirecto) : null,
      iva: porcentajeAFraccion(v.iva),
    }));
}

export function crearDescuentoSchema(maxPorcentaje = 50) {
  return z.object({
    porcentaje: z.number().min(0, "Mínimo 0 %").max(maxPorcentaje, `Máximo ${maxPorcentaje} %`),
  });
}

// Backwards-compatible defaults
export const parametrosSchema = crearParametrosSchema();

export const firmanteSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(200),
  cargo: z.string().min(1, "El cargo es obligatorio").max(200),
  rol: z.enum(["CONSOLIDADO", "APROBADO"]),
  orden: z.number().int().min(1),
});

export const descuentoSchema = crearDescuentoSchema();

export type ProyectoFormData = z.input<typeof proyectoSchema>;
export type ParametrosFormData = z.input<typeof parametrosSchema>;
export type FirmanteFormData = z.input<typeof firmanteSchema>;
export type DescuentoFormData = z.input<typeof descuentoSchema>;
