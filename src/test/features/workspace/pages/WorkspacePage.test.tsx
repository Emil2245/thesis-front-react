import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { screen } from "@testing-library/react";
import { Route, Routes, useLocation } from "react-router-dom";
import { WorkspacePage } from "@/features/workspace/pages/WorkspacePage";
import { apuDetalleFixture } from "@/test/fixtures/apu";
import { PRESUPUESTO_V2, RUBRO_1_1_1 } from "@/test/fixtures/presupuesto";
import { renderConProviders } from "@/test/render";
import { server } from "@/test/server";

describe("WorkspacePage", () => {
  it("mounts on the authenticated route shape and preserves the selected version", async () => {
    function LocationProbe() {
      return <output aria-label="Ubicación">{useLocation().search}</output>;
    }

    renderConProviders(
      <Routes>
        <Route
          path="/proyectos/:id/workspace"
          element={
            <>
              <WorkspacePage />
              <LocationProbe />
            </>
          }
        />
      </Routes>,
      { ruta: `/proyectos/01927f4e-1a2b-7c3d-8e4f-000000000001/workspace?v=${PRESUPUESTO_V2}` },
    );

    expect(await screen.findByText("Puente Ambato")).toBeInTheDocument();
    expect(await screen.findByText(/Versión 2/)).toBeInTheDocument();
    expect(screen.getByText("Workspace del proyecto")).toBeInTheDocument();
    expect(screen.getByLabelText("Ubicación")).toHaveTextContent(`?v=${PRESUPUESTO_V2}`);
  });

  it("resolves a nested selected rubro to its APU endpoint by apuId", async () => {
    let observedPath = "";
    server.use(
      http.get("*/api/v1/apus/:id", ({ request }) => {
        observedPath = new URL(request.url).pathname;
        return HttpResponse.json(apuDetalleFixture);
      }),
    );
    renderConProviders(
      <Routes>
        <Route path="/proyectos/:id/workspace" element={<WorkspacePage />} />
      </Routes>,
      {
        ruta: `/proyectos/01927f4e-1a2b-7c3d-8e4f-000000000001/workspace?v=${PRESUPUESTO_V2}&rubro=${RUBRO_1_1_1}`,
      },
    );

    expect(await screen.findByText("APU-001")).toBeInTheDocument();
    expect(screen.getByText("Equipo")).toBeInTheDocument();
    expect(observedPath).toBe(`/api/v1/apus/${apuDetalleFixture.id}`);
  });

  it("shows an accessible loading state while the project is pending", () => {
    renderConProviders(
      <Routes>
        <Route path="/proyectos/:id/workspace" element={<WorkspacePage />} />
      </Routes>,
      { ruta: "/proyectos/proyecto-inexistente/workspace" },
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
