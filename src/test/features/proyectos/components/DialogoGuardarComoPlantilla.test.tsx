import { describe, expect, it, vi } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { espiar, ultima } from "@/test/espia";
import { DialogoGuardarComoPlantilla } from "@/features/proyectos/components/DialogoGuardarComoPlantilla";

const PROYECTO_ID = "01927f4e-1a2b-7c3d-8e4f-000000000001";

describe("DialogoGuardarComoPlantilla", () => {
  it("nombre vacío muestra error", async () => {
    const { user } = renderConProviders(
      <DialogoGuardarComoPlantilla abierto onClose={() => {}} proyectoId={PROYECTO_ID} />,
    );

    await user.click(screen.getByText("Guardar plantilla"));
    expect(screen.getByText("El nombre es obligatorio")).toBeInTheDocument();
  });

  it("guarda exitosamente y llama onClose", async () => {
    const onClose = vi.fn();
    const { user } = renderConProviders(
      <DialogoGuardarComoPlantilla abierto onClose={onClose} proyectoId={PROYECTO_ID} />,
    );

    await user.type(screen.getByLabelText(/Nombre/), "Mi plantilla de proyecto");
    await user.click(screen.getByText("Guardar plantilla"));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  // Fija la ruta real (PlantillaProyectoGuardarResource): el proyecto va en el
  // path y el cuerpo solo lleva `nombre` y `descripcion?`. Antes del plan 049
  // esto era POST /plantillas-proyecto con `proyectoId` en el cuerpo, que el
  // backend responde con 404.
  it("postea a /proyectos/{id}/guardar-plantilla sin proyectoId en el cuerpo", async () => {
    const peticiones = espiar();
    const { user } = renderConProviders(
      <DialogoGuardarComoPlantilla abierto onClose={() => {}} proyectoId={PROYECTO_ID} />,
    );

    await user.type(screen.getByLabelText(/Nombre/), "Base vial");
    await user.type(screen.getByLabelText(/Descripción/), "Estructura estándar");
    await user.click(screen.getByText("Guardar plantilla"));

    await waitFor(() => {
      const p = ultima(peticiones, "POST", `/proyectos/${PROYECTO_ID}/guardar-plantilla`);
      expect(p?.cuerpo).toEqual({ nombre: "Base vial", descripcion: "Estructura estándar" });
    });
  });
});
