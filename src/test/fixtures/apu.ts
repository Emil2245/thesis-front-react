import type { ApuResponse, ApuResumenResponse, PlantillaApuDetalleResponse } from "@/api/contract";

export const apuResumenFixture: ApuResumenResponse[] = [
  {
    id: "018f8a40-0000-7000-8000-000000000001",
    codigo: "APU-001",
    descripcion: "Excavación a máquina",
    unidad: "m3",

    costoDirecto: 800,
    costoTotal: 920,
    vinculado: false,
  },
  {
    id: "018f8a40-0000-7000-8000-000000000002",
    codigo: "APU-002",
    descripcion: "Relleno compactado",
    unidad: "m3",

    costoDirecto: 450,
    costoTotal: 517.5,
    vinculado: true,
  },
  {
    id: "018f8a40-0000-7000-8000-000000000003",
    codigo: "APU-003",
    descripcion: "Transporte material",
    unidad: "m3-km",

    costoDirecto: 120,
    costoTotal: 120,
    vinculado: false,
  },
  {
    id: "018f8a40-0000-7000-8000-000000000004",
    codigo: "APU-004",
    descripcion: "Hormigón simple",
    unidad: "m3",

    costoDirecto: 2100,
    costoTotal: 2415,
    vinculado: true,
  },
];

export const apuDetalleFixture: ApuResponse = {
  id: "018f8a40-0000-7000-8000-000000000001",
  codigo: "APU-001",
  descripcion: "Excavación a máquina",
  unidad: "m3",

  costoDirecto: 800,
  costoTotal: 920,
  porcentajeIndirecto: null,
  porcentajeIndirectoEfectivo: 0.15,
  costoIndirecto: 120,
  especificacionTecnica: null,
  secciones: [
    {
      tipo: "EQUIPO",
      orden: 1,
      subtotal: 400,
      detalles: [
        {
          id: "018f8a50-0000-7000-8000-000000000100",
          orden: 1,
          descripcion: "Retroexcavadora",
          esHerramientaMenor: false,
          insumoId: "018f8a20-0000-7000-8000-000000000015",

          cantidad: 1,
          rendimiento: 0.05,
          unidad: "h",
          precioEfectivo: 45,
          precioHeredado: true,
          costoHora: 900,
          costo: 400,
        },
      ],
    },
    {
      tipo: "MANO_OBRA",
      orden: 2,
      subtotal: 400,
      detalles: [
        {
          id: "018f8a50-0000-7000-8000-000000000101",
          orden: 1,
          descripcion: "Albañil",
          esHerramientaMenor: false,
          insumoId: "018f8a20-0000-7000-8000-000000000013",

          cantidad: 1,
          rendimiento: 0.1,
          unidad: "h",
          precioEfectivo: 8.5,
          precioHeredado: true,
          costoHora: 85,
          costo: 200,
        },
        {
          id: "018f8a50-0000-7000-8000-000000000102",
          orden: 2,
          descripcion: "Peón",
          esHerramientaMenor: false,
          insumoId: "018f8a20-0000-7000-8000-000000000014",

          cantidad: 2,
          rendimiento: 0.1,
          unidad: "h",
          precioEfectivo: 4.25,
          precioHeredado: true,
          costoHora: 42.5,
          costo: 200,
        },
      ],
    },
    {
      tipo: "MATERIAL",
      orden: 3,
      subtotal: 0,
      detalles: [],
    },
    {
      tipo: "TRANSPORTE",
      orden: 4,
      subtotal: 0,
      detalles: [],
    },
  ],
};

/** An APU that HAS the HM row — used for HM-protected-row tests */
export const apuConHmFixture: ApuResponse = {
  ...apuDetalleFixture,
  secciones: [
    {
      ...apuDetalleFixture.secciones[0],
      detalles: [
        {
          id: "018f8a50-0000-7000-8000-000000000200",
          orden: 1,
          descripcion: "Herramienta Menor (%HM × Subtotal N)",
          esHerramientaMenor: true,
          insumoId: null,

          cantidad: null,
          rendimiento: null,
          unidad: null,
          precioEfectivo: 0,
          precioHeredado: false,
          costoHora: null,
          costo: 20,
        },
        ...apuDetalleFixture.secciones[0].detalles,
      ].map((d, i) => ({ ...d, orden: i + 1 })),
      subtotal: 420,
    },
    ...apuDetalleFixture.secciones.slice(1),
  ],
};

export const plantillaDetalleFixture: PlantillaApuDetalleResponse = {
  id: "018f8a1e-0000-7000-8000-000000000001",
  nombre: "Excavación típica",
  descripcionRubro: "Plantilla base para excavaciones",
  unidad: "m3",
  tipo: "SISTEMA",
  createdAt: "2026-07-23T00:00:00",
  updatedAt: "2026-07-23T00:00:00",
  snapshotSecciones: apuDetalleFixture.secciones,
};
