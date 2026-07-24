import { describe, expect, it, beforeEach } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { ParametrosPage } from "./ParametrosPage";
import { useSesionStore } from "@/features/auth/sesion";
import { usuarioFixture } from "@/test/fixtures/auth";

describe("ParametrosPage", () => {
  beforeEach(() => {
    useSesionStore.setState({ usuario: usuarioFixture, cargando: false });
  });

  it("renderiza los parámetros del proyecto", async () => {
    renderConProviders(
      <Routes>
        <Route path="/proyectos/:id/parametros" element={<ParametrosPage />} />
      </Routes>,
      { ruta: "/proyectos/1/parametros" },
    );

    await waitFor(() => {
      expect(screen.getByText(/% Herramienta menor/i)).toBeInTheDocument();
      expect(screen.getByText(/% Indirectos/i)).toBeInTheDocument();
    });
  });

  it("muestra la alerta de recálculo", async () => {
    renderConProviders(
      <Routes>
        <Route path="/proyectos/:id/parametros" element={<ParametrosPage />} />
      </Routes>,
      { ruta: "/proyectos/1/parametros" },
    );

    await waitFor(() => {
      expect(screen.getByText(/recalculará/i)).toBeInTheDocument();
    });
  });
});
