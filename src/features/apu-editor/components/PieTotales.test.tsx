import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen } from "@testing-library/react";
import { PieTotales } from "./PieTotales";
import { apuDetalleFixture } from "@/test/fixtures/apu";
import type { ApuResponse } from "@/api/contract";

function apuAuxiliar(): ApuResponse {
  return { ...apuDetalleFixture, esAuxiliar: true, costoTotal: "800.000000" as never };
}

function apuConDescuento(): ApuResponse {
  return {
    ...apuDetalleFixture,
    porcentajeDescuento: "5.000000" as never,
    cdAjustado: "760.000000" as never,
  };
}

function apuConPorcentajePropio(): ApuResponse {
  return {
    ...apuDetalleFixture,
    porcentajeIndirecto: "0.200000" as never,
    porcentajeIndirectoEfectivo: "0.200000" as never,
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

  it("cuando esAuxiliar=true, oculta fila CI y CT label dice CT = CD", () => {
    renderConProviders(
      <PieTotales
        apu={apuAuxiliar()}
        onEditarPorcentajeCi={() => Promise.resolve()}
        onAbrirDescuento={() => {}}
        onAbrirDesglose={() => {}}
      />,
    );
    expect(screen.queryByText("Costo Indirecto")).not.toBeInTheDocument();
    expect(screen.queryByText("% CI")).not.toBeInTheDocument();
    expect(screen.getByText("Costo total (CT = CD)")).toBeInTheDocument();
  });

  it("muestra CD Ajustado solo cuando hay descuento", () => {
    renderConProviders(
      <PieTotales
        apu={apuConDescuento()}
        onEditarPorcentajeCi={() => Promise.resolve()}
        onAbrirDescuento={() => {}}
        onAbrirDesglose={() => {}}
      />,
    );
    expect(screen.getByText("CD Ajustado")).toBeInTheDocument();
  });

  it("no muestra CD Ajustado cuando descuento es cero", () => {
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

  it("muestra botones Descuento y Desglose", () => {
    renderConProviders(
      <PieTotales
        apu={apuDetalleFixture}
        onEditarPorcentajeCi={() => Promise.resolve()}
        onAbrirDescuento={() => {}}
        onAbrirDesglose={() => {}}
      />,
    );
    expect(screen.getByText("Descuento")).toBeInTheDocument();
    expect(screen.getByText("Desglose")).toBeInTheDocument();
  });
});
