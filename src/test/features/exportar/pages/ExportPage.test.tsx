import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderConProviders } from "@/test/render";
import { Route, Routes } from "react-router-dom";
import { useSesionStore } from "@/features/auth/sesion";
import { usuarioFixture } from "@/test/fixtures/auth";
import { ExportPage, ExportPageActiva } from "@/features/exportar/pages/ExportPage";

beforeEach(() => {
  useSesionStore.setState({ usuario: usuarioFixture, cargando: false });
});

async function setup() {
  const result = renderConProviders(
    <Routes>
      <Route path="/proyectos/:id/documentos" element={<ExportPageActiva />} />
    </Routes>,
    { ruta: "/proyectos/1/documentos?v=0198c1a0-0000-7000-8000-000000000011" },
  );
  await waitFor(() => expect(screen.getByText("Exportar")).toBeInTheDocument());
  return { user: result.user };
}

// El backend no tiene ningún endpoint de exportación (plan 027): la ruta real
// muestra ExportPage, que degrada a "todavía no disponible" sin llamar al
// backend (ver más abajo). ExportPageActiva es la implementación completa,
// conservada para reactivarla cuando el endpoint exista: estos tests siguen
// probándola directamente.
describe("ExportPageActiva", () => {
  it("muestra el título y subtítulo", async () => {
    await setup();
    expect(screen.getByText("Exportar")).toBeInTheDocument();
    expect(screen.getByText(/descargue documentos/i)).toBeInTheDocument();
  });

  it("muestra las opciones de exportación", async () => {
    await setup();
    expect(screen.getByText("Presupuesto (PDF)")).toBeInTheDocument();
    expect(screen.getByText("Presupuesto (Excel)")).toBeInTheDocument();
    expect(screen.getByText("APUs")).toBeInTheDocument();
    expect(screen.getByText("Cronograma")).toBeInTheDocument();
  });

  it("deshabilita descargas cuando el presupuesto no es exportable", async () => {
    await setup();
    await waitFor(() => {
      const btns = screen.getAllByRole("button", { name: /descargar/i });
      btns.forEach((btn) => {
        expect(btn).toBeDisabled();
      });
    });
  });

  it("muestra alerta de validación cuando hay problemas", async () => {
    await setup();
    await waitFor(() => {
      expect(screen.getByText(/no puede exportarse/i)).toBeInTheDocument();
    });
  });
});

describe("ExportPage", () => {
  it("explica que el módulo todavía no está disponible, sin pedir la exportación al backend", async () => {
    // MSW está configurado con onUnhandledRequest: "error": si esta pantalla
    // llamara al hook real, el test fallaría por la petición no mockeada.
    renderConProviders(
      <Routes>
        <Route path="/proyectos/:id/documentos" element={<ExportPage />} />
      </Routes>,
      { ruta: "/proyectos/1/documentos?v=0198c1a0-0000-7000-8000-000000000011" },
    );

    expect(screen.getByText("Exportar")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/todavía no está disponible/i)).toBeInTheDocument();
    });
  });
});
