import type { ActividadCronogramaResponse, CronogramaResponse } from "@/api/contract";
import { asDecimal } from "@/lib/decimal";
import { PRESUPUESTO_V2, RUBRO_1_1_1, RUBRO_1_1_2, RUBRO_1_2_1, RUBRO_2_1 } from "./presupuesto";

export const CRONOGRAMA_ID = "0198c1a3-0000-7000-8000-000000000001";

export const ACTIVIDAD_1 = "0198c1a4-0000-7000-8000-000000000100";
export const ACTIVIDAD_2 = "0198c1a4-0000-7000-8000-000000000101";
export const ACTIVIDAD_3 = "0198c1a4-0000-7000-8000-000000000102";
export const ACTIVIDAD_4 = "0198c1a4-0000-7000-8000-000000000200";

/**
 * Las actividades se derivan 1:1 de los rubros del presupuesto
 * (`CronogramaSincronizacionService`), así que hay una por rubro de
 * `presupuestoFixture` y `precioTotal` es el del rubro.
 *
 * `avancePorPeriodo` de actividad son **puntos de porcentaje escala 4**, no
 * dinero: `desviacion = pesoPonderado − Σ avancePorPeriodo` y los pesos suman
 * 100,0000. El mapa es disperso —sólo los períodos asignados— y `segmentos`
 * son sus corridas consecutivas.
 */
const actividad = (
  id: string,
  rubroId: string,
  item: string,
  codigo: string,
  descripcion: string,
  unidad: string,
  cantidad: string,
  precioUnitario: string,
  precioTotal: string,
  pesoPonderado: string,
  avancePorPeriodo: Record<string, string>,
  segmentos: { inicio: number; fin: number }[],
  desviacion: string,
): ActividadCronogramaResponse => ({
  id,
  rubroId,
  item,
  codigo,
  descripcion,
  unidad,
  cantidad: asDecimal(cantidad),
  precioUnitario: asDecimal(precioUnitario),
  precioTotal: asDecimal(precioTotal),
  pesoPonderado: asDecimal(pesoPonderado),
  avancePorPeriodo: Object.fromEntries(
    Object.entries(avancePorPeriodo).map(([p, v]) => [p, asDecimal(v)]),
  ),
  segmentos,
  desviacion: asDecimal(desviacion),
});

/** 2000 / 18500 = 10,8108 % repartido en P1..P3. */
const EXCAVACION = actividad(
  ACTIVIDAD_1,
  RUBRO_1_1_1,
  "1.1.1",
  "APU-001",
  "Excavación a máquina",
  "m3",
  "50.000000",
  "40.000000",
  "2000.000000",
  "10.8108",
  { "1": "3.6036", "2": "3.6036", "3": "3.6036" },
  [{ inicio: 1, fin: 3 }],
  "0.0000",
);

/** 500 / 18500 = 2,7027 % repartido en P1..P2. */
const RELLENO = actividad(
  ACTIVIDAD_2,
  RUBRO_1_1_2,
  "1.1.2",
  "APU-002",
  "Relleno compactado",
  "m3",
  "20.000000",
  "25.000000",
  "500.000000",
  "2.7027",
  { "1": "1.3514", "2": "1.3513" },
  [{ inicio: 1, fin: 2 }],
  "0.0000",
);

/** 2000 / 18500 = 10,8108 % en P2 y P4: dos segmentos, no uno. */
const TRANSPORTE = actividad(
  ACTIVIDAD_3,
  RUBRO_1_2_1,
  "1.2.1",
  "APU-003",
  "Transporte material",
  "m3-km",
  "100.000000",
  "20.000000",
  "2000.000000",
  "10.8108",
  { "2": "5.4054", "4": "5.4054" },
  [
    { inicio: 2, fin: 2 },
    { inicio: 4, fin: 4 },
  ],
  "0.0000",
);

/** 14000 / 18500 = 75,6757 % repartido en P2..P4. */
const HORMIGON = actividad(
  ACTIVIDAD_4,
  RUBRO_2_1,
  "2.1",
  "APU-004",
  "Hormigón simple",
  "m3",
  "10.000000",
  "1400.000000",
  "14000.000000",
  "75.6757",
  { "2": "25.2252", "3": "25.2252", "4": "25.2253" },
  [{ inicio: 2, fin: 4 }],
  "0.0000",
);

export const actividadesFixture: ActividadCronogramaResponse[] = [
  EXCAVACION,
  RELLENO,
  TRANSPORTE,
  HORMIGON,
];

const densa = (...valores: string[]) => valores.map(asDecimal);

/**
 * Camino feliz: toda desviación en cero y `avanceFinal` en 100,0000, que es
 * exactamente lo que el backend exige para `COMPLETO`.
 */
export const cronogramaFixture: CronogramaResponse = {
  id: CRONOGRAMA_ID,
  presupuestoId: PRESUPUESTO_V2,
  unidadTiempo: "MES",
  numeroPeriodos: 4,
  totalGeneral: asDecimal("18500.000000"),
  totalGeneralRevisado: asDecimal("18500.000000"),
  fechaRevision: "2026-07-15T00:00:00Z",
  estadoDistribucion: "COMPLETO",
  desactualizado: false,
  avanceFinal: asDecimal("100.0000"),
  actividades: actividadesFixture,
  // Denso y 1-based por posición: el índice 0 es el período 1.
  avancePorPeriodo: densa("4.9550", "35.5855", "28.8288", "30.6307"),
  avanceAcumulado: densa("4.9550", "40.5405", "69.3693", "100.0000"),
};

/**
 * Distribución a medias: al hormigón le falta el último período, así que su
 * desviación no es cero y el cronograma entero queda en `BORRADOR`.
 */
export const cronogramaBorradorFixture: CronogramaResponse = {
  ...cronogramaFixture,
  estadoDistribucion: "BORRADOR",
  totalGeneralRevisado: null,
  fechaRevision: null,
  avanceFinal: asDecimal("74.7747"),
  actividades: [
    EXCAVACION,
    RELLENO,
    TRANSPORTE,
    {
      ...HORMIGON,
      avancePorPeriodo: {
        "2": asDecimal("25.2252"),
        "3": asDecimal("25.2252"),
      },
      segmentos: [{ inicio: 2, fin: 3 }],
      desviacion: asDecimal("25.2253"),
    },
  ],
  avancePorPeriodo: densa("4.9550", "35.5855", "28.8288", "5.4054"),
  avanceAcumulado: densa("4.9550", "40.5405", "69.3693", "74.7747"),
};

/**
 * F-08: el presupuesto cambió después de la última revisión, así que
 * `totalGeneralRevisado` es el viejo y `desactualizado` está en alto.
 */
export const cronogramaDesactualizadoFixture: CronogramaResponse = {
  ...cronogramaFixture,
  desactualizado: true,
  totalGeneralRevisado: asDecimal("17800.000000"),
  fechaRevision: "2026-06-01T00:00:00Z",
};

/** Las `perdidas` que viaja el 409 de configuración. */
export const perdidasFixture = [
  { actividadId: ACTIVIDAD_4, periodo: 4, valor: asDecimal("25.2253") },
  { actividadId: ACTIVIDAD_3, periodo: 4, valor: asDecimal("5.4054") },
];
