import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen } from "@testing-library/react";
import { PieTotales } from "./PieTotales";
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
        onAbrirDescuento={() => {}}
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
        onAbrirDescuento={() => {}}
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
        onAbrirDescuento={() => {}}
        onAbrirDesglose={() => {}}
      />,
    );
    expect(screen.getByText("Valor propio")).toBeInTheDocument();
  });

  it("muestra botones Descuento y Desglose deshabilitados (sin endpoint en el backend)", () => {
    renderConProviders(
      <PieTotales
        apu={apuDetalleFixture}
        onEditarPorcentajeCi={() => Promise.resolve()}
        onAbrirDescuento={() => {}}
        onAbrirDesglose={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /descuento/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /desglose/i })).toBeDisabled();
  });
});
