import { describe, expect, it, vi } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { DialogoGuardarComoPlantilla } from "@/features/proyectos/components/DialogoGuardarComoPlantilla";

describe("DialogoGuardarComoPlantilla", () => {
  it("nombre vacío muestra error", async () => {
    const { user } = renderConProviders(
      <DialogoGuardarComoPlantilla
        abierto
        onClose={() => {}}
        proyectoId={"01927f4e-1a2b-7c3d-8e4f-000000000001"}
      />,
    );

    await user.click(screen.getByText("Guardar plantilla"));
    expect(screen.getByText("El nombre es obligatorio")).toBeInTheDocument();
  });

  it("guarda exitosamente y llama onClose", async () => {
    const onClose = vi.fn();
    const { user } = renderConProviders(
      <DialogoGuardarComoPlantilla
        abierto
        onClose={onClose}
        proyectoId={"01927f4e-1a2b-7c3d-8e4f-000000000001"}
      />,
    );

    await user.type(screen.getByLabelText(/Nombre/), "Mi plantilla de proyecto");
    await user.click(screen.getByText("Guardar plantilla"));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});
