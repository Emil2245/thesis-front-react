import { describe, expect, it, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { Toaster } from "sonner";

import { renderConProviders } from "@/test/render";
import { server } from "@/test/server";
import { espiar, ultima } from "@/test/espia";
import { useSesionStore } from "@/features/auth/sesion";
import { usuarioFixture } from "@/test/fixtures/auth";
import { VersionesPage } from "@/features/presupuesto/pages/VersionesPage";
import { PRESUPUESTO_V1, PRESUPUESTO_V2 } from "@/test/fixtures/presupuesto";

const API = "*/api/v1";
const PROYECTO = "0198c1a3-0000-7000-8000-000000000001";

beforeEach(() => {
  useSesionStore.setState({ usuario: usuarioFixture, cargando: false });
});

async function montar() {
  const r = renderConProviders(
    <Routes>
      <Route
        path="/proyectos/:id/versiones"
        element={
          <>
            <VersionesPage />
            <Toaster />
          </>
        }
      />
    </Routes>,
    { ruta: `/proyectos/${PROYECTO}/versiones` },
  );
  await waitFor(() => expect(screen.getByText("v2")).toBeInTheDocument());
  return r;
}

const filaDe = (texto: string) =>
  screen.getAllByRole("row").find((f) => within(f).queryByText(texto))!;

describe("VersionesPage", () => {
  it("lista las versiones y marca cuál es la vigente", async () => {
    await montar();
    expect(within(filaDe("v1")).getByText("Histórica")).toBeInTheDocument();
    expect(within(filaDe("v2")).getByText("Vigente")).toBeInTheDocument();
  });

  it("crear una versión manda origenId y notas del formulario", async () => {
    const peticiones = espiar();
    const { user } = await montar();

    await user.click(screen.getByRole("button", { name: /nueva versión/i }));
    await user.click(screen.getByRole("combobox", { name: /versión origen/i }));
    await user.click(await screen.findByRole("option", { name: /v2/i }));
    await user.type(screen.getByLabelText(/notas/i), "Ajuste de precios");
    await user.click(screen.getByRole("button", { name: /^crear$/i }));

    await waitFor(() => {
      const p = ultima(peticiones, "POST", `/proyectos/${PROYECTO}/presupuestos`);
      expect(p?.cuerpo).toEqual({ origenId: PRESUPUESTO_V2, notas: "Ajuste de precios" });
    });
  });

  it("marcar vigente manda POST /presupuestos/{id}/vigente de la fila pulsada", async () => {
    const peticiones = espiar();
    const { user } = await montar();

    await user.click(within(filaDe("v1")).getByRole("button", { name: /marcar vigente/i }));

    await waitFor(() =>
      expect(ultima(peticiones, "POST", `/presupuestos/${PRESUPUESTO_V1}/vigente`)).toBeDefined(),
    );
  });

  // ponytail: la página esconde «Eliminar» en la fila vigente, así que el 409
  // del backend es inalcanzable desde la UI; hay que falsear el listado para
  // llegar a él. Es defensa en profundidad, no un defecto por sí solo, pero
  // sí deja sin probar el camino de error real.
  it("el 409 de versión vigente protegida llega al usuario", async () => {
    server.use(
      http.get(`${API}/proyectos/:id/presupuestos`, () =>
        HttpResponse.json([
          {
            presupuestoId: PRESUPUESTO_V2,
            version: 2,
            esVigente: false,
            notas: "Segunda versión",
            totalGeneral: "1200.000000",
            fechaCreacion: "2026-03-01T00:00:00",
          },
        ]),
      ),
    );
    const { user } = await montar();

    await user.click(within(filaDe("v2")).getByRole("button", { name: /eliminar/i }));
    const dialogo = await screen.findByRole("alertdialog");
    await user.click(within(dialogo).getByRole("button", { name: "Eliminar" }));

    // ponytail: `useVersionMutaciones` descarta el `detail` del problem+json
    // («No se puede eliminar la versión vigente») y muestra un genérico.
    expect(await screen.findByText("Error al eliminar versión")).toBeInTheDocument();
  });
});
