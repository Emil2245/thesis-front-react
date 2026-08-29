import { describe, expect, it, vi } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { DialogoDescuentoRubro } from "@/features/apu-editor/components/DialogoDescuentoRubro";
import { apuDetalleFixture } from "@/test/fixtures/apu";
import type { ApuResponse } from "@/api/contract";

function apuConDescuentoExistente(): ApuResponse {
  return {
    ...apuDetalleFixture,
    porcentajeDescuento: 5,
  };
}

describe("DialogoDescuentoRubro", () => {
  it("rechaza 51 y acepta 50 (validación cliente 0-50)", async () => {
    const onAplicar = vi.fn().mockResolvedValue(undefined);
    const { user } = renderConProviders(
      <DialogoDescuentoRubro
        abierto
        onClose={() => {}}
        apu={apuDetalleFixture}
        onAplicarDescuento={onAplicar}
      />,
    );

    const input = screen.getByLabelText(/Porcentaje/);
    await user.clear(input);
    await user.type(input, "51");
    await user.click(screen.getByText("Aplicar"));
    expect(screen.getByText(/El descuento debe estar entre 0% y 50%/)).toBeInTheDocument();
    expect(onAplicar).not.toHaveBeenCalled();

    await user.clear(input);
    await user.type(input, "50");
    await user.click(screen.getByText("Aplicar"));
    await waitFor(() => {
      expect(onAplicar).toHaveBeenCalledWith("50");
    });
  });

  it("Quitar descuento envía 0", async () => {
    const onAplicar = vi.fn().mockResolvedValue(undefined);
    const { user } = renderConProviders(
      <DialogoDescuentoRubro
        abierto
        onClose={() => {}}
        apu={apuConDescuentoExistente()}
        onAplicarDescuento={onAplicar}
      />,
    );

    await user.click(screen.getByText("Quitar descuento"));
    await waitFor(() => {
      expect(onAplicar).toHaveBeenCalledWith("0");
    });
  });

  it("muestra valores actuales de CD, CI, CT", () => {
    renderConProviders(
      <DialogoDescuentoRubro
        abierto
        onClose={() => {}}
        apu={apuDetalleFixture}
        onAplicarDescuento={() => Promise.resolve()}
      />,
    );
    expect(screen.getByText("CD actual")).toBeInTheDocument();
    expect(screen.getByText("CI actual")).toBeInTheDocument();
    expect(screen.getByText("CT actual")).toBeInTheDocument();
  });

  it("muestra texto de ayuda", () => {
    renderConProviders(
      <DialogoDescuentoRubro
        abierto
        onClose={() => {}}
        apu={apuDetalleFixture}
        onAplicarDescuento={() => Promise.resolve()}
      />,
    );
    expect(
      screen.getByText(/El descuento se aplica al costo directo del rubro/),
    ).toBeInTheDocument();
  });
});
