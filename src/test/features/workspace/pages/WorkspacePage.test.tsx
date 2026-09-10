import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
import { Route, Routes, useLocation } from "react-router-dom";
import { WorkspacePage } from "@/features/workspace/pages/WorkspacePage";
import { APU_1 } from "@/test/fixtures/apu";
import {
  CAPITULO_1,
  PRESUPUESTO_V2,
  RUBRO_1_1_1,
  presupuestoFixture,
} from "@/test/fixtures/presupuesto";
import { renderConProviders } from "@/test/render";
import { server } from "@/test/server";

describe("WorkspacePage", () => {
  it("mounts with only the project title and active budget id", async () => {
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
    expect(
      await screen.findByText(new RegExp(`Presupuesto ${PRESUPUESTO_V2}`)),
    ).toBeInTheDocument();
    expect(screen.queryByText("Workspace del proyecto")).not.toBeInTheDocument();
    expect(screen.queryByText(/Versión 2/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Ubicación")).toHaveTextContent(`?v=${PRESUPUESTO_V2}`);
    expect(screen.getByRole("searchbox", { name: "Buscar en presupuesto" })).toBeInTheDocument();
  });

  it("opens the add-APU source dialog with a chapter destination", async () => {
    const { user } = renderConProviders(
      <Routes>
        <Route path="/proyectos/:id/workspace" element={<WorkspacePage />} />
      </Routes>,
      { ruta: `/proyectos/01927f4e-1a2b-7c3d-8e4f-000000000001/workspace?v=${PRESUPUESTO_V2}` },
    );

    await screen.findByText("Puente Ambato");
    await user.click(screen.getByRole("button", { name: "Agregar APU" }));

    expect(screen.getByRole("dialog")).toHaveTextContent("Capítulo de destino");
    expect(screen.getByRole("combobox", { name: "Capítulo de destino" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Usar APU existente/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /^Crear APU/ })).toBeEnabled();
  });

  it("routes the source choice to the existing-APU dialog", async () => {
    const { user } = renderConProviders(
      <Routes>
        <Route path="/proyectos/:id/workspace" element={<WorkspacePage />} />
      </Routes>,
      { ruta: `/proyectos/01927f4e-1a2b-7c3d-8e4f-000000000001/workspace?v=${PRESUPUESTO_V2}` },
    );

    await screen.findByText("Puente Ambato");
    await user.click(screen.getByRole("button", { name: "Agregar APU" }));
    await user.click(screen.getByRole("button", { name: /Usar APU existente/ }));

    expect(await screen.findByText("Agregar rubro al presupuesto")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /APU-001/ })).toBeInTheDocument();
  });

  it("links an existing APU using the selected chapter and decimal quantity", async () => {
    let requestBody: unknown;
    let chapterId = "";
    server.use(
      http.post(
        "*/api/v1/presupuestos/:presupuestoId/capitulos/:capituloId/rubros",
        async ({ params, request }) => {
          chapterId = String(params.capituloId);
          requestBody = await request.json();
          return HttpResponse.json(presupuestoFixture, { status: 201 });
        },
      ),
    );

    const { user } = renderConProviders(
      <Routes>
        <Route path="/proyectos/:id/workspace" element={<WorkspacePage />} />
      </Routes>,
      { ruta: `/proyectos/01927f4e-1a2b-7c3d-8e4f-000000000001/workspace?v=${PRESUPUESTO_V2}` },
    );

    await screen.findByText("Puente Ambato");
    await user.click(screen.getByRole("button", { name: "Agregar APU" }));
    await user.click(screen.getByRole("button", { name: /Usar APU existente/ }));
    await user.click(await screen.findByRole("button", { name: /APU-001/ }));
    const quantity = screen.getByLabelText("Cantidad (m3)");
    await user.clear(quantity);
    await user.type(quantity, "2.000000");
    await user.click(screen.getByRole("button", { name: /^Agregar$/ }));

    await waitFor(() => {
      expect(chapterId).toBe(CAPITULO_1);
      expect(requestBody).toEqual({ apuId: APU_1, cantidad: "2.000000" });
    });
  });

  it("routes the source choice to the manual-or-template APU dialog", async () => {
    const { user } = renderConProviders(
      <Routes>
        <Route path="/proyectos/:id/workspace" element={<WorkspacePage />} />
      </Routes>,
      { ruta: `/proyectos/01927f4e-1a2b-7c3d-8e4f-000000000001/workspace?v=${PRESUPUESTO_V2}` },
    );

    await screen.findByText("Puente Ambato");
    await user.click(screen.getByRole("button", { name: "Agregar APU" }));
    await user.click(screen.getByRole("button", { name: /^Crear APU/ }));

    expect(await screen.findByText("Nuevo APU")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Desde cero" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Desde plantilla" })).toBeInTheDocument();
  });

  it("resolves a nested selected rubro to its APU", async () => {
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
