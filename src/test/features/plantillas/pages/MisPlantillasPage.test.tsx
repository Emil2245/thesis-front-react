import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { espiar, ultima } from "@/test/espia";
import { MisPlantillasPage } from "@/features/plantillas/pages/MisPlantillasPage";

// El backend sirve /plantillas-apu (PlantillaApuResource en origin/main), así
// que la ruta real ya monta la pantalla completa: no hay stub que probar
// aparte (plan 048, deroga el gate del plan 027).
const PLANTILLA_PERSONAL = "018f8a1e-0000-7000-8000-000000000002";

describe("MisPlantillasPage", () => {
  it("lista plantillas personales", async () => {
    renderConProviders(<MisPlantillasPage />);

    await waitFor(() => {
      expect(screen.getByText("Mi plantilla")).toBeInTheDocument();
    });
    expect(screen.getByText("Plantilla personal")).toBeInTheDocument();
  });

  it("tiene encabezado de tabla correcto", async () => {
    renderConProviders(<MisPlantillasPage />);

    await waitFor(() => {
      expect(screen.getByText("Nombre")).toBeInTheDocument();
      expect(screen.getByText("Descripción")).toBeInTheDocument();
      expect(screen.getByText("Fecha")).toBeInTheDocument();
    });
  });

  it("renombrar manda PUT /plantillas-apu/{id} con solo el nombre", async () => {
    const peticiones = espiar();
    const { user } = renderConProviders(<MisPlantillasPage />);

    await waitFor(() => {
      expect(screen.getByText("Mi plantilla")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Renombrar plantilla" }));
    const entrada = screen.getByRole("textbox");
    await user.clear(entrada);
    await user.type(entrada, "Renombrada");
    await user.click(screen.getByRole("button", { name: "Guardar nombre" }));

    // El handler valida el cuerpo con soloCampos: un campo de más sería 400.
    await waitFor(() => {
      const put = ultima(peticiones, "PUT", `/plantillas-apu/${PLANTILLA_PERSONAL}`);
      expect(put?.cuerpo).toEqual({ nombre: "Renombrada" });
    });
  });

  it("eliminar manda DELETE /plantillas-apu/{id} tras confirmar", async () => {
    const peticiones = espiar();
    const { user } = renderConProviders(<MisPlantillasPage />);

    await waitFor(() => {
      expect(screen.getByText("Mi plantilla")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Eliminar plantilla" }));
    await user.click(await screen.findByRole("button", { name: "Eliminar" }));

    await waitFor(() => {
      expect(ultima(peticiones, "DELETE", `/plantillas-apu/${PLANTILLA_PERSONAL}`)).toBeDefined();
    });
  });
});
