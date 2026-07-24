import { describe, expect, it, beforeEach } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { ListaProyectosPage } from "./ListaProyectosPage";
import { useSesionStore } from "@/features/auth/sesion";
import { usuarioFixture } from "@/test/fixtures/auth";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";

const API = "*/api/v1";

describe("ListaProyectosPage", () => {
  beforeEach(() => {
    useSesionStore.setState({ usuario: usuarioFixture, cargando: false });
  });

  it("muestra CTA vacío cuando no hay proyectos", async () => {
    server.use(
      http.get(`${API}/proyectos`, () =>
        HttpResponse.json({ contenido: [], page: 0, size: 25, totalElementos: 0, totalPaginas: 0 }),
      ),
    );

    renderConProviders(
      <Routes>
        <Route path="/proyectos" element={<ListaProyectosPage />} />
      </Routes>,
      { ruta: "/proyectos" },
    );

    await waitFor(() => {
      expect(screen.getByText(/crea tu primer proyecto/i)).toBeInTheDocument();
      expect(screen.getByText(/crear proyecto/i)).toBeInTheDocument();
    });
  });

  it("renderiza filas de proyectos", async () => {
    renderConProviders(
      <Routes>
        <Route path="/proyectos" element={<ListaProyectosPage />} />
      </Routes>,
      { ruta: "/proyectos" },
    );

    await waitFor(() => {
      expect(screen.getByText("Puente Ambato")).toBeInTheDocument();
      expect(screen.getByText("Vía Quito Sur")).toBeInTheDocument();
    });
  });
});
