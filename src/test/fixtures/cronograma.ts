import type { CronogramaResponse, ActividadResponse } from "@/api/contract";
import { PRESUPUESTO_V2, RUBRO_1_1_1, RUBRO_1_1_2, RUBRO_2_1 } from "./presupuesto";

export const CRONOGRAMA_ID = "0198c1a3-0000-7000-8000-000000000001";

const ACTIVIDAD_1 = "0198c1a4-0000-7000-8000-000000000100";
const ACTIVIDAD_2 = "0198c1a4-0000-7000-8000-000000000101";
const ACTIVIDAD_3 = "0198c1a4-0000-7000-8000-000000000200";

export const actividadesFixture: ActividadResponse[] = [
  {
    id: ACTIVIDAD_1,
    rubroId: RUBRO_1_1_1,
    item: "1.1.1",
    descripcion: "Excavación a máquina",
    precioTotal: "2000.000000" as never,
    pesoPonderado: "0.1081" as never,
    avancePorPeriodo: {
      "1": "500.000000" as never,
      "2": "1000.000000" as never,
      "3": "500.000000" as never,
    },
    desviacion: "0.000000" as never,
  },
  {
    id: ACTIVIDAD_2,
    rubroId: RUBRO_1_1_2,
    item: "1.1.2",
    descripcion: "Relleno compactado",
    precioTotal: "500.000000" as never,
    pesoPonderado: "0.0270" as never,
    avancePorPeriodo: { "1": "250.000000" as never, "2": "250.000000" as never },
    desviacion: "0.000000" as never,
  },
  {
    id: ACTIVIDAD_3,
    rubroId: RUBRO_2_1,
    item: "2.1",
    descripcion: "Hormigón simple",
    precioTotal: "14000.000000" as never,
    pesoPonderado: "0.7568" as never,
    avancePorPeriodo: {
      "1": "3000.000000" as never,
      "2": "5000.000000" as never,
      "3": "4000.000000" as never,
      "4": "2000.000000" as never,
    },
    desviacion: "100.000000" as never,
  },
];

export const cronogramaFixture: CronogramaResponse = {
  id: CRONOGRAMA_ID,
  presupuestoId: PRESUPUESTO_V2,
  unidadTiempo: "MES",
  numeroPeriodos: 4,
  totalGeneral: "18500.000000" as never,
  totalGeneralRevisado: "18600.000000" as never,
  fechaRevision: "2026-07-15T00:00:00",
  desactualizado: false,
  actividades: actividadesFixture,
  avancePorPeriodo: {
    "1": "3750.000000" as never,
    "2": "6250.000000" as never,
    "3": "4500.000000" as never,
    "4": "2000.000000" as never,
  },
  avanceAcumulado: {
    "1": "3750.000000" as never,
    "2": "10000.000000" as never,
    "3": "14500.000000" as never,
    "4": "16500.000000" as never,
  },
};
