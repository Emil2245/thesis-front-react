import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { DialogoUsoInsumo } from "@/features/insumos/components/DialogoUsoInsumo";
import { insumoUsoFixture } from "@/test/fixtures/insumos";

describe("DialogoUsoInsumo", () => {
  const onClose = () => {};

  it("renders usage data when opened", async () => {
    renderConProviders(
      <DialogoUsoInsumo
        abierto={true}
        onClose={onClose}
        proyectoId={"01927f4e-1a2b-7c3d-8e4f-000000000001"}
        insumoId={"018f8a20-0000-7000-8000-000000000010"}
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
        proyectoId={"01927f4e-1a2b-7c3d-8e4f-000000000001"}
        insumoId={"018f8a20-0000-7000-8000-000000000099"}
        usosPrecargados={insumoUsoFixture}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("APU-001")).toBeInTheDocument();
      expect(screen.getByText("APU-002")).toBeInTheDocument();
    });
  });
});
