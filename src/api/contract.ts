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
}

export interface PerfilResponse {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  emailVerificado: boolean;
}

export interface PerfilActualizarRequest {
  nombre?: string;
  email?: string;
}

export interface PasswordCambiarRequest {
  passwordActual: string;
  passwordNueva: string;
}

// ————— Proyectos, firmantes y parámetros (§11) —————
export interface ProyectoResponse {
  id: number;
  nombre: string;
  codigo: string;
  estado: "BORRADOR" | "EN_PROCESO" | "FINALIZADO";
  fechaCreacion: string;
}

export interface ProyectoDetalleResponse {
  id: number;
  nombre: string;
  codigo: string;
  estado: "BORRADOR" | "EN_PROCESO" | "FINALIZADO";
  direccionInstitucional?: string;
  anio?: number;
  fechaCreacion: string;
  alertas: string[];
  tieneLogo: boolean;
}

export interface ProyectoCrearRequest {
  nombre: string;
  codigo: string;
  direccionInstitucional?: string;
  anio?: number;
  origenInsumos: OrigenInsumosRequest;
}

export interface OrigenInsumosRequest {
  tipo: "CENTRAL" | "PROYECTO" | "VACIA";
  baseId?: number;
  proyectoId?: number;
}

export interface ProyectoEditarRequest {
  nombre?: string;
  codigo?: string;
  direccionInstitucional?: string;
  anio?: number;
}

export interface ProyectoDuplicarRequest {
  nombre: string;
  codigo: string;
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
  porcentajeHerramientaMenor: Decimal;
  porcentajeIndirecto?: Decimal | null;
  iva: Decimal;
  moneda: string;
  mostrarSeccionesVacias: boolean;
  sufijosSeccionActivos: boolean;
  mostrarSubtotalesSeccion: boolean;
  mostrarSubtotalesPie: boolean;
  mostrarNombreProyectoHeader: boolean;
  enumerarApus: boolean;
  mensajeFooter?: string;
  modoCodigoRubro: "AUTOGENERADO" | "MANUAL";
}

export interface ParametrosProyectoActualizarRequest {
  porcentajeHerramientaMenor?: Decimal;
  porcentajeIndirecto?: Decimal | null;
  iva?: Decimal;
  moneda?: string;
  mostrarSeccionesVacias?: boolean;
  sufijosSeccionActivos?: boolean;
  mostrarSubtotalesSeccion?: boolean;
  mostrarSubtotalesPie?: boolean;
  mostrarNombreProyectoHeader?: boolean;
  enumerarApus?: boolean;
  mensajeFooter?: string;
  modoCodigoRubro?: "AUTOGENERADO" | "MANUAL";
}

export interface DescuentoGlobalPreviewResponse {
  apus: Array<{
    apuId: number;
    codigo: string;
    descripcion: string;
    cd: Decimal;
    cdAjustado: Decimal;
    ci: Decimal;
    ct: Decimal;
  }>;
  totalGeneralActual: Decimal;
  totalGeneralNuevo: Decimal;
}

export interface DescuentoGlobalRequest {
  presupuestoId: number;
  porcentaje: Decimal;
}

// ————— Insumos y bases (§11) —————
export type TipoInsumo = "EQUIPO" | "MANO_OBRA" | "MATERIAL" | "TRANSPORTE";

export interface InsumoResponse {
  id: number;
  codigo: string;
  descripcion: string;
  tipo: TipoInsumo;
  unidad: string;
  precio: Decimal;
  tarifa?: Decimal | null;
  jornal?: Decimal | null;
  fechaActualizacion: string;
  desactualizado: boolean;
  fuente: "LOCAL" | "CENTRAL";
  baseNombre?: string;
}

export interface InsumoCrearRequest {
  codigo: string;
  descripcion: string;
  tipo: TipoInsumo;
  unidad: string;
  precio: Decimal;
  tarifa?: Decimal | null;
  jornal?: Decimal | null;
}

export interface InsumoEditarRequest {
  codigo?: string;
  descripcion?: string;
  unidad?: string;
  precio?: Decimal;
  tarifa?: Decimal | null;
  jornal?: Decimal | null;
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
  precio: Decimal;
  fuente: "LOCAL" | "CENTRAL" | "COMBINADA";
  baseNombre?: string;
}

export interface ImportResultadoResponse {
  creados: number;
  actualizados: number;
  errores: Array<{ fila: number; mensaje: string }>;
}

export interface CopiarBaseRequest {
  baseId: number;
  tipos?: TipoInsumo[];
}

