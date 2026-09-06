import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";

import { renderConProviders } from "@/test/render";
import { espiar, ultima } from "@/test/espia";
import { usuarioFixture, adminFixture } from "@/test/fixtures/auth";
import { useSesionStore } from "@/features/auth/sesion";
import { PerfilPage } from "@/features/auth/pages/PerfilPage";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const RUTA = "/api/v1";

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  useSesionStore.setState({ usuario: usuarioFixture, refreshToken: null, cargando: false });
});

describe("PerfilPage", () => {
  it("pinta los datos del usuario en sesión y su rol", () => {
    renderConProviders(<PerfilPage />);

    expect(screen.getByLabelText(/nombre/i)).toHaveValue(usuarioFixture.nombre);
    expect(screen.getByLabelText(/correo electrónico/i)).toHaveValue(usuarioFixture.email);
    expect(screen.getByText("Usuario")).toBeInTheDocument();
  });

  it("marca al SUPER_ADMIN con la insignia de Admin", () => {
    useSesionStore.setState({ usuario: adminFixture, cargando: false });
    renderConProviders(<PerfilPage />);

    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  // El backend solo acepta `{ nombre, email }` en PUT /perfil. Cualquier campo
  // extra (el rol, el id) lo rechaza el handler estricto con un 400.
  it("guardar cambios manda PUT /perfil con solo nombre y correo", async () => {
    const peticiones = espiar();
    const { user } = renderConProviders(<PerfilPage />);

    const nombre = screen.getByLabelText(/nombre/i);
    await user.clear(nombre);
    await user.type(nombre, "Ana Torres Vega");
    await user.click(screen.getByRole("button", { name: /guardar cambios/i }));

    await waitFor(() => {
      const p = ultima(peticiones, "PUT", "/perfil");
      expect(p?.ruta).toBe(`${RUTA}/perfil`);
      expect(p?.cuerpo).toEqual({ nombre: "Ana Torres Vega", email: usuarioFixture.email });
    });
  });

  // Cambiar la contraseña invalida las demás sesiones en el backend, así que
  // la página cierra también la propia: si se dejara abierta, el usuario
  // seguiría navegando con un access token que ya no se puede refrescar.
  it("cambiar la contraseña manda PUT /perfil/password y cierra la sesión", async () => {
    const peticiones = espiar();
    const { user } = renderConProviders(<PerfilPage />);

    await user.type(screen.getByLabelText(/contraseña actual/i), "vieja1234");
    await user.type(screen.getByLabelText(/nueva contraseña/i), "nueva1234");
    await user.type(screen.getByLabelText(/confirmar contraseña/i), "nueva1234");
    await user.click(screen.getByRole("button", { name: /cambiar contraseña/i }));

    await waitFor(() => {
      const p = ultima(peticiones, "PUT", "/perfil/password");
      expect(p?.ruta).toBe(`${RUTA}/perfil/password`);
      expect(p?.cuerpo).toEqual({
        passwordActual: "vieja1234",
        passwordNueva: "nueva1234",
        passwordConfirmacion: "nueva1234",
      });
    });
    await waitFor(() => expect(useSesionStore.getState().usuario).toBeNull());
  });

  it("no envía nada si la confirmación no coincide", async () => {
    const peticiones = espiar();
    const { user } = renderConProviders(<PerfilPage />);

    await user.type(screen.getByLabelText(/contraseña actual/i), "vieja1234");
    await user.type(screen.getByLabelText(/nueva contraseña/i), "nueva1234");
    await user.type(screen.getByLabelText(/confirmar contraseña/i), "otra12345");
    await user.click(screen.getByRole("button", { name: /cambiar contraseña/i }));

    expect(await screen.findByText("Las contraseñas no coinciden")).toBeInTheDocument();
    expect(peticiones).toHaveLength(0);
  });
});
