import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { http } from "msw";
import { problema } from "@/test/handlers";
import { server } from "@/test/server";
import { getAccessToken } from "@/api/client";
import { LoginPage } from "@/features/auth/pages/LoginPage";

const API = "*/api/v1";

describe("LoginPage", () => {
  it("inicia sesión y guarda el access token", async () => {
    const { user } = renderConProviders(<LoginPage />, { ruta: "/login" });

    await user.type(screen.getByLabelText("Correo electrónico"), "ana@ejemplo.ec");
    await user.type(screen.getByLabelText("Contraseña"), "abc12345");
    await user.click(screen.getByRole("button", { name: /ingresar/i }));

    await waitFor(() => {
      expect(getAccessToken()).toBeTruthy();
    });
  });

  it("muestra mensaje genérico para credenciales inválidas (anti-enumeración)", async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        // El cuerpo es el de `AuthService.error(401, ...)`, literal.
        problema(401, "credenciales-invalidas", "Correo o contraseña incorrectos"),
      ),
    );

    const { user } = renderConProviders(<LoginPage />, { ruta: "/login" });

    await user.type(screen.getByLabelText("Correo electrónico"), "no-existe@ejemplo.ec");
    await user.type(screen.getByLabelText("Contraseña"), "abc12345");
    await user.click(screen.getByRole("button", { name: /ingresar/i }));

    await waitFor(() => {
      expect(screen.getByText("Correo o contraseña incorrectos")).toBeInTheDocument();
    });
    // No debe contener "no existe"
    expect(screen.queryByText(/no existe/i)).toBeNull();
  });

  it("muestra enlace de reenvío para email no verificado", async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        problema(403, "email-no-verificado", "El correo no ha sido verificado"),
      ),
    );

    const { user } = renderConProviders(<LoginPage />, { ruta: "/login" });

    await user.type(screen.getByLabelText("Correo electrónico"), "ana@ejemplo.ec");
    await user.type(screen.getByLabelText("Contraseña"), "abc12345");
    await user.click(screen.getByRole("button", { name: /ingresar/i }));

    await waitFor(() => {
      expect(screen.getByText(/no ha sido verificado/i)).toBeInTheDocument();
    });
  });

  // Sin el correo en la URL, VerificarEmailPage no tiene con qué reenviar
  // (plan 071, defecto 3).
  it("el enlace de reenvío incluye el correo que el usuario escribió", async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        problema(403, "email-no-verificado", "El correo no ha sido verificado"),
      ),
    );

    const { user } = renderConProviders(<LoginPage />, { ruta: "/login" });

    await user.type(screen.getByLabelText("Correo electrónico"), "ana@ejemplo.ec");
    await user.type(screen.getByLabelText("Contraseña"), "abc12345");
    await user.click(screen.getByRole("button", { name: /ingresar/i }));

    const enlace = await screen.findByRole("link", { name: /reenviar verificación/i });
    expect(enlace).toHaveAttribute("href", "/verificar-email?email=ana%40ejemplo.ec");
  });
});
