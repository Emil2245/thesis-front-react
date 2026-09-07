import { asDecimal } from "@/lib/decimal";
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
  totalGeneral: asDecimal("18500.000000"),
  capitulos: [
    {
      id: CAPITULO_1,
      item: "1",
      descripcion: "Preliminares",
      orden: 1,
      total: asDecimal("4500.000000"),
      rubros: [],
      subcapitulos: [
        {
          id: CAPITULO_1_1,
          item: "1.1",
          descripcion: "Instalación de campamento",
          orden: 1,
          total: asDecimal("2500.000000"),
          subcapitulos: [],
          rubros: [
            {
              id: RUBRO_1_1_1,
              item: "1.1.1",
              codigo: "APU-001",
              descripcion: "Excavación a máquina",
              unidad: "m3",
              cantidad: asDecimal("50.000000"),
              precioUnitario: asDecimal("40.000000"),
              precioTotal: asDecimal("2000.000000"),
              apuId: APU_001,
            },
            {
              id: RUBRO_1_1_2,
              item: "1.1.2",
              codigo: "APU-002",
              descripcion: "Relleno compactado",
              unidad: "m3",
              cantidad: asDecimal("20.000000"),
              precioUnitario: asDecimal("25.000000"),
              precioTotal: asDecimal("500.000000"),
              apuId: APU_002,
            },
          ],
        },
        {
          id: CAPITULO_1_2,
          item: "1.2",
          descripcion: "Cerramiento provisional",
          orden: 2,
          total: asDecimal("2000.000000"),
          subcapitulos: [],
          rubros: [
            {
              id: RUBRO_1_2_1,
              item: "1.2.1",
              codigo: "APU-003",
              descripcion: "Transporte material",
              unidad: "m3-km",
              cantidad: asDecimal("100.000000"),
              precioUnitario: asDecimal("20.000000"),
              precioTotal: asDecimal("2000.000000"),
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
      total: asDecimal("14000.000000"),
      subcapitulos: [],
      rubros: [
        {
          id: RUBRO_2_1,
          item: "2.1",
          codigo: "APU-004",
          descripcion: "Hormigón simple",
          unidad: "m3",
          cantidad: asDecimal("10.000000"),
          precioUnitario: asDecimal("1400.000000"),
          precioTotal: asDecimal("14000.000000"),
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
    totalGeneral: asDecimal("18000.000000"),
    fechaCreacion: "2026-06-01T00:00:00",
  },
  {
    presupuestoId: PRESUPUESTO_V2,
    version: 2,
    esVigente: true,
    origenId: PRESUPUESTO_V1,
    notas: "Corrección APU hormigón",
    totalGeneral: asDecimal("18500.000000"),
    fechaCreacion: "2026-07-01T00:00:00",
  },
];

export const validacionFixture: ValidacionPresupuestoResponse = {
  exportable: false,
  itemsPuCero: [
    { id: RUBRO_1_1_2, item: "1.1.2", codigo: "APU-002", descripcion: "Relleno compactado" },
  ],
  itemsCantidadCero: [
    { id: RUBRO_1_2_1, item: "1.2.1", codigo: "APU-003", descripcion: "Transporte material" },
  ],
  itemsSinActividad: [
    { id: RUBRO_1_1_1, item: "1.1.1", codigo: "APU-001", descripcion: "Excavación a máquina" },
  ],
};

export const resumenComponentesFixture: ResumenComponentesResponse = {
  porComponente: {
    EQUIPO: asDecimal("4000.000000"),
    MANO_OBRA: asDecimal("6000.000000"),
    MATERIAL: asDecimal("3000.000000"),
    TRANSPORTE: asDecimal("1000.000000"),
  },
  totalGeneral: asDecimal("14000.000000"),
  ivaReferencial: asDecimal("1680.000000"),
  totalConIva: asDecimal("15680.000000"),
};

export const comparacionFixture: ComparacionVersionesResponse = {
  versiones: [
    {
      presupuestoId: PRESUPUESTO_V1,
      version: 1,
      totalGeneral: asDecimal("18000.000000"),
      porCapituloRaiz: [
        { item: "1", descripcion: "Preliminares", total: asDecimal("4500.000000") },
        { item: "2", descripcion: "Obra civil", total: asDecimal("13500.000000") },
      ],
    },
    {
      presupuestoId: PRESUPUESTO_V2,
      version: 2,
      totalGeneral: asDecimal("18500.000000"),
      porCapituloRaiz: [
        { item: "1", descripcion: "Preliminares", total: asDecimal("4500.000000") },
        { item: "2", descripcion: "Obra civil", total: asDecimal("14000.000000") },
      ],
    },
  ],
};
