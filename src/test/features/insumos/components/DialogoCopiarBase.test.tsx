import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { DialogoCopiarBase } from "@/features/insumos/components/DialogoCopiarBase";

describe("DialogoCopiarBase", () => {
  const onClose = () => {};

  it("renders omitidos with explanation", async () => {
    renderConProviders(<DialogoCopiarBase abierto={true} onClose={onClose} proyectoId={"01927f4e-1a2b-7c3d-8e4f-000000000001"} />);

    await waitFor(() => {
      expect(screen.getByText(/Copiar base de insumos/i)).toBeInTheDocument();
    });
  });
});
