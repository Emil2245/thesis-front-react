import type {
  ApuCalculoResponse,
  ApuResponse,
  ApuResumenResponse,
  PlantillaApuDetalleResponse,
} from "@/api/contract";

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
  porcentajeIndirectoEfectivo: 0.15,
  costoIndirecto: 120,
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

// Forma de main: {apuId, codigo, parametros, secciones[{tipo, subtotal,
// operacion, resultado, lineas[]}], resumen{cd, ci, ct}}. Dinero como `number`.
// `operacion` la compone el backend: por línea EQUIPO/MANO_OBRA es
// «cantidad × precio × rendimiento»; por sección, la suma de los resultados.
export const apuCalculoFixture: ApuCalculoResponse = {
  apuId: "018f8a40-0000-7000-8000-000000000001",
  codigo: "APU-001",
  parametros: { hm: 0.05, ciDefault: 0.15, ciAplicado: 0.15 },
  secciones: [
    {
      tipo: "EQUIPO",
      subtotal: 400,
      operacion: "400.000000",
      resultado: 400,
      lineas: [
        {
          detalleId: "018f8a50-0000-7000-8000-000000000100",
          orden: 1,
          seccion: "EQUIPO",
          esHerramientaMenor: false,
          insumoId: "018f8a20-0000-7000-8000-000000000015",
          descripcion: "Retroexcavadora",
          cantidad: 1,
          rendimiento: 0.05,
          precioEfectivo: 45,
          costoHora: 900,
          operacion: "1.000000 × 45.000000 × 0.050000",
          resultado: 400,
        },
      ],
    },
    {
      tipo: "MANO_OBRA",
      subtotal: 400,
      operacion: "200.000000 + 200.000000",
      resultado: 400,
      lineas: [
        {
          detalleId: "018f8a50-0000-7000-8000-000000000101",
          orden: 1,
          seccion: "MANO_OBRA",
          esHerramientaMenor: false,
          insumoId: "018f8a20-0000-7000-8000-000000000013",
          descripcion: "Albañil",
          cantidad: 1,
          rendimiento: 0.1,
          precioEfectivo: 8.5,
          costoHora: 85,
          operacion: "1.000000 × 8.500000 × 0.100000",
          resultado: 200,
        },
        {
          detalleId: "018f8a50-0000-7000-8000-000000000102",
          orden: 2,
          seccion: "MANO_OBRA",
          esHerramientaMenor: false,
          insumoId: "018f8a20-0000-7000-8000-000000000014",
          descripcion: "Peón",
          cantidad: 2,
          rendimiento: 0.1,
          precioEfectivo: 4.25,
          costoHora: 42.5,
          operacion: "2.000000 × 4.250000 × 0.100000",
          resultado: 200,
        },
      ],
    },
    { tipo: "MATERIAL", subtotal: 0, operacion: "0", resultado: 0, lineas: [] },
    { tipo: "TRANSPORTE", subtotal: 0, operacion: "0", resultado: 0, lineas: [] },
  ],
  // Sin `cdAjustado`: la cadena activa del motor es CD → CI → CT.
  resumen: { cd: 800, ci: 120, ct: 920 },
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
