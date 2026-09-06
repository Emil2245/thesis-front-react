import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { http } from "msw";

import { renderConProviders } from "@/test/render";
import { server } from "@/test/server";
import { problema } from "@/test/handlers";
import { espiar, ultima } from "@/test/espia";
import { RestablecerPage } from "@/features/auth/pages/RestablecerPage";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const API = "*/api/v1";
const RUTA = "/api/v1";
const TOKEN = "tok-de-la-ruta-123";

function render() {
  return renderConProviders(
    <Routes>
      <Route path="/restablecer/:token" element={<RestablecerPage />} />
    </Routes>,
    { ruta: `/restablecer/${TOKEN}` },
  );
}

async function rellenarYEnviar(user: ReturnType<typeof render>["user"]) {
  await user.type(screen.getByLabelText(/nueva contraseña/i), "nueva1234");
  await user.type(screen.getByLabelText(/confirmar contraseña/i), "nueva1234");
  await user.click(screen.getByRole("button", { name: /restablecer/i }));
}

describe("RestablecerPage", () => {
  // El token vive en la ruta, no en el formulario: si se perdiera, el backend
  // recibiría `{ token: undefined }` y respondería 400 sin pista para el
  // usuario. Por eso se afirma el cuerpo entero.
  it("manda POST /auth/restablecer con el token de la ruta y las dos contraseñas", async () => {
    const peticiones = espiar();
    const { user } = render();

    await rellenarYEnviar(user);

    await waitFor(() => {
      const p = ultima(peticiones, "POST", "/auth/restablecer");
      expect(p?.ruta).toBe(`${RUTA}/auth/restablecer`);
      expect(p?.cuerpo).toEqual({
        token: TOKEN,
        password: "nueva1234",
        passwordConfirmacion: "nueva1234",
      });
    });
  });

  it("tras el éxito ofrece volver al login", async () => {
    const { user } = render();

    await rellenarYEnviar(user);

    expect(await screen.findByText(/restablecida exitosamente/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /iniciar sesión/i })).toHaveAttribute("href", "/login");
  });

  it("con token expirado explica el problema y ofrece pedir otro enlace", async () => {
    server.use(
      http.post(`${API}/auth/restablecer`, () =>
        problema(400, "token-invalido-o-expirado", "Token inválido o expirado"),
      ),
    );
    const { user } = render();

    await rellenarYEnviar(user);

    expect(await screen.findByText(/el enlace ha expirado/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /solicitar nuevo enlace/i })).toHaveAttribute(
      "href",
      "/recuperar",
    );
  });

  it("no envía nada si las contraseñas no coinciden", async () => {
    const peticiones = espiar();
    const { user } = render();

    await user.type(screen.getByLabelText(/nueva contraseña/i), "nueva1234");
    await user.type(screen.getByLabelText(/confirmar contraseña/i), "otra12345");
    await user.click(screen.getByRole("button", { name: /restablecer/i }));

    expect(await screen.findByText("Las contraseñas no coinciden")).toBeInTheDocument();
    expect(peticiones).toHaveLength(0);
  });
});
