import { z } from "zod";

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

export const parametrosSchema = z
  .object({
    porcentajeHerramientaMenor: z.number().min(0, "Mínimo 0 %").max(20, "Máximo 20 %"),
    porcentajeIndirecto: z.number().min(0, "Mínimo 0 %").max(100, "Máximo 100 %").nullable(),
    iva: z.number().min(0, "Mínimo 0 %").max(30, "Máximo 30 %"),
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
    porcentajeHerramientaMenor: String((v.porcentajeHerramientaMenor / 100).toFixed(6)),
    porcentajeIndirecto:
      v.porcentajeIndirecto != null ? String((v.porcentajeIndirecto / 100).toFixed(6)) : null,
    iva: String((v.iva / 100).toFixed(6)),
  }));

export const firmanteSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(200),
  cargo: z.string().min(1, "El cargo es obligatorio").max(200),
  rol: z.enum(["CONSOLIDADO", "APROBADO"]),
  orden: z.number().int().min(1),
});

export const descuentoSchema = z.object({
  porcentaje: z.number().min(0, "Mínimo 0 %").max(50, "Máximo 50 %"),
});

export type ProyectoFormData = z.input<typeof proyectoSchema>;
export type ParametrosFormData = z.input<typeof parametrosSchema>;
export type FirmanteFormData = z.input<typeof firmanteSchema>;
export type DescuentoFormData = z.input<typeof descuentoSchema>;
