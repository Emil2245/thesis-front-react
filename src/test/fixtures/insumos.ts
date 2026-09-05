import type {
  InsumoResponse,
  BaseInsumosResponse,
  InsumoBusquedaResponse,
  CopiaBaseResultadoResponse,
  ImportResultadoResponse,
  InsumoUsoResponse,
} from "@/api/contract";

export const insumosFixture: InsumoResponse[] = [
  {
    id: "018f8a20-0000-7000-8000-000000000010",
    codigo: "M-001",
    descripcion: "Cemento Portland Tipo I",
    tipo: "MATERIAL",
    unidad: "kg",
    precioUnitario: 12.5,
    fechaActualizacion: "2026-03-15T00:00:00",
    desactualizado: false,
    fuente: "LOCAL",
  },
  {
    id: "018f8a20-0000-7000-8000-000000000011",
    codigo: "M-002",
    descripcion: "Arena fina",
    tipo: "MATERIAL",
    unidad: "m3",
    precioUnitario: 18,
    fechaActualizacion: "2025-11-20T00:00:00",
    desactualizado: true,
    fuente: "LOCAL",
  },
  {
    id: "018f8a20-0000-7000-8000-000000000012",
    codigo: "M-003",
    descripcion: "Ripio triturado",
    tipo: "MATERIAL",
    unidad: "m3",
    precioUnitario: 22,
    fechaActualizacion: "2026-01-10T00:00:00",
    desactualizado: false,
    fuente: "LOCAL",
  },
  {
    id: "018f8a20-0000-7000-8000-000000000013",
    codigo: "MO-001",
    descripcion: "Albañil",
    tipo: "MANO_OBRA",
    unidad: "h",
    precioUnitario: 8.5,
    fechaActualizacion: "2026-02-01T00:00:00",
    desactualizado: false,
    fuente: "LOCAL",
  },
  {
    id: "018f8a20-0000-7000-8000-000000000014",
    codigo: "MO-002",
    descripcion: "Peón",
    tipo: "MANO_OBRA",
    unidad: "h",
    precioUnitario: 4.25,
    fechaActualizacion: "2026-02-01T00:00:00",
    desactualizado: false,
    fuente: "LOCAL",
  },
  {
    id: "018f8a20-0000-7000-8000-000000000015",
    codigo: "EQ-001",
    descripcion: "Retroexcavadora",
    tipo: "EQUIPO",
    unidad: "h",
    precioUnitario: 45,
    fechaActualizacion: "2026-03-01T00:00:00",
    desactualizado: false,
    fuente: "LOCAL",
  },
  {
    id: "018f8a20-0000-7000-8000-000000000016",
    codigo: "EQ-002",
    descripcion: "Compactador",
    tipo: "EQUIPO",
    unidad: "h",
    precioUnitario: 25,
    fechaActualizacion: "2025-09-15T00:00:00",
    desactualizado: true,
    fuente: "LOCAL",
  },
  {
    id: "018f8a20-0000-7000-8000-000000000017",
    codigo: "T-001",
    descripcion: "Volqueta 8 m3",
    tipo: "TRANSPORTE",
    unidad: "viaje",
    precioUnitario: 35,
    fechaActualizacion: "2026-04-10T00:00:00",
    desactualizado: false,
    fuente: "LOCAL",
  },
];

export const basesCentralesFixture: BaseInsumosResponse[] = [
  {
    id: "018f8a30-0000-7000-8000-000000000001",
    nombre: "Base IESS 2026",
    tipo: "CENTRAL",
    archivada: false,
    totalInsumos: 93,
  },
  {
    id: "018f8a30-0000-7000-8000-000000000002",
    nombre: "Base MTOP 2025",
    tipo: "CENTRAL",
    archivada: false,
    totalInsumos: 45,
  },
  {
    id: "018f8a30-0000-7000-8000-000000000003",
    nombre: "Base Antigua 2024",
    tipo: "CENTRAL",
    archivada: true,
    totalInsumos: 120,
  },
];

export const insumosBusquedaFixture: InsumoBusquedaResponse[] = [
  {
    id: "018f8a20-0000-7000-8000-000000000010",
    codigo: "M-001",
    descripcion: "Cemento Portland Tipo I",
    tipo: "MATERIAL",
    unidad: "kg",
    precioUnitario: 12.5,
    fuente: "LOCAL",
  },
  {
    id: "018f8a20-0000-7000-8000-000000000013",
    codigo: "MO-001",
    descripcion: "Albañil",
    tipo: "MANO_OBRA",
    unidad: "h",
    precioUnitario: 8.5,
    fuente: "LOCAL",
  },
  {
    id: "018f8a20-0000-7000-8000-000000000100",
    codigo: "C-001",
    descripcion: "Cemento IESS",
    tipo: "MATERIAL",
    unidad: "kg",
    precioUnitario: 11.2,
    fuente: "CENTRAL",
    baseNombre: "Base IESS 2026",
  },
];

export const copiaBaseResultadoFixture: CopiaBaseResultadoResponse = {
  copiados: 5,
  omitidos: ["M-001", "EQ-002"],
};

export const importResultadoFixture: ImportResultadoResponse = {
  creados: 8,
  actualizados: 2,
  errores: [],
};

export const importResultadoConErroresFixture: ImportResultadoResponse = {
  creados: 5,
  actualizados: 1,
  errores: [
    { fila: 3, mensaje: "El precio debe ser mayor que 0" },
    { fila: 7, mensaje: "Código duplicado: M-001" },
  ],
};

export const insumoUsoFixture: InsumoUsoResponse[] = [
  {
    apuId: "018f8a40-0000-7000-8000-000000000001",
    apuCodigo: "APU-001",
    apuDescripcion: "Excavación",
    detalleId: "018f8a50-0000-7000-8000-000000000100",
    cantidad: "2.000000" as never,
  },
  {
    apuId: "018f8a40-0000-7000-8000-000000000002",
    apuCodigo: "APU-002",
    apuDescripcion: "Relleno compactado",
    detalleId: "018f8a50-0000-7000-8000-000000000101",
    cantidad: "1.500000" as never,
  },
];
