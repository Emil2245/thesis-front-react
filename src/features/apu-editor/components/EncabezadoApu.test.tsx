import { describe, expect, it, vi } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { EncabezadoApu } from "./EncabezadoApu";
import { apuDetalleFixture } from "@/test/fixtures/apu";
import { ApiError } from "@/api/problem";
import type { ApuResponse } from "@/api/contract";

function apuAuxiliarFixture(): ApuResponse {
  return { ...apuDetalleFixture, esAuxiliar: true };
}

describe("EncabezadoApu", () => {
  it("muestra switch de auxiliar", () => {
    renderConProviders(
      <EncabezadoApu
        apu={apuDetalleFixture}
        onEditar={() => Promise.resolve()}
        onAlternarAuxiliar={() => Promise.resolve()}
      />,
    );
    expect(screen.getByText("Rubro auxiliar")).toBeInTheDocument();
  });

  it("409 flag-auxiliar-bloqueado muestra lista de usos", async () => {
    const onAlternar = vi.fn().mockRejectedValue(
      new ApiError(
        {
          type: "/problemas/flag-auxiliar-bloqueado",
          title: "Auxiliar bloqueado",
          status: 409,
          usos: [{ codigo: "APU-002", descripcion: "Relleno compactado" }],
        },
        409,
      ),
    );
    const { user } = renderConProviders(
      <EncabezadoApu
        apu={apuAuxiliarFixture()}
        onEditar={() => Promise.resolve()}
        onAlternarAuxiliar={onAlternar}
      />,
    );

    const toggle = screen.getByRole("switch");
    await user.click(toggle);

    await waitFor(() => {
      expect(screen.getByText(/APU-002/)).toBeInTheDocument();
      expect(screen.getByText(/Relleno compactado/)).toBeInTheDocument();
    });
  });
});
