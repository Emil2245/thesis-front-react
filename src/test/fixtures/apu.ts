import type { ApuResponse, ApuResumenResponse, PlantillaApuDetalleResponse } from "@/api/contract";

export const apuResumenFixture: ApuResumenResponse[] = [
  {
    id: 1,
    codigo: "APU-001",
    descripcion: "Excavación a máquina",
    unidad: "m3",
    
    costoDirecto: 800,
    costoTotal: 920,
    vinculado: false,
  },
  {
    id: 2,
    codigo: "APU-002",
    descripcion: "Relleno compactado",
    unidad: "m3",
    
    costoDirecto: 450,
    costoTotal: 517.5,
    vinculado: true,
  },
  {
    id: 3,
    codigo: "APU-003",
    descripcion: "Transporte material",
    unidad: "m3-km",
    
    costoDirecto: 120,
    costoTotal: 120,
    vinculado: false,
  },
  {
    id: 4,
    codigo: "APU-004",
    descripcion: "Hormigón simple",
    unidad: "m3",
    
    costoDirecto: 2100,
    costoTotal: 2415,
    vinculado: true,
  },
];

export const apuDetalleFixture: ApuResponse = {
  id: 1,
  codigo: "APU-001",
  descripcion: "Excavación a máquina",
  unidad: "m3",
  
  costoDirecto: 800,
  costoTotal: 920,
  porcentajeIndirecto: null,
  porcentajeIndirectoEfectivo: 0.15,
  porcentajeDescuento: 0,
  costoIndirecto: 120,
  secciones: [
    {
      tipo: "EQUIPO",
      orden: 1,
      subtotal: 400,
      detalles: [
        {
          id: 100,
          orden: 1,
          descripcion: "Retroexcavadora",
          esHerramientaMenor: false,
          insumoId: 15,
          
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
          id: 101,
          orden: 1,
          descripcion: "Albañil",
          esHerramientaMenor: false,
          insumoId: 13,
          
          cantidad: 1,
          rendimiento: 0.1,
          unidad: "h",
          precioEfectivo: 8.5,
          precioHeredado: true,
          costoHora: 85,
          costo: 200,
        },
        {
          id: 102,
          orden: 2,
          descripcion: "Peón",
          esHerramientaMenor: false,
          insumoId: 14,
          
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
          id: 200,
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
  id: 1,
  nombre: "Excavación típica",
  descripcion: "Plantilla base para excavaciones",
  tipo: "SISTEMA",
  snapshot: apuDetalleFixture,
};
