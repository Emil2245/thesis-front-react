import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderConProviders } from "@/test/render";
import { espiar, ultima } from "@/test/espia";
import { AdminPlantillasProyectoPage } from "@/features/admin/pages/AdminPlantillasProyectoPage";
import { plantillasProyectoAdminFixture } from "@/test/fixtures/admin";
import { proyectosFixture } from "@/test/fixtures/proyectos";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Plan 044 del backend: `/admin/plantillas-proyecto`. El snapshot lo arma el
// servidor; el cliente sólo manda de qué proyecto sale y los metadatos.
describe("AdminPlantillasProyectoPage", () => {
  it("lista las plantillas de proyecto del sistema", async () => {
    renderConProviders(<AdminPlantillasProyectoPage />);

    expect(await screen.findByText(plantillasProyectoAdminFixture[0].nombre)).toBeInTheDocument();
  });

  it("crea una SISTEMA con POST {desdeProyectoId, nombre, descripcion}", async () => {
    const peticiones = espiar();
    const { user } = renderConProviders(<AdminPlantillasProyectoPage />);

    await user.click(await screen.findByRole("button", { name: /Nueva plantilla/ }));
    await user.click(screen.getByRole("combobox", { name: "Proyecto de origen" }));
    await user.click(
      await screen.findByRole("option", { name: proyectosFixture[0].nombreProyecto }),
    );
    await user.type(screen.getByLabelText("Nombre"), "Vía urbana");
    await user.type(screen.getByLabelText("Descripción"), "Base vial");
    await user.click(screen.getByRole("button", { name: "Crear" }));

    await waitFor(() => {
      expect(ultima(peticiones, "POST", "/admin/plantillas-proyecto")?.cuerpo).toEqual({
        desdeProyectoId: proyectosFixture[0].id,
        nombre: "Vía urbana",
        descripcion: "Base vial",
      });
    });
  });
});
