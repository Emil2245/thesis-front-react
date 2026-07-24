import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import { getAccessToken } from "@/api/client";
import { LoginPage } from "./LoginPage";

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
        HttpResponse.json(
          {
            type: "/problemas/credenciales-invalidas",
            title: "Credenciales inválidas",
            status: 401,
          },
          { status: 401, headers: { "Content-Type": "application/problem+json" } },
        ),
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
        HttpResponse.json(
          { type: "/problemas/email-no-verificado", title: "Email no verificado", status: 403 },
          { status: 403, headers: { "Content-Type": "application/problem+json" } },
        ),
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
});
