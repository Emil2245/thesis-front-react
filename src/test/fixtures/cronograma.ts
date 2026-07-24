import type { CronogramaResponse, ActividadResponse } from "@/api/contract";

export const actividadesFixture: ActividadResponse[] = [
  {
    id: 100,
    rubroId: 100,
    item: "1.1.1",
    descripcion: "Excavación a máquina",
    precioTotal: "2000.000000" as never,
    pesoPonderado: "0.1081" as never,
    avancePorPeriodo: {
      "0": "500.000000" as never,
      "1": "1000.000000" as never,
      "2": "500.000000" as never,
    },
    desviacion: "0.000000" as never,
  },
  {
    id: 101,
    rubroId: 101,
    item: "1.1.2",
    descripcion: "Relleno compactado",
    precioTotal: "500.000000" as never,
    pesoPonderado: "0.0270" as never,
    avancePorPeriodo: { "0": "250.000000" as never, "1": "250.000000" as never },
    desviacion: "0.000000" as never,
  },
  {
    id: 200,
    rubroId: 200,
    item: "2.1",
    descripcion: "Hormigón simple",
    precioTotal: "14000.000000" as never,
    pesoPonderado: "0.7568" as never,
    avancePorPeriodo: {
      "0": "3000.000000" as never,
      "1": "5000.000000" as never,
      "2": "4000.000000" as never,
      "3": "2000.000000" as never,
    },
    desviacion: "100.000000" as never,
  },
];

export const cronogramaFixture: CronogramaResponse = {
  id: 1,
  presupuestoId: 11,
  unidadTiempo: "MES",
  numeroPeriodos: 4,
  totalGeneral: "18500.000000" as never,
  totalGeneralRevisado: "18600.000000" as never,
  fechaRevision: "2026-07-15T00:00:00",
  desactualizado: false,
  actividades: actividadesFixture,
  avancePorPeriodo: [
    "3750.000000" as never,
    "6250.000000" as never,
    "4500.000000" as never,
    "2000.000000" as never,
  ],
  avanceAcumulado: [
    "3750.000000" as never,
    "10000.000000" as never,
    "14500.000000" as never,
    "16500.000000" as never,
  ],
};
