import { describe, expect, it, vi } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { espiar, ultima } from "@/test/espia";
import { server } from "@/test/server";
import { AdminPlantillasPageActiva } from "@/features/admin/pages/AdminPlantillasPageActiva";
import { plantillasAdminFixture } from "@/test/fixtures/admin";
import { proyectosFixture, PROYECTO_1 } from "@/test/fixtures/proyectos";
import { apuResumenFixture } from "@/test/fixtures/apu";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const [conDescripcion, sinDescripcion] = plantillasAdminFixture;

// El gate `admin-plantillas` sigue cerrado (plan 081 lo abre); esta pantalla
// se prueba aislada, como hizo Usuarios (077) mientras esperaba activarse.
describe("AdminPlantillasPageActiva", () => {
  it("lista las plantillas de sistema que devuelve el backend", async () => {
    renderConProviders(<AdminPlantillasPageActiva />);

    expect(await screen.findByText(conDescripcion.nombre)).toBeInTheDocument();
    expect(screen.getByText(conDescripcion.descripcionRubro!)).toBeInTheDocument();
    // Patrón C en la respuesta: `descripcionRubro: null` no revienta la tabla.
    expect(screen.getByText(sinDescripcion.nombre)).toBeInTheDocument();
  });

  it("pide la lista a GET /admin/plantillas-apu con tipo=SISTEMA siempre", async () => {
    const peticiones = espiar();
    renderConProviders(<AdminPlantillasPageActiva />);

    await screen.findByText(conDescripcion.nombre);
    const p = ultima(peticiones, "GET", "/admin/plantillas-apu");
    expect(p?.ruta).toBe("/api/v1/admin/plantillas-apu");
    expect(p?.url.searchParams.get("tipo")).toBe("SISTEMA");
  });

  it("busca por nombre con el filtro q", async () => {
    const peticiones = espiar();
    const user = userEvent.setup();
    renderConProviders(<AdminPlantillasPageActiva />);

    await screen.findByText(conDescripcion.nombre);
    await user.type(screen.getByLabelText("Buscar plantillas"), "porcelanato");

    await waitFor(() =>
      expect(ultima(peticiones, "GET", "/admin/plantillas-apu")?.url.searchParams.get("q")).toBe(
        "porcelanato",
      ),
    );
  });

  it("renderiza un estado vacío honesto sin romper la tabla", async () => {
    server.use(
      http.get("*/api/v1/admin/plantillas-apu", () =>
        HttpResponse.json({ items: [], total: 0, page: 0, size: 25, totalPaginas: 0 }),
      ),
    );

    renderConProviders(<AdminPlantillasPageActiva />);

    expect(await screen.findByText("Sin plantillas")).toBeInTheDocument();
  });

  it("muestra un estado de error si el listado falla (403)", async () => {
    server.use(
      http.get("*/api/v1/admin/plantillas-apu", () =>
        HttpResponse.json(
          { codigo: "acceso-denegado", mensaje: "No posee los permisos necesarios" },
          { status: 403 },
        ),
      ),
    );

    renderConProviders(<AdminPlantillasPageActiva />);

    expect(await screen.findByText("No posee los permisos necesarios")).toBeInTheDocument();
  });

  // §9bis: no existe listado global de APUs. La cascada proyecto → versión →
  // APU puede quedarse sin nada en cualquier nivel — aquí, en las versiones de
  // presupuesto del proyecto elegido — y eso no es un fallo de la pantalla.
  it("si la cascada de proyecto→versión→APU viene vacía, lo dice y deshabilita Crear", async () => {
    server.use(http.get("*/api/v1/proyectos/:id/presupuestos", () => HttpResponse.json([])));
    const user = userEvent.setup();
    renderConProviders(<AdminPlantillasPageActiva />);

    await screen.findByText(conDescripcion.nombre);
    await user.click(screen.getByRole("button", { name: "Nueva plantilla" }));
    await user.click(screen.getByRole("combobox", { name: "Proyecto" }));
    await user.click(
      await screen.findByRole("option", { name: proyectosFixture[0].nombreProyecto }),
    );

    expect(
      await screen.findByText("No hay APUs disponibles para crear una plantilla"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear" })).toBeDisabled();
  });

  it("crea con POST /admin/plantillas-apu recorriendo proyecto→versión→APU", async () => {
    const peticiones = espiar();
    const user = userEvent.setup();
    renderConProviders(<AdminPlantillasPageActiva />);

    await screen.findByText(conDescripcion.nombre);
    await user.click(screen.getByRole("button", { name: "Nueva plantilla" }));

    await user.click(screen.getByRole("combobox", { name: "Proyecto" }));
    await user.click(
      await screen.findByRole("option", {
        name: proyectosFixture.find((p) => p.id === PROYECTO_1)!.nombreProyecto,
      }),
    );

    await user.click(screen.getByRole("combobox", { name: "Versión de presupuesto" }));
    await user.click(await screen.findByRole("option", { name: /versión 1/i }));

    await user.click(screen.getByRole("combobox", { name: "APU de origen" }));
    await user.click(
      await screen.findByRole("option", { name: new RegExp(apuResumenFixture[0].codigo) }),
    );

    await user.type(screen.getByLabelText("Nombre"), "Plantilla desde APU");
    await user.click(screen.getByRole("button", { name: "Crear" }));

    await waitFor(() => {
      const p = ultima(peticiones, "POST", "/admin/plantillas-apu");
      expect(p?.cuerpo).toEqual({
        desdeApuId: apuResumenFixture[0].id,
        nombre: "Plantilla desde APU",
      });
    });
  });

  it("edita sólo la descripción con PUT /admin/plantillas-apu/{id} sin mandar nombre", async () => {
    const peticiones = espiar();
    const user = userEvent.setup();
    renderConProviders(<AdminPlantillasPageActiva />);

    const fila = (await screen.findByText(conDescripcion.nombre)).closest("tr")!;
    await user.click(within(fila).getByTitle("Editar"));
    const descripcion = screen.getByLabelText("Descripción del rubro");
    await user.clear(descripcion);
    await user.type(descripcion, "Descripción reescrita");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      const p = ultima(peticiones, "PUT", `/admin/plantillas-apu/${conDescripcion.id}`);
      expect(p?.cuerpo).toEqual({ descripcionRubro: "Descripción reescrita" });
    });
  });

  it("elimina con DELETE /admin/plantillas-apu/{id}", async () => {
    const peticiones = espiar();
    const user = userEvent.setup();
    renderConProviders(<AdminPlantillasPageActiva />);

    const fila = (await screen.findByText(sinDescripcion.nombre)).closest("tr")!;
    await user.click(within(fila).getByTitle("Eliminar"));

    await waitFor(() =>
      expect(ultima(peticiones, "DELETE", `/admin/plantillas-apu/${sinDescripcion.id}`)?.ruta).toBe(
        `/api/v1/admin/plantillas-apu/${sinDescripcion.id}`,
      ),
    );
  });
});
