import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen } from "@testing-library/react";
import { DialogoDescuentoGlobal } from "./DialogoDescuentoGlobal";

describe("DialogoDescuentoGlobal", () => {
  it("renderiza el diálogo", () => {
    renderConProviders(<DialogoDescuentoGlobal abierto onClose={() => {}} proyectoId={1} />);
    expect(screen.getByText(/descuento global/i)).toBeInTheDocument();
  });
});
