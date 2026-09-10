import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CurvaSChart } from "@/features/cronograma/components/CurvaSChart";
import { cronogramaVistasFixture } from "@/test/fixtures/cronograma";

describe("CurvaSChart", () => {
  it("renders the complete accessible server series without recalculating it", () => {
    render(<CurvaSChart curvaS={cronogramaVistasFixture.curvaS} />);

    expect(screen.getByRole("figure", { name: "Curva S" })).toBeInTheDocument();
    expect(screen.getByText("30.6307")).toBeInTheDocument();
    expect(screen.getByText("100.0000")).toBeInTheDocument();
    expect(screen.getByText("18500.000000")).toBeInTheDocument();
  });

  it("renders an empty state when the server sends no points", () => {
    render(<CurvaSChart curvaS={{ puntos: [] }} />);

    expect(screen.getByText("No hay puntos de curva S para mostrar.")).toBeInTheDocument();
  });
});
