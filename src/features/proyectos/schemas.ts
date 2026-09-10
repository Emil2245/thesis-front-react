import { z } from "zod";
import { porcentajeAFraccion } from "@/lib/decimal";

export const proyectoSchema = z.object({
  nombreProyecto: z.string().min(1, "El nombre es obligatorio").max(200),
  codigo: z.string().max(50).optional(),
  descripcion: z.string().max(2000).optional(),
  // @NotNull / @NotBlank en main: opcionales aquí, el formulario dejaba enviar
  // un cuerpo que el backend rechaza con 400.
  anio: z
    .number({ message: "El año es obligatorio" })
    .int()
    .min(2000, "Año inválido")
    .max(2100, "Año inválido"),
  fechaInicio: z.string().optional(),
  plazoEjecucion: z
    .number({ message: "El plazo es obligatorio" })
    .int()
    .min(1, "Plazo inválido")
    .max(600, "Plazo inválido"),
  plazoUnidad: z.enum(["SEMANA", "MES"], { message: "La unidad de plazo es obligatoria" }),
  direccionInstitucional: z.string().min(1, "La dirección es obligatoria").max(200),
  subdireccionInstitucional: z.string().max(200).optional(),
});

export interface RangosValidacion {
  hmMax: number;
  ciMax: number;
  ivaMax: number;
}

const RANGOS_DEFAULT: RangosValidacion = {
  hmMax: 20,
  ciMax: 100,
  ivaMax: 30,
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

// Backwards-compatible defaults
export const parametrosSchema = crearParametrosSchema();

export const firmanteSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio").max(200),
  cargo: z.string().min(1, "El cargo es obligatorio").max(200),
  rol: z.enum(["CONSOLIDADO", "APROBADO"]),
  orden: z.number().int().min(1),
});

export type ProyectoFormData = z.input<typeof proyectoSchema>;
export type ParametrosFormData = z.input<typeof parametrosSchema>;
export type FirmanteFormData = z.input<typeof firmanteSchema>;
