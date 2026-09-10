import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CronogramaValorizado } from "@/features/cronograma/components/CronogramaValorizado";
import { cronogramaVistasFixture } from "@/test/fixtures/cronograma";

describe("CronogramaValorizado", () => {
  it("renders server period values, valued hierarchy, and all totals exactly", () => {
    render(<CronogramaValorizado valorizado={cronogramaVistasFixture.valorizado} />);

    expect(screen.getByRole("heading", { name: "Cronograma valorizado" })).toBeInTheDocument();
    expect(screen.getAllByText("4.9550").length).toBeGreaterThan(0);
    expect(screen.getAllByText("18500.000000").length).toBeGreaterThan(0);
    expect(screen.getByText("Movimiento de tierras")).toBeInTheDocument();
    expect(screen.getAllByText("2000.000000").length).toBeGreaterThan(0);
  });

  it("renders an empty period state while retaining server totals", () => {
    render(
      <CronogramaValorizado
        valorizado={{
          ...cronogramaVistasFixture.valorizado,
          periodos: [],
          capitulos: [],
        }}
      />,
    );

    expect(screen.getByText("No hay períodos valorizados para mostrar.")).toBeInTheDocument();
    expect(screen.getAllByText("100.0000").length).toBeGreaterThan(0);
  });
});
