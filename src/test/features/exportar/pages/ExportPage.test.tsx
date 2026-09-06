import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { renderConProviders } from "@/test/render";
import { server } from "@/test/server";
import { espiar, ultima } from "@/test/espia";
import { Route, Routes } from "react-router-dom";
import { useSesionStore } from "@/features/auth/sesion";
import { usuarioFixture } from "@/test/fixtures/auth";
import { validacionFixture } from "@/test/fixtures/presupuesto";
import { ExportPage } from "@/features/exportar/pages/ExportPage";

const API = "*/api/v1";
const PRESUPUESTO = "0198c1a0-0000-7000-8000-000000000011";

beforeEach(() => {
  useSesionStore.setState({ usuario: usuarioFixture, cargando: false });
});

async function setup({ exportable = false } = {}) {
  if (exportable)
    server.use(
      http.get(`${API}/presupuestos/:id/validacion`, () =>
        HttpResponse.json({
          ...validacionFixture,
          exportable: true,
          itemsPuCero: [],
          itemsCantidadCero: [],
          itemsSinActividad: [],
        }),
      ),
    );
  const result = renderConProviders(
    <Routes>
      <Route path="/proyectos/:id/documentos" element={<ExportPage />} />
    </Routes>,
    {
      ruta: `/proyectos/01927f4e-1a2b-7c3d-8e4f-000000000001/documentos?v=${PRESUPUESTO}`,
    },
  );
  await waitFor(() => expect(screen.getByText("Exportar")).toBeInTheDocument());
  return { user: result.user };
}

// Plan 051: la página deja de estar degradada, pero solo ofrece el documento
// que el backend genera de verdad. Nada de botones apagados para los otros
// cuatro entregables de P-37: un botón apagado promete que llegará pronto.
describe("ExportPage", () => {
  it("muestra el título y subtítulo", async () => {
    await setup();
    expect(screen.getByText("Exportar")).toBeInTheDocument();
    expect(screen.getByText(/descargue documentos/i)).toBeInTheDocument();
  });

  it("ofrece la especificación técnica en DOCX como único documento", async () => {
    await setup();
    expect(screen.getByText(/especificaciones técnicas/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /descargar/i })).toHaveLength(1);
  });

  it("no ofrece las cuatro exportaciones que el backend no genera", async () => {
    await setup();
    expect(screen.queryByText(/presupuesto \(pdf\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/presupuesto \(excel\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^APUs$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Cronograma$/)).not.toBeInTheDocument();
  });

  it("avisa de que el resto de entregables todavía no existe", async () => {
    await setup();
    expect(screen.getByText(/por ahora/i)).toBeInTheDocument();
  });

  it("deshabilita la descarga cuando el presupuesto no es exportable", async () => {
    await setup();
    await waitFor(() => expect(screen.getByRole("button", { name: /descargar/i })).toBeDisabled());
  });

  it("muestra alerta de validación cuando hay problemas", async () => {
    await setup();
    await waitFor(() => {
      expect(screen.getByText(/no puede exportarse/i)).toBeInTheDocument();
    });
  });

  it("descarga la ET del endpoint real cuando el presupuesto es exportable", async () => {
    const peticiones = espiar();
    const { user } = await setup({ exportable: true });

    const boton = await screen.findByRole("button", { name: /descargar/i });
    await waitFor(() => expect(boton).toBeEnabled());
    await user.click(boton);

    await waitFor(() =>
      expect(
        ultima(peticiones, "GET", `/documentos/especificaciones-tecnicas/${PRESUPUESTO}`),
      ).toBeDefined(),
    );
  });
});
