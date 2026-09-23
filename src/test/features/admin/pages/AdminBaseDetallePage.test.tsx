import { describe, expect, it, vi } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { espiar, ultima } from "@/test/espia";
import { AdminBaseDetallePage } from "@/features/admin/pages/AdminBaseDetallePage";
import { basesCentralesFixtureAdmin } from "@/test/fixtures/admin";
import { insumosFixture } from "@/test/fixtures/insumos";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const base = basesCentralesFixtureAdmin[0];
const RUTA = `/admin/bases/${base.id}`;

const csv = "codigo,descripcion,tipo,unidad,precioUnitario\nM-9,Pintura,MATERIAL,gl,10.5";

function montar() {
  return renderConProviders(
    <Routes>
      <Route path="/admin/bases/:id" element={<AdminBaseDetallePage />} />
    </Routes>,
    { ruta: RUTA },
  );
}

// S-39 — detalle de base central. La escritura va contra los endpoints de
// `AdminBaseCentralResource`; la lectura, contra `GET /bases-centrales/{id}/insumos`
// (plan 044 del backend). Las dos rutas viven en `destinoBaseCentral`.
describe("AdminBaseDetallePage", () => {
  it("muestra el nombre de la base", async () => {
    montar();

    expect(await screen.findByText(base.nombre)).toBeInTheDocument();
  });

  // El alta reutiliza DialogoInsumo: lo que cambia es el destino, no el
  // formulario. Si alguien duplicara el componente, esta ruta se le escaparía.
  it("da de alta insumos contra /admin/bases-centrales/{id}/insumos", async () => {
    const user = userEvent.setup();
    const peticiones = espiar();
    montar();

    await screen.findByText(insumosFixture[0].descripcion);
    await user.click(screen.getByRole("button", { name: "Nuevo" }));
    await screen.findByText("Nuevo insumo", { selector: "h2, [data-slot='dialog-title']" });

    await user.type(screen.getByLabelText(/Código/i), "M-9");
    await user.type(screen.getByLabelText(/Descripción/i), "Pintura blanca");
    await user.type(screen.getByPlaceholderText(/unidad personalizada/i), "gl");
    await user.type(screen.getByLabelText(/Precio unitario/i), "12.5");
    await user.click(screen.getByRole("button", { name: "Crear insumo" }));

    await waitFor(() => {
      const p = ultima(peticiones, "POST", `/admin/bases-centrales/${base.id}/insumos`);
      expect(p?.ruta).toBe(`/api/v1/admin/bases-centrales/${base.id}/insumos`);
    });
  });

  // La ruta de importación de admin termina en `/import`, no en `/importar`
  // como la del proyecto. Es la clase de detalle que un prefijo compartido se
  // come en silencio.
  it("importa CSV contra /admin/bases-centrales/{id}/insumos/import", async () => {
    const user = userEvent.setup();
    const peticiones = espiar();
    montar();

    await user.click(await screen.findByRole("button", { name: /Importar CSV/i }));
    await user.upload(
      screen.getByLabelText(/Archivo CSV/i),
      new File([csv], "insumos.csv", { type: "text/csv" }),
    );
    await screen.findByText(/filas detectadas/i);
    await user.click(screen.getByRole("button", { name: "Importar" }));

    await waitFor(() => {
      const p = ultima(peticiones, "POST", "/insumos/import");
      expect(p?.ruta).toBe(`/api/v1/admin/bases-centrales/${base.id}/insumos/import`);
    });
  });

  it("lista los insumos de la base con GET /bases-centrales/{id}/insumos", async () => {
    const peticiones = espiar();
    montar();

    expect(await screen.findByText(insumosFixture[0].descripcion)).toBeInTheDocument();
    expect(ultima(peticiones, "GET", `/bases-centrales/${base.id}/insumos`)?.ruta).toBe(
      `/api/v1/bases-centrales/${base.id}/insumos`,
    );
  });
});
