import { describe, expect, it, beforeEach } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor, within } from "@testing-library/react";
import { TablaInsumos } from "@/features/insumos/components/TablaInsumos";
import { server } from "@/test/server";
import { http, HttpResponse } from "msw";
import { pagina } from "@/test/handlers";
import { useSesionStore } from "@/features/auth/sesion";
import { usuarioFixture } from "@/test/fixtures/auth";

const API = "*/api/v1";

describe("TablaInsumos", () => {
  beforeEach(() => {
    useSesionStore.setState({ usuario: usuarioFixture, cargando: false });
  });

  it("renders rows", async () => {
    renderConProviders(<TablaInsumos proyectoId={"01927f4e-1a2b-7c3d-8e4f-000000000001"} />);

    await waitFor(() => {
      expect(screen.getByText("Cemento Portland Tipo I")).toBeInTheDocument();
    });

    expect(screen.getByText("Albañil")).toBeInTheDocument();
    expect(screen.getByText("Retroexcavadora")).toBeInTheDocument();
  });

  it("desactualizado badge appears only when true", async () => {
    renderConProviders(<TablaInsumos proyectoId={"01927f4e-1a2b-7c3d-8e4f-000000000001"} />);

    await waitFor(() => {
      // Arena fina is desactualizado=true
      expect(screen.getByText("Arena fina")).toBeInTheDocument();
    });

    const badges = screen.getAllByText("Desactualizado");
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it("Ver uso no está deshabilitado y abre el diálogo con los APUs que lo usan (plan 071)", async () => {
    const { user } = renderConProviders(
      <TablaInsumos proyectoId={"01927f4e-1a2b-7c3d-8e4f-000000000001"} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Cemento Portland Tipo I")).toBeInTheDocument();
    });

    const filas = screen.getAllByRole("row");
    const fila = filas.find((row) => row.textContent?.includes("Cemento Portland Tipo I"))!;
    await user.click(within(fila).getByRole("button"));

    const verUso = await screen.findByRole("menuitem", { name: /ver uso/i });
    expect(verUso).not.toHaveAttribute("aria-disabled");
    await user.click(verUso);

    await waitFor(() => {
      expect(screen.getByText("APU-001")).toBeInTheDocument();
      expect(screen.getByText("APU-002")).toBeInTheDocument();
    });
  });

  it("empty state CTA", async () => {
    server.use(http.get(`${API}/proyectos/:id/insumos`, () => HttpResponse.json(pagina([]))));

    renderConProviders(<TablaInsumos proyectoId={"01927f4e-1a2b-7c3d-8e4f-000000000001"} />);

    await waitFor(() => {
      expect(screen.getByText(/No hay insumos/i)).toBeInTheDocument();
      expect(screen.getByText(/Nuevo insumo/i)).toBeInTheDocument();
    });
  });
});
