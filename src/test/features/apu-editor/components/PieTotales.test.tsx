import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen } from "@testing-library/react";
import { PieTotales } from "@/features/apu-editor/components/PieTotales";
import { apuDetalleFixture } from "@/test/fixtures/apu";
import type { ApuResponse } from "@/api/contract";

function apuConPorcentajePropio(): ApuResponse {
  return {
    ...apuDetalleFixture,
    porcentajeIndirecto: 0.2,
    porcentajeIndirectoEfectivo: 0.2,
  };
}

describe("PieTotales", () => {
  it("muestra CD, CI y CT normales", () => {
    renderConProviders(
      <PieTotales
        apu={apuDetalleFixture}
        onEditarPorcentajeCi={() => Promise.resolve()}
        onAbrirDesglose={() => {}}
      />,
    );
    expect(screen.getByText("Costo Directo")).toBeInTheDocument();
    expect(screen.getByText("Costo Indirecto")).toBeInTheDocument();
    expect(screen.getByText("Costo Total")).toBeInTheDocument();
  });

  it("nunca muestra CD Ajustado (el backend no expone ese campo)", () => {
    renderConProviders(
      <PieTotales
        apu={apuDetalleFixture}
        onEditarPorcentajeCi={() => Promise.resolve()}
        onAbrirDesglose={() => {}}
      />,
    );
    expect(screen.queryByText("CD Ajustado")).not.toBeInTheDocument();
  });

  it("muestra badge Valor propio cuando porcentajeIndirecto no es null", () => {
    renderConProviders(
      <PieTotales
        apu={apuConPorcentajePropio()}
        onEditarPorcentajeCi={() => Promise.resolve()}
        onAbrirDesglose={() => {}}
      />,
    );
    expect(screen.getByText("Valor propio")).toBeInTheDocument();
  });

  // El descuento de rubro no está pendiente: fue retirado (plan backend 015 y
  // rollout docs 2026-08-31, P-24/S-24 WITHDRAWN). Dejar el botón deshabilitado
  // prometía algo que el backend decidió no tener.
  it("no ofrece ningún control de descuento del rubro", () => {
    renderConProviders(
      <PieTotales
        apu={apuDetalleFixture}
        onEditarPorcentajeCi={() => Promise.resolve()}
        onAbrirDesglose={() => {}}
      />,
    );
    expect(screen.queryByRole("button", { name: /descuento/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/El descuento se aplica al costo directo/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /desglose/i })).toBeDisabled();
  });
});
