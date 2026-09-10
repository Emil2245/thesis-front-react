import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { renderConProviders } from "@/test/render";
import { Route, Routes } from "react-router-dom";
import { useSesionStore } from "@/features/auth/sesion";
import { usuarioFixture } from "@/test/fixtures/auth";
import {
  cronogramaBorradorFixture,
  cronogramaDesactualizadoFixture,
  cronogramaVistasFixture,
} from "@/test/fixtures/cronograma";
import { server } from "@/test/server";
import { CronogramaPage } from "@/features/cronograma/pages/CronogramaPage";

const API = "*/api/v1";

beforeEach(() => {
  useSesionStore.setState({ usuario: usuarioFixture, cargando: false });
});

async function setupCronogramaPage(version = "0198c1a0-0000-7000-8000-000000000011") {
  const result = renderConProviders(
    <Routes>
      <Route path="/proyectos/:id/cronograma" element={<CronogramaPage />} />
    </Routes>,
    { ruta: `/proyectos/01927f4e-1a2b-7c3d-8e4f-000000000001/cronograma?v=${version}` },
  );
  await waitFor(() => expect(screen.getByText("Cronograma")).toBeInTheDocument());
  // La versión activa se resuelve de forma asíncrona (selector de la barra
  // superior): esperar a que el fixture esté pintado, no solo el encabezado.
  await waitFor(() =>
    expect(screen.getAllByText("Excavación a máquina").length).toBeGreaterThan(0),
  );
  return { user: result.user };
}

