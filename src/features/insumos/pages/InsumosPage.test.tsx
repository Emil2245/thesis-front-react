import { describe, expect, it, beforeEach } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { InsumosPage } from "./InsumosPage";
import { useSesionStore } from "@/features/auth/sesion";
import { usuarioFixture } from "@/test/fixtures/auth";

describe("InsumosPage", () => {
  beforeEach(() => {
    useSesionStore.setState({ usuario: usuarioFixture, cargando: false });
  });

  it("renders the page with insumos table", async () => {
    renderConProviders(
      <Routes>
        <Route path="/proyectos/:id/insumos" element={<InsumosPage />} />
      </Routes>,
      { ruta: "/proyectos/1/insumos" },
    );

    await waitFor(() => {
      expect(screen.getByText("Insumos")).toBeInTheDocument();
      expect(screen.getByText("Insumos del proyecto")).toBeInTheDocument();
    });
  });

  it("tabs switch between project insumos and central bases", async () => {
    const user = userEvent.setup();
    renderConProviders(
      <Routes>
        <Route path="/proyectos/:id/insumos" element={<InsumosPage />} />
      </Routes>,
      { ruta: "/proyectos/1/insumos" },
    );

    await waitFor(() => {
      expect(screen.getByText("Bases centrales")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("tab", { name: "Bases centrales" }));

    await waitFor(() => {
      expect(screen.getByText("93 insumos")).toBeInTheDocument();
      expect(screen.getByText("Base IESS 2026")).toBeInTheDocument();
    });
  });
});
