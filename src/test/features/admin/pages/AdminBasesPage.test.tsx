import { describe, expect, it, vi } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { espiar, ultima } from "@/test/espia";
import { AdminBasesPage } from "@/features/admin/pages/AdminBasesPage";
import { basesCentralesFixtureAdmin } from "@/test/fixtures/admin";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const [activa, , archivada] = basesCentralesFixtureAdmin;

// S-38 es la única pantalla de admin cuyo backend existe entero en main
// (`AdminBaseCentralResource`), así que deja de estar degradada.
describe("AdminBasesPage", () => {
  it("lista las bases centrales que devuelve el backend", async () => {
    renderConProviders(<AdminBasesPage />);

    expect(await screen.findByText(activa.nombre)).toBeInTheDocument();
    expect(screen.getByText(String(activa.totalInsumos))).toBeInTheDocument();
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