describe("CronogramaPage", () => {
  it("muestra estado vacío cuando no hay cronograma", async () => {
    renderConProviders(
      <Routes>
        <Route path="/proyectos/:id/cronograma" element={<CronogramaPage />} />
      </Routes>,
      {
        ruta: "/proyectos/01927f4e-1a2b-7c3d-8e4f-000000000001/cronograma?v=0198c1a0-0000-7000-8000-0000000009f9",
      },
    );
    await waitFor(() => {
      expect(screen.getByText(/no hay cronograma/i)).toBeInTheDocument();
    });
  });

  it("muestra la tabla de actividades con datos del fixture", async () => {
    await setupCronogramaPage();
    await waitFor(() => {
      expect(screen.getAllByText("Excavación a máquina").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Hormigón simple").length).toBeGreaterThan(0);
    });
  });

  it("muestra el diagrama de Gantt", async () => {
    await setupCronogramaPage();
    await waitFor(() => {
      expect(screen.getByText(/Diagrama de Gantt/)).toBeInTheDocument();
    });
  });

  it("muestra avance por período y acumulado", async () => {
    await setupCronogramaPage();
    expect(screen.getByText("Avance por período")).toBeInTheDocument();
    expect(screen.getByText("Avance acumulado")).toBeInTheDocument();
  });

  it("abre diálogo de reconfiguración", async () => {
    const { user } = await setupCronogramaPage();
    await user.click(screen.getByRole("button", { name: /reconfigurar/i }));
    await waitFor(() => {
      expect(screen.getByText("Reconfigurar cronograma")).toBeInTheDocument();
    });
  });

  it("cierra el diálogo al cancelar", async () => {
    const { user } = await setupCronogramaPage();
    await user.click(screen.getByRole("button", { name: /reconfigurar/i }));
    await user.click(screen.getByRole("button", { name: /cancelar/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("reconfigura el cronograma desde el diálogo", async () => {
    const { user } = await setupCronogramaPage();
    await user.click(screen.getByRole("button", { name: /reconfigurar/i }));
    await user.click(screen.getByRole("button", { name: /reconfigurar/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("no muestra BadgeDesactualizado cuando está actualizado", async () => {
    await setupCronogramaPage();
    expect(screen.queryByText("Desactualizado")).not.toBeInTheDocument();
  });

  it("abre diálogo de editar actividad al hacer click en una fila", async () => {
    const { user } = await setupCronogramaPage();
    await user.click(screen.getAllByText("Excavación a máquina")[0]);
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  it("muestra 'Crear cronograma' cuando no existe uno", async () => {
    renderConProviders(
      <Routes>
        <Route path="/proyectos/:id/cronograma" element={<CronogramaPage />} />
      </Routes>,
      {
        ruta: "/proyectos/01927f4e-1a2b-7c3d-8e4f-000000000001/cronograma?v=0198c1a0-0000-7000-8000-0000000009f9",
      },
    );
    await waitFor(() => {
      expect(screen.getByText(/no hay cronograma/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /crear cronograma/i })).toBeInTheDocument();
    });
  });

  it("los períodos en la tabla usan índice 1-based", async () => {
    await setupCronogramaPage();
    expect(screen.getByText("P1")).toBeInTheDocument();
    expect(screen.getByText("P4")).toBeInTheDocument();
  });

  // El camino completo del 409 de configuración: reducir períodos sin
  // confirmar → 409 con `perdidas[]` → el diálogo las pinta. Antes leía
  // `periodosAfectados`, que no existe, y se confirmaba a ciegas.
  it("el 409 de reconfiguración abre el diálogo con las pérdidas del backend", async () => {
    const { user } = await setupCronogramaPage();

    await user.click(screen.getByRole("button", { name: /reconfigurar/i }));
    const periodos = screen.getByLabelText("Número de períodos");
    await user.clear(periodos);
    await user.type(periodos, "2");
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: /^reconfigurar$/i }),
    );

    await waitFor(() => expect(screen.getByText(/se borrarán/i)).toBeInTheDocument());
    const confirmacion = within(screen.getByRole("dialog"));
    expect(confirmacion.getByText("25,2253 %")).toBeInTheDocument();
    expect(confirmacion.getByText("5,4054 %")).toBeInTheDocument();
  });

  it("marca la distribución incompleta cuando el estado es BORRADOR", async () => {
    server.use(
      http.get(`${API}/presupuestos/:id/cronograma`, () =>
        HttpResponse.json(cronogramaBorradorFixture),
      ),
    );
    renderConProviders(
      <Routes>
        <Route path="/proyectos/:id/cronograma" element={<CronogramaPage />} />
      </Routes>,
      {
        ruta: "/proyectos/01927f4e-1a2b-7c3d-8e4f-000000000001/cronograma?v=0198c1a0-0000-7000-8000-000000000011",
      },
    );

    await waitFor(() => {
      expect(screen.getByText("Distribución incompleta")).toBeInTheDocument();
    });
  });

  it("muestra BadgeDesactualizado cuando desactualizado es true", async () => {
    server.use(
      http.get(`${API}/presupuestos/:id/cronograma`, () =>
        HttpResponse.json(cronogramaDesactualizadoFixture),
      ),
    );
    renderConProviders(
      <Routes>
        <Route path="/proyectos/:id/cronograma" element={<CronogramaPage />} />
      </Routes>,
      {
        ruta: "/proyectos/01927f4e-1a2b-7c3d-8e4f-000000000001/cronograma?v=0198c1a0-0000-7000-8000-000000000011",
      },
    );
    await waitFor(() => {
      expect(screen.getByText("Desactualizado")).toBeInTheDocument();
      expect(screen.getByText(/la vista está desactualizada/i)).toBeInTheDocument();
    });
  });

  it("integra el Gantt jerárquico, valorizado y curva S de la única vista", async () => {
    await setupCronogramaPage();
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Gantt jerárquico" })).toBeInTheDocument(),
    );

    expect(screen.getByRole("heading", { name: "Gantt jerárquico" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Cronograma valorizado" })).toBeInTheDocument();
    expect(screen.getByText("Curva S")).toBeInTheDocument();
    expect(screen.getAllByText("Movimiento de tierras").length).toBeGreaterThan(0);
    expect(screen.getByText("Sin actividad")).toBeInTheDocument();
    expect(screen.getByText("2–2")).toBeInTheDocument();
    expect(screen.getByText("4–4")).toBeInTheDocument();
    expect(screen.getAllByText("4.9550").length).toBeGreaterThan(0);
    expect(screen.getAllByText("18500.000000").length).toBeGreaterThan(0);
  });

  it("mantiene visible el estado de carga de las vistas", async () => {
    let liberar!: () => void;
    const pendiente = new Promise<void>((resolve) => {
      liberar = resolve;
    });
    server.use(
      http.get(`${API}/cronogramas/:id/vistas`, async () => {
        await pendiente;
        return HttpResponse.json(cronogramaVistasFixture);
      }),
    );
    const resultado = renderConProviders(
      <Routes>
        <Route path="/proyectos/:id/cronograma" element={<CronogramaPage />} />
      </Routes>,
      {
        ruta: "/proyectos/01927f4e-1a2b-7c3d-8e4f-000000000001/cronograma?v=0198c1a0-0000-7000-8000-000000000011",
      },
    );

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/cargando vistas/i));
    liberar();
    await waitFor(() => expect(screen.getByText("Curva S")).toBeInTheDocument());
    resultado.unmount();
  });

  it("distingue la vista 404 del cronograma existente", async () => {
    server.use(
      http.get(`${API}/cronogramas/:id/vistas`, () =>
        HttpResponse.json({ codigo: "no-encontrado", mensaje: "No existe" }, { status: 404 }),
      ),
    );
    await setupCronogramaPage();

    await waitFor(() =>
      expect(
        screen.getByText("No hay vistas disponibles para este cronograma."),
      ).toBeInTheDocument(),
    );
  });

  it("muestra error de vistas sin ocultar el flujo de edición", async () => {
    server.use(
      http.get(`${API}/cronogramas/:id/vistas`, () =>
        HttpResponse.json({ codigo: "servidor", mensaje: "fallo" }, { status: 500 }),
      ),
    );
    await setupCronogramaPage();

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/no se pudieron cargar/i),
    );
    expect(screen.getByRole("button", { name: /reconfigurar/i })).toBeInTheDocument();
  });
});
