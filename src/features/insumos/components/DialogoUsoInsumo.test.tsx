import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { DialogoUsoInsumo } from "./DialogoUsoInsumo";
import { insumoUsoFixture } from "@/test/fixtures/insumos";

describe("DialogoUsoInsumo", () => {
  const onClose = () => {};

  it("renders usage data when opened", async () => {
    renderConProviders(
      <DialogoUsoInsumo
        abierto={true}
        onClose={onClose}
        proyectoId={1}
        insumoId={10}
        usosPrecargados={insumoUsoFixture}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Insumo en uso/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Este insumo está siendo usado y no puede eliminarse/i),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("APU-001")).toBeInTheDocument();
    expect(screen.getByText("APU-002")).toBeInTheDocument();
  });

  it("409 on delete opens dialog pre-filled from error body", async () => {
    // This simulates the TablaInsumos handling of the 409 error
    // The DialogoUsoInsumo receives usosPrecargados from the error body
    renderConProviders(
      <DialogoUsoInsumo
        abierto={true}
        onClose={onClose}
        proyectoId={1}
        insumoId={99}
        usosPrecargados={insumoUsoFixture}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("APU-001")).toBeInTheDocument();
      expect(screen.getByText("APU-002")).toBeInTheDocument();
    });
  });
});
