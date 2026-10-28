import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CronogramaValorizado } from "@/features/cronograma/components/CronogramaValorizado";
import { asDecimal } from "@/lib/decimal";
import {
  cronogramaValorizado120PeriodosFixture,
  cronogramaVistasFixture,
} from "@/test/fixtures/cronograma";

function renderValorizado(
  valorizado = cronogramaVistasFixture.valorizado,
  unidadTiempo = cronogramaVistasFixture.gantt.cronograma.unidadTiempo,
) {
  return render(<CronogramaValorizado valorizado={valorizado} unidadTiempo={unidadTiempo} />);
}

describe("CronogramaValorizado", () => {
  it("renders one hierarchical matrix with server values and summaries", () => {
    renderValorizado();

    expect(screen.getByRole("heading", { name: "Cronograma valorizado" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Ítem" })).toHaveClass("sticky");
    expect(screen.getByRole("columnheader", { name: "Descripción" })).toHaveClass("sticky");
    expect(screen.getByRole("columnheader", { name: "Monto valorizado" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "M1" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "M4" })).toBeInTheDocument();
    expect(screen.getByText("Obras preliminares")).toBeInTheDocument();
    expect(screen.getByText("Movimiento de tierras")).toBeInTheDocument();
    expect(screen.getByText("Actividad APU-001")).toBeInTheDocument();
    expect(screen.queryByText("Capítulo")).not.toBeInTheDocument();

    const parcial = screen.getByTestId("resumen-porcentaje-parcial");
    expect(within(parcial).getByText("4.9550")).toBeInTheDocument();
    expect(within(parcial).getByText("30.6307")).toBeInTheDocument();
    const acumulado = screen.getByTestId("resumen-monto-acumulado");
    expect(within(acumulado).getByText("18500.000000")).toBeInTheDocument();

    const rubroSinActividad = screen.getByText("Rubro sin actividad").closest("tr");
    expect(rubroSinActividad).not.toBeNull();
    expect(within(rubroSinActividad as HTMLElement).getAllByText("—").length).toBeGreaterThan(0);
  });

  it("uses S labels for weekly projections", () => {
    renderValorizado(cronogramaVistasFixture.valorizado, "SEMANA");

    expect(screen.getByRole("columnheader", { name: "S1" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "S4" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "M1" })).not.toBeInTheDocument();
  });

  it("distinguishes empty periods from empty rubros", () => {
    const first = renderValorizado({
      ...cronogramaVistasFixture.valorizado,
      periodos: [],
      capitulos: [],
    });

    expect(screen.getByText("No hay períodos valorizados para mostrar.")).toBeInTheDocument();
    expect(screen.queryByText("No hay rubros valorizados para mostrar.")).not.toBeInTheDocument();
    expect(screen.getAllByText("100.0000 %")).toHaveLength(2);
    first.unmount();

    renderValorizado({
      ...cronogramaVistasFixture.valorizado,
      capitulos: [],
    });

    expect(screen.getByText("No hay rubros valorizados para mostrar.")).toBeInTheDocument();
  });

  it("keeps all 120 monthly columns reachable", () => {
    renderValorizado(cronogramaValorizado120PeriodosFixture);

    expect(screen.getByRole("columnheader", { name: "M1" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "M120" })).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader")).toHaveLength(127);
  });

  it("muestra la brecha cuando hay actividades sin programar (plan 039)", () => {
    renderValorizado({
      ...cronogramaVistasFixture.valorizado,
      totales: {
        ...cronogramaVistasFixture.valorizado.totales,
        avanceFinalPorcentaje: asDecimal("40.0000"),
        montoTotalGeneral: asDecimal("10000.000000"),
        porcentajeCierre: asDecimal("40.0000"),
        montoPresupuesto: asDecimal("25000.000000"),
        montoSinProgramar: asDecimal("15000.000000"),
        actividadesSinAsignar: 3,
      },
    });

    expect(screen.getByText("Monto programado")).toBeInTheDocument();
    expect(screen.queryByText("Monto total general")).not.toBeInTheDocument();
    expect(screen.getByText("$10,000.00")).toBeInTheDocument();
    expect(screen.getByText("Total del presupuesto")).toBeInTheDocument();
    expect(screen.getByText("$25,000.00")).toBeInTheDocument();
    expect(screen.getByTestId("sin-programar")).toHaveTextContent(
      "$15,000.00 (3 actividades con distribución incompleta)",
    );
    expect(screen.getByTestId("sin-programar")).toHaveClass("text-amber-600");
  });

  it("con todo programado, Sin programar muestra 0 y sin aviso (plan 039)", () => {
    renderValorizado({
      ...cronogramaVistasFixture.valorizado,
      totales: {
        ...cronogramaVistasFixture.valorizado.totales,
        montoPresupuesto: asDecimal("18500.000000"),
        montoSinProgramar: asDecimal("0.000000"),
        actividadesSinAsignar: 0,
      },
    });

    expect(screen.getByTestId("sin-programar")).toHaveTextContent(/^\$0\.00$/);
    expect(screen.getByTestId("sin-programar")).not.toHaveClass("text-amber-600");
  });

  it("sigue renderizando contra un back sin los campos nuevos", () => {
    renderValorizado();
    expect(screen.queryByText("Sin programar")).not.toBeInTheDocument();
    expect(screen.getByText("Monto programado")).toBeInTheDocument();
  });

  it("con brecha y contador 0 (back antiguo) no muestra «0 actividades» (plan 039b)", () => {
    renderValorizado({
      ...cronogramaVistasFixture.valorizado,
      totales: {
        ...cronogramaVistasFixture.valorizado.totales,
        montoPresupuesto: asDecimal("25000.000000"),
        montoSinProgramar: asDecimal("7589.960304"),
        actividadesSinAsignar: 0,
      },
    });
    const celda = screen.getByTestId("sin-programar");
    expect(celda).toHaveTextContent("$7,589.96");
    expect(celda).not.toHaveTextContent(/\b0 actividad/);
    expect(celda).not.toHaveTextContent("(");
  });

  it("singulariza una actividad con distribución incompleta (plan 039b)", () => {
    renderValorizado({
      ...cronogramaVistasFixture.valorizado,
      totales: {
        ...cronogramaVistasFixture.valorizado.totales,
        montoPresupuesto: asDecimal("100.000000"),
        montoSinProgramar: asDecimal("15.000000"),
        actividadesSinAsignar: 1,
      },
    });
    expect(screen.getByTestId("sin-programar")).toHaveTextContent(
      "$15.00 (1 actividad con distribución incompleta)",
    );
  });
});
