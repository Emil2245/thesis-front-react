import { describe, expect, it } from "vitest";
import { renderConProviders } from "@/test/render";
import { screen } from "@testing-library/react";
import { EncabezadoApu } from "@/features/apu-editor/components/EncabezadoApu";
import { apuDetalleFixture } from "@/test/fixtures/apu";

describe("EncabezadoApu", () => {
  it("muestra código y descripción del APU", () => {
    renderConProviders(
      <EncabezadoApu apu={apuDetalleFixture} onEditar={() => Promise.resolve()} />,
    );
    expect(screen.getByText(apuDetalleFixture.codigo)).toBeInTheDocument();
    expect(screen.getByText(apuDetalleFixture.descripcion)).toBeInTheDocument();
  });
});