export interface CopiaBaseResultadoResponse {
  copiados: number;
  omitidos: string[];
}

export interface BaseInsumosResponse {
  id: number;
  nombre: string;
  archivada: boolean;
  insumoCount: number;
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
  apuAuxiliarId?: number | null;
  cantidad?: Decimal | null;
  rendimiento?: Decimal | null;
  unidad?: string | null;
  precioEfectivo: Decimal;
  precioHeredado: boolean;
  costoHora?: Decimal | null;
  costo: Decimal;
}

export interface ApuResponse {
  id: number;
  codigo: string;
  descripcion: string;
  unidad: string;
  esAuxiliar: boolean;
  costoDirecto: Decimal;
  costoTotal: Decimal;
  vinculado: boolean;
  porcentajeIndirecto?: Decimal | null;
  porcentajeIndirectoEfectivo: Decimal;
  porcentajeDescuento: Decimal;
  cdAjustado: Decimal;
  costoIndirecto: Decimal;
  secciones: Array<{
    tipo: SeccionTipo;
    orden: number;
    subtotal: Decimal;
    detalles: ApuDetalleResponse[];
  }>;
}

export interface ApuResumenResponse {
  id: number;
  codigo: string;
  descripcion: string;
  unidad: string;
  esAuxiliar: boolean;
  costoDirecto: Decimal;
  costoTotal: Decimal;
  vinculado: boolean;
}

export interface ApuCrearRequest {
  codigo: string;
  descripcion: string;
  unidad: string;
  plantillaId?: number;
  esAuxiliar?: boolean;
}

export interface ApuPatchRequest {
  codigo?: string;
  descripcion?: string;
  unidad?: string;
  esAuxiliar?: boolean;
  porcentajeIndirecto?: Decimal | null;
}

export interface ApuDetalleCrearRequest {
  insumoId?: number;
  apuAuxiliarId?: number;
  cantidad?: Decimal;
  rendimiento?: Decimal;
}

export interface ApuDetallePatchRequest {
  cantidad?: Decimal;
  rendimiento?: Decimal;
  precioOverride?: Decimal | null;
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

export interface PlantillaApuResponse {
  id: number;
  nombre: string;
  descripcion?: string;
  tipo: "SISTEMA" | "PERSONAL";
  fechaCreacion: string;
}

export interface PlantillaApuCrearRequest {
  nombre: string;
  descripcion?: string;
}

export interface PlantillaApuEditarRequest {
  nombre?: string;
  descripcion?: string;
}

export interface PlantillaApuDetalleResponse {
  id: number;
  nombre: string;
  descripcion?: string;
  tipo: "SISTEMA" | "PERSONAL";
  snapshot: ApuResponse;
}

export interface PlantillaSistemaCrearRequest {
  nombre: string;
  descripcion?: string;
  desdeApuId: number;
}

// ————— Presupuesto y versiones (§11) —————
export interface PresupuestoVersionResponse {
  id: number;
  numero: number;
  notas?: string;
  vigente: boolean;
  totalGeneral: Decimal;
  fechaCreacion: string;
}

export interface PresupuestoVersionCrearRequest {
  proyectoId: number;
  versionOrigenId: number;
  notas?: string;
}

export interface CapituloResponse {
  id: number;
  item: string;
  descripcion: string;
  subcapitulos: CapituloResponse[];
  rubros: RubroResponse[];
  total: Decimal;
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
  id: number;
  version: number;
  capitulos: CapituloResponse[];
  totalGeneral: Decimal;
}

export interface CapituloCrearRequest {
  descripcion: string;
  padreId?: number;
}

export interface CapituloEditarRequest {
  descripcion?: string;
}

export interface CapituloMoverRequest {
  nuevoPadreId?: number | null;
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
  equipo: { total: Decimal; porcentaje: Decimal };
  manoObra: { total: Decimal; porcentaje: Decimal };
  material: { total: Decimal; porcentaje: Decimal };
  transporte: { total: Decimal; porcentaje: Decimal };
  totalGeneral: Decimal;
}

export interface ComparacionVersionesResponse {
  versionA: { id: number; numero: number; totalGeneral: Decimal };
  versionB: { id: number; numero: number; totalGeneral: Decimal };
  capitulos: Array<{
    item: string;
    descripcion: string;
    totalA: Decimal;
    totalB: Decimal;
    diferencia: Decimal;
  }>;
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
  avancePorPeriodo: Decimal[];
  avanceAcumulado: Decimal[];
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
