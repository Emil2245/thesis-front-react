import { describe, expect, it, beforeEach } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { ResumenProyectoPage } from "@/features/proyectos/pages/ResumenProyectoPage";
import { useSesionStore } from "@/features/auth/sesion";
import { usuarioFixture } from "@/test/fixtures/auth";

describe("ResumenProyectoPage", () => {
  beforeEach(() => {
    useSesionStore.setState({ usuario: usuarioFixture, cargando: false });
  });

  it("muestra alerta CI_NO_CONFIGURADO con enlace a parámetros", async () => {
    renderConProviders(
      <Routes>
        <Route path="/proyectos/:id" element={<ResumenProyectoPage />} />
      </Routes>,
      { ruta: "/proyectos/01927f4e-1a2b-7c3d-8e4f-000000000001" },
    );

    await waitFor(() => {
      expect(screen.getByText(/indirectos no configurado/i)).toBeInTheDocument();
      const link = screen.getByText(/configurar ahora/i);
      expect(link).toBeInTheDocument();
      expect(link.closest("a")).toHaveAttribute(
        "href",
        "/proyectos/01927f4e-1a2b-7c3d-8e4f-000000000001/parametros",
      );
    });
  });

  it("muestra el nombre del proyecto", async () => {
    renderConProviders(
      <Routes>
        <Route path="/proyectos/:id" element={<ResumenProyectoPage />} />
      </Routes>,
      { ruta: "/proyectos/01927f4e-1a2b-7c3d-8e4f-000000000001" },
    );

    await waitFor(() => {
      expect(screen.getByText("Puente Ambato")).toBeInTheDocument();
    });
  });

  it("abre el diálogo de guardar como plantilla desde el menú de más acciones", async () => {
    const { user } = renderConProviders(
      <Routes>
        <Route path="/proyectos/:id" element={<ResumenProyectoPage />} />
      </Routes>,
      { ruta: "/proyectos/01927f4e-1a2b-7c3d-8e4f-000000000001" },
    );

    await waitFor(() => {
      expect(screen.getByText("Puente Ambato")).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText("Más acciones"));
    await user.click(screen.getByText("Guardar como plantilla"));

    expect(
      screen.getByText(
        "Guarda este proyecto como plantilla para crear nuevos proyectos a partir de él.",
      ),
    ).toBeInTheDocument();
  });
});
