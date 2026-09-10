import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
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
        element={<PestanaApu apuId={apuDetalleFixture.id} proyectoId="proyecto-1" />}
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
    renderApu();
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
    expect(screen.getByText("Costo directo (CD)").nextElementSibling).toHaveTextContent("800");
    expect(screen.getByText("Costo indirecto (CI)").nextElementSibling).toHaveTextContent("120");
    expect(screen.getByText("Costo total (CT)").nextElementSibling).toHaveTextContent("920");
    expect(screen.getByText("CI efectivo").nextElementSibling).toHaveTextContent("0.15");
  });

  it("builds the exact editor href and has no mutation controls", async () => {
    const mutation = vi.fn();
    server.use(
      ...(["post", "patch", "put", "delete"] as const).map((method) =>
        http[method](apuUrl, () => {
          mutation();
          return HttpResponse.json({});
        }),
      ),
    );
    renderApu("/proyectos/proyecto-1/workspace?v=7&rubro=rubro-1");
    await screen.findByText("APU-001");
    expect(screen.getByRole("link", { name: "Editar APU completo" })).toHaveAttribute(
      "href",
      `/proyectos/proyecto-1/apus/${apuDetalleFixture.id}?v=7`,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(mutation).not.toHaveBeenCalled();
  });

  it("omits an empty v query", async () => {
    renderApu("/proyectos/proyecto-1/workspace?rubro=rubro-1");
    await expect(
      screen.findByRole("link", { name: "Editar APU completo" }),
    ).resolves.toHaveAttribute("href", `/proyectos/proyecto-1/apus/${apuDetalleFixture.id}`);
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
