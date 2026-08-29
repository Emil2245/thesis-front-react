import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen, waitFor } from "@testing-library/react";
import { RecuperarPage } from "@/features/auth/pages/RecuperarPage";

describe("RecuperarPage", () => {
  it("muestra mensaje genérico siempre (anti-enumeración)", async () => {
    const { user } = renderConProviders(<RecuperarPage />, { ruta: "/recuperar" });

    await user.type(screen.getByLabelText("Correo electrónico"), "cualquiera@ejemplo.ec");
    await user.click(screen.getByRole("button", { name: /enviar enlace/i }));

    await waitFor(() => {
      expect(screen.getByText(/si el correo ingresado está registrado/i)).toBeInTheDocument();
    });
  });
});
