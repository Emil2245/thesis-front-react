import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { http } from "msw";
import { problema } from "@/test/handlers";
import { server } from "@/test/server";
import { VerificarEmailPage } from "@/features/auth/pages/VerificarEmailPage";

const API = "*/api/v1";

describe("VerificarEmailPage", () => {
  it("muestra éxito con token válido", async () => {
    renderConProviders(<VerificarEmailPage />, { ruta: "/verificar-email?token=valido" });

    await waitFor(() => {
      expect(screen.getByText(/correo verificado/i)).toBeInTheDocument();
    });
  });

  it("muestra expirado con token inválido", async () => {
    server.use(
      http.post(`${API}/auth/verificar-email`, () =>
        problema(410, "token-invalido-o-expirado", "Token inválido o expirado"),
      ),
    );

    renderConProviders(<VerificarEmailPage />, { ruta: "/verificar-email?token=expirado" });

    await waitFor(() => {
      expect(screen.getByText(/enlace ha expirado/i)).toBeInTheDocument();
    });
  });

  it("muestra estado revisar sin token", () => {
    renderConProviders(<VerificarEmailPage />, { ruta: "/verificar-email?email=ana@ejemplo.ec" });

    expect(screen.getByText(/revisa tu bandeja/i)).toBeInTheDocument();
  });
});
