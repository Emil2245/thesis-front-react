import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { SelectorVersion } from "@/shell/SelectorVersion";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";

const API = "*/api/v1";

describe("SelectorVersion", () => {
  it("selecciona la versión vigente por defecto", async () => {
    renderConProviders(
      <Routes>
        <Route path="/proyectos/:id" element={<SelectorVersion />} />
      </Routes>,
      { ruta: "/proyectos/1" },
    );

    await waitFor(() => {
      expect(screen.getByText(/Versión 2/)).toBeInTheDocument();
    });
  });

  it("cambia ?v= al seleccionar otra versión", async () => {
    const { user } = renderConProviders(
      <Routes>
        <Route path="/proyectos/:id" element={<SelectorVersion />} />
      </Routes>,
      { ruta: "/proyectos/1" },
    );

    await waitFor(() => {
      expect(screen.getByText(/Versión 2/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole("combobox", { name: /seleccionar versión/i }));

    const opcion = await screen.findByRole("option", { name: /Versión 1/ });
    await user.click(opcion);

    await waitFor(() => {
      expect(screen.getByText(/Versión 1/)).toBeInTheDocument();
    });
  });

  it("cae a vigente cuando ?v= apunta a ID desconocido", async () => {
    renderConProviders(
      <Routes>
        <Route path="/proyectos/:id" element={<SelectorVersion />} />
      </Routes>,
      { ruta: "/proyectos/1?v=999" },
    );

    await waitFor(() => {
      expect(screen.getByText(/Versión 2/)).toBeInTheDocument();
    });
  });

  it("muestra 'Sin versiones' cuando no hay versiones", async () => {
    server.use(http.get(`${API}/proyectos/:id/presupuestos`, () => HttpResponse.json([])));

    renderConProviders(
      <Routes>
        <Route path="/proyectos/:id" element={<SelectorVersion />} />
      </Routes>,
      { ruta: "/proyectos/1" },
    );

    await waitFor(() => {
      expect(screen.getByText("Sin versiones")).toBeInTheDocument();
    });
  });
});
