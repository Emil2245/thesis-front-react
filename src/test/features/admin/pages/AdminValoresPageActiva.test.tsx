import { describe, expect, it, vi } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { espiar, ultima } from "@/test/espia";
import { server } from "@/test/server";
import { AdminValoresPageActiva } from "@/features/admin/pages/AdminValoresPageActiva";
import { valoresReferenciaFixture } from "@/test/fixtures/admin";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const [sbu, aportePatronal] = valoresReferenciaFixture;

// El gate `admin-valores` sigue cerrado (plan 081 lo abre); esta pantalla se
// prueba aislada, como Plantillas (078) mientras esperaba activarse.
describe("AdminValoresPageActiva", () => {
  it("lista los valores de referencia que devuelve el backend", async () => {
    renderConProviders(<AdminValoresPageActiva />);

    expect(await screen.findByText(sbu.clave)).toBeInTheDocument();
    expect(screen.getByText(sbu.valor)).toBeInTheDocument();
    expect(screen.getByText(sbu.descripcion)).toBeInTheDocument();
    expect(screen.getByText(sbu.fuente)).toBeInTheDocument();
    expect(screen.getByText(aportePatronal.clave)).toBeInTheDocument();
  });

  it("pide la lista a GET /admin/valores-referencia con page/size y sin q", async () => {
    const peticiones = espiar();
    renderConProviders(<AdminValoresPageActiva />);

    await screen.findByText(sbu.clave);
    const p = ultima(peticiones, "GET", "/admin/valores-referencia");
    expect(p?.ruta).toBe("/api/v1/admin/valores-referencia");
    expect(p?.url.searchParams.get("page")).toBe("0");
    expect(p?.url.searchParams.get("size")).toBe("25");
    expect(p?.url.searchParams.has("q")).toBe(false);
  });

  it("renderiza un estado vacío honesto sin romper la tabla", async () => {
    server.use(
      http.get("*/api/v1/admin/valores-referencia", () =>
        HttpResponse.json({ items: [], total: 0, page: 0, size: 25, totalPaginas: 0 }),
      ),
    );

    renderConProviders(<AdminValoresPageActiva />);

    expect(await screen.findByText("Sin valores de referencia")).toBeInTheDocument();
  });

  it("muestra un estado de error si el listado falla (403)", async () => {
    server.use(
      http.get("*/api/v1/admin/valores-referencia", () =>
        HttpResponse.json(
          { codigo: "acceso-denegado", mensaje: "No posee los permisos necesarios" },
          { status: 403 },
        ),
      ),
    );

    renderConProviders(<AdminValoresPageActiva />);

    expect(await screen.findByText("No posee los permisos necesarios")).toBeInTheDocument();
  });

  it("crea con PUT /admin/valores-referencia/{clave} (201) mandando la clave sólo en la ruta", async () => {
    const peticiones = espiar();
    const user = userEvent.setup();
    renderConProviders(<AdminValoresPageActiva />);

    await screen.findByText(sbu.clave);
    await user.click(screen.getByRole("button", { name: "Nuevo valor" }));

    await user.type(screen.getByLabelText("Clave"), "IVA_MAXIMO");
    await user.type(screen.getByLabelText("Valor"), "15.00");
    await user.type(screen.getByLabelText("Descripción"), "IVA máximo referencial");
    await user.type(screen.getByLabelText("Fuente"), "SRI 2026");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      const p = ultima(peticiones, "PUT", "/admin/valores-referencia/IVA_MAXIMO");
      expect(p?.ruta).toBe("/api/v1/admin/valores-referencia/IVA_MAXIMO");
      expect(p?.cuerpo).toEqual({
        valor: "15.00",
        descripcion: "IVA máximo referencial",
        fuente: "SRI 2026",
      });
    });
  });

  it("edita con PUT /admin/valores-referencia/{clave} (200) sin mandar la clave en el cuerpo", async () => {
    const peticiones = espiar();
    const user = userEvent.setup();
    renderConProviders(<AdminValoresPageActiva />);

    const fila = (await screen.findByText(sbu.clave)).closest("tr")!;
    await user.click(within(fila).getByTitle("Editar"));

    // La clave no se edita aquí: la fija el path de la petición.
    expect(screen.getByLabelText("Clave")).toBeDisabled();

    const valor = screen.getByLabelText("Valor");
    await user.clear(valor);
    await user.type(valor, "460.00");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      const p = ultima(peticiones, "PUT", `/admin/valores-referencia/${sbu.clave}`);
      expect(p?.cuerpo).toEqual({
        valor: "460.00",
        descripcion: sbu.descripcion,
        fuente: sbu.fuente,
      });
      expect(p?.cuerpo).not.toHaveProperty("clave");
    });
  });

  it("elimina con DELETE /admin/valores-referencia/{clave} tras confirmar", async () => {
    const peticiones = espiar();
    const user = userEvent.setup();
    renderConProviders(<AdminValoresPageActiva />);

    const fila = (await screen.findByText(aportePatronal.clave)).closest("tr")!;
    await user.click(within(fila).getByTitle("Eliminar"));
    await user.click(await screen.findByRole("button", { name: "Eliminar valor" }));

    await waitFor(() =>
      expect(
        ultima(peticiones, "DELETE", `/admin/valores-referencia/${aportePatronal.clave}`)?.ruta,
      ).toBe(`/api/v1/admin/valores-referencia/${aportePatronal.clave}`),
    );
  });

  it("un 404 al eliminar (clave ya borrada) se muestra en pantalla", async () => {
    server.use(
      http.delete("*/api/v1/admin/valores-referencia/:clave", () =>
        HttpResponse.json(
          { codigo: "no-encontrado", mensaje: "Valor de referencia no encontrado" },
          { status: 404 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderConProviders(<AdminValoresPageActiva />);

    const fila = (await screen.findByText(sbu.clave)).closest("tr")!;
    await user.click(within(fila).getByTitle("Eliminar"));
    await user.click(await screen.findByRole("button", { name: "Eliminar valor" }));

    expect(await screen.findByText("Valor de referencia no encontrado")).toBeInTheDocument();
  });
});
