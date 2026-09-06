import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { DialogoUsoInsumo } from "@/features/insumos/components/DialogoUsoInsumo";

const PROYECTO = "01927f4e-1a2b-7c3d-8e4f-000000000001";
const INSUMO = "018f8a20-0000-7000-8000-000000000010";

/**
 * Los usos salen SIEMPRE de `GET /proyectos/{id}/insumos/{iid}/usos`. Nunca
 * llegaron "precargados" en el cuerpo del error de borrado: `ErrorPayload` son
 * dos strings y no puede transportar una lista.
 */
describe("DialogoUsoInsumo", () => {
  const onClose = () => {};

  it("pide los usos al endpoint y los pinta", async () => {
    renderConProviders(
      <DialogoUsoInsumo abierto={true} onClose={onClose} proyectoId={PROYECTO} insumoId={INSUMO} />,
    );

    await waitFor(() => {
      expect(screen.getByText(/Insumo en uso/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Este insumo está siendo usado y no puede eliminarse/i),
      ).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText("APU-001")).toBeInTheDocument();
      expect(screen.getByText("APU-002")).toBeInTheDocument();
    });
  });
});
