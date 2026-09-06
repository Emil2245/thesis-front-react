import type {
  PresupuestoResponse,
  PresupuestoVersionResponse,
  ValidacionPresupuestoResponse,
  ResumenComponentesResponse,
  ComparacionVersionesResponse,
} from "@/api/contract";

// UUIDv7 estables: las queryKeys y los snapshots deben ser deterministas, así
// que nada de crypto.randomUUID() aquí.
export const PRESUPUESTO_V1 = "0198c1a0-0000-7000-8000-000000000010";
export const PRESUPUESTO_V2 = "0198c1a0-0000-7000-8000-000000000011";
export const PRESUPUESTO_V3 = "0198c1a0-0000-7000-8000-000000000012";

export const CAPITULO_1 = "0198c1a1-0000-7000-8000-000000000010";
export const CAPITULO_1_1 = "0198c1a1-0000-7000-8000-000000000011";
export const CAPITULO_1_2 = "0198c1a1-0000-7000-8000-000000000012";
export const CAPITULO_2 = "0198c1a1-0000-7000-8000-000000000020";

export const RUBRO_1_1_1 = "0198c1a2-0000-7000-8000-000000000100";
export const RUBRO_1_1_2 = "0198c1a2-0000-7000-8000-000000000101";
export const RUBRO_1_2_1 = "0198c1a2-0000-7000-8000-000000000102";
export const RUBRO_2_1 = "0198c1a2-0000-7000-8000-000000000200";

// Los apuId son los de apuResumenFixture: un rubro apunta a un APU real.
const APU_001 = "018f8a40-0000-7000-8000-000000000001";
const APU_002 = "018f8a40-0000-7000-8000-000000000002";
const APU_003 = "018f8a40-0000-7000-8000-000000000003";
const APU_004 = "018f8a40-0000-7000-8000-000000000004";

export const presupuestoFixture: PresupuestoResponse = {
  presupuestoId: PRESUPUESTO_V2,
  version: 2,
  esVigente: true,
  totalGeneral: "18500.000000" as never,
  capitulos: [
    {
      id: CAPITULO_1,
      item: "1",
      descripcion: "Preliminares",
      orden: 1,
      total: "4500.000000" as never,
      rubros: [],
      subcapitulos: [
        {
          id: CAPITULO_1_1,
          item: "1.1",
          descripcion: "Instalación de campamento",
          orden: 1,
          total: "2500.000000" as never,
          subcapitulos: [],
          rubros: [
            {
              id: RUBRO_1_1_1,
              item: "1.1.1",
              codigo: "APU-001",
              descripcion: "Excavación a máquina",
              unidad: "m3",
              cantidad: "50.000000" as never,
              precioUnitario: "40.000000" as never,
              precioTotal: "2000.000000" as never,
              apuId: APU_001,
            },
            {
              id: RUBRO_1_1_2,
              item: "1.1.2",
              codigo: "APU-002",
              descripcion: "Relleno compactado",
              unidad: "m3",
              cantidad: "20.000000" as never,
              precioUnitario: "25.000000" as never,
              precioTotal: "500.000000" as never,
              apuId: APU_002,
            },
          ],
        },
        {
          id: CAPITULO_1_2,
          item: "1.2",
          descripcion: "Cerramiento provisional",
          orden: 2,
          total: "2000.000000" as never,
          subcapitulos: [],
          rubros: [
            {
              id: RUBRO_1_2_1,
              item: "1.2.1",
              codigo: "APU-003",
              descripcion: "Transporte material",
              unidad: "m3-km",
              cantidad: "100.000000" as never,
              precioUnitario: "20.000000" as never,
              precioTotal: "2000.000000" as never,
              apuId: APU_003,
            },
          ],
        },
      ],
    },
    {
      id: CAPITULO_2,
      item: "2",
      descripcion: "Obra civil",
      orden: 2,
      total: "14000.000000" as never,
      subcapitulos: [],
      rubros: [
        {
          id: RUBRO_2_1,
          item: "2.1",
          codigo: "APU-004",
          descripcion: "Hormigón simple",
          unidad: "m3",
          cantidad: "10.000000" as never,
          precioUnitario: "1400.000000" as never,
          precioTotal: "14000.000000" as never,
          apuId: APU_004,
        },
      ],
    },
  ],
};

export const versionesFixture: PresupuestoVersionResponse[] = [
  {
    presupuestoId: PRESUPUESTO_V1,
    version: 1,
    esVigente: false,
    notas: "Versión inicial",
    totalGeneral: "18000.000000" as never,
    fechaCreacion: "2026-06-01T00:00:00",
  },
  {
    presupuestoId: PRESUPUESTO_V2,
    version: 2,
    esVigente: true,
    origenId: PRESUPUESTO_V1,
    notas: "Corrección APU hormigón",
    totalGeneral: "18500.000000" as never,
    fechaCreacion: "2026-07-01T00:00:00",
  },
];

export const validacionFixture: ValidacionPresupuestoResponse = {
  exportable: false,
  itemsPuCero: [
    { rubroId: RUBRO_1_1_2, item: "1.1.2", codigo: "APU-002", descripcion: "Relleno compactado" },
  ],
  itemsCantidadCero: [
    { rubroId: RUBRO_1_2_1, item: "1.2.1", codigo: "APU-003", descripcion: "Transporte material" },
  ],
  itemsSinActividad: [
    { rubroId: RUBRO_1_1_1, item: "1.1.1", codigo: "APU-001", descripcion: "Excavación a máquina" },
  ],
};

export const resumenComponentesFixture: ResumenComponentesResponse = {
  porComponente: {
    EQUIPO: "4000.000000" as never,
    MANO_OBRA: "6000.000000" as never,
    MATERIAL: "3000.000000" as never,
    TRANSPORTE: "1000.000000" as never,
  },
  totalGeneral: "14000.000000" as never,
  ivaReferencial: "1680.000000" as never,
  totalConIva: "15680.000000" as never,
};

export const comparacionFixture: ComparacionVersionesResponse = {
  versiones: [
    {
      presupuestoId: PRESUPUESTO_V1,
      version: 1,
      totalGeneral: "18000.000000" as never,
      porCapituloRaiz: [
        { item: "1", descripcion: "Preliminares", total: "4500.000000" as never },
        { item: "2", descripcion: "Obra civil", total: "13500.000000" as never },
      ],
    },
    {
      presupuestoId: PRESUPUESTO_V2,
      version: 2,
      totalGeneral: "18500.000000" as never,
      porCapituloRaiz: [
        { item: "1", descripcion: "Preliminares", total: "4500.000000" as never },
        { item: "2", descripcion: "Obra civil", total: "14000.000000" as never },
      ],
    },
  ],
};
