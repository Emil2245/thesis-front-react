import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { Route, Routes, useLocation } from "react-router-dom";
import { WorkspacePage } from "@/features/workspace/pages/WorkspacePage";
import { PRESUPUESTO_V2 } from "@/test/fixtures/presupuesto";
import { renderConProviders } from "@/test/render";

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
