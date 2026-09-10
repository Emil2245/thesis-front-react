import type { Decimal } from "@/lib/decimal";

// ————— Common —————
export interface Page<T> {
  contenido: T[];
  page: number;
  size: number;
  totalElementos: number;
  totalPaginas: number;
}

// ————— Autenticación y cuenta (§11) —————
export type Rol = "USUARIO" | "SUPER_ADMIN";

export interface UsuarioResponse {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  emailVerificado: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
  recordarSesion: boolean;
}

export interface TokenResponse {
  accessToken: string;
  expiraEnSegundos: number;
  refreshToken?: string;
  usuario: UsuarioResponse;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface VerificarEmailRequest {
  token: string;
}

export interface ReenviarVerificacionRequest {
  email: string;
}

export interface RecuperarPasswordRequest {
  email: string;
}

export interface RestablecerPasswordRequest {
  token: string;
  password: string;
  passwordConfirmacion: string;
}

export interface RegistroRequest {
  nombre: string;
  email: string;
  password: string;
  passwordConfirmacion: string;
}

export interface AceptarInvitacionRequest {
  token: string;
  password: string;
  passwordConfirmacion: string;
}

export interface PerfilResponse {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  fechaCreacion: string;
}

export interface PerfilActualizarRequest {
  nombre: string;
  email: string;
}

export interface PasswordCambiarRequest {
  passwordActual: string;
  passwordNueva: string;
  passwordConfirmacion: string;
}

// ————— Proyectos, firmantes y parámetros (§11) —————
export interface ProyectoResponse {
  id: string;
  nombreProyecto: string;
  codigo: string;
  estado: "BORRADOR" | "EN_PROCESO" | "FINALIZADO";
  descripcion?: string;
  direccionInstitucional?: string;
  subdireccionInstitucional?: string;
  anio?: number;
  fechaInicio?: string;
  plazoEjecucion?: number;
  plazoUnidad?: string;
  tieneLogo?: boolean;
  updatedAt?: string;
}

// Asimetría real del backend, no error del frontend: `plazoUnidad` es `String`
// en los requests y el enum `PlazoUnidad` en la respuesta. Se tipa como viaja.
export interface ProyectoCrearRequest {
  nombreProyecto: string;
  codigo?: string;
  descripcion?: string;
  anio: number;
  fechaInicio?: string;
  plazoEjecucion: number;
  plazoUnidad: string;
  direccionInstitucional: string;
  subdireccionInstitucional?: string;
}

export interface ProyectoEditarRequest {
  nombreProyecto: string;
  codigo?: string;
  descripcion?: string;
  anio?: number;
  fechaInicio?: string;
  plazoEjecucion?: number;
  plazoUnidad?: string;
  direccionInstitucional: string;
  subdireccionInstitucional?: string;
}

export interface PlantillaProyectoResponse {
  id: string;
  nombre: string;
  descripcion?: string;
  // JsonNode opaco: el backend no fija su forma, así que aquí es `unknown` y lo
  // estrecha quien lo consuma. Inventarle una interfaz sería un contrato imaginario.
  snapshotEstructura: unknown;
  fechaCreacion: string;
}

/** Cuerpo de POST /proyectos/{proyectoId}/guardar-plantilla. `proyectoId` va en
 *  la ruta, nunca en el cuerpo, y el snapshot lo construye el backend. */
export interface PlantillaProyectoCrearRequest {
  nombre: string;
  descripcion?: string;
}

export interface ProyectoDesdePlantillaRequest {
  nombre: string;
}

/** POST /proyectos/desde-plantilla/{plantillaId}: 201 sin advertencias, 200 con
 *  ellas, y en ambos casos el proyecto viene envuelto. */
export interface ProyectoDesdePlantillaResponse {
  proyecto: ProyectoResponse;
  advertencias?: AdvertenciaPlantillaResponse[];
}

export interface FirmanteResponse {
  id: string;
  nombre: string;
  cargo: string;
  rol: "CONSOLIDADO" | "APROBADO";
  orden: number;
}

export interface FirmanteCrearRequest {
  nombre: string;
  cargo: string;
  rol: "CONSOLIDADO" | "APROBADO";
  orden: number;
}

export interface ParametrosProyectoResponse {
  proyectoId?: string;
  porcentajeHerramientaMenor: number;
  porcentajeIndirecto?: number | null;
  iva: number;
  moneda: string;
  mostrarSeccionesVacias: boolean;
  sufijosSeccionActivos: boolean;
  mostrarSubtotalesSeccion: boolean;
  mostrarSubtotalesPie: boolean;
  mostrarNombreProyectoHeader: boolean;
  enumerarApus: boolean;
  mensajeFooter?: string | null;
  modoCodigoRubro: "AUTOGENERADO" | "MANUAL";
}

export interface ParametrosProyectoEditarRequest {
  porcentajeHerramientaMenor: number;
  porcentajeIndirecto?: number | null;
  iva: number;
  moneda?: string;
}

// ————— Insumos y bases (§11) —————
export type TipoInsumo = "EQUIPO" | "MANO_OBRA" | "MATERIAL" | "TRANSPORTE";

// `fuente` y `baseNombre` no están aquí: son de InsumoBusquedaResponse, el DTO
// del selector multi-fuente. Los listados de insumos del proyecto no los traen.
/** @deprecated Use ParametrosProyectoEditarRequest. */
export type ParametrosProyectoActualizarRequest = Partial<ParametrosProyectoEditarRequest> & {
  mostrarSeccionesVacias?: boolean;
  sufijosSeccionActivos?: boolean;
  mostrarSubtotalesSeccion?: boolean;
  mostrarSubtotalesPie?: boolean;
  mostrarNombreProyectoHeader?: boolean;
  enumerarApus?: boolean;
  mensajeFooter?: string | null;
  modoCodigoRubro?: "AUTOGENERADO" | "MANUAL";
};

export interface InsumoResponse {
  id: string;
  codigo: string;
  tipo: TipoInsumo;
  descripcion: string;
  unidad: string;
  precioUnitario: number;
  fechaActualizacion: string;
  /** «> 3 meses sin actualizar» (RNF-08): lo calcula el backend, no se deriva aquí. */
  desactualizado: boolean;
}

export interface InsumoCrearRequest {
  codigo: string;
  tipo: TipoInsumo;
  descripcion: string;
  unidad: string;
  precioUnitario: number;
}

export interface InsumoEditarRequest {
  descripcion: string;
  unidad: string;
  precioUnitario: number;
}

// GET /proyectos/{id}/insumos/{insumoId}/usos — `usos` en plural.
export interface InsumoUsoResponse {
  apuId: string;
  codigo: string;
  descripcion: string;
  /** Bloque M/N/O/P donde aparece el insumo. */
  bloque: string;
  /** El APU tiene un precio manual para este insumo: explica el bloqueo de borrado (S-19). */
  override: boolean;
}

// InsumoResponse + fuente, para el selector multi-fuente (P-16/P-21).
export interface InsumoBusquedaResponse {
  id: string;
  codigo: string;
  descripcion: string;
  tipo: TipoInsumo;
  unidad: string;
  precioUnitario: number;
  fechaActualizacion: string;
  desactualizado: boolean;
  // El backend emite "PROYECTO", no "LOCAL": el filtro de la UI sí usa LOCAL,
  // pero eso es un parámetro de búsqueda, no el valor que vuelve.
  fuente: "CENTRAL" | "PROYECTO";
  baseNombre: string | null;
}

export interface ImportResultadoResponse {
  creados: number;
  actualizados: number;
  errores: Array<{ fila: number; campo?: string; mensaje: string }>;
}

export interface CopiarBaseRequest {
  fuenteTipo: "CENTRAL" | "PROYECTO";
  baseId: string;
}

export interface CopiaBaseResultadoResponse {
  copiados: number;
  omitidos: string[];
}

export interface BaseInsumosResponse {
  id: string;
  nombre: string;
  tipo: "CENTRAL";
  archivada: boolean;
  totalInsumos: number;
}

export interface BaseInsumosCrearRequest {
  nombre: string;
}

// ————— APU y plantillas (§11) —————
export type SeccionTipo = "EQUIPO" | "MANO_OBRA" | "MATERIAL" | "TRANSPORTE";

export interface ApuDetalleResponse {
  id: string;
  orden: number;
  descripcion: string;
  esHerramientaMenor: boolean;
  insumoId?: string | null;
  cantidad?: number | null;
  rendimiento?: number | null;
  unidad?: string | null;
  precioEfectivo: number | null;
  precioHeredado: boolean;
  costoHora?: number | null;
  costo: number;
}

// @JsonInclude(NON_NULL): los campos nulos no vienen en el JSON, así que todo
// opcional es `?` y no `| null`. No lleva `porcentajeDescuento` (retirado el
// 2026-08-31) ni `especificacionTecnica`: la ET se lee con su propio GET.
export interface ApuResponse {
  id: string;
  codigo: string;
  descripcion: string;
  unidad: string;
  costoDirecto: number;
  costoTotal: number;
  /** Override del APU; ausente cuando hereda del proyecto. */
  porcentajeIndirecto?: number;
  /** El %CI realmente aplicado tras la herencia; ausente cuando el proyecto no tiene %CI configurado. */
  porcentajeIndirectoEfectivo?: number | null;
  costoIndirecto: number;
  secciones: Array<{
    tipo: SeccionTipo;
    orden: number;
    subtotal: number;
    detalles: ApuDetalleResponse[];
  }>;
  advertencias?: AdvertenciaPlantillaResponse[];
}

export interface EspecificacionTecnicaRequest {
  texto: string;
}

/** GET /apus/{apuId}/especificacion-tecnica. `contenido` es null si no hay ET. */
export interface EspecificacionTecnicaResponse {
  apuId: string;
  contenido: string | null;
}

/** Body ausente o `copiarET: null` → no copiar la ET del APU origen. */
export interface ApuDuplicarRequest {
  copiarET?: boolean;
}

export interface ApuResumenResponse {
  id: string;
  codigo: string;
  descripcion: string;
  unidad: string;
  costoDirecto: number;
  costoTotal: number;
  vinculado: boolean;
}

export interface ApuCrearRequest {
  codigo: string;
  descripcion: string;
  unidad: string;
  plantillaId?: string;
}

// El record del backend es ApuPatchRequest(codigo, descripcion, unidad): no
// añadir campos aquí. El %CI se edita con PATCH /apus/{id}/porcentaje-indirecto
// y un decimal crudo como body (plan 054 §2).
export interface ApuPatchRequest {
  codigo?: string;
  descripcion?: string;
  unidad?: string;
}

// Los tres primeros son @NotNull en main: sin `seccionTipo` el POST es un 400.
// `cantidad` y `rendimiento` son @DecimalMin("0.000001"): mandar 0 también es
// un 400, así que `rendimiento` se omite en vez de enviarse a cero.
export interface ApuDetalleCrearRequest {
  seccionTipo: SeccionTipo;
  insumoId: string;
  cantidad: Decimal;
  rendimiento?: Decimal;
}

export interface ApuDetallePatchRequest {
  cantidad?: Decimal;
  rendimiento?: Decimal;
  precioOverride?: Decimal | null;
  orden?: number;
}

// El desglose de cálculo (P-27) es dinero como `number`, no `Decimal` string:
// ésa es la partición del §2 del handoff. `operacion` es la fórmula en texto que
// el backend ya compone ("4.690900 × 0.180000"); la UI la muestra, no la arma.
// ApuCalculoResponse no lleva @JsonInclude(NON_NULL): los nulos sí viajan.
export interface ApuCalculoLinea {
  detalleId: string;
  orden: number;
  seccion: SeccionTipo;
  esHerramientaMenor: boolean;
  // La fila de Herramienta Menor no tiene insumo.
  insumoId: string | null;
  descripcion: string;
  cantidad: number | null;
  rendimiento: number | null;
  precioEfectivo: number | null;
  costoHora: number | null;
  operacion: string;
  resultado: number;
}

export interface ApuCalculoSeccion {
  tipo: SeccionTipo;
  subtotal: number;
  operacion: string;
  resultado: number;
  lineas: ApuCalculoLinea[];
}

export interface ApuCalculoResponse {
  apuId: string;
  codigo: string;
  // ciAplicado = COALESCE(apu.porcentajeIndirecto, proyecto.porcentajeIndirecto, 0).
  // No existe `descuento`: la cadena activa del motor es CD → CI → CT.
  parametros: { hm: number; ciDefault: number | null; ciAplicado: number };
  secciones: ApuCalculoSeccion[];
  // No existe `cdAjustado`: un contract test del backend lo custodia.
  resumen: { cd: number; ci: number; ct: number };
}

export interface PlantillaApuResumenResponse {
  id: string;
  nombre: string;
  tipo: "SISTEMA" | "PERSONAL";
  descripcionRubro?: string;
  unidad?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdvertenciaPlantillaResponse {
  insumoCodigo: string;
  motivo: string;
  mensaje: string;
}

export interface PlantillaApuCrearRequest {
  nombre: string;
  descripcionRubro?: string;
}

export interface PlantillaApuEditarRequest {
  nombre?: string;
  descripcionRubro?: string;
}

export interface PlantillaApuDetalleResponse extends PlantillaApuResumenResponse {
  snapshotSecciones: unknown;
  advertencias?: AdvertenciaPlantillaResponse[];
}

export interface PlantillaSistemaCrearRequest {
  nombre: string;
  descripcion?: string;
  desdeApuId: string;
}

// ————— Presupuesto y versiones (§11) —————
export interface PresupuestoVersionResponse {
  presupuestoId: string;
  version: number;
  esVigente: boolean;
  // La versión inicial no nace de ninguna otra.
  origenId?: string | null;
  notas?: string;
  fechaCreacion: string;
  totalGeneral: Decimal;
}

export interface PresupuestoVersionCrearRequest {
  origenId: string;
  notas?: string;
}

export interface CapituloResponse {
  id: string;
  item: string;
  descripcion: string;
  orden: number;
  total: Decimal;
  subcapitulos: CapituloResponse[];
  rubros: RubroResponse[];
}

export interface RubroResponse {
  id: string;
  item: string;
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: Decimal;
  precioUnitario: Decimal;
  precioTotal: Decimal;
  apuId: string;
}

export interface PresupuestoResponse {
  presupuestoId: string;
  version: number;
  esVigente: boolean;
  totalGeneral: Decimal;
  capitulos: CapituloResponse[];
}

export interface CapituloCrearRequest {
  descripcion: string;
  parentId?: string;
  orden?: number;
}

export interface CapituloEditarRequest {
  descripcion?: string;
}

export interface CapituloMoverRequest {
  parentId?: string | null;
  orden: number;
}

export interface RubroCrearRequest {
  apuId: string;
  cantidad: Decimal;
}

export interface RubroPatchRequest {
  cantidad?: Decimal;
}

export interface ResumenComponentesResponse {
  porComponente: Record<string, Decimal>;
  totalGeneral: Decimal;
  ivaReferencial: Decimal;
  totalConIva: Decimal;
}

export interface CapituloComparacionItem {
  item: string;
  descripcion: string;
  total: Decimal;
}

export interface PresupuestoComparacionItem {
  presupuestoId: string;
  version: number;
  totalGeneral: Decimal;
  porCapituloRaiz: CapituloComparacionItem[];
}

export interface ComparacionVersionesResponse {
  versiones: PresupuestoComparacionItem[];
}

export interface RubroRefResponse {
  id: string;
  item: string;
  codigo: string;
  descripcion: string;
}

export interface ValidacionPresupuestoResponse {
  exportable: boolean;
  itemsPuCero: RubroRefResponse[];
  itemsCantidadCero: RubroRefResponse[];
  itemsSinActividad: RubroRefResponse[];
}

// ————— Cronograma (§11) —————
//
// Escrito contra el paquete `ec.uce.propuestas.cronograma` de `origin/main`
// (plan 055), no contra `07-api-contract.md` §7, que describe el contrato
// anterior a los planes de backend 026–030.
//
// Dos escalas conviven aquí: el dinero va a 6 decimales
// (`totalGeneral`, `precioTotal`, …) y todo lo que es porcentaje o avance a 4
// (`pesoPonderado`, `avancePorPeriodo`, `desviacion`, `avanceFinal`).
export type UnidadTiempo = "SEMANA" | "MES";

/** `COMPLETO` sólo si toda desviación es 0,0000 y `avanceFinal` es 100,0000. */
export type EstadoDistribucion = "COMPLETO" | "BORRADOR";

/** Corrida de períodos consecutivos, 1-based e inclusiva por los dos extremos. */
export interface SegmentoResponse {
  inicio: number;
  fin: number;
}

export interface ActividadCronogramaResponse {
  id: string;
  rubroId: string;
  item: string;
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: Decimal;
  precioUnitario: Decimal;
  precioTotal: Decimal;
  /** Porcentaje escala 4: 75,6757 se manda como `"75.6757"`, no como `0.756757`. */
  pesoPonderado: Decimal;
  /**
   * Disperso: sólo los períodos asignados, con la clave 1-based como string.
   * Ojo — el campo homónimo de `CronogramaResponse` es un array denso.
   */
  avancePorPeriodo: Record<string, Decimal>;
  segmentos: SegmentoResponse[];
  /** `pesoPonderado − Σ avancePorPeriodo`, escala 4. */
  desviacion: Decimal;
}

export interface CronogramaResponse {
  id: string;
  presupuestoId: string;
  unidadTiempo: UnidadTiempo;
  numeroPeriodos: number;
  totalGeneral: Decimal;
  totalGeneralRevisado: Decimal | null;
  fechaRevision: string | null;
  estadoDistribucion: EstadoDistribucion;
  desactualizado: boolean;
  /** Σ de todos los avances, escala 4. */
  avanceFinal: Decimal;
  actividades: ActividadCronogramaResponse[];
  /** Array **denso** de largo `numeroPeriodos`: la posición 0 es el período 1. */
  avancePorPeriodo: Decimal[];
  avanceAcumulado: Decimal[];
}

export interface CronogramaCrearRequest {
  unidadTiempo: UnidadTiempo;
  numeroPeriodos: number;
}

/** Los dos primeros son obligatorios también al reconfigurar. */
export interface CronogramaConfigurarRequest {
  unidadTiempo: UnidadTiempo;
  numeroPeriodos: number;
  confirmarPerdida?: boolean;
}

/**
 * El PATCH de actividad es una unión discriminada por `operacion`, y el parser
 * del backend rechaza cualquier propiedad fuera de la lista de su operación.
 */
export type ActividadProgramarRequest =
  | { operacion: "REEMPLAZAR_AVANCES"; avancePorPeriodo: Record<string, Decimal> }
  | { operacion: "DISTRIBUIR_UNIFORME"; periodos: number[] }
  | { operacion: "MOVER_SEGMENTO"; inicio: number; fin: number; delta: number }
  | {
      operacion: "REDIMENSIONAR_SEGMENTO";
      inicio: number;
      fin: number;
      nuevoInicio: number;
      nuevoFin: number;
    };

/** Un avance que la reconfiguración va a borrar. */
export interface PerdidaAvanceResponse {
  actividadId: string;
  periodo: number;
  valor: Decimal;
}

/**
 * Los 409 de configuración y de programación NO pasan por
 * `GlobalExceptionMapper`, así que no traen `type`/`title`/`status`: se
 * distinguen por `codigo`. El de creación sí es Problem+JSON normal.
 */
export interface ConflictoCronograma {
  codigo: string;
  mensaje: string;
  perdidas?: PerdidaAvanceResponse[];
}

// ————— Documentos: exportación del cronograma (§11) —————
/**
 * Transcritos de `ec.uce.propuestas.cronograma.dto` en `origin/main @ 5673615`
 * (plan 031 del backend), que los sirve por
 * `GET /documentos/cronograma/{presupuestoId}[/preflight]?formato=xlsx|pdf|mspdi`.
 *
 * Los cuatro `record` llevan `@JsonInclude(JsonInclude.Include.ALWAYS)` —lo
 * contrario del patrón C de `docs/bugs.md`—, así que ninguna clave se omite:
 * `actividadId` **llega como `null`** cuando el bloqueo no viene de una
 * actividad concreta. Por eso es `actividadId: string | null`, clave
 * obligatoria, y no `actividadId?: string`.
 *
 * `codigo` es `string` a propósito y no una unión cerrada de los siete
 * bloqueos que el backend emite hoy: la UI muestra `detalle` —que el servidor
 * ya redacta en español— y no ramifica por código, así que un bloqueo nuevo del
 * backend no debe romper el tipado. Si algún día hace falta ramificar, ese será
 * el momento de cerrar la unión, no antes.
 */
export type FormatoExportCronograma = "xlsx" | "pdf" | "mspdi";

export interface BloqueoExportResponse {
  codigo: string;
  actividadId: string | null;
  detalle: string;
}

export interface WarningExportResponse {
  codigo: string;
  detalle: string;
}

export interface CronogramaExportPreflightResponse {
  exportable: boolean;
  formato: FormatoExportCronograma;
  bloqueos: BloqueoExportResponse[];
  warnings: WarningExportResponse[];
}

/** Cuerpo del 409 `export-bloqueado`: un superconjunto de `ErrorPayload`. */
export interface BloqueoExportDetalle {
  presupuestoId: string;
  formato: FormatoExportCronograma;
  codigo: "export-bloqueado";
  mensaje: string;
  bloqueos: BloqueoExportResponse[];
  warnings: WarningExportResponse[];
}

// ————— Super-Admin (§11) —————
// Los DTO de valores de referencia y logs de actividad se borraron con sus
// hooks (plan 050): esos dos recursos siguen sin existir en origin/main, y un
// tipo sin endpoint es una promesa que el próximo agente cree cumplida.
//
// Usuarios sí tiene backend real (plan 077): `UsuarioAdminResource`
// (`@Path("/admin/usuarios")`, `@RolesAllowed("SUPER_ADMIN")`). El gate
// `admin-usuarios` sigue cerrado en `MODULOS_SIN_BACKEND` — este DTO ya
// funciona, pero la pantalla real aún no está enchufada al Set (plan 081).
export interface UsuarioAdminResponse {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  emailVerificado: boolean;
  fechaCreacion: string;
}

/** `POST /admin/usuarios` — los tres campos son `@NotNull`. */
export interface UsuarioInvitarRequest {
  nombre: string;
  email: string;
  rol: Rol;
}

/**
 * `PUT /admin/usuarios/{id}` — los tres campos son `@NotNull`. Sin `email`: el
 * correo no se edita por aquí (el backend lo ignora en silencio si se manda,
 * pero el frontend no lo manda nunca).
 */
export interface UsuarioAdminEditarRequest {
  nombre: string;
  rol: Rol;
  activo: boolean;
}

/**
 * `GET /proyectos/parametros-sistema` devuelve la **entidad cruda**
 * `ParametrosSistema`, no un DTO: trae además seis booleanos de display,
 * `mensajeFooter`, `modoCodigoRubro` y `updatedAt`, que la UI no usa y por eso
 * no están aquí.
 *
 * Son `BigDecimal` serializados como número JSON, y son editables: `number`
 * por los dos ejes de la política de dinero (plan 061). Todas las columnas son
 * `nullable = false` con default en la entidad salvo `porcentajeIndirecto`, así
 * que los ocho rangos llegan siempre y no hay que inventarles un valor.
 */
export interface ParametrosSistemaResponse {
  porcentajeHerramientaMenor: number;
  porcentajeIndirecto?: number | null;
  iva: number;
  moneda: string;
  rangoHmMin: number;
  rangoHmMax: number;
  rangoCiMin: number;
  rangoCiMax: number;
  rangoDescuentoMin: number;
  rangoDescuentoMax: number;
  rangoIvaMin: number;
  rangoIvaMax: number;
}

/**
 * `ParametrosSistemaEditarRequest` — diez de los once campos numéricos son
 * `@NotNull` en el backend, así que un PUT parcial (la pantalla mandaba cuatro)
 * es un 400. Todos van en `[0, 1]`.
 */
export interface ParametrosSistemaEditarRequest {
  porcentajeHerramientaMenor: number;
  porcentajeIndirecto?: number | null;
  iva: number;
  rangoHmMin: number;
  rangoHmMax: number;
  rangoCiMin: number;
  rangoCiMax: number;
  rangoDescuentoMin: number;
  rangoDescuentoMax: number;
  rangoIvaMin: number;
  rangoIvaMax: number;
  moneda?: string;
}

// ————— Display config —————
export interface DisplayConfigResponse {
  precisionDinero: number;
  precisionPorcentaje: number;
}
