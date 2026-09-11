import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CronogramaValorizado } from "@/features/cronograma/components/CronogramaValorizado";
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
    expect(screen.getAllByText("100.0000")).toHaveLength(2);
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
});
