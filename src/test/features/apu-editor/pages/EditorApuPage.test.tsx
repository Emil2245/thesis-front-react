import { asDecimal } from "@/lib/decimal";
import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import { EditorApuPage } from "@/features/apu-editor/pages/EditorApuPage";

const API = "*/api/v1";

function renderEditor() {
  return renderConProviders(
    <Routes>
      <Route path="/proyectos/:id/apus/:apuId" element={<EditorApuPage />} />
    </Routes>,
    {
      ruta: "/proyectos/01927f4e-1a2b-7c3d-8e4f-000000000001/apus/018f8a40-0000-7000-8000-000000000001",
    },
  );
}

describe("EditorApuPage", () => {
  it("renders section headers", async () => {
    renderEditor();
    await waitFor(() => {
      const equipoHeaders = screen.getAllByText((c) => c.includes("Equipo"));
      expect(equipoHeaders.length).toBeGreaterThanOrEqual(1);
      const manoObraHeaders = screen.getAllByText((c) => c.includes("Mano de obra"));
      expect(manoObraHeaders.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("HM row is displayed", async () => {
    renderEditor();
    await waitFor(() => {
      expect(screen.getByText((c) => c.includes("Herramienta Menor"))).toBeInTheDocument();
    });
  });

  it("footer renders CD, CI, CT labels from fixture", async () => {
    renderEditor();
    await waitFor(() => {
      expect(screen.getByText("Costo Directo")).toBeInTheDocument();
      expect(screen.getByText("Costo Indirecto")).toBeInTheDocument();
      expect(screen.getByText("Costo Total")).toBeInTheDocument();
    });
  });

  // Plan 052 rebanada 2: `POST /apus/{apuId}/guardar-plantilla` existe en
  // origin/main y el diálogo estaba construido; solo faltaba quitar el gate.
  it("Guardar como plantilla está habilitado y abre el diálogo", async () => {
    const { user } = renderEditor();

    const boton = await screen.findByRole("button", { name: /Guardar como plantilla/ });
    expect(boton).toBeEnabled();

    await user.click(boton);
    expect(await screen.findByLabelText(/Nombre/)).toBeInTheDocument();
  });

  it("usa la versión vigente cuando la URL no trae ?v=", async () => {
    let peticionVersiones: string | null = null;
    server.use(
      http.get(`${API}/proyectos/:id/presupuestos`, ({ request }) => {
        peticionVersiones = new URL(request.url).pathname;
        return HttpResponse.json([
          {
            presupuestoId: "0198c1a0-0000-7000-8000-000000000010",
            version: 1,
            esVigente: false,
            notas: "Primera versión",
            totalGeneral: asDecimal("1000.000000"),
            fechaCreacion: "2026-02-01T00:00:00",
          },
          {
            presupuestoId: "0198c1a0-0000-7000-8000-000000000011",
            version: 2,
            esVigente: true,
            notas: "Segunda versión",
            totalGeneral: asDecimal("1200.000000"),
            fechaCreacion: "2026-03-01T00:00:00",
          },
        ]);
      }),
    );

    renderEditor();
    await waitFor(() => {
      expect(screen.getAllByText((c) => c.includes("Mano de obra")).length).toBeGreaterThanOrEqual(
        1,
      );
    });

    // El editor resuelve la versión activa del selector (vigente = 11), no del
    // parámetro de ruta; sin versiones no habría presupuesto que invalidar.
    expect(peticionVersiones).toBe(
      "/api/v1/proyectos/01927f4e-1a2b-7c3d-8e4f-000000000001/presupuestos",
    );
  });
});
