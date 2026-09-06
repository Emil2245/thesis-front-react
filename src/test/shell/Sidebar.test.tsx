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

  // El gate pasa de granularidad de módulo a granularidad de página: dentro de
  // «admin» conviven una pantalla con backend completo (Bases) y cuatro sin él.
  it("dentro de Admin, Bases ya no está pendiente pero Usuarios sí", () => {
    useSesionStore.setState({ usuario: adminFixture, cargando: false });
    renderConProviders(
      <SidebarProvider>
        <Routes>
          <Route path="/" element={<AppSidebar />} />
        </Routes>
      </SidebarProvider>,
      { ruta: "/" },
    );

    const filaBases = screen.getByText("Bases").closest("a")!;
    expect(within(filaBases).queryByText("pronto")).not.toBeInTheDocument();

    const filaUsuarios = screen.getByText("Usuarios").closest("a")!;
    expect(within(filaUsuarios).getByText("pronto")).toBeInTheDocument();
  });

  // Plan 049: el backend expone /plantillas-proyecto y los dos endpoints de
  // guardar/aplicar, así que la entrada sale de MODULOS_SIN_BACKEND.
  it("Plantillas de proyecto ya no está pendiente", () => {
    useSesionStore.setState({ usuario: usuarioFixture, cargando: false });
    renderConProviders(
      <SidebarProvider>
        <Routes>
          <Route path="/" element={<AppSidebar />} />
        </Routes>
      </SidebarProvider>,
      { ruta: "/" },
    );

    const fila = screen.getByText("Plantillas de proyecto").closest("a")!;
    expect(within(fila).queryByText("pronto")).not.toBeInTheDocument();
  });

  it("Presupuesto, Cronograma, Insumos y Documentos no tienen insignia pendiente", async () => {
    useSesionStore.setState({ usuario: usuarioFixture, cargando: false });
    renderConProviders(
      <SidebarProvider>
        <Routes>
          <Route path="/proyectos/:id" element={<AppSidebar />} />
        </Routes>
      </SidebarProvider>,
      { ruta: "/proyectos/01927f4e-1a2b-7c3d-8e4f-000000000001" },
    );

    const presupuesto = await screen.findByText("Presupuesto");
    const filaPresupuesto = presupuesto.closest("a")!;
    expect(within(filaPresupuesto).queryByText("pronto")).not.toBeInTheDocument();

    const cronograma = await screen.findByText("Cronograma");
    const filaCronograma = cronograma.closest("a")!;
    expect(within(filaCronograma).queryByText("pronto")).not.toBeInTheDocument();

    const insumos = await screen.findByText("Insumos");
    const filaInsumos = insumos.closest("a")!;
    expect(within(filaInsumos).queryByText("pronto")).not.toBeInTheDocument();

    // Plan 051: el backend genera la especificación técnica, así que el módulo
    // deja de estar pendiente aunque solo cubra uno de los cinco entregables.
    const documentos = await screen.findByText("Documentos");
    const filaDocumentos = documentos.closest("a")!;
    expect(within(filaDocumentos).queryByText("pronto")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("APUs")).toBeInTheDocument();
    });
  });
});
