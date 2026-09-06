import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { renderConProviders } from "@/test/render";
import { Route, Routes } from "react-router-dom";
import { useSesionStore } from "@/features/auth/sesion";
import { usuarioFixture } from "@/test/fixtures/auth";
import { cronogramaFixture } from "@/test/fixtures/cronograma";
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
    { ruta: `/proyectos/1/cronograma?v=${version}` },
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
      { ruta: "/proyectos/1/cronograma?v=0198c1a0-0000-7000-8000-0000000009f9" },
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
      { ruta: "/proyectos/1/cronograma?v=0198c1a0-0000-7000-8000-0000000009f9" },
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

  it("muestra BadgeDesactualizado cuando desactualizado es true", async () => {
    server.use(
      http.get(`${API}/presupuestos/:id/cronograma`, () =>
        HttpResponse.json({ ...cronogramaFixture, desactualizado: true }),
      ),
    );
    renderConProviders(
      <Routes>
        <Route path="/proyectos/:id/cronograma" element={<CronogramaPage />} />
      </Routes>,
      { ruta: "/proyectos/1/cronograma?v=0198c1a0-0000-7000-8000-000000000011" },
    );
    await waitFor(() => {
      expect(screen.getByText("Desactualizado")).toBeInTheDocument();
    });
  });
});
