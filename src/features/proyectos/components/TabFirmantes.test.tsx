import { describe, expect, it, beforeEach } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import { TabFirmantes } from "./TabFirmantes";
import { useSesionStore } from "@/features/auth/sesion";
import { usuarioFixture } from "@/test/fixtures/auth";

const API = "*/api/v1";

describe("TabFirmantes", () => {
  beforeEach(() => {
    useSesionStore.setState({ usuario: usuarioFixture, cargando: false });
  });

  it("lista firmantes del proyecto", async () => {
    renderConProviders(
      <Routes>
        <Route path="/proyectos/:id" element={<TabFirmantes proyectoId={1} />} />
      </Routes>,
      { ruta: "/proyectos/1" },
    );

    await waitFor(() => {
      expect(screen.getByText(/ing. juan pérez/i)).toBeInTheDocument();
    });
  });

  it("muestra vacío cuando no hay firmantes", async () => {
    server.use(http.get(`${API}/proyectos/:id/firmantes`, () => HttpResponse.json([])));

    renderConProviders(
      <Routes>
        <Route path="/proyectos/:id" element={<TabFirmantes proyectoId={2} />} />
      </Routes>,
      { ruta: "/proyectos/2" },
    );

    await waitFor(() => {
      expect(screen.getByText(/sin firmantes registrados/i)).toBeInTheDocument();
    });
  });
});
