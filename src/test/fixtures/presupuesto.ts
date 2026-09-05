import type {
  PresupuestoResponse,
  PresupuestoVersionResponse,
  ValidacionPresupuestoResponse,
  ResumenComponentesResponse,
  ComparacionVersionesResponse,
} from "@/api/contract";

export const presupuestoFixture: PresupuestoResponse = {
  presupuestoId: 1,
  version: 2,
  esVigente: true,
  totalGeneral: "18500.000000" as never,
  capitulos: [
    {
      id: 10,
      item: "1",
      descripcion: "Preliminares",
      orden: 1,
      total: "4500.000000" as never,
      rubros: [],
      subcapitulos: [
        {
          id: 11,
          item: "1.1",
          descripcion: "Instalación de campamento",
          orden: 1,
          total: "2500.000000" as never,
          subcapitulos: [],
          rubros: [
            {
              id: 100,
              item: "1.1.1",
              codigo: "APU-001",
              descripcion: "Excavación a máquina",
              unidad: "m3",
              cantidad: "50.000000" as never,
              precioUnitario: "40.000000" as never,
              precioTotal: "2000.000000" as never,
              apuId: 1,
              alertas: [],
            },
            {
              id: 101,
              item: "1.1.2",
              codigo: "APU-002",
              descripcion: "Relleno compactado",
              unidad: "m3",
              cantidad: "20.000000" as never,
              precioUnitario: "25.000000" as never,
              precioTotal: "500.000000" as never,
              apuId: 2,
              alertas: ["PU_CERO"],
            },
          ],
        },
        {
          id: 12,
          item: "1.2",
          descripcion: "Cerramiento provisional",
          orden: 2,
          total: "2000.000000" as never,
          subcapitulos: [],
          rubros: [
            {
              id: 102,
              item: "1.2.1",
              codigo: "APU-003",
              descripcion: "Transporte material",
              unidad: "m3-km",
              cantidad: "100.000000" as never,
              precioUnitario: "20.000000" as never,
              precioTotal: "2000.000000" as never,
              apuId: 3,
              alertas: ["CANTIDAD_CERO"],
            },
          ],
        },
      ],
    },
    {
      id: 20,
      item: "2",
      descripcion: "Obra civil",
      orden: 2,
      total: "14000.000000" as never,
      subcapitulos: [],
      rubros: [
        {
          id: 200,
          item: "2.1",
          codigo: "APU-004",
          descripcion: "Hormigón simple",
          unidad: "m3",
          cantidad: "10.000000" as never,
          precioUnitario: "1400.000000" as never,
          precioTotal: "14000.000000" as never,
          apuId: 4,
          alertas: [],
        },
      ],
    },
  ],
};

export const versionesFixture: PresupuestoVersionResponse[] = [
  {
    presupuestoId: 10,
    version: 1,
    esVigente: false,
    origenId: 0,
    notas: "Versión inicial",
    totalGeneral: "18000.000000" as never,
    fechaCreacion: "2026-06-01T00:00:00",
  },
  {
    presupuestoId: 11,
    version: 2,
    esVigente: true,
    origenId: 10,
    notas: "Corrección APU hormigón",
    totalGeneral: "18500.000000" as never,
    fechaCreacion: "2026-07-01T00:00:00",
  },
];

export const validacionFixture: ValidacionPresupuestoResponse = {
  exportable: false,
  itemsPuCero: [
    { rubroId: 101, item: "1.1.2", codigo: "APU-002", descripcion: "Relleno compactado" },
  ],
  itemsCantidadCero: [
    { rubroId: 102, item: "1.2.1", codigo: "APU-003", descripcion: "Transporte material" },
  ],
  itemsSinActividad: [
    { rubroId: 100, item: "1.1.1", codigo: "APU-001", descripcion: "Excavación a máquina" },
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
      presupuestoId: 10,
      version: 1,
      totalGeneral: "18000.000000" as never,
      porCapituloRaiz: [
        { item: "1", descripcion: "Preliminares", total: "4500.000000" as never },
        { item: "2", descripcion: "Obra civil", total: "13500.000000" as never },
      ],
    },
    {
      presupuestoId: 11,
      version: 2,
      totalGeneral: "18500.000000" as never,
      porCapituloRaiz: [
        { item: "1", descripcion: "Preliminares", total: "4500.000000" as never },
        { item: "2", descripcion: "Obra civil", total: "14000.000000" as never },
      ],
    },
  ],
};
