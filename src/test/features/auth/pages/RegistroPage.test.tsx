import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { http } from "msw";
import { problema } from "@/test/handlers";
import { server } from "@/test/server";
import { Route, Routes } from "react-router-dom";
import { RegistroPage } from "@/features/auth/pages/RegistroPage";
import { VerificarEmailPage } from "@/features/auth/pages/VerificarEmailPage";

const API = "*/api/v1";

describe("RegistroPage", () => {
  it("registra y navega a verificación", async () => {
    const { user } = renderConProviders(
      <Routes>
        <Route path="/registro" element={<RegistroPage />} />
        <Route path="/verificar-email" element={<VerificarEmailPage />} />
      </Routes>,
      { ruta: "/registro" },
    );

    await user.type(screen.getByLabelText("Nombre"), "Ana Torres");
    await user.type(screen.getByLabelText("Correo electrónico"), "ana@ejemplo.ec");
    await user.type(screen.getByLabelText("Contraseña"), "abc12345");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "abc12345");
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(screen.getByText(/revisa tu bandeja/i)).toBeInTheDocument();
    });
  });

  it("muestra error de campo para correo duplicado", async () => {
    server.use(
      http.post(`${API}/auth/registro`, () =>
        // `AuthService:51`. El backend NO manda `errores[]`: el motivo viaja
        // entero en `mensaje` y la pantalla lo pinta como error general.
        problema(400, "validacion", "El correo ya está registrado"),
      ),
    );

    const { user } = renderConProviders(<RegistroPage />, { ruta: "/registro" });

    await user.type(screen.getByLabelText("Nombre"), "Ana Torres");
    await user.type(screen.getByLabelText("Correo electrónico"), "duplicado@ejemplo.ec");
    await user.type(screen.getByLabelText("Contraseña"), "abc12345");
    await user.type(screen.getByLabelText("Confirmar contraseña"), "abc12345");
    await user.click(screen.getByRole("button", { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(screen.getByText("El correo ya está registrado")).toBeInTheDocument();
    });
  });
});
