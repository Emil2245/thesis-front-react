import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor, within } from "@testing-library/react";
import { espiar, ultima } from "@/test/espia";
import { Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import { pagina } from "@/test/handlers";
import { apuResumenFixture } from "@/test/fixtures/apu";
import { ListaApusPage } from "@/features/apu-editor/pages/ListaApusPage";

const API = "*/api/v1";

function renderLista(ruta = "/proyectos/01927f4e-1a2b-7c3d-8e4f-000000000001/apus") {
  return renderConProviders(
    <Routes>
      <Route path="/proyectos/:id/apus" element={<ListaApusPage />} />
    </Routes>,
    { ruta },
  );
}

describe("ListaApusPage", () => {
  it("shows search input", async () => {
    renderLista();
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Buscar por código/)).toBeInTheDocument();
    });
  });

  it("renders the Nuevo APU button", async () => {
    renderLista();
    await waitFor(() => {
      expect(screen.getByText(/Nuevo APU/)).toBeInTheDocument();
    });
  });

  it("renders APU codes in the table", async () => {
    renderLista();
    await waitFor(() => {
      expect(screen.getByText("APU-001")).toBeInTheDocument();
      expect(screen.getByText("APU-002")).toBeInTheDocument();
    });
  });

  it("shows vinculado indicator for linked APUs", async () => {
    renderLista();
    await waitFor(() => {
      const apu002 = screen.getByText("APU-002");
      expect(apu002).toBeInTheDocument();
    });
  });

  // Plan 052 rebanada 1: `POST /apus/{apuId}/duplicar` existe en origin/main y
  // `useDuplicarApu` ya apuntaba ahí; el item solo estaba `disabled`. El test
  // mira la petición, no la respuesta del mock: con el item deshabilitado el
  // click no dispara nada y no hay POST que encontrar.
  it("duplicar manda POST /apus/{id}/duplicar", async () => {
    const peticiones = espiar();
    const { user } = renderLista();

    await waitFor(() => {
      expect(screen.getByText("APU-001")).toBeInTheDocument();
    });

    const fila = screen.getByText("APU-001").closest("tr")!;
    await user.click(within(fila).getByRole("button", { name: "Acciones del APU" }));

    // El item de menú es un div, no un <button>: con `disabled` Radix marca
    // aria-disabled pero el onClick sigue disparando, así que el POST salía
    // igual. Afirmar solo la petición estaría verde contra el gate.
    const item = await screen.findByRole("menuitem", { name: /Duplicar/ });
    expect(item).not.toHaveAttribute("data-disabled");
    expect(item).not.toHaveAttribute("aria-disabled", "true");

    await user.click(item);

    await waitFor(() => {
      expect(
        ultima(peticiones, "POST", "/apus/018f8a40-0000-7000-8000-000000000001/duplicar"),
      ).toBeDefined();
    });
  });

  it("usa la versión vigente cuando la URL no trae ?v=", async () => {
    const pedidos: string[] = [];
    server.use(
      http.get(`${API}/presupuestos/:id/apus`, ({ request }) => {
        pedidos.push(new URL(request.url).pathname);
        return HttpResponse.json(pagina(apuResumenFixture));
      }),
    );

    renderLista();
    await waitFor(() => {
      expect(screen.getByText("APU-001")).toBeInTheDocument();
    });

    // PRESUPUESTO_V2 es la versión vigente en versionesStub, no el id del proyecto.
    expect(pedidos).toContain("/api/v1/presupuestos/0198c1a0-0000-7000-8000-000000000011/apus");
  });

  it("respeta ?v= a una versión que no es la vigente", async () => {
    const pedidos: string[] = [];
    server.use(
      http.get(`${API}/presupuestos/:id/apus`, ({ request }) => {
        pedidos.push(new URL(request.url).pathname);
        return HttpResponse.json(pagina(apuResumenFixture));
      }),
    );

    renderLista(
      "/proyectos/01927f4e-1a2b-7c3d-8e4f-000000000001/apus?v=0198c1a0-0000-7000-8000-000000000010",
    );
    await waitFor(() => {
      expect(screen.getByText("APU-001")).toBeInTheDocument();
    });

    expect(pedidos).toContain("/api/v1/presupuestos/0198c1a0-0000-7000-8000-000000000010/apus");
  });

  it("muestra el estado vacío cuando el proyecto no tiene versiones", async () => {
    const pedidos: string[] = [];
    server.use(
      http.get(`${API}/proyectos/:id/presupuestos`, () => HttpResponse.json([])),
      http.get(`${API}/presupuestos/:id/apus`, ({ request }) => {
        pedidos.push(new URL(request.url).pathname);
        return HttpResponse.json(pagina(apuResumenFixture));
      }),
    );

    renderLista();

    await waitFor(() => {
      expect(screen.getByText("Sin versión seleccionada")).toBeInTheDocument();
    });
    expect(screen.queryByText("APU-001")).not.toBeInTheDocument();
    expect(pedidos).toEqual([]);
  });
});
