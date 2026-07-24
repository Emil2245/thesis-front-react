import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import { VerificarEmailPage } from "./VerificarEmailPage";

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
        HttpResponse.json(
          { type: "/problemas/token-invalido-o-expirado", title: "Expirado", status: 410 },
          { status: 410, headers: { "Content-Type": "application/problem+json" } },
        ),
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
