import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { JerarquiaCronograma } from "@/features/cronograma/components/JerarquiaCronograma";
import { cronogramaVistasFixture } from "@/test/fixtures/cronograma";

describe("JerarquiaCronograma", () => {
  it("renders the recursive tree, null activity, periods, and separate segments", () => {
    render(<JerarquiaCronograma gantt={cronogramaVistasFixture.gantt} />);

    expect(screen.getByRole("heading", { name: "Gantt jerárquico" })).toBeInTheDocument();
    expect(screen.getByText("Movimiento de tierras")).toBeInTheDocument();
    expect(screen.getByText("Sin actividad")).toBeInTheDocument();
    expect(screen.getByText("M1")).toBeInTheDocument();
    expect(screen.getByText("M4")).toBeInTheDocument();
    expect(screen.getByText("2–2")).toBeInTheDocument();
    expect(screen.getByText("4–4")).toBeInTheDocument();
  });

  it("renders an explicit empty hierarchy state", () => {
    render(<JerarquiaCronograma capitulos={[]} />);

    expect(screen.getByText("No hay capítulos para mostrar en el Gantt.")).toBeInTheDocument();
  });
});
