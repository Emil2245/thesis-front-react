import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { asDecimal } from "@/lib/decimal";
import { Moneda } from "@/components/comunes/Moneda";

it("muestra el valor con cifras tabulares", () => {
  render(<Moneda valor={asDecimal("1234.500000")} />);
  const el = screen.getByText(/1,234\.50/);
  expect(el).toHaveClass("num");
});
