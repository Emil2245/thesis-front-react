import type {
  PresupuestoResponse,
  PresupuestoVersionResponse,
  ValidacionPresupuestoResponse,
  ResumenComponentesResponse,
  ComparacionVersionesResponse,
} from "@/api/contract";

export const presupuestoFixture: PresupuestoResponse = {
  id: 1,
  version: 2,
  totalGeneral: "18500.000000" as never,
  capitulos: [
    {
      id: 10,
      item: "1",
      descripcion: "Preliminares",
      total: "4500.000000" as never,
      rubros: [],
      subcapitulos: [
        {
          id: 11,
          item: "1.1",
          descripcion: "Instalación de campamento",
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
    id: 10,
    numero: 1,
    notas: "Versión inicial",
    vigente: false,
    totalGeneral: "18000.000000" as never,
    fechaCreacion: "2026-06-01T00:00:00",
  },
  {
    id: 11,
    numero: 2,
    notas: "Corrección APU hormigón",
    vigente: true,
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
  equipo: { total: "4000.000000" as never, porcentaje: "0.2830" as never },
  manoObra: { total: "6000.000000" as never, porcentaje: "0.4250" as never },
  material: { total: "3000.000000" as never, porcentaje: "0.2120" as never },
  transporte: { total: "1000.000000" as never, porcentaje: "0.0800" as never },
  totalGeneral: "14000.000000" as never,
};

export const comparacionFixture: ComparacionVersionesResponse = {
  versionA: { id: 10, numero: 1, totalGeneral: "18000.000000" as never },
  versionB: { id: 11, numero: 2, totalGeneral: "18500.000000" as never },
  capitulos: [
    {
      item: "1",
      descripcion: "Preliminares",
      totalA: "4500.000000" as never,
      totalB: "4500.000000" as never,
      diferencia: "0.000000" as never,
    },
    {
      item: "2",
      descripcion: "Obra civil",
      totalA: "13500.000000" as never,
      totalB: "14000.000000" as never,
      diferencia: "500.000000" as never,
    },
  ],
};
