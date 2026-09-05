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
  id: number;
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

// El backend aún no envía alertas; opcional hasta que las implemente.
export type ProyectoDetalleResponse = ProyectoResponse & { alertas?: string[] };

export interface ProyectoCrearRequest {
  nombreProyecto: string;
  codigo?: string;
  descripcion?: string;
  anio?: number;
  fechaInicio?: string;
  plazoEjecucion?: number;
  plazoUnidad?: "SEMANA" | "MES";
  direccionInstitucional?: string;
  subdireccionInstitucional?: string;
}

export interface ProyectoEditarRequest {
  nombreProyecto?: string;
  codigo?: string;
  descripcion?: string;
  anio?: number;
  fechaInicio?: string;
  plazoEjecucion?: number;
  plazoUnidad?: "SEMANA" | "MES";
  direccionInstitucional?: string;
  subdireccionInstitucional?: string;
}

export interface ProyectoDuplicarRequest {
  nombre: string;
  codigo: string;
}

export interface PlantillaProyectoResponse {
  id: number;
  nombre: string;
  descripcion?: string;
  fechaCreacion: string;
}

export interface PlantillaProyectoCrearRequest {
  nombre: string;
  descripcion?: string;
  proyectoId: number;
}

export interface ProyectoDesdePlantillaRequest {
  nombre: string;
}

