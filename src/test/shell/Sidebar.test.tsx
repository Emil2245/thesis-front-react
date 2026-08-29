import { describe, expect, it, beforeEach } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/shell/Sidebar";
import { useSesionStore } from "@/features/auth/sesion";
import { usuarioFixture, adminFixture } from "@/test/fixtures/auth";

describe("AppSidebar", () => {
  beforeEach(() => {
    useSesionStore.setState({ usuario: null, cargando: false });
  });

  it("oculta la sección Admin para USUARIO", () => {
    useSesionStore.setState({ usuario: usuarioFixture, cargando: false });
    renderConProviders(
      <SidebarProvider>
        <Routes>
          <Route path="/" element={<AppSidebar />} />
        </Routes>
      </SidebarProvider>,
      { ruta: "/" },
    );
    expect(screen.queryByText("Usuarios")).not.toBeInTheDocument();
  });

  it("muestra la sección Admin para SUPER_ADMIN", () => {
    useSesionStore.setState({ usuario: adminFixture, cargando: false });
    renderConProviders(
      <SidebarProvider>
        <Routes>
          <Route path="/" element={<AppSidebar />} />
        </Routes>
      </SidebarProvider>,
      { ruta: "/" },
    );
    expect(screen.getByText("Usuarios")).toBeInTheDocument();
  });

  it("marca Presupuesto como pendiente y deja Cronograma e Insumos sin insignia", async () => {
    useSesionStore.setState({ usuario: usuarioFixture, cargando: false });
    renderConProviders(
      <SidebarProvider>
        <Routes>
          <Route path="/proyectos/:id" element={<AppSidebar />} />
        </Routes>
      </SidebarProvider>,
      { ruta: "/proyectos/1" },
    );

    const presupuesto = await screen.findByText("Presupuesto");
    const filaPresupuesto = presupuesto.closest("a")!;
    expect(within(filaPresupuesto).getByText("pronto")).toBeInTheDocument();

    const cronograma = await screen.findByText("Cronograma");
    const filaCronograma = cronograma.closest("a")!;
    expect(within(filaCronograma).queryByText("pronto")).not.toBeInTheDocument();

    const insumos = await screen.findByText("Insumos");
    const filaInsumos = insumos.closest("a")!;
    expect(within(filaInsumos).queryByText("pronto")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("APUs")).toBeInTheDocument();
    });
  });
});
