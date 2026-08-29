import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import {
  MisPlantillasPage,
  MisPlantillasPageActiva,
} from "@/features/plantillas/pages/MisPlantillasPage";

// El backend no tiene /plantillas-apu (plan 027): la ruta real muestra
// MisPlantillasPage, que degrada a "todavía no disponible" sin llamar al
// backend (ver más abajo). MisPlantillasPageActiva es la implementación
// completa, conservada para reactivarla cuando el endpoint exista: estos
// tests siguen probándola directamente.
describe("MisPlantillasPageActiva", () => {
  it("lista plantillas personales", async () => {
    renderConProviders(<MisPlantillasPageActiva />);

    await waitFor(() => {
      expect(screen.getByText("Mi plantilla")).toBeInTheDocument();
    });
    expect(screen.getByText("Plantilla personal")).toBeInTheDocument();
  });

  it("tiene encabezado de tabla correcto", async () => {
    renderConProviders(<MisPlantillasPageActiva />);

    await waitFor(() => {
      expect(screen.getByText("Nombre")).toBeInTheDocument();
      expect(screen.getByText("Descripción")).toBeInTheDocument();
      expect(screen.getByText("Fecha")).toBeInTheDocument();
    });
  });
});

describe("MisPlantillasPage", () => {
  it("explica que el módulo todavía no está disponible, sin pedir plantillas al backend", async () => {
    // MSW está configurado con onUnhandledRequest: "error": si esta pantalla
    // llamara al hook real, el test fallaría por la petición no mockeada.
    renderConProviders(<MisPlantillasPage />);

    expect(screen.getByText("Mis plantillas")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/todavía no está disponible/i)).toBeInTheDocument();
    });
  });
});
