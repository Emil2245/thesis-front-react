import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import { apuResumenFixture } from "@/test/fixtures/apu";
import { ListaApusPage } from "@/features/apu-editor/pages/ListaApusPage";

const API = "*/api/v1";

function renderLista(ruta = "/proyectos/1/apus") {
  return renderConProviders(
    <Routes>
      <Route path="/proyectos/:id/apus" element={<ListaApusPage />} />
    </Routes>,
    { ruta },
  );
}

describe("ListaApusPage", () => {
  it("shows search input", async () => {
    renderLista();
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Buscar por código/)).toBeInTheDocument();
    });
  });

  it("renders the Nuevo APU button", async () => {
    renderLista();
    await waitFor(() => {
      expect(screen.getByText(/Nuevo APU/)).toBeInTheDocument();
    });
  });

  it("renders APU codes in the table", async () => {
    renderLista();
    await waitFor(() => {
      expect(screen.getByText("APU-001")).toBeInTheDocument();
      expect(screen.getByText("APU-002")).toBeInTheDocument();
    });
  });

  it("shows vinculado indicator for linked APUs", async () => {
    renderLista();
    await waitFor(() => {
      const apu002 = screen.getByText("APU-002");
      expect(apu002).toBeInTheDocument();
    });
  });

  it("usa la versión vigente cuando la URL no trae ?v=", async () => {
    const pedidos: string[] = [];
    server.use(
      http.get(`${API}/presupuestos/:id/apus`, ({ request }) => {
        pedidos.push(new URL(request.url).pathname);
        return HttpResponse.json({
          contenido: apuResumenFixture,
          total: apuResumenFixture.length,
          pagina: 0,
          tamano: 20,
        });
      }),
    );

    renderLista();
    await waitFor(() => {
      expect(screen.getByText("APU-001")).toBeInTheDocument();
    });

    // PRESUPUESTO_V2 es la versión vigente en versionesStub, no el id del proyecto.
    expect(pedidos).toContain("/api/v1/presupuestos/0198c1a0-0000-7000-8000-000000000011/apus");
  });

  it("respeta ?v= a una versión que no es la vigente", async () => {
    const pedidos: string[] = [];
    server.use(
      http.get(`${API}/presupuestos/:id/apus`, ({ request }) => {
        pedidos.push(new URL(request.url).pathname);
        return HttpResponse.json({
          contenido: apuResumenFixture,
          total: apuResumenFixture.length,
          pagina: 0,
          tamano: 20,
        });
      }),
    );

    renderLista("/proyectos/1/apus?v=0198c1a0-0000-7000-8000-000000000010");
    await waitFor(() => {
      expect(screen.getByText("APU-001")).toBeInTheDocument();
    });

    expect(pedidos).toContain("/api/v1/presupuestos/0198c1a0-0000-7000-8000-000000000010/apus");
  });

  it("muestra el estado vacío cuando el proyecto no tiene versiones", async () => {
    const pedidos: string[] = [];
    server.use(
      http.get(`${API}/proyectos/:id/presupuestos`, () => HttpResponse.json([])),
      http.get(`${API}/presupuestos/:id/apus`, ({ request }) => {
        pedidos.push(new URL(request.url).pathname);
        return HttpResponse.json({
          contenido: apuResumenFixture,
          total: apuResumenFixture.length,
          pagina: 0,
          tamano: 20,
        });
      }),
    );

    renderLista();

    await waitFor(() => {
      expect(screen.getByText("Sin versión seleccionada")).toBeInTheDocument();
    });
    expect(screen.queryByText("APU-001")).not.toBeInTheDocument();
    expect(pedidos).toEqual([]);
  });
});
