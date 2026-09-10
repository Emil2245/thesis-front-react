import { z } from "zod";
import { ApiError } from "./problem";
import type {
  CapituloResponse,
  CopiaBaseResultadoResponse,
  ComparacionVersionesResponse,
  CronogramaResponse,
  PresupuestoResponse,
  PresupuestoVersionResponse,
  RubroResponse,
  ResumenComponentesResponse,
  ValidacionPresupuestoResponse,
} from "./contract";
import { asDecimal, type Decimal } from "@/lib/decimal";

/**
 * Esquemas de las respuestas que la UI *lee*. Complementan `contract.ts`, que
 * sigue siendo la fuente de tipos: aquí sólo están los DTO que se validan en
 * runtime con `getValidado`, y sus campos se copian de allí sin relajarlos.
 *
 * Los importes van como los manda el backend (plan 061, eje de transporte):
 * APU e insumo serializan `BigDecimal` como número JSON, así que `z.number()`.
 * Presupuesto y cronograma mandan strings decimales y se transforman al tipo
 * `Decimal` en los esquemas correspondientes; APU, insumo y parámetros se
 * validan como números JSON.
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
  z
    .object({
      contenido: z.array(item),
      page: z.number(),
      size: z.number(),
      totalElementos: z.number(),
      totalPaginas: z.number(),
    })
    .strict();

export const perfilSchema = z
  .object({
    id: z.number(),
    nombre: z.string(),
    email: z.string(),
    rol: z.enum(["USUARIO", "SUPER_ADMIN"]),
    fechaCreacion: z.string(),
  })
  .strict();

export const usuarioSchema = z
  .object({
    id: z.number(),
    nombre: z.string(),
    email: z.string(),
    rol: z.enum(["USUARIO", "SUPER_ADMIN"]),
    emailVerificado: z.boolean(),
  })
  .strict();

/**
 * `GET/POST/PUT /admin/usuarios` (`UsuarioAdminResponse`, plan 077). Id UUID,
 * a diferencia de `usuarioSchema` (el perfil de sesión, `id: number`) — no es
 * el mismo DTO aunque comparta forma parcial.
 */
export const usuarioAdminSchema = z
  .object({
    id: z.string(),
    nombre: z.string(),
    email: z.string(),
    rol: z.enum(["USUARIO", "SUPER_ADMIN"]),
    activo: z.boolean(),
    emailVerificado: z.boolean(),
    fechaCreacion: z.string(),
  })
  .strict();

export const tokenSchema = z
  .object({
    accessToken: z.string(),
    expiraEnSegundos: z.number(),
    refreshToken: z.string().optional(),
    usuario: usuarioSchema,
  })
  .strict();

export const proyectoSchema = z
  .object({
    id: z.string(),
    nombreProyecto: z.string(),
    codigo: z
      .string()
      .nullable()
      .transform((codigo) => codigo ?? ""),
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
  })
  .strict();

export const insumoSchema = z
  .object({
    id: z.string(),
    codigo: z.string(),
    tipo: z.enum(["EQUIPO", "MANO_OBRA", "MATERIAL", "TRANSPORTE"]),
    descripcion: z.string(),
    unidad: z.string(),
    precioUnitario: z.number(),
    fechaActualizacion: z.string(),
    desactualizado: z.boolean(),
  })
  .strict();

/**
 * `GET /admin/bases-centrales` — lista pelada, no `Page<T>`. Se valida porque
 * el defecto que traía era exactamente de forma: el hook la tipaba como página
 * y `data.contenido.map` reventaba al montar. `totalInsumos` es un `long`.
 */
export const baseCentralSchema = z
  .object({
    id: z.string(),
    nombre: z.string(),
    tipo: z.literal("CENTRAL"),
    archivada: z.boolean(),
    totalInsumos: z.number(),
  })
  .strict();

export const apuResumenSchema = z
  .object({
    id: z.string(),
    codigo: z.string(),
    descripcion: z.string(),
    unidad: z.string(),
    costoDirecto: z.number(),
    costoTotal: z.number(),
    vinculado: z.boolean(),
  })
  .strict();

