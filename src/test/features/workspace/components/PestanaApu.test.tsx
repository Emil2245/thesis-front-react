import { describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { Route, Routes } from "react-router-dom";
import { PestanaApu } from "@/features/workspace/components/PestanaApu";
import { apuDetalleFixture } from "@/test/fixtures/apu";
import { renderConProviders } from "@/test/render";
import { server } from "@/test/server";

const apuUrl = "*/api/v1/apus/:id";
const renderApu = (ruta = "/proyectos/proyecto-1/workspace") =>
  renderConProviders(
    <Routes>
      <Route
        path="/proyectos/:id/workspace"
        element={
          <PestanaApu
            apuId={apuDetalleFixture.id}
            proyectoId="proyecto-1"
            presupuestoId="presupuesto-1"
          />
        }
      />
    </Routes>,
    { ruta },
  );

describe("PestanaApu", () => {
  it("does not request without a selection", async () => {
    let requests = 0;
    server.use(
      http.get(apuUrl, () => {
        requests += 1;
        return HttpResponse.json(apuDetalleFixture);
      }),
    );
    renderConProviders(<PestanaApu apuId={null} proyectoId="proyecto-1" />);
    expect(screen.getByText("Selecciona un rubro")).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(requests).toBe(0);
  });

  it("exposes an accessible loading status", async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get(apuUrl, async () => {
        await pending;
        return HttpResponse.json(apuDetalleFixture);
      }),
    );
    renderApu();
    expect(screen.getByRole("status")).toHaveTextContent("Cargando APU");
    release();
    expect(await screen.findByText("APU-001")).toBeInTheDocument();
  });

  it("renders the complete read-only fixture in server order", async () => {
    const { user } = renderApu();
    expect(await screen.findByText("APU-001")).toBeInTheDocument();
    expect(screen.getByText("Excavación a máquina")).toBeInTheDocument();
    expect(screen.getByText("Unidad: m3")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Equipo",
      "Mano de obra",
    ]);
    expect(screen.getByText("Retroexcavadora")).toBeInTheDocument();
    expect(screen.getAllByText("h")).not.toHaveLength(0);
    expect(screen.getAllByText("1")).not.toHaveLength(0);
    expect(screen.getByText("0.05")).toBeInTheDocument();
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByText("400")).toBeInTheDocument();
    expect(screen.getByText("Subtotal: 400")).toBeInTheDocument();
    expect(screen.getByText("CD").closest("div")).toHaveTextContent("800");
    expect(screen.getByText("CI").closest("div")).toHaveTextContent("120");
    expect(screen.getByText("CT").closest("div")).toHaveTextContent("920");
    expect(screen.getByText("CI ef.").closest("div")).toHaveTextContent("0.15");
    expect(screen.getByText("CD").closest("dl")).toHaveClass("shrink-0", "flex-wrap");
    await user.hover(screen.getByText("CD"));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Costo directo");
    expect(screen.getByText("APU-001").closest("header")?.parentElement).toHaveClass(
      "flex-1",
      "overflow-auto",
    );
  });

  it("opens the shared editor without navigation and refreshes the workspace header", async () => {
    let stored = apuDetalleFixture;
    const patch = vi.fn();
    const cellPatch = vi.fn();
    let releaseSave!: () => void;
    const saving = new Promise<void>((resolve) => {
      releaseSave = resolve;
    });
    server.use(
      http.get(apuUrl, () => HttpResponse.json(stored)),
      http.patch(apuUrl, async ({ request }) => {
        const body = await request.json();
        expect(body).toEqual({ codigo: "APU-001", descripcion: "Updated APU", unidad: "m3" });
        patch(body);
        stored = { ...stored, descripcion: "Updated APU" };
        return HttpResponse.json(stored);
      }),
      http.patch("*/api/v1/apus/:id/detalles/:detalleId", async ({ request, params }) => {
        expect(params.detalleId).toBe(stored.secciones[0].detalles[0].id);
        const body = await request.json();
        expect(body).toEqual({ cantidad: "3" });
        cellPatch(body);
        await saving;
        stored = {
          ...stored,
          secciones: stored.secciones.map((section, index) =>
            index === 0
              ? {
                  ...section,
                  detalles: section.detalles.map((detail, detailIndex) =>
                    detailIndex === 0 ? { ...detail, cantidad: 3, costo: 987.654321 } : detail,
                  ),
                }
              : section,
          ),
        };
        return HttpResponse.json(stored);
      }),
    );
    const { user } = renderApu("/proyectos/proyecto-1/workspace?v=7&rubro=rubro-1");
    await user.click(await screen.findByRole("button", { name: "Editar APU completo" }));
    const dialog = await screen.findByRole("dialog", { name: "Editar APU" });
    await user.click(await within(dialog).findByRole("button", { name: "Editar encabezado" }));
    const description = within(dialog).getByLabelText("Descripción");
    await user.clear(description);
    await user.type(description, "Updated APU");
    await user.click(within(dialog).getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(patch).toHaveBeenCalledOnce());
    expect(screen.getByRole("dialog", { name: "Editar APU" })).toBe(dialog);
    const row = within(dialog).getByRole("row", { name: /Retroexcavadora/ });
    await user.click(within(row).getByRole("button", { name: "Editar valor 1" }));
    const quantity = within(row).getByRole("textbox");
    await user.clear(quantity);
    await user.type(quantity, "3{Enter}");
    await waitFor(() => expect(cellPatch).toHaveBeenCalledOnce());
    expect(within(dialog).getByRole("button", { name: "Cerrar" })).toBeDisabled();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog", { name: "Editar APU" })).toBe(dialog);
    releaseSave();
    await waitFor(() =>
      expect(within(dialog).getByRole("button", { name: "Cerrar" })).toBeEnabled(),
    );
    await user.click(within(dialog).getByRole("button", { name: "Cerrar" }));
    expect(await screen.findByText("Updated APU")).toBeInTheDocument();
    expect(await screen.findByText("987.654321")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("protects an unsaved header draft on close", async () => {
    const { user } = renderApu();
    await user.click(await screen.findByRole("button", { name: "Editar APU completo" }));
    const dialog = await screen.findByRole("dialog", { name: "Editar APU" });
    await user.click(await within(dialog).findByRole("button", { name: "Editar encabezado" }));
    await user.type(within(dialog).getByLabelText("Descripción"), " draft");
    await user.keyboard("{Escape}");
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Seguir editando" }));
    expect(within(dialog).getByLabelText("Descripción")).toHaveValue("Excavación a máquina draft");
  });

  it("loads the server specification and protects its draft", async () => {
    server.use(
      http.get("*/api/v1/apus/:id/especificacion-tecnica", () =>
        HttpResponse.json({ apuId: apuDetalleFixture.id, contenido: "Existing specification" }),
      ),
    );
    const { user } = renderApu();
    await user.click(await screen.findByRole("button", { name: "Editar APU completo" }));
    const dialog = await screen.findByRole("dialog", { name: "Editar APU" });
    const toggle = await within(dialog).findByRole("button", { name: "Especificación técnica" });
    if (!within(dialog).queryByRole("textbox", { name: "Especificación técnica" })) {
      await user.click(toggle);
    }
    const specification = within(dialog).getByRole("textbox", { name: "Especificación técnica" });
    await waitFor(() => expect(specification).toHaveValue("Existing specification"));
    await user.type(specification, " draft");
    await user.click(within(dialog).getByRole("button", { name: "Cerrar" }));
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Seguir editando" }));
    expect(specification).toHaveValue("Existing specification draft");
  });

  it.each([
    ["Agregar insumo a Equipo", "Seleccionar insumo"],
    ["Guardar como plantilla", "Guardar como plantilla"],
    ["Desglose", "Desglose de cálculo"],
  ])("restores keyboard focus after closing nested %s", async (triggerName, dialogName) => {
    const { user } = renderApu();
    await user.click(await screen.findByRole("button", { name: "Editar APU completo" }));
    const editor = await screen.findByRole("dialog", { name: "Editar APU" });
    const trigger = await within(editor).findByRole("button", { name: triggerName });
    await user.click(trigger);
    expect(await screen.findByRole("dialog", { name: dialogName })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: dialogName })).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.getByRole("dialog", { name: "Editar APU" })).toBe(editor);
  });

  it("shows an empty state for an APU without sections", async () => {
    server.use(http.get(apuUrl, () => HttpResponse.json({ ...apuDetalleFixture, secciones: [] })));
    renderApu();
    expect(await screen.findByText("APU sin secciones")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not render the first delayed response after selecting a second APU", async () => {
    let releaseFirst!: () => void;
    const first = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    server.use(
      http.get(apuUrl, async ({ params }) => {
        if (params.id === apuDetalleFixture.id) {
          await first;
          return HttpResponse.json(apuDetalleFixture);
        }
        return HttpResponse.json({ ...apuDetalleFixture, id: "apu-2", codigo: "APU-002" });
      }),
    );
    const view = renderConProviders(
      <PestanaApu
        apuId={apuDetalleFixture.id}
        proyectoId="proyecto-1"
        presupuestoId="presupuesto-1"
      />,
    );
    view.rerender(
      <PestanaApu apuId="apu-2" proyectoId="proyecto-1" presupuestoId="presupuesto-1" />,
    );
    expect(await screen.findByText("APU-002")).toBeInTheDocument();
    releaseFirst();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText("APU-001")).not.toBeInTheDocument();
  });

  it.each([401, 403, 404, 500])("distinguishes HTTP %s errors", async (status) => {
    server.use(
      http.get(apuUrl, () => HttpResponse.json({ codigo: "error", mensaje: "fallo" }, { status })),
    );
    renderApu();
    expect(await screen.findByRole("alert")).toHaveTextContent(`Error ${status}`);
  });

  it("uses the current budget scope instead of another budget cache", async () => {
    let requests = 0;
    server.use(
      http.get(apuUrl, () => {
        requests += 1;
        return HttpResponse.json({ ...apuDetalleFixture, codigo: `APU-${requests}` });
      }),
    );
    const view = renderConProviders(
      <PestanaApu
        apuId={apuDetalleFixture.id}
        proyectoId="proyecto-1"
        presupuestoId="presupuesto-1"
      />,
    );
    expect(await screen.findByText("APU-1")).toBeInTheDocument();
    view.rerender(
      <PestanaApu
        apuId={apuDetalleFixture.id}
        proyectoId="proyecto-1"
        presupuestoId="presupuesto-2"
      />,
    );
    expect(await screen.findByText("APU-2")).toBeInTheDocument();
    expect(requests).toBe(2);
  });

  it("shows an error and retries successfully", async () => {
    let requests = 0;
    server.use(
      http.get(apuUrl, () => {
        requests += 1;
        return requests === 1
          ? HttpResponse.json({ error: "no" }, { status: 500 })
          : HttpResponse.json(apuDetalleFixture);
      }),
    );
    const { user } = renderApu();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("APU-001")).toBeInTheDocument();
    await waitFor(() => expect(requests).toBe(2));
  });
});
