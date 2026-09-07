import { describe, expect, it, vi } from "vitest";
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

  // `ApuResponse` lleva @JsonInclude(NON_NULL) en el backend: cuando el APU
  // hereda el %CI del proyecto la clave `porcentajeIndirecto` NO viene en el
  // JSON, así que en TS es `undefined`, no `null`. Con `!== null` la insignia
  // salía en TODOS los APU. La fixture debe OMITIR la clave, no ponerla a
  // `null`: ponerla a `null` hace pasar el test en falso y es justo lo que
  // enmascaraba el bug.
  it("no muestra Valor propio ni el enlace al valor del proyecto cuando el APU hereda", () => {
    expect(apuDetalleFixture).not.toHaveProperty("porcentajeIndirecto");

    renderConProviders(
      <PieTotales
        apu={apuDetalleFixture}
        onEditarPorcentajeCi={() => Promise.resolve()}
        onAbrirDesglose={() => {}}
      />,
    );

    expect(screen.queryByText("Valor propio")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /usar valor del proyecto/i }),
    ).not.toBeInTheDocument();
  });

  it("ofrece volver al valor del proyecto cuando el APU tiene override propio", () => {
    renderConProviders(
      <PieTotales
        apu={{ ...apuDetalleFixture, porcentajeIndirecto: 0.22 }}
        onEditarPorcentajeCi={() => Promise.resolve()}
        onAbrirDesglose={() => {}}
      />,
    );

    expect(screen.getByText("Valor propio")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /usar valor del proyecto/i })).toBeInTheDocument();
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
  });

  // Plan 052 rebanada 3: el endpoint `GET /apus/{apuId}/calculo` existía ya,
  // pero la forma del DTO no casaba y por eso el botón seguía apagado. El plan
  // 059 alineó `ApuCalculoResponse` (e182d2a), así que el gate ya no describe
  // nada: queda encenderlo.
  it("Desglose está habilitado e invoca onAbrirDesglose", async () => {
    const abrir = vi.fn();
    const { user } = renderConProviders(
      <PieTotales
        apu={apuDetalleFixture}
        onEditarPorcentajeCi={() => Promise.resolve()}
        onAbrirDesglose={abrir}
      />,
    );

    const boton = screen.getByRole("button", { name: /desglose/i });
    expect(boton).toBeEnabled();

    await user.click(boton);
    expect(abrir).toHaveBeenCalled();
  });
});