export interface FirmanteResponse {
  id: number;
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
  proyectoId?: number;
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

export interface ParametrosProyectoActualizarRequest {
  porcentajeHerramientaMenor: number;
  porcentajeIndirecto?: number | null;
  iva: number;
  moneda: string;
}

export interface DescuentoGlobalPreviewResponse {
  porcentaje: Decimal;
  porApu: Array<{
    apuId: number;
    codigo: string;
    cd: Decimal;
    cdAjustado: Decimal;
    ci: Decimal;
    ct: Decimal;
  }>;
  totalGeneralActual: Decimal;
  totalGeneralProyectado: Decimal;
}

export interface DescuentoGlobalRequest {
  porcentaje: Decimal;
}

// ————— Insumos y bases (§11) —————
export type TipoInsumo = "EQUIPO" | "MANO_OBRA" | "MATERIAL" | "TRANSPORTE";

export interface InsumoResponse {
  id: number;
  codigo: string;
  tipo: TipoInsumo;
  descripcion: string;
  unidad: string;
  precioUnitario: number;
  fechaActualizacion: string;
  desactualizado: boolean;
  fuente?: "LOCAL" | "CENTRAL";
  baseNombre?: string;
}

export interface InsumoCrearRequest {
  codigo: string;
  tipo: TipoInsumo;
  descripcion: string;
  unidad: string;
  precioUnitario: number;
}

export interface InsumoEditarRequest {
  descripcion?: string;
  unidad?: string;
  precioUnitario?: number;
}

export interface InsumoUsoResponse {
  apuId: number;
  apuCodigo: string;
  apuDescripcion: string;
  detalleId: number;
  cantidad: Decimal;
}

export interface InsumoBusquedaResponse {
  id: number;
  codigo: string;
  descripcion: string;
  tipo: TipoInsumo;
  unidad: string;
  precioUnitario: number;
  fuente?: "LOCAL" | "CENTRAL";
  baseNombre?: string;
}

export interface ImportResultadoResponse {
  creados: number;
  actualizados: number;
  errores: Array<{ fila: number; campo?: string; mensaje: string }>;
}

export interface CopiarBaseRequest {
  fuenteTipo: "CENTRAL" | "PROYECTO";
  baseId?: number;
  proyectoId?: number;
}

export interface CopiaBaseResultadoResponse {
  copiados: number;
  omitidos: string[];
}

export interface BaseInsumosResponse {
  id: number;
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
  id: number;
  orden: number;
  descripcion: string;
  esHerramientaMenor: boolean;
  insumoId?: number | null;
  cantidad?: number | null;
  rendimiento?: number | null;
  unidad?: string | null;
  precioEfectivo: number;
  precioHeredado: boolean;
  costoHora?: number | null;
  costo: number;
}

export interface ApuResponse {
  id: number;
  codigo: string;
  descripcion: string;
  unidad: string;
  costoDirecto: number;
  costoTotal: number;
  porcentajeIndirecto?: number | null;
  porcentajeIndirectoEfectivo: number;
  porcentajeDescuento: number;
  costoIndirecto: number;
  especificacionTecnica?: string | null;
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

export interface ApuResumenResponse {
  id: number;
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

export interface ApuPatchRequest {
  codigo?: string;
  descripcion?: string;
  unidad?: string;
  porcentajeIndirecto?: Decimal | null;
}

export interface ApuDetalleCrearRequest {
  insumoId?: number;
  cantidad?: Decimal;
  rendimiento?: Decimal;
}

export interface ApuDetallePatchRequest {
  cantidad?: Decimal;
  rendimiento?: Decimal;
  precioOverride?: Decimal | null;
  orden?: number;
}

export interface DescuentoRubroRequest {
  porcentaje: Decimal;
}

export interface ApuCalculoResponse {
  formulas: Array<{ concepto: string; formula: string; resultado: string }>;
  subtotales: Record<string, string>;
  cd: string;
  cdAjustado: string;
  ci: string;
  ct: string;
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
  descripcion?: string;
}

export interface PlantillaApuDetalleResponse extends PlantillaApuResumenResponse {
  snapshotSecciones: unknown;
  advertencias?: AdvertenciaPlantillaResponse[];
}

export interface PlantillaSistemaCrearRequest {
  nombre: string;
  descripcion?: string;
  desdeApuId: number;
}

// ————— Presupuesto y versiones (§11) —————
export interface PresupuestoVersionResponse {
  presupuestoId: number;
  version: number;
  esVigente: boolean;
  origenId: number;
  notas?: string;
  fechaCreacion: string;
  totalGeneral: Decimal;
}

export interface PresupuestoVersionCrearRequest {
  origenId: number;
  notas?: string;
}

export interface CapituloResponse {
  id: number;
  item: string;
  descripcion: string;
  orden: number;
  total: Decimal;
  subcapitulos: CapituloResponse[];
  rubros: RubroResponse[];
}

export interface RubroResponse {
  id: number;
  item: string;
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: Decimal;
  precioUnitario: Decimal;
  precioTotal: Decimal;
  apuId: number;
  alertas: string[];
}

export interface PresupuestoResponse {
  presupuestoId: number;
  version: number;
  esVigente: boolean;
  totalGeneral: Decimal;
  capitulos: CapituloResponse[];
}

export interface CapituloCrearRequest {
  descripcion: string;
  parentId?: number;
  orden?: number;
}

export interface CapituloEditarRequest {
  descripcion?: string;
}

export interface CapituloMoverRequest {
  parentId?: number | null;
  orden: number;
}

export interface RubroCrearRequest {
  apuId: number;
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
  presupuestoId: number;
  version: number;
  totalGeneral: Decimal;
  porCapituloRaiz: CapituloComparacionItem[];
}

export interface ComparacionVersionesResponse {
  versiones: PresupuestoComparacionItem[];
}

export interface RubroRefResponse {
  rubroId: number;
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
export type UnidadTiempo = "SEMANA" | "MES";

export interface ActividadResponse {
  id: number;
  rubroId: number;
  item: string;
  descripcion: string;
  precioTotal: Decimal;
  pesoPonderado: Decimal;
  avancePorPeriodo: Record<string, Decimal>;
  desviacion: Decimal;
}

export interface CronogramaResponse {
  id: number;
  presupuestoId: number;
  unidadTiempo: UnidadTiempo;
  numeroPeriodos: number;
  totalGeneral: Decimal;
  totalGeneralRevisado?: Decimal;
  fechaRevision?: string;
  desactualizado: boolean;
  actividades: ActividadResponse[];
  avancePorPeriodo: Record<string, Decimal>;
  avanceAcumulado: Record<string, Decimal>;
}

export interface CronogramaCrearRequest {
  unidadTiempo: UnidadTiempo;
  numeroPeriodos: number;
}

export interface CronogramaConfigurarRequest {
  unidadTiempo?: UnidadTiempo;
  numeroPeriodos?: number;
  confirmarPerdida?: boolean;
}

export interface ActividadAvanceRequest {
  avancePorPeriodo: Record<string, Decimal>;
}

// ————— Super-Admin (§11) —————
export interface UsuarioAdminResponse {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  emailVerificado: boolean;
  fechaCreacion: string;
}

export interface UsuarioInvitarRequest {
  nombre: string;
  email: string;
  rol: Rol;
}

export interface UsuarioAdminEditarRequest {
  nombre?: string;
  email?: string;
  rol?: Rol;
}

export interface ParametrosSistemaResponse {
  porcentajeHerramientaMenor: Decimal;
  porcentajeIndirecto?: Decimal | null;
  iva: Decimal;
  moneda: string;
  rangoHmMin?: Decimal;
  rangoHmMax?: Decimal;
  rangoCiMin?: Decimal;
  rangoCiMax?: Decimal;
  rangoDescuentoMin?: Decimal;
  rangoDescuentoMax?: Decimal;
  rangoIvaMin?: Decimal;
  rangoIvaMax?: Decimal;
}

export interface ParametrosSistemaActualizarRequest {
  porcentajeHerramientaMenor?: Decimal;
  porcentajeIndirecto?: Decimal | null;
  iva?: Decimal;
  moneda?: string;
}

export interface ValorReferenciaResponse {
  clave: string;
  valor: string;
  descripcion: string;
  fuente: string;
}

export interface ValorReferenciaRequest {
  valor: string;
  descripcion: string;
  fuente: string;
}

export interface LogActividadResponse {
  id: number;
  usuarioId: number;
  usuarioNombre: string;
  evento: string;
  detalle: Record<string, unknown>;
  fecha: string;
}

// ————— Display config —————
export interface DisplayConfigResponse {
  precisionDinero: number;
  precisionPorcentaje: number;
}
