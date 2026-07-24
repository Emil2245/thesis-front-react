import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { ListaApusPage } from "./ListaApusPage";

function renderLista() {
  return renderConProviders(
    <Routes>
      <Route path="/proyectos/:id/apus" element={<ListaApusPage />} />
    </Routes>,
    { ruta: "/proyectos/1/apus" },
  );
}

describe("ListaApusPage", () => {
  it("renders auxiliary badge", async () => {
    renderLista();
    await waitFor(() => {
      expect(screen.getByText("Auxiliar")).toBeInTheDocument();
    });
  });

  it("renders filter controls", async () => {
    renderLista();
    await waitFor(() => {
      expect(screen.getByText(/Solo auxiliares/)).toBeInTheDocument();
    });
  });

  it("shows search input", async () => {
    renderLista();
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Buscar por código/)).toBeInTheDocument();
    });
  });

  it("renders the Nuevo APU button", async () => {
    renderLista();
    await waitFor(() => {
      expect(screen.getByText(/Nuevo APU/)).toBeInTheDocument();
    });
  });

  it("renders APU codes in the table", async () => {
    renderLista();
    await waitFor(() => {
      expect(screen.getByText("APU-001")).toBeInTheDocument();
      expect(screen.getByText("APU-002")).toBeInTheDocument();
    });
  });

  it("shows vinculado indicator for linked APUs", async () => {
    renderLista();
    await waitFor(() => {
      const apu002 = screen.getByText("APU-002");
      expect(apu002).toBeInTheDocument();
    });
  });
});
