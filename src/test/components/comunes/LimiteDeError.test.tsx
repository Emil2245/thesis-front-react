import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LimiteDeError } from "@/components/comunes/LimiteDeError";

function Explota(): never {
  throw new Error("boom");
}

afterEach(() => vi.restoreAllMocks());

describe("LimiteDeError", () => {
  // Ancla del texto: `capturar()` en e2e/screenshots.spec.ts busca esta cadena
  // exacta para detectar pantallas caídas. Si cambia aquí sin cambiar allí, la
  // guarda de las capturas se vuelve inútil en silencio (plan 064).
  it("renderiza el texto exacto que vigilan las capturas E2E", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <LimiteDeError>
        <Explota />
      </LimiteDeError>,
    );
    expect(screen.getByText("Algo salió mal en esta sección.")).toBeInTheDocument();
  });
});
