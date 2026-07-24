import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { DialogoCopiarBase } from "./DialogoCopiarBase";

describe("DialogoCopiarBase", () => {
  const onClose = () => {};

  it("renders omitidos with explanation", async () => {
    renderConProviders(<DialogoCopiarBase abierto={true} onClose={onClose} proyectoId={1} />);

    await waitFor(() => {
      expect(screen.getByText(/Copiar base de insumos/i)).toBeInTheDocument();
    });
  });
});
