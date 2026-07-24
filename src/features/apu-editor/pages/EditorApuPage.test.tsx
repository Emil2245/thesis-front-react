import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { EditorApuPage } from "./EditorApuPage";

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
});
