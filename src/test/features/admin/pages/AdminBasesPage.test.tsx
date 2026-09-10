import { describe, expect, it, vi } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { espiar, ultima } from "@/test/espia";
import { server } from "@/test/server";
import { AdminBasesPage } from "@/features/admin/pages/AdminBasesPage";
import { basesCentralesFixtureAdmin } from "@/test/fixtures/admin";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const [activa, otraActiva, archivada] = basesCentralesFixtureAdmin;

// S-38 es la única pantalla de admin cuyo backend existe entero en main
// (`AdminBaseCentralResource`), así que deja de estar degradada.
describe("AdminBasesPage", () => {
  it("lista las bases centrales que devuelve el backend", async () => {
    renderConProviders(<AdminBasesPage />);

    expect(await screen.findByText(activa.nombre)).toBeInTheDocument();
    expect(screen.getByText(otraActiva.nombre)).toBeInTheDocument();
    expect(screen.getByText(String(activa.totalInsumos))).toBeInTheDocument();
  });

  it("avanza a la segunda página y solicita page=1", async () => {
    const peticiones = espiar();
    server.use(
      http.get("*/api/v1/admin/bases-centrales", ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get("page"));
        const base = page === 0 ? activa : otraActiva;
        return HttpResponse.json({
          items: [base],
          total: 26,
          page,
          size: 25,
          totalPaginas: 2,
        });
      }),
    );

    const user = userEvent.setup();
    renderConProviders(<AdminBasesPage />);

    expect(await screen.findByText(activa.nombre)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Página siguiente" }));

    expect(await screen.findByText(otraActiva.nombre)).toBeInTheDocument();
    await waitFor(() =>
      expect(
        ultima(peticiones, "GET", "/admin/bases-centrales")?.url.searchParams.get("page"),
      ).toBe("1"),
    );
  });

  it("vuelve a la página 0 después de eliminar desde la página 1", async () => {
    const peticiones = espiar();
    server.use(
      http.get("*/api/v1/admin/bases-centrales", ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get("page"));
        return HttpResponse.json({
          items: page === 0 ? [activa] : [otraActiva],
          total: page === 0 ? 26 : 26,
          page,
          size: 25,
          totalPaginas: 2,
        });
      }),
      http.delete("*/api/v1/admin/bases-centrales/:id", () =>
        HttpResponse.json(null, { status: 204 }),
      ),
    );

    const user = userEvent.setup();
    renderConProviders(<AdminBasesPage />);
    await user.click(await screen.findByRole("button", { name: "Página siguiente" }));
    expect(await screen.findByText(otraActiva.nombre)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    await waitFor(() =>
      expect(
        ultima(peticiones, "GET", "/admin/bases-centrales")?.url.searchParams.get("page"),
      ).toBe("0"),
    );
  });

  it("renderiza una página vacía sin romper la tabla", async () => {
    server.use(
      http.get("*/api/v1/admin/bases-centrales", () =>
        HttpResponse.json({ items: [], total: 0, page: 0, size: 25, totalPaginas: 0 }),
      ),
    );

    renderConProviders(<AdminBasesPage />);

    await waitFor(() => expect(screen.queryAllByRole("row")).toHaveLength(1));
  });

  it("pide la lista a /admin/bases-centrales", async () => {
    const peticiones = espiar();
    renderConProviders(<AdminBasesPage />);

    await screen.findByText(activa.nombre);
    expect(ultima(peticiones, "GET", "/admin/bases-centrales")?.ruta).toBe(
      "/api/v1/admin/bases-centrales",
    );
  });

  // El filtro es un query param del backend, no un filtrado en cliente: si se
  // cablea mal, la lista no cambia y la pantalla miente.
  it("el conmutador «incluir archivadas» viaja como query param y trae las archivadas", async () => {
    const peticiones = espiar();
    renderConProviders(<AdminBasesPage />);

    await screen.findByText(activa.nombre);
    expect(screen.queryByText(archivada.nombre)).not.toBeInTheDocument();

    await userEvent.click(screen.getByLabelText("Incluir archivadas"));

    expect(await screen.findByText(archivada.nombre)).toBeInTheDocument();
    await waitFor(() =>
      expect(
        ultima(peticiones, "GET", "/admin/bases-centrales")?.url.searchParams.get(
          "incluirArchivadas",
        ),
      ).toBe("true"),
    );
  });
});
