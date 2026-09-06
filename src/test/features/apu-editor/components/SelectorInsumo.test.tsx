import { describe, expect, it, vi } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { SelectorInsumo } from "@/features/apu-editor/components/SelectorInsumo";
import { server } from "@/test/server";
import { pagina } from "@/test/handlers";
import { http, HttpResponse } from "msw";

const API = "*/api/v1";

describe("SelectorInsumo", () => {
  const onClose = vi.fn();
  const onSeleccionar = vi.fn();

  it("renders fuente switcher", async () => {
    renderConProviders(
      <SelectorInsumo
        abierto
        onClose={onClose}
        proyectoId={"01927f4e-1a2b-7c3d-8e4f-000000000001"}
        tipo="MATERIAL"
        onSeleccionar={onSeleccionar}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText(/Seleccionar insumo/)).toBeInTheDocument();
    });
  });

  it("renders source indicator for results", async () => {
    renderConProviders(
      <SelectorInsumo
        abierto
        onClose={onClose}
        proyectoId={"01927f4e-1a2b-7c3d-8e4f-000000000001"}
        tipo="MATERIAL"
        onSeleccionar={onSeleccionar}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText("Local")).toBeInTheDocument();
    });
  });

  it("shows CENTRAL source with base name", async () => {
    server.use(
      http.get(`${API}/proyectos/:id/insumos/selector`, () =>
        HttpResponse.json(
          pagina([
            {
              id: "018f8a20-0000-7000-8000-000000000100",
              codigo: "C-001",
              descripcion: "Cemento IESS",
              tipo: "MATERIAL",
              unidad: "kg",
              precioUnitario: 11.2,
              fuente: "CENTRAL",
              baseNombre: "Base IESS 2026",
            },
          ]),
        ),
      ),
    );
    renderConProviders(
      <SelectorInsumo
        abierto
        onClose={onClose}
        proyectoId={"01927f4e-1a2b-7c3d-8e4f-000000000001"}
        tipo="MATERIAL"
        onSeleccionar={onSeleccionar}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText(/Base IESS/)).toBeInTheDocument();
    });
  });

  it("shows local and central search results", async () => {
    renderConProviders(
      <SelectorInsumo
        abierto
        onClose={onClose}
        proyectoId={"01927f4e-1a2b-7c3d-8e4f-000000000001"}
        tipo="MATERIAL"
        onSeleccionar={onSeleccionar}
      />,
    );
    await waitFor(() => {
      const items = screen.getAllByText((c) => c.includes("Cemento"));
      expect(items.length).toBeGreaterThanOrEqual(1);
    });
  });
});
