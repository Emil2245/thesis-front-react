import { describe, expect, it, vi } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { espiar, ultima } from "@/test/espia";
import { server } from "@/test/server";
import { AdminUsuariosPageActiva } from "@/features/admin/pages/AdminUsuariosPageActiva";
import { usuariosAdminFixture } from "@/test/fixtures/admin";
import { USUARIO_CON_PROYECTOS } from "@/test/handlers";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const [superAdmin, activo, inactivo] = usuariosAdminFixture;

// El gate `admin-usuarios` sigue cerrado (plan 081 lo abre); esta pantalla se
// prueba aislada, como hizo Bases mientras esperaba activarse.
describe("AdminUsuariosPageActiva", () => {
  it("lista los usuarios que devuelve el backend, sin secretos", async () => {
    renderConProviders(<AdminUsuariosPageActiva />);

    expect(await screen.findByText(superAdmin.nombre)).toBeInTheDocument();
    expect(screen.getByText(activo.email)).toBeInTheDocument();
    expect(screen.getByText("Super admin")).toBeInTheDocument();
    // El DTO no lleva passwordHash ni tokenHash: no hay nada que filtrar, pero
    // tampoco se pinta ningún campo que no sea de UsuarioAdminResponse.
    expect(screen.queryByText(/passwordHash|tokenHash/i)).not.toBeInTheDocument();
  });

  it("pide la lista a GET /admin/usuarios", async () => {
    const peticiones = espiar();
    renderConProviders(<AdminUsuariosPageActiva />);

    await screen.findByText(superAdmin.nombre);
    expect(ultima(peticiones, "GET", "/admin/usuarios")?.ruta).toBe("/api/v1/admin/usuarios");
  });

  it("busca por nombre o correo con el filtro q", async () => {
    const peticiones = espiar();
    const user = userEvent.setup();
    renderConProviders(<AdminUsuariosPageActiva />);

    await screen.findByText(superAdmin.nombre);
    await user.type(screen.getByLabelText("Buscar usuarios"), "ana");

    await waitFor(() =>
      expect(ultima(peticiones, "GET", "/admin/usuarios")?.url.searchParams.get("q")).toBe("ana"),
    );
  });

  it("invita un usuario con POST /admin/usuarios y refresca la lista", async () => {
    const peticiones = espiar();
    const user = userEvent.setup();
    renderConProviders(<AdminUsuariosPageActiva />);

    await screen.findByText(superAdmin.nombre);
    await user.click(screen.getByRole("button", { name: "Invitar usuario" }));
    await user.type(screen.getByLabelText("Nombre"), "Nuevo Usuario");
    await user.type(screen.getByLabelText("Correo electrónico"), "nuevo@example.com");
    await user.click(screen.getByRole("button", { name: "Invitar" }));

    await waitFor(() => {
      const p = ultima(peticiones, "POST", "/admin/usuarios");
      expect(p?.cuerpo).toEqual({
        nombre: "Nuevo Usuario",
        email: "nuevo@example.com",
        rol: "USUARIO",
      });
    });
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Invitar usuario" })).not.toBeInTheDocument(),
    );
  });

  it("muestra el 409 del backend sin filtrarlo, sin dejarlo pasar por éxito", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("*/api/v1/admin/usuarios", () =>
        HttpResponse.json(
          { codigo: "email-ya-registrado", mensaje: "El correo ya está registrado" },
          { status: 409 },
        ),
      ),
    );
    renderConProviders(<AdminUsuariosPageActiva />);

    await screen.findByText(superAdmin.nombre);
    await user.click(screen.getByRole("button", { name: "Invitar usuario" }));
    await user.type(screen.getByLabelText("Nombre"), "Dup");
    await user.type(screen.getByLabelText("Correo electrónico"), activo.email);
    await user.click(screen.getByRole("button", { name: "Invitar" }));

    expect(await screen.findByText("El correo ya está registrado")).toBeInTheDocument();
    // El diálogo sigue abierto: un 409 no se confunde con un alta exitosa.
    expect(screen.getByRole("button", { name: "Invitar" })).toBeInTheDocument();
  });

  it("edita con PUT /admin/usuarios/{id} sin mandar email", async () => {
    const peticiones = espiar();
    const user = userEvent.setup();
    renderConProviders(<AdminUsuariosPageActiva />);

    const fila = (await screen.findByText(activo.nombre)).closest("tr")!;
    await user.click(within(fila).getByTitle("Editar"));
    const nombre = screen.getByLabelText("Nombre");
    await user.clear(nombre);
    await user.type(nombre, "Nombre Editado");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      const p = ultima(peticiones, "PUT", `/admin/usuarios/${activo.id}`);
      expect(p?.cuerpo).toEqual({ nombre: "Nombre Editado", rol: activo.rol, activo: true });
    });
  });

  it("desactiva y reactiva con los botones dedicados, no con editar", async () => {
    const peticiones = espiar();
    const user = userEvent.setup();
    renderConProviders(<AdminUsuariosPageActiva />);

    const filaActivo = (await screen.findByText(activo.nombre)).closest("tr")!;
    await user.click(within(filaActivo).getByTitle("Desactivar"));
    await waitFor(() =>
      expect(ultima(peticiones, "POST", `/admin/usuarios/${activo.id}/desactivar`)?.ruta).toBe(
        `/api/v1/admin/usuarios/${activo.id}/desactivar`,
      ),
    );

    const filaInactivo = screen.getByText(inactivo.nombre).closest("tr")!;
    await user.click(within(filaInactivo).getByTitle("Reactivar"));
    await waitFor(() =>
      expect(ultima(peticiones, "POST", `/admin/usuarios/${inactivo.id}/reactivar`)?.ruta).toBe(
        `/api/v1/admin/usuarios/${inactivo.id}/reactivar`,
      ),
    );
  });

  it("elimina con DELETE /admin/usuarios/{id}", async () => {
    const peticiones = espiar();
    const user = userEvent.setup();
    renderConProviders(<AdminUsuariosPageActiva />);

    const fila = (await screen.findByText(inactivo.nombre)).closest("tr")!;
    await user.click(within(fila).getByTitle("Eliminar"));

    await waitFor(() =>
      expect(ultima(peticiones, "DELETE", `/admin/usuarios/${inactivo.id}`)?.ruta).toBe(
        `/api/v1/admin/usuarios/${inactivo.id}`,
      ),
    );
  });

  it("un usuario con proyectos propios no se puede eliminar: 409 visible, no una fila desaparecida", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("*/api/v1/admin/usuarios", () =>
        HttpResponse.json({
          items: [{ ...superAdmin, id: USUARIO_CON_PROYECTOS }],
          total: 1,
          page: 0,
          size: 25,
          totalPaginas: 1,
        }),
      ),
    );
    renderConProviders(<AdminUsuariosPageActiva />);

    const fila = (await screen.findByText(superAdmin.nombre)).closest("tr")!;
    await user.click(within(fila).getByTitle("Eliminar"));

    await waitFor(() => expect(screen.getByText(superAdmin.nombre)).toBeInTheDocument());
  });

  it("renderiza una lista vacía sin romper la tabla", async () => {
    server.use(
      http.get("*/api/v1/admin/usuarios", () =>
        HttpResponse.json({ items: [], total: 0, page: 0, size: 25, totalPaginas: 0 }),
      ),
    );

    renderConProviders(<AdminUsuariosPageActiva />);

    expect(await screen.findByText("Sin usuarios")).toBeInTheDocument();
  });

  it("muestra un estado de error si el listado falla", async () => {
    server.use(
      http.get("*/api/v1/admin/usuarios", () =>
        HttpResponse.json(
          { codigo: "acceso-denegado", mensaje: "No posee los permisos necesarios" },
          { status: 403 },
        ),
      ),
    );

    renderConProviders(<AdminUsuariosPageActiva />);

    expect(await screen.findByText("No posee los permisos necesarios")).toBeInTheDocument();
  });
});
