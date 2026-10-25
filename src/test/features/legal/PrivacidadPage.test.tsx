import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderConProviders } from "@/test/render";
import { PrivacidadPage } from "@/features/legal/pages/PrivacidadPage";

describe("PrivacidadPage", () => {
  it("muestra la política y el contacto configurable", () => {
    renderConProviders(<PrivacidadPage />, { ruta: "/privacidad" });
    expect(screen.getByText("Política de privacidad")).toBeInTheDocument();
    expect(screen.getByText(/privacidad@example\.invalid/)).toBeInTheDocument();
  });
});
