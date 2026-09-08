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
import { preflightBloqueadoFixture, preflightConWarningFixture } from "@/test/fixtures/cronograma";
import type { CronogramaExportPreflightResponse } from "@/api/contract";
import { ExportPage } from "@/features/exportar/pages/ExportPage";

const API = "*/api/v1";
const PRESUPUESTO = "0198c1a0-0000-7000-8000-000000000011";

beforeEach(() => {
  useSesionStore.setState({ usuario: usuarioFixture, cargando: false });
});

async function setup({
  exportable = false,
  preflight,
}: { exportable?: boolean; preflight?: CronogramaExportPreflightResponse } = {}) {
  if (preflight)
    server.use(
      http.get(`${API}/documentos/cronograma/:id/preflight`, () => HttpResponse.json(preflight)),
    );
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

  // Los dos documentos que el backend genera de verdad: la ET (plan 051) y el
  // cronograma valorizado (plan 031 del backend, @ 5673615).
  it("ofrece la especificación técnica en DOCX y el cronograma valorizado", async () => {
    await setup();
    expect(screen.getByText(/especificaciones técnicas/i)).toBeInTheDocument();
    expect(screen.getByText(/cronograma valorizado/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /descargar/i })).toHaveLength(2);
  });

  it("no ofrece las exportaciones que el backend no genera", async () => {
    await setup();
    expect(screen.queryByText(/presupuesto \(pdf\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/presupuesto \(excel\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^APUs$/)).not.toBeInTheDocument();
  });

  it("avisa de que el presupuesto y los APUs todavía no existen", async () => {
    await setup();
    expect(screen.getByText(/todavía no existe en el servidor/i)).toBeInTheDocument();
    // El cronograma sí existe desde `5673615`: el aviso no puede seguir
    // diciendo lo contrario de lo que la propia pantalla ofrece.
    expect(screen.queryByText(/del cronograma todavía no existe/i)).not.toBeInTheDocument();
  });

  it("deshabilita la descarga cuando el presupuesto no es exportable", async () => {
    await setup();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^descargar$/i })).toBeDisabled(),
    );
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

    const boton = await screen.findByRole("button", { name: /^descargar$/i });
    await waitFor(() => expect(boton).toBeEnabled());
    await user.click(boton);

    await waitFor(() =>
      expect(
        ultima(peticiones, "GET", `/documentos/especificaciones-tecnicas/${PRESUPUESTO}`),
      ).toBeDefined(),
    );
  });
});

// Plan 031 del backend: el preflight decide si la descarga va a salir, y con
// qué bloqueos si no. La pantalla enseña el `detalle` que el servidor redacta.
describe("ExportPage — cronograma valorizado", () => {
  it("ofrece los tres formatos que el backend genera", async () => {
    const { user } = await setup();

    await user.click(screen.getByRole("combobox", { name: /formato/i }));

    expect(screen.getByRole("option", { name: /xlsx/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /\.pdf/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /\.xml/i })).toBeInTheDocument();
  });

  it("muestra el detalle de cada bloqueo y deshabilita la descarga", async () => {
    await setup({ preflight: preflightBloqueadoFixture });

    for (const b of preflightBloqueadoFixture.bloqueos) {
      expect(await screen.findByText(b.detalle)).toBeInTheDocument();
    }
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /descargar cronograma/i })).toBeDisabled(),
    );
  });

  // Un warning avisa pero NO bloquea: tratarlo como bloqueo es el bug que este
  // test caza, y sin él no lo caza nadie.
  it("un warning avisa sin deshabilitar la descarga", async () => {
    await setup({ exportable: true, preflight: preflightConWarningFixture });

    expect(
      await screen.findByText(preflightConWarningFixture.warnings[0].detalle),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /descargar cronograma/i })).toBeEnabled(),
    );
  });

  it("al pulsar el botón pide /documentos/cronograma/{id}", async () => {
    const peticiones = espiar();
    const { user } = await setup({ exportable: true });

    const boton = await screen.findByRole("button", { name: /descargar cronograma/i });
    await waitFor(() => expect(boton).toBeEnabled());
    await user.click(boton);

    await waitFor(() =>
      expect(ultima(peticiones, "GET", `/documentos/cronograma/${PRESUPUESTO}`)).toBeDefined(),
    );
  });
});
