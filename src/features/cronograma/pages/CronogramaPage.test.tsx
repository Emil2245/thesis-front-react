import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderConProviders } from "@/test/render";
import { Route, Routes } from "react-router-dom";
import { useSesionStore } from "@/features/auth/sesion";
import { usuarioFixture } from "@/test/fixtures/auth";
import { CronogramaPage, CronogramaPageActiva } from "../pages/CronogramaPage";

beforeEach(() => {
  useSesionStore.setState({ usuario: usuarioFixture, cargando: false });
});

async function setupCronogramaPage(version = "11") {
  const result = renderConProviders(
    <Routes>
      <Route path="/proyectos/:id/cronograma" element={<CronogramaPageActiva />} />
    </Routes>,
    { ruta: `/proyectos/1/cronograma?v=${version}` },
  );
  await waitFor(() => expect(screen.getByText("Cronograma")).toBeInTheDocument());
  // La versión activa se resuelve de forma asíncrona (selector de la barra
  // superior): esperar a que el fixture esté pintado, no solo el encabezado.
  await waitFor(() => expect(screen.getByText("Excavación a máquina")).toBeInTheDocument());
  return { user: result.user };
}

// El backend no expone /presupuestos/{id}/cronograma todavía (plan 027): la
// ruta real muestra CronogramaPage, que degrada a "todavía no disponible" sin
// llamar al backend (ver más abajo). CronogramaPageActiva es la
// implementación completa, conservada para reactivarla cuando el endpoint
// exista: estos tests siguen probándola directamente.
describe("CronogramaPageActiva", () => {
  it("muestra estado vacío cuando no hay cronograma", async () => {
    renderConProviders(
      <Routes>
        <Route path="/proyectos/:id/cronograma" element={<CronogramaPageActiva />} />
      </Routes>,
      { ruta: "/proyectos/1/cronograma?v=999" },
    );
    await waitFor(() => {
      expect(screen.getByText(/no hay cronograma/i)).toBeInTheDocument();
    });
  });

  it("muestra la tabla de actividades con datos del fixture", async () => {
    await setupCronogramaPage();
    await waitFor(() => {
      expect(screen.getByText("Excavación a máquina")).toBeInTheDocument();
      expect(screen.getByText("Hormigón simple")).toBeInTheDocument();
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
});

describe("CronogramaPage", () => {
  it("explica que el módulo todavía no está disponible, sin pedir el cronograma al backend", async () => {
    // MSW está configurado con onUnhandledRequest: "error": si esta pantalla
    // llamara al hook real, el test fallaría por la petición no mockeada.
    renderConProviders(
      <Routes>
        <Route path="/proyectos/:id/cronograma" element={<CronogramaPage />} />
      </Routes>,
      { ruta: "/proyectos/1/cronograma?v=11" },
    );

    expect(screen.getByText("Cronograma")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/todavía no está disponible/i)).toBeInTheDocument();
    });
  });
});
