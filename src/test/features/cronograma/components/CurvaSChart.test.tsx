import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CurvaSChart } from "@/features/cronograma/components/CurvaSChart";
import {
  cronogramaValorizado120PeriodosFixture,
  cronogramaVistasFixture,
} from "@/test/fixtures/cronograma";

describe("CurvaSChart", () => {
  it("renders an accessible SVG and preserves the complete server series", () => {
    render(
      <CurvaSChart
        curvaS={cronogramaVistasFixture.curvaS}
        unidadTiempo={cronogramaVistasFixture.gantt.cronograma.unidadTiempo}
      />,
    );

    expect(screen.getByRole("figure", { name: "Curva S" })).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Curva S de programación acumulada" }),
    ).toBeInTheDocument();
    expect(screen.getAllByTestId(/curva-s-punto-/)).toHaveLength(4);
    expect(screen.getByText("Tabla accesible de datos de Curva S")).toBeInTheDocument();
    expect(screen.getAllByText("30.6307").length).toBeGreaterThan(0);
    expect(screen.getAllByText("100.0000").length).toBeGreaterThan(0);
    expect(screen.getAllByText("18500.000000").length).toBeGreaterThan(0);
    expect(screen.getAllByText("M1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("M4").length).toBeGreaterThan(0);
    expect(
      screen.queryByText(/avance real|programado vs\. real|SPI|forecast/i),
    ).not.toBeInTheDocument();
  });

  it("keeps point details synchronized with keyboard navigation", () => {
    render(
      <CurvaSChart
        curvaS={cronogramaVistasFixture.curvaS}
        unidadTiempo={cronogramaVistasFixture.gantt.cronograma.unidadTiempo}
      />,
    );

    const botones = screen.getAllByRole("button", { name: /Seleccionar/ });
    fireEvent.focus(botones[2]);

    expect(botones[2]).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("region", { name: "Detalle del punto seleccionado" }),
    ).toHaveTextContent("69.3693");
    expect(
      screen.getByRole("region", { name: "Detalle del punto seleccionado" }),
    ).toHaveTextContent("12833.320500");
  });

  it("uses weekly ordinal labels and handles a single point", () => {
    render(
      <CurvaSChart
        curvaS={{ puntos: [cronogramaVistasFixture.curvaS.puntos[0]] }}
        unidadTiempo="SEMANA"
      />,
    );

    expect(screen.getByTestId("curva-s-punto-1")).toBeInTheDocument();
    expect(screen.getAllByText("S1").length).toBeGreaterThan(0);
    expect(screen.queryByText("S2")).not.toBeInTheDocument();
  });

  it("keeps 120 points and all raw table rows reachable", () => {
    render(
      <CurvaSChart
        curvaS={{
          puntos: cronogramaValorizado120PeriodosFixture.periodos.map((periodo) => ({
            ...periodo,
          })),
        }}
        unidadTiempo="MES"
      />,
    );

    expect(screen.getAllByTestId(/curva-s-punto-/)).toHaveLength(120);
    expect(screen.getAllByText("M120").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("row")).toHaveLength(121);
  });

  it("renders an empty state when the server sends no points", () => {
    render(<CurvaSChart curvaS={{ puntos: [] }} unidadTiempo="MES" />);

    expect(screen.getByText("No hay puntos de curva S para mostrar.")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
