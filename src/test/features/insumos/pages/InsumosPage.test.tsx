import { describe, expect, it, beforeEach } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { InsumosPage } from "@/features/insumos/pages/InsumosPage";
import { useSesionStore } from "@/features/auth/sesion";
import { usuarioFixture } from "@/test/fixtures/auth";
import { insumosFixture } from "@/test/fixtures/insumos";

describe("InsumosPage", () => {
  beforeEach(() => {
    useSesionStore.setState({ usuario: usuarioFixture, cargando: false });
  });

  // bugs-pendientes §5: la pantalla del proyecto muestra sólo sus insumos; las
  // bases de sistema y personales viven en la sección global `/insumos`.
  it("muestra sólo los insumos del proyecto, sin pestaña de bases centrales", async () => {
    renderConProviders(
      <Routes>
        <Route path="/proyectos/:id/insumos" element={<InsumosPage />} />
      </Routes>,
      { ruta: "/proyectos/01927f4e-1a2b-7c3d-8e4f-000000000001/insumos" },
    );

    expect(
      await screen.findByRole("heading", { name: "Insumos del proyecto" }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(insumosFixture[0].descripcion)).toBeInTheDocument();
    });
    expect(screen.queryByRole("tab", { name: "Bases centrales" })).not.toBeInTheDocument();
    // La puerta para poblar el catálogo sigue aquí.
    expect(screen.getByRole("button", { name: /Copiar base/ })).toBeInTheDocument();
  });
});
