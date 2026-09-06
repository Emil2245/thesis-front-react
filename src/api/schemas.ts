import { z } from "zod";
import { ApiError } from "./problem";

/**
 * Esquemas de las respuestas que la UI *lee*. Complementan `contract.ts`, que
 * sigue siendo la fuente de tipos: aquí sólo están los DTO que se validan en
 * runtime con `getValidado`, y sus campos se copian de allí sin relajarlos.
 *
 * Los importes van como los manda el backend (plan 061, eje de transporte):
 * APU e insumo serializan `BigDecimal` como número JSON, así que `z.number()`.
 * Presupuesto y cronograma mandan string, pero ninguno se valida todavía aquí.
 */

/**
 * Envoltura de página del contrato (`Page<T>`). Valida la *forma*: un listado
 * que devuelva otra cosa falla aquí con un mensaje legible en vez de reventar
 * tres capas más arriba con `Cannot read properties of undefined`.
 *
 * Los cinco campos son obligatorios porque `Page<T>` los declara obligatorios y
 * las tablas los desreferencian sin guarda (`data.totalPaginas > 1`).
 */
export const paginaDe = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    contenido: z.array(item),
    page: z.number(),
    size: z.number(),
    totalElementos: z.number(),
    totalPaginas: z.number(),
  });

export const proyectoSchema = z.object({
  id: z.string(),
  nombreProyecto: z.string(),
  codigo: z.string(),
  estado: z.enum(["BORRADOR", "EN_PROCESO", "FINALIZADO"]),
  descripcion: z.string().optional(),
  direccionInstitucional: z.string().optional(),
  subdireccionInstitucional: z.string().optional(),
  anio: z.number().optional(),
  fechaInicio: z.string().optional(),
  plazoEjecucion: z.number().optional(),
  plazoUnidad: z.string().optional(),
  tieneLogo: z.boolean().optional(),
  updatedAt: z.string().optional(),
});

export const insumoSchema = z.object({
  id: z.string(),
  codigo: z.string(),
  tipo: z.enum(["EQUIPO", "MANO_OBRA", "MATERIAL", "TRANSPORTE"]),
  descripcion: z.string(),
  unidad: z.string(),
  precioUnitario: z.number(),
  fechaActualizacion: z.string(),
  desactualizado: z.boolean(),
});

export const apuResumenSchema = z.object({
  id: z.string(),
  codigo: z.string(),
  descripcion: z.string(),
  unidad: z.string(),
  costoDirecto: z.number(),
  costoTotal: z.number(),
  vinculado: z.boolean(),
});

// El DTO del bug del plan 020: el LISTADO no trae el snapshot; el detalle sí.
export const plantillaApuResumenSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  tipo: z.enum(["SISTEMA", "PERSONAL"]),
  descripcionRubro: z.string().optional(),
  unidad: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * Un fallo de validación es un problema del *cliente*, no un tipo del contrato:
 * por eso `type` no sale de `PROBLEM_TYPES`. Se envuelve en `ApiError` para que
 * el manejo de errores existente lo trate como cualquier otro fallo de red.
 */
export function errorDeRespuesta(url: string, error: z.ZodError): ApiError {
  const detalle = error.issues
    .slice(0, 3)
    .map((i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`)
    .join("; ");
  return new ApiError(
    {
      type: "/problemas/respuesta-invalida",
      title: "El servidor devolvió una respuesta inesperada",
      status: 500,
      detail: `${url} — ${detalle}`,
    },
    500,
  );
}
