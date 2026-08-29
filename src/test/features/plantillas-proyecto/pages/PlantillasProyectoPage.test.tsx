import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import {
  PlantillasProyectoPage,
  PlantillasProyectoPageActiva,
} from "@/features/plantillas-proyecto/pages/PlantillasProyectoPage";

// El backend no tiene /plantillas-proyecto ni /proyectos/desde-plantilla
// (plan 035): la ruta real muestra PlantillasProyectoPage, que degrada a
// "todavía no disponible" sin llamar al backend. PlantillasProyectoPageActiva
// es la implementación completa, conservada para reactivarla cuando el
// endpoint exista: estos tests siguen probándola directamente.
describe("PlantillasProyectoPageActiva", () => {
  it("lista plantillas de proyecto", async () => {
    renderConProviders(<PlantillasProyectoPageActiva />);

    await waitFor(() => {
      expect(screen.getByText("Plantilla proyecto")).toBeInTheDocument();
    });
    expect(screen.getByText("Plantilla de prueba")).toBeInTheDocument();
  });

  it("crea un proyecto desde la plantilla", async () => {
    const { user } = renderConProviders(<PlantillasProyectoPageActiva />);

    await waitFor(() => {
      expect(screen.getByText("Plantilla proyecto")).toBeInTheDocument();
    });

    await user.click(screen.getByTitle("Crear proyecto desde esta plantilla"));
    await user.type(screen.getByLabelText(/Nombre/), "Proyecto nuevo");
    await user.click(screen.getByText("Crear proyecto"));

    await waitFor(() => {
      expect(screen.queryByText("Crear proyecto desde plantilla")).not.toBeInTheDocument();
    });
  });

  it("no envía crear proyecto si el nombre está vacío", async () => {
    const { user } = renderConProviders(<PlantillasProyectoPageActiva />);

    await waitFor(() => {
      expect(screen.getByText("Plantilla proyecto")).toBeInTheDocument();
    });

    await user.click(screen.getByTitle("Crear proyecto desde esta plantilla"));
    expect(screen.getByText("Crear proyecto desde plantilla")).toBeInTheDocument();

    await user.click(screen.getByText("Crear proyecto"));

    expect(screen.getByText("Crear proyecto desde plantilla")).toBeInTheDocument();
  });

  it("elimina una plantilla tras confirmación", async () => {
    const { user } = renderConProviders(<PlantillasProyectoPageActiva />);

    await waitFor(() => {
      expect(screen.getByText("Plantilla proyecto")).toBeInTheDocument();
    });

    const deleteBtn = document.querySelector("button.text-destructive") as HTMLElement;
    await user.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText("Eliminar plantilla")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Eliminar"));

    await waitFor(() => {
      expect(screen.queryByText("Eliminar plantilla")).not.toBeInTheDocument();
    });
  });
});

describe("PlantillasProyectoPage", () => {
  it("explica que el módulo todavía no está disponible, sin pedir plantillas al backend", async () => {
    // MSW está configurado con onUnhandledRequest: "error": si esta pantalla
    // llamara al hook real, el test fallaría por la petición no mockeada.
    renderConProviders(<PlantillasProyectoPage />);

    expect(screen.getByText("Plantillas de proyecto")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/todavía no está disponible/i)).toBeInTheDocument();
    });
  });
});
