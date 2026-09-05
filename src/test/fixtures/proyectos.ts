import type {
  ProyectoResponse,
  ProyectoDetalleResponse,
  ParametrosProyectoResponse,
  FirmanteResponse,
} from "@/api/contract";

// UUIDv7 públicos (backend Plan 07 — columna public_id).
export const PROYECTO_1 = "01927f4e-1a2b-7c3d-8e4f-000000000001";
export const PROYECTO_2 = "01927f4e-1a2b-7c3d-8e4f-000000000002";
export const PROYECTO_3 = "01927f4e-1a2b-7c3d-8e4f-000000000003";

export const proyectosFixture: ProyectoResponse[] = [
  {
    id: PROYECTO_1,
    nombreProyecto: "Puente Ambato",
    codigo: "AMB-001",
    estado: "EN_PROCESO",
    descripcion: "Construcción del puente Ambato",
    direccionInstitucional: "MTOP",
    subdireccionInstitucional: "Subdirección de Obra Pública",
    anio: 2026,
    fechaInicio: "2026-01-15",
    plazoEjecucion: 8,
    plazoUnidad: "MES",
    tieneLogo: false,
    updatedAt: "2026-01-15T00:00:00Z",
  },
  {
    id: PROYECTO_2,
    nombreProyecto: "Vía Quito Sur",
    codigo: "UIO-002",
    estado: "BORRADOR",
    descripcion: "Mejoramiento de la vía Quito Sur",
    direccionInstitucional: "MTOP",
    subdireccionInstitucional: "Zona 3",
    anio: 2026,
    fechaInicio: "2026-03-20",
    plazoEjecucion: 12,
    plazoUnidad: "MES",
    tieneLogo: false,
    updatedAt: "2026-03-20T00:00:00Z",
  },
  {
    id: PROYECTO_3,
    nombreProyecto: "Escuela Milagro",
    codigo: "MIL-003",
    estado: "FINALIZADO",
    descripcion: "Reconstrucción de la escuela Milagro",
    direccionInstitucional: "MinEduc",
    subdireccionInstitucional: "Coordinación Zonal 5",
    anio: 2026,
    fechaInicio: "2026-05-10",
    plazoEjecucion: 6,
    plazoUnidad: "MES",
    tieneLogo: false,
    updatedAt: "2026-05-10T00:00:00Z",
  },
];

export const proyectoDetalleFixture: ProyectoDetalleResponse = {
  id: PROYECTO_1,
  nombreProyecto: "Puente Ambato",
  codigo: "AMB-001",
  estado: "EN_PROCESO",
  descripcion: "Construcción del puente Ambato",
  direccionInstitucional: "MTOP",
  subdireccionInstitucional: "Subdirección de Obra Pública",
  anio: 2026,
  fechaInicio: "2026-01-15",
  plazoEjecucion: 8,
  plazoUnidad: "MES",
  tieneLogo: false,
  updatedAt: "2026-01-15T00:00:00Z",
  alertas: ["CI_NO_CONFIGURADO"],
};

export const parametrosFixture: ParametrosProyectoResponse = {
  porcentajeHerramientaMenor: 0.05,
  porcentajeIndirecto: 0.15,
  iva: 0.12,
  moneda: "USD",
  mostrarSeccionesVacias: false,
  sufijosSeccionActivos: true,
  mostrarSubtotalesSeccion: true,
  mostrarSubtotalesPie: false,
  mostrarNombreProyectoHeader: true,
  enumerarApus: false,
  mensajeFooter: "",
  modoCodigoRubro: "AUTOGENERADO",
};

export const FIRMANTE_1 = "01927f50-1a2b-7c3d-8e4f-000000000001";
export const FIRMANTE_2 = "01927f50-1a2b-7c3d-8e4f-000000000002";

export const firmantesFixture: FirmanteResponse[] = [
  { id: FIRMANTE_1, nombre: "Ing. Juan Pérez", cargo: "Director de Obra", rol: "CONSOLIDADO", orden: 1 },
  { id: FIRMANTE_2, nombre: "Arq. María López", cargo: "Supervisora", rol: "APROBADO", orden: 1 },
];
