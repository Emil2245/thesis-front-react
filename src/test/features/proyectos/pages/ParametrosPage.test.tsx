import { describe, expect, it, beforeEach } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { ParametrosPage } from "@/features/proyectos/pages/ParametrosPage";
import { useSesionStore } from "@/features/auth/sesion";
import { usuarioFixture } from "@/test/fixtures/auth";
import { server } from "@/test/server";
import { http, HttpResponse } from "msw";
import { parametrosFixture } from "@/test/fixtures/proyectos";

const API = "*/api/v1";

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

  it("muestra el porcentaje numérico del backend como entero", async () => {
    renderConProviders(
      <Routes>
        <Route path="/proyectos/:id/parametros" element={<ParametrosPage />} />
      </Routes>,
      { ruta: "/proyectos/1/parametros" },
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("5")).toBeInTheDocument();
    });
  });

  it("envía fracción numérica en el PUT al guardar", async () => {
    let sentBody: unknown = null;
    server.use(
      http.put(`${API}/proyectos/:id/parametros`, async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json(parametrosFixture);
      }),
    );
    const { user } = renderConProviders(
      <Routes>
        <Route path="/proyectos/:id/parametros" element={<ParametrosPage />} />
      </Routes>,
      { ruta: "/proyectos/1/parametros" },
    );

    const hm = await screen.findByDisplayValue("5");
    await user.clear(hm);
    await user.type(hm, "7");
    await user.click(screen.getByRole("button", { name: /guardar parámetros/i }));

    await waitFor(() => {
      expect(sentBody).toMatchObject({ porcentajeHerramientaMenor: 0.07 });
    });
  });
});
