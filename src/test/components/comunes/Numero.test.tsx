import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { asDecimal } from "@/lib/decimal";
import { Numero } from "@/components/comunes/Numero";

// Frontera donde se decide cómo se ve una cantidad. Fijar el comportamiento
// aquí hace verificable la partición `Decimal` string vs number (plan 057 §7).
describe("Numero", () => {
  it("formatea en es-EC con la precisión por defecto (2–4 decimales)", () => {
    render(<Numero valor={asDecimal("1234.500000")} />);
    expect(screen.getByText("1,234.50")).toHaveClass("num");
  });

  it("conserva hasta 4 decimales sin redondear a 2", () => {
    render(<Numero valor={asDecimal("0.123400")} />);
    expect(screen.getByText("0.1234")).toBeInTheDocument();
  });

  it("respeta min y max explícitos", () => {
    render(<Numero valor={asDecimal("2.500000")} min={0} max={0} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("pinta guion largo ante null, y no «0» ni «NaN»", () => {
    render(<Numero valor={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
