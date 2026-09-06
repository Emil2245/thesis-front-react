import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { useLocation } from "react-router-dom";
import { PlantillasProyectoPage } from "@/features/plantillas-proyecto/pages/PlantillasProyectoPage";
import { PROYECTO_DESDE_PLANTILLA } from "@/test/handlers";

/** Sonda de navegación: el destino de `navigate()` es la aserción, no un detalle. */
function RutaActual() {
  return <span data-testid="ruta">{useLocation().pathname}</span>;
}

describe("PlantillasProyectoPage", () => {
  it("lista plantillas de proyecto", async () => {
    renderConProviders(<PlantillasProyectoPage />);

    await waitFor(() => {
      expect(screen.getByText("Plantilla proyecto")).toBeInTheDocument();
    });
    expect(screen.getByText("Plantilla de prueba")).toBeInTheDocument();
  });

  // El id de plantilla es un UUID string: el diálogo se abría con el centinela
  // numérico `usarId > 0`, que con strings nunca es cierto. Que el diálogo
  // aparezca al pulsar es lo que fija el arreglo.
  it("abre el diálogo al pulsar sobre una plantilla con id UUID", async () => {
    const { user } = renderConProviders(<PlantillasProyectoPage />);

    await waitFor(() => {
      expect(screen.getByText("Plantilla proyecto")).toBeInTheDocument();
    });

    await user.click(screen.getByTitle("Crear proyecto desde esta plantilla"));
    expect(screen.getByText("Crear proyecto desde plantilla")).toBeInTheDocument();
  });

  // El backend devuelve `{proyecto, advertencias?}`, no el proyecto a secas.
  // Sin desenvolver, esto navegaba a /proyectos/undefined.
  it("crea un proyecto desde la plantilla y navega al proyecto creado", async () => {
    const { user } = renderConProviders(
      <>
        <PlantillasProyectoPage />
        <RutaActual />
      </>,
    );

    await waitFor(() => {
      expect(screen.getByText("Plantilla proyecto")).toBeInTheDocument();
    });

    await user.click(screen.getByTitle("Crear proyecto desde esta plantilla"));
    await user.type(screen.getByLabelText(/Nombre/), "Proyecto nuevo");
    await user.click(screen.getByText("Crear proyecto"));

    await waitFor(() => {
      expect(screen.getByTestId("ruta")).toHaveTextContent(
        `/proyectos/${PROYECTO_DESDE_PLANTILLA}`,
      );
    });
    expect(screen.queryByText("Crear proyecto desde plantilla")).not.toBeInTheDocument();
  });

  it("no envía crear proyecto si el nombre está vacío", async () => {
    const { user } = renderConProviders(<PlantillasProyectoPage />);

    await waitFor(() => {
      expect(screen.getByText("Plantilla proyecto")).toBeInTheDocument();
    });

    await user.click(screen.getByTitle("Crear proyecto desde esta plantilla"));
    expect(screen.getByText("Crear proyecto desde plantilla")).toBeInTheDocument();

    await user.click(screen.getByText("Crear proyecto"));

    expect(screen.getByText("Crear proyecto desde plantilla")).toBeInTheDocument();
  });

  it("elimina una plantilla tras confirmación", async () => {
    const { user } = renderConProviders(<PlantillasProyectoPage />);

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
