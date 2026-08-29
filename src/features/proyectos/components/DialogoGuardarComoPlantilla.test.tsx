import { describe, expect, it, vi } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { DialogoGuardarComoPlantilla } from "./DialogoGuardarComoPlantilla";

describe("DialogoGuardarComoPlantilla", () => {
  it("nombre vacío muestra error", async () => {
    const { user } = renderConProviders(
      <DialogoGuardarComoPlantilla abierto onClose={() => {}} proyectoId={1} />,
    );

    await user.click(screen.getByText("Guardar plantilla"));
    expect(screen.getByText("El nombre es obligatorio")).toBeInTheDocument();
  });

  it("guarda exitosamente y llama onClose", async () => {
    const onClose = vi.fn();
    const { user } = renderConProviders(
      <DialogoGuardarComoPlantilla abierto onClose={onClose} proyectoId={1} />,
    );

    await user.type(screen.getByLabelText(/Nombre/), "Mi plantilla de proyecto");
    await user.click(screen.getByText("Guardar plantilla"));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});
