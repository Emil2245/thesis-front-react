import type {
  ProyectoResponse,
  ProyectoDetalleResponse,
  ParametrosProyectoResponse,
  FirmanteResponse,
} from "@/api/contract";

export const proyectosFixture: ProyectoResponse[] = [
  {
    id: 1,
    nombre: "Puente Ambato",
    codigo: "AMB-001",
    estado: "EN_PROCESO",
    fechaCreacion: "2026-01-15T00:00:00",
  },
  {
    id: 2,
    nombre: "Vía Quito Sur",
    codigo: "UIO-002",
    estado: "BORRADOR",
    fechaCreacion: "2026-03-20T00:00:00",
  },
  {
    id: 3,
    nombre: "Escuela Milagro",
    codigo: "MIL-003",
    estado: "FINALIZADO",
    fechaCreacion: "2026-05-10T00:00:00",
  },
];

export const proyectoDetalleFixture: ProyectoDetalleResponse = {
  id: 1,
  nombre: "Puente Ambato",
  codigo: "AMB-001",
  estado: "EN_PROCESO",
  direccionInstitucional: "MTOP",
  anio: 2026,
  fechaCreacion: "2026-01-15T00:00:00",
  alertas: ["CI_NO_CONFIGURADO"],
  tieneLogo: false,
};

export const parametrosFixture: ParametrosProyectoResponse = {
  porcentajeHerramientaMenor: "0.050000" as never,
  porcentajeIndirecto: "0.150000" as never,
  iva: "0.120000" as never,
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

export const firmantesFixture: FirmanteResponse[] = [
  { id: 1, nombre: "Ing. Juan Pérez", cargo: "Director de Obra", rol: "CONSOLIDADO", orden: 1 },
  { id: 2, nombre: "Arq. María López", cargo: "Supervisora", rol: "APROBADO", orden: 1 },
];
