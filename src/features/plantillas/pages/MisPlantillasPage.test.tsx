import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { MisPlantillasPage } from "./MisPlantillasPage";

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
});
