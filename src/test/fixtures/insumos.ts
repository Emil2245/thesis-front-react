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
    id: 10,
    codigo: "M-001",
    descripcion: "Cemento Portland Tipo I",
    tipo: "MATERIAL",
    unidad: "kg",
    precio: "12.500000" as never,
    fechaActualizacion: "2026-03-15T00:00:00",
    desactualizado: false,
    fuente: "LOCAL",
  },
  {
    id: 11,
    codigo: "M-002",
    descripcion: "Arena fina",
    tipo: "MATERIAL",
    unidad: "m3",
    precio: "18.000000" as never,
    fechaActualizacion: "2025-11-20T00:00:00",
    desactualizado: true,
    fuente: "LOCAL",
  },
  {
    id: 12,
    codigo: "M-003",
    descripcion: "Ripio triturado",
    tipo: "MATERIAL",
    unidad: "m3",
    precio: "22.000000" as never,
    fechaActualizacion: "2026-01-10T00:00:00",
    desactualizado: false,
    fuente: "LOCAL",
  },
  {
    id: 13,
    codigo: "MO-001",
    descripcion: "Albañil",
    tipo: "MANO_OBRA",
    unidad: "h",
    precio: "8.500000" as never,
    jornal: "8.500000" as never,
    fechaActualizacion: "2026-02-01T00:00:00",
    desactualizado: false,
    fuente: "LOCAL",
  },
  {
    id: 14,
    codigo: "MO-002",
    descripcion: "Peón",
    tipo: "MANO_OBRA",
    unidad: "h",
    precio: "4.250000" as never,
    jornal: "4.250000" as never,
    fechaActualizacion: "2026-02-01T00:00:00",
    desactualizado: false,
    fuente: "LOCAL",
  },
  {
    id: 15,
    codigo: "EQ-001",
    descripcion: "Retroexcavadora",
    tipo: "EQUIPO",
    unidad: "h",
    precio: "45.000000" as never,
    tarifa: "45.000000" as never,
    fechaActualizacion: "2026-03-01T00:00:00",
    desactualizado: false,
    fuente: "LOCAL",
  },
  {
    id: 16,
    codigo: "EQ-002",
    descripcion: "Compactador",
    tipo: "EQUIPO",
    unidad: "h",
    precio: "25.000000" as never,
    tarifa: "25.000000" as never,
    fechaActualizacion: "2025-09-15T00:00:00",
    desactualizado: true,
    fuente: "LOCAL",
  },
  {
    id: 17,
    codigo: "T-001",
    descripcion: "Volqueta 8 m3",
    tipo: "TRANSPORTE",
    unidad: "viaje",
    precio: "35.000000" as never,
    fechaActualizacion: "2026-04-10T00:00:00",
    desactualizado: false,
    fuente: "LOCAL",
  },
];

export const basesCentralesFixture: BaseInsumosResponse[] = [
  { id: 1, nombre: "Base IESS 2026", archivada: false, insumoCount: 93 },
  { id: 2, nombre: "Base MTOP 2025", archivada: false, insumoCount: 45 },
  { id: 3, nombre: "Base Antigua 2024", archivada: true, insumoCount: 120 },
];

export const insumosBusquedaFixture: InsumoBusquedaResponse[] = [
  {
    id: 10,
    codigo: "M-001",
    descripcion: "Cemento Portland Tipo I",
    tipo: "MATERIAL",
    unidad: "kg",
    precio: "12.500000" as never,
    fuente: "LOCAL",
  },
  {
    id: 13,
    codigo: "MO-001",
    descripcion: "Albañil",
    tipo: "MANO_OBRA",
    unidad: "h",
    precio: "8.500000" as never,
    fuente: "LOCAL",
  },
  {
    id: 100,
    codigo: "C-001",
    descripcion: "Cemento IESS",
    tipo: "MATERIAL",
    unidad: "kg",
    precio: "11.200000" as never,
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
    apuId: 1,
    apuCodigo: "APU-001",
    apuDescripcion: "Excavación",
    detalleId: 100,
    cantidad: "2.000000" as never,
  },
  {
    apuId: 2,
    apuCodigo: "APU-002",
    apuDescripcion: "Relleno compactado",
    detalleId: 101,
    cantidad: "1.500000" as never,
  },
];
