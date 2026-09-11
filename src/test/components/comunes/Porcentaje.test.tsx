import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { asDecimal } from "@/lib/decimal";
import { Porcentaje } from "@/components/comunes/Porcentaje";

// El valor que llega del backend es la *fracción* (0.15), no el porcentaje
// (15). Si alguien «arregla» el componente multiplicando por 100 otra vez,
// estos tests lo cazan.
describe("Porcentaje", () => {
  it("pinta la fracción del backend como porcentaje, con 4 decimales", () => {
    render(<Porcentaje valor={asDecimal("0.150000")} />);
    expect(screen.getByText(/^15\.0000\s?%$/)).toHaveClass("num");
  });

  it("respeta dp explícito", () => {
    render(<Porcentaje valor={asDecimal("0.150000")} dp={2} />);
    expect(screen.getByText(/^15\.00\s?%$/)).toBeInTheDocument();
  });

  it("pinta guion largo ante null", () => {
    render(<Porcentaje valor={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
