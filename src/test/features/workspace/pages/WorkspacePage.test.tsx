import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor, within } from "@testing-library/react";
import { Route, Routes, useLocation } from "react-router-dom";
import { WorkspacePage } from "@/features/workspace/pages/WorkspacePage";
import { APU_1, PLANTILLA_APU_1, apuDetalleFixture } from "@/test/fixtures/apu";
import { insumosFixture } from "@/test/fixtures/insumos";
import {
  CAPITULO_1_1,
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

  it("opens with the initial plantilla search, filters, detail and contextual destination", async () => {
    let searchUrl: URL | undefined;
    server.use(
      http.get("*/api/v1/plantillas-apu/busqueda", ({ request }) => {
        searchUrl = new URL(request.url);
        return HttpResponse.json({
          items: [
            {
              id: PLANTILLA_APU_1,
              nombre: "Excavación típica",
              descripcionRubro: "Plantilla base para excavaciones",
              unidad: "m3",
              tipo: "SISTEMA",
              createdAt: "2026-07-01T00:00:00",
              updatedAt: "2026-07-01T00:00:00",
            },
          ],
          total: 1,
          page: 0,
          size: 20,
          totalPaginas: 1,
        });
      }),
    );
    const { user } = renderConProviders(
      <Routes>
        <Route path="/proyectos/:id/workspace" element={<WorkspacePage />} />
      </Routes>,
      {
        ruta: `/proyectos/01927f4e-1a2b-7c3d-8e4f-000000000001/workspace?v=${PRESUPUESTO_V2}&rubro=${RUBRO_1_1_1}`,
      },
    );

    await screen.findByText("Puente Ambato");
    await user.click(screen.getByRole("button", { name: "Agregar APU" }));

    expect(await screen.findByRole("option", { name: /Excavación típica/ })).toBeInTheDocument();
    expect(searchUrl?.searchParams.getAll("tipo")).toEqual(["SISTEMA", "PERSONAL"]);
    expect(searchUrl?.searchParams.get("page")).toBe("0");
    expect(searchUrl?.searchParams.get("size")).toBe("20");
    expect(screen.getByRole("checkbox", { name: "Incluir plantillas del sistema" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Incluir plantillas personales" })).toBeChecked();
    expect(screen.getByRole("combobox", { name: "Capítulo de destino" })).toHaveTextContent(
      "1.1 · Instalación de campamento",
    );

    await user.click(screen.getByRole("option", { name: /Excavación típica/ }));
    expect(await screen.findByRole("heading", { name: "Excavación típica" })).toBeInTheDocument();
    expect(screen.queryByText("Agregar rubro al presupuesto")).not.toBeInTheDocument();
    expect(screen.queryByText("Nuevo APU")).not.toBeInTheDocument();
  });

  it("adds a simple active plantilla with one exact atomic POST and preserves the URL", async () => {
    let posts = 0;
    let body: unknown;
    server.use(
      http.post(
        "*/api/v1/presupuestos/:presupuestoId/rubros/desde-plantillas",
        async ({ request }) => {
          posts += 1;
          body = await request.json();
          return HttpResponse.json(
            {
              presupuesto: presupuestoFixture,
              resultados: [
                {
                  plantillaId: PLANTILLA_APU_1,
                  plantillaNombre: "Excavación típica",
                  apuId: APU_1,
                  codigo: "APU-001",
                  advertencias: [],
                },
              ],
            },
            { status: 201 },
          );
        },
      ),
    );
    function LocationProbe() {
      return <output aria-label="Ubicación">{useLocation().search}</output>;
    }
    const ruta = `/proyectos/01927f4e-1a2b-7c3d-8e4f-000000000001/workspace?v=${PRESUPUESTO_V2}&rubro=${RUBRO_1_1_1}`;
    const { user } = renderConProviders(
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
      { ruta },
    );

    await screen.findByText("Puente Ambato");
    const trigger = screen.getByRole("button", { name: "Agregar APU" });
    await user.click(trigger);
    await user.click(await screen.findByRole("option", { name: /Excavación típica/ }));
    expect(
      screen.getByRole("checkbox", { name: "Seleccionar Excavación típica" }),
    ).not.toBeChecked();
    await user.click(screen.getByRole("button", { name: "Agregar plantillas" }));

    await waitFor(() => expect(posts).toBe(1));
    expect(body).toEqual({ capituloId: CAPITULO_1_1, plantillaIds: [PLANTILLA_APU_1] });
    expect(screen.getByLabelText("Ubicación")).toHaveTextContent(
      `?v=${PRESUPUESTO_V2}&rubro=${RUBRO_1_1_1}`,
    );
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("mounts the complete manual form and closes after creating one row", async () => {
    let body: unknown;
    server.use(
      http.post("*/api/v1/presupuestos/:id/apus/completo", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          { apu: apuDetalleFixture, presupuesto: presupuestoFixture },
          { status: 201 },
        );
      }),
    );
    const { user } = renderConProviders(
      <Routes>
        <Route path="/proyectos/:id/workspace" element={<WorkspacePage />} />
      </Routes>,
      { ruta: `/proyectos/01927f4e-1a2b-7c3d-8e4f-000000000001/workspace?v=${PRESUPUESTO_V2}` },
    );

    await screen.findByText("Puente Ambato");
    const trigger = screen.getByRole("button", { name: "Agregar APU" });
    await user.click(trigger);
    await user.click(await screen.findByRole("button", { name: "Crear manualmente" }));

    expect(screen.getByRole("dialog", { name: "Agregar APU" })).toBeInTheDocument();
    expect(await screen.findByLabelText("Código")).toBeDisabled();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    await user.type(screen.getByLabelText("Descripción"), "Adoquín manual");
    await user.type(screen.getByLabelText("Unidad"), "m2");
    const materiales = screen.getByRole("region", { name: "MATERIAL" });
    await user.click(within(materiales).getByRole("button", { name: "Agregar insumo" }));
    await user.click(await screen.findByRole("button", { name: /M-001 — Cemento Portland/ }));
    await user.click(screen.getByRole("button", { name: "Crear APU" }));

    await waitFor(() =>
      expect(body).toEqual({
        descripcion: "Adoquín manual",
        unidad: "m2",
        detalles: [
          {
            seccionTipo: "MATERIAL",
            insumoId: insumosFixture[0].id,
            cantidad: "1.000000",
          },
        ],
      }),
    );
    expect(screen.queryByRole("dialog", { name: "Agregar APU" })).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("returns from manual mode and restores focus after Cancel or Escape", async () => {
    const { user } = renderConProviders(
      <Routes>
        <Route path="/proyectos/:id/workspace" element={<WorkspacePage />} />
      </Routes>,
      { ruta: `/proyectos/01927f4e-1a2b-7c3d-8e4f-000000000001/workspace?v=${PRESUPUESTO_V2}` },
    );

    await screen.findByText("Puente Ambato");
    const trigger = screen.getByRole("button", { name: "Agregar APU" });
    await user.click(trigger);
    await user.click(await screen.findByRole("button", { name: "Crear manualmente" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByRole("searchbox", { name: "Buscar plantillas" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(trigger).toHaveFocus());

    await user.click(trigger);
    await screen.findByRole("searchbox", { name: "Buscar plantillas" });
    await user.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
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
