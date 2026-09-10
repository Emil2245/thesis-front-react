import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { renderConProviders } from "@/test/render";
import { Route, Routes, useLocation } from "react-router-dom";
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

function UbicacionActual() {
  const location = useLocation();
  return (
    <span data-testid="ubicacion-actual" hidden>{`${location.pathname}${location.search}`}</span>
  );
}

async function setupCronogramaPage(
  version = "0198c1a0-0000-7000-8000-000000000011",
  vista?: string,
) {
  const result = renderConProviders(
    <Routes>
      <Route
        path="/proyectos/:id/cronograma"
        element={
          <>
            <CronogramaPage />
            <UbicacionActual />
          </>
        }
      />
    </Routes>,
    {
      ruta: `/proyectos/01927f4e-1a2b-7c3d-8e4f-000000000001/cronograma?v=${version}${vista ? `&vista=${vista}` : ""}`,
    },
  );
  await waitFor(() => expect(screen.getByText("Cronograma")).toBeInTheDocument());
  await waitFor(() =>
    expect(screen.getByRole("tablist", { name: "Vistas del cronograma" })).toBeInTheDocument(),
  );
  return { user: result.user, unmount: result.unmount };
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
    screen.getAllByRole("tab", { hidden: true }).forEach((tab) => expect(tab).toBeDisabled());
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

  it("muestra tres vistas y deja Gantt seleccionado por defecto", async () => {
    await setupCronogramaPage();

    const tabs = within(screen.getByRole("tablist", { name: "Vistas del cronograma" }));
    expect(tabs.getAllByRole("tab")).toHaveLength(3);
    expect(tabs.getByRole("tab", { name: "Gantt" })).toHaveAttribute("aria-selected", "true");
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Gantt jerárquico" })).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("heading", { name: "Cronograma valorizado" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("figure", { name: "Curva S" })).not.toBeInTheDocument();
    expect(screen.getByText("Sin actividad")).toBeInTheDocument();
    expect(screen.getByText("2–2")).toBeInTheDocument();
    expect(screen.getByText("4–4")).toBeInTheDocument();
  });

  it("cambia de vista sin perder la versión de la URL", async () => {
    const version = "0198c1a0-0000-7000-8000-000000000011";
    const { user } = await setupCronogramaPage(version);

    await user.click(screen.getByRole("tab", { name: "Cronograma valorizado" }));

    expect(screen.getByRole("heading", { name: "Cronograma valorizado" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Gantt jerárquico" })).not.toBeInTheDocument();
    expect(screen.getByTestId("ubicacion-actual")).toHaveTextContent(
      `?v=${version}&vista=valorizado`,
    );
  });

  it("permite recorrer las vistas con el teclado", async () => {
    const { user } = await setupCronogramaPage();
    const gantt = screen.getByRole("tab", { name: "Gantt" });
    gantt.focus();

    await user.keyboard("{ArrowRight}");

    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Cronograma valorizado" })).toHaveAttribute(
        "aria-selected",
        "true",
      ),
    );
    expect(screen.getByTestId("ubicacion-actual")).toHaveTextContent("vista=valorizado");
  });

  it("abre una vista compartida desde la URL y normaliza valores inválidos", async () => {
    const { user, unmount } = await setupCronogramaPage(undefined, "curva-s");
    await waitFor(() =>
      expect(screen.getByRole("figure", { name: "Curva S" })).toBeInTheDocument(),
    );
    expect(screen.queryByRole("heading", { name: "Gantt jerárquico" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Gantt" }));
    expect(screen.getByTestId("ubicacion-actual")).toHaveTextContent("vista=gantt");
    unmount();

    const invalidResult = renderConProviders(
      <Routes>
        <Route
          path="/proyectos/:id/cronograma"
          element={
            <>
              <CronogramaPage />
              <UbicacionActual />
            </>
          }
        />
      </Routes>,
      {
        ruta: "/proyectos/01927f4e-1a2b-7c3d-8e4f-000000000001/cronograma?v=0198c1a0-0000-7000-8000-000000000011&vista=invalida",
      },
    );
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Gantt" })).toHaveAttribute("aria-selected", "true"),
    );
    await waitFor(() =>
      expect(screen.getByTestId("ubicacion-actual")).not.toHaveTextContent("vista=invalida"),
    );
    invalidResult.unmount();
  });

  it("no repite GET /vistas al cambiar entre tabs", async () => {
    let peticiones = 0;
    server.use(
      http.get(`${API}/cronogramas/:id/vistas`, () => {
        peticiones += 1;
        return HttpResponse.json(cronogramaVistasFixture);
      }),
    );
    const { user } = await setupCronogramaPage();
    expect(peticiones).toBe(1);

    await user.click(screen.getByRole("tab", { name: "Cronograma valorizado" }));
    await user.click(screen.getByRole("tab", { name: "Curva S" }));
    await user.click(screen.getByRole("tab", { name: "Gantt" }));

    expect(peticiones).toBe(1);
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