// El DTO del bug del plan 020: el LISTADO no trae el snapshot; el detalle sí.
export const plantillaApuResumenSchema = z
  .object({
    id: z.string(),
    nombre: z.string(),
    tipo: z.enum(["SISTEMA", "PERSONAL"]),
    descripcionRubro: z.string().optional(),
    unidad: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();

export const parametrosProyectoSchema = z
  .object({
    proyectoId: z.string(),
    porcentajeHerramientaMenor: z.number(),
    porcentajeIndirecto: z.number().nullable(),
    iva: z.number(),
    moneda: z.string(),
    mostrarSeccionesVacias: z.boolean(),
    sufijosSeccionActivos: z.boolean(),
    mostrarSubtotalesSeccion: z.boolean(),
    mostrarSubtotalesPie: z.boolean(),
    mostrarNombreProyectoHeader: z.boolean(),
    enumerarApus: z.boolean(),
    mensajeFooter: z.string(),
    modoCodigoRubro: z.enum(["AUTOGENERADO", "MANUAL"]),
  })
  .strict();
export const firmanteSchema = z
  .object({
    id: z.string(),
    nombre: z.string(),
    cargo: z.string(),
    rol: z.enum(["CONSOLIDADO", "APROBADO"]),
    orden: z.number(),
  })
  .strict();
export const importResultadoSchema = z
  .object({
    creados: z.number(),
    actualizados: z.number(),
    errores: z.array(
      z.object({ fila: z.number(), campo: z.string().optional(), mensaje: z.string() }).strict(),
    ),
  })
  .strict();
export const displayConfigSchema = z
  .object({ precisionDinero: z.number(), precisionPorcentaje: z.number() })
  .strict();
export const copiaBaseResultadoSchema: z.ZodType<
  CopiaBaseResultadoResponse,
  z.ZodTypeDef,
  unknown
> = z.object({ copiados: z.number(), omitidos: z.array(z.string()) }).strict();
export const validacionPresupuestoSchema = z
  .object({
    exportable: z.boolean(),
    itemsPuCero: z.array(
      z
        .object({ id: z.string(), item: z.string(), codigo: z.string(), descripcion: z.string() })
        .strict(),
    ),
    itemsCantidadCero: z.array(
      z
        .object({ id: z.string(), item: z.string(), codigo: z.string(), descripcion: z.string() })
        .strict(),
    ),
    itemsSinActividad: z.array(
      z
        .object({ id: z.string(), item: z.string(), codigo: z.string(), descripcion: z.string() })
        .strict(),
    ),
  })
  .strict();

/**
 * `GET /documentos/cronograma/{id}/preflight` — el único DTO de la exportación
 * del cronograma que se valida en runtime, porque la pantalla desreferencia
 * `data.bloqueos.map(...)` y `data.warnings.map(...)` sin guarda, que es
 * exactamente la clase de fallo que documenta este archivo.
 *
 * Los cinco campos son obligatorios porque `CronogramaExportPreflightResponse`
 * los declara obligatorios y `@JsonInclude(ALWAYS)` garantiza que viajan;
 * `actividadId` viaja como `null`, no ausente. No los relajes con `.optional()`.
 */
export const cronogramaExportPreflightSchema = z.object({
  exportable: z.boolean(),
  formato: z.enum(["xlsx", "pdf", "mspdi"]),
  bloqueos: z.array(
    z.object({ codigo: z.string(), actividadId: z.string().nullable(), detalle: z.string() }),
  ),
  warnings: z.array(z.object({ codigo: z.string(), detalle: z.string() })),
});

/**
 * El cuerpo de error del backend (`record ErrorPayload(String codigo, String
 * mensaje)`). El plan 028 validó las respuestas *correctas* y dejó fuera esta
 * mitad del seam —que es justo donde se escondió el defecto del plan 063
 * durante toda la vida del repo—, así que aquí se cierra.
 *
 * `passthrough()` es obligatorio, no laxitud: el 409 de configurar cronograma
 * manda `CronogramaConflictoPayload(codigo, mensaje, perdidas)` y `strip` —el
 * defecto de `z.object`— se comería `perdidas`, que `useCronograma` necesita.
 */
const seccionTipoSchema = z.enum(["EQUIPO", "MANO_OBRA", "MATERIAL", "TRANSPORTE"]);
const advertenciaPlantillaSchema = z
  .object({ insumoCodigo: z.string(), motivo: z.string(), mensaje: z.string() })
  .strict();
export const apuDetalleSchema = z
  .object({
    id: z.string(),
    orden: z.number(),
    descripcion: z.string(),
    esHerramientaMenor: z.boolean(),
    insumoId: z.string().nullable().optional(),
    cantidad: z.number().nullable().optional(),
    rendimiento: z.number().nullable().optional(),
    unidad: z.string().nullable().optional(),
    precioEfectivo: z.number().nullable(),
    precioHeredado: z.boolean(),
    costoHora: z.number().nullable().optional(),
    costo: z.number(),
  })
  .strict();
export const apuSchema = z
  .object({
    id: z.string(),
    codigo: z.string(),
    descripcion: z.string(),
    unidad: z.string(),
    costoDirecto: z.number(),
    costoTotal: z.number(),
    porcentajeIndirecto: z.number().optional(),
    porcentajeIndirectoEfectivo: z.number().nullable().optional(),
    costoIndirecto: z.number(),
    secciones: z.array(
      z
        .object({
          tipo: seccionTipoSchema,
          orden: z.number(),
          subtotal: z.number(),
          detalles: z.array(apuDetalleSchema),
        })
        .strict(),
    ),
    advertencias: z.array(advertenciaPlantillaSchema).optional(),
  })
  .strict();
export const apuCalculoSchema = z
  .object({
    apuId: z.string(),
    codigo: z.string(),
    parametros: z
      .object({ hm: z.number(), ciDefault: z.number().nullable(), ciAplicado: z.number() })
      .strict(),
    secciones: z.array(
      z
        .object({
          tipo: seccionTipoSchema,
          subtotal: z.number(),
          operacion: z.string(),
          resultado: z.number(),
          lineas: z.array(
            z
              .object({
                detalleId: z.string(),
                orden: z.number(),
                seccion: seccionTipoSchema,
                esHerramientaMenor: z.boolean(),
                insumoId: z.string().nullable(),
                descripcion: z.string(),
                cantidad: z.number().nullable(),
                rendimiento: z.number().nullable(),
                precioEfectivo: z.number().nullable(),
                costoHora: z.number().nullable(),
                operacion: z.string(),
                resultado: z.number(),
              })
              .strict(),
          ),
        })
        .strict(),
    ),
    resumen: z.object({ cd: z.number(), ci: z.number(), ct: z.number() }).strict(),
  })
  .strict();
export const especificacionTecnicaSchema = z
  .object({ apuId: z.string(), contenido: z.string().nullable() })
  .strict();
export const plantillaApuDetalleSchema = z
  .object({
    id: z.string(),
    nombre: z.string(),
    tipo: z.enum(["SISTEMA", "PERSONAL"]),
    descripcionRubro: z.string().optional(),
    unidad: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    snapshotSecciones: z.unknown(),
    advertencias: z.array(advertenciaPlantillaSchema).optional(),
  })
  .strict();
export const insumoBusquedaSchema = z
  .object({
    id: z.string(),
    codigo: z.string(),
    descripcion: z.string(),
    tipo: seccionTipoSchema,
    unidad: z.string(),
    precioUnitario: z.number(),
    fechaActualizacion: z.string(),
    desactualizado: z.boolean(),
    fuente: z.enum(["CENTRAL", "PROYECTO"]),
    baseNombre: z.string().nullable(),
  })
  .strict();
export const insumoUsoSchema = z
  .object({
    apuId: z.string(),
    codigo: z.string(),
    descripcion: z.string(),
    bloque: z.string(),
    override: z.boolean(),
  })
  .strict();

const decimalSchema: z.ZodType<Decimal, z.ZodTypeDef, unknown> = z.string().transform(asDecimal);
const rubroRefSchema = z
  .object({ id: z.string(), item: z.string(), codigo: z.string(), descripcion: z.string() })
  .strict();
export const plantillaProyectoSchema = z
  .object({
    id: z.string(),
    nombre: z.string(),
    descripcion: z.string().optional(),
    snapshotEstructura: z.unknown(),
    fechaCreacion: z.string(),
  })
  .strict();
export const proyectoDesdePlantillaSchema = z
  .object({ proyecto: proyectoSchema, advertencias: z.array(z.unknown()).optional() })
  .strict();
export const parametrosSistemaSchema = z
  .object({
    id: z.number(),
    porcentajeHerramientaMenor: z.number(),
    porcentajeIndirecto: z.number().nullable(),
    iva: z.number(),
    moneda: z.string(),
    rangoHmMin: z.number(),
    rangoHmMax: z.number(),
    rangoCiMin: z.number(),
    rangoCiMax: z.number(),
    rangoDescuentoMin: z.number(),
    rangoDescuentoMax: z.number(),
    rangoIvaMin: z.number(),
    rangoIvaMax: z.number(),
    mostrarSeccionesVacias: z.boolean(),
    sufijosSeccionActivos: z.boolean(),
    mostrarSubtotalesSeccion: z.boolean(),
    mostrarSubtotalesPie: z.boolean(),
    mostrarNombreProyectoHeader: z.boolean(),
    enumerarApus: z.boolean(),
    mensajeFooter: z.string().nullable(),
    modoCodigoRubro: z.enum(["AUTOGENERADO", "MANUAL"]),
    updatedAt: z.string(),
  })
  .strict();
const rubroSchema: z.ZodType<RubroResponse, z.ZodTypeDef, unknown> = z
  .object({
    id: z.string(),
    item: z.string(),
    codigo: z.string(),
    descripcion: z.string(),
    unidad: z.string(),
    cantidad: decimalSchema,
    precioUnitario: decimalSchema,
    precioTotal: decimalSchema,
    apuId: z.string(),
  })
  .strict();
const capituloSchema: z.ZodType<CapituloResponse, z.ZodTypeDef, unknown> = z.lazy(() =>
  z
    .object({
      id: z.string(),
      item: z.string(),
      descripcion: z.string(),
      orden: z.number(),
      total: decimalSchema,
      subcapitulos: z.array(capituloSchema),
      rubros: z.array(rubroSchema),
    })
    .strict(),
);
export const presupuestoSchema: z.ZodType<PresupuestoResponse, z.ZodTypeDef, unknown> = z
  .object({
    presupuestoId: z.string(),
    version: z.number(),
    esVigente: z.boolean(),
    totalGeneral: decimalSchema,
    capitulos: z.array(capituloSchema),
  })
  .strict();
export const versionSchema: z.ZodType<PresupuestoVersionResponse, z.ZodTypeDef, unknown> = z
  .object({
    presupuestoId: z.string(),
    version: z.number(),
    esVigente: z.boolean(),
    origenId: z.string().nullable().optional(),
    notas: z.string().optional(),
    fechaCreacion: z.string(),
    totalGeneral: decimalSchema,
  })
  .strict();
export const resumenComponentesSchema: z.ZodType<
  ResumenComponentesResponse,
  z.ZodTypeDef,
  unknown
> = z
  .object({
    porComponente: z.record(decimalSchema),
    totalGeneral: decimalSchema,
    ivaReferencial: decimalSchema,
    totalConIva: decimalSchema,
  })
  .strict();
const comparacionItemSchema = z
  .object({ item: z.string(), descripcion: z.string(), total: decimalSchema })
  .strict();
export const comparacionVersionesSchema: z.ZodType<
  ComparacionVersionesResponse,
  z.ZodTypeDef,
  unknown
> = z
  .object({
    versiones: z.array(
      z
        .object({
          presupuestoId: z.string(),
          version: z.number(),
          totalGeneral: decimalSchema,
          porCapituloRaiz: z.array(comparacionItemSchema),
        })
        .strict(),
    ),
  })
  .strict();
export const validacionPresupuestoCompletaSchema: z.ZodType<
  ValidacionPresupuestoResponse,
  z.ZodTypeDef,
  unknown
> = z
  .object({
    exportable: z.boolean(),
    itemsPuCero: z.array(rubroRefSchema),
    itemsCantidadCero: z.array(rubroRefSchema),
    itemsSinActividad: z.array(rubroRefSchema),
  })
  .strict();
const actividadSchema = z
  .object({
    id: z.string(),
    rubroId: z.string(),
    item: z.string(),
    codigo: z.string(),
    descripcion: z.string(),
    unidad: z.string(),
    cantidad: decimalSchema,
    precioUnitario: decimalSchema,
    precioTotal: decimalSchema,
    pesoPonderado: decimalSchema,
    avancePorPeriodo: z.record(decimalSchema),
    segmentos: z.array(z.object({ inicio: z.number(), fin: z.number() }).strict()),
    desviacion: decimalSchema,
  })
  .strict();
export const cronogramaSchema: z.ZodType<CronogramaResponse, z.ZodTypeDef, unknown> = z
  .object({
    id: z.string(),
    presupuestoId: z.string(),
    unidadTiempo: z.enum(["SEMANA", "MES"]),
    numeroPeriodos: z.number(),
    totalGeneral: decimalSchema,
    totalGeneralRevisado: decimalSchema.nullable(),
    fechaRevision: z.string().nullable(),
    estadoDistribucion: z.enum(["COMPLETO", "BORRADOR"]),
    desactualizado: z.boolean(),
    avanceFinal: decimalSchema,
    actividades: z.array(actividadSchema),
    avancePorPeriodo: z.array(decimalSchema),
    avanceAcumulado: z.array(decimalSchema),
  })
  .strict();
export const errorPayloadSchema = z
  .object({
    codigo: z.string(),
    mensaje: z.string(),
  })
  .passthrough();

/**
 * Un fallo de validación es un problema del *cliente*, no un código del
 * contrato: por eso `respuesta-invalida` no sale de `PROBLEM_TYPES`. Se
 * envuelve en `ApiError` para que el manejo de errores existente lo trate como
 * cualquier otro fallo de red.
 */
export function errorDeRespuesta(url: string, error: z.ZodError): ApiError {
  const detalle = error.issues
    .slice(0, 3)
    .map((i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`)
    .join("; ");
  return new ApiError(
    {
      codigo: "respuesta-invalida",
      mensaje: `El servidor devolvió una respuesta inesperada: ${url} — ${detalle}`,
    },
    500,
  );
}
