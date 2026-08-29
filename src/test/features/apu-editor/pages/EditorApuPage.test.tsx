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
    { ruta: "/proyectos/1/apus/1" },
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

  it("usa la versión vigente cuando la URL no trae ?v=", async () => {
    let peticionVersiones: string | null = null;
    server.use(
      http.get(`${API}/proyectos/:id/presupuestos`, ({ request }) => {
        peticionVersiones = new URL(request.url).pathname;
        return HttpResponse.json([
          {
            id: 10,
            numero: 1,
            notas: "Primera versión",
            vigente: false,
            totalGeneral: "1000.000000" as never,
            fechaCreacion: "2026-02-01T00:00:00",
          },
          {
            id: 11,
            numero: 2,
            notas: "Segunda versión",
            vigente: true,
            totalGeneral: "1200.000000" as never,
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
    expect(peticionVersiones).toBe("/api/v1/proyectos/1/presupuestos");
  });
});
