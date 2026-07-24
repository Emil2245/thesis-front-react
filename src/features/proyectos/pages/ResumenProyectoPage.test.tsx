import { describe, expect, it, beforeEach } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { ResumenProyectoPage } from "./ResumenProyectoPage";
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
      { ruta: "/proyectos/1" },
    );

    await waitFor(() => {
      expect(screen.getByText(/indirectos no configurado/i)).toBeInTheDocument();
      const link = screen.getByText(/configurar ahora/i);
      expect(link).toBeInTheDocument();
      expect(link.closest("a")).toHaveAttribute("href", "/proyectos/1/parametros");
    });
  });

  it("muestra el nombre del proyecto", async () => {
    renderConProviders(
      <Routes>
        <Route path="/proyectos/:id" element={<ResumenProyectoPage />} />
      </Routes>,
      { ruta: "/proyectos/1" },
    );

    await waitFor(() => {
      expect(screen.getByText("Puente Ambato")).toBeInTheDocument();
    });
  });
});
