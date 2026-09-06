import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderConProviders } from "@/test/render";
import { ComparadorVersiones } from "@/features/presupuesto/components/ComparadorVersiones";
import { asDecimal } from "@/lib/decimal";
import type { ComparacionVersionesResponse } from "@/api/contract";

// Totales reales del proyecto IESS de referencia. Su resta en float64 da
// 39511.53200000001: el frontend no hace aritmética de dinero (ADR 9), así que
// la diferencia no se muestra hasta que el backend la mande calculada.
const data: ComparacionVersionesResponse = {
  versiones: [
    {
      presupuestoId: 1,
      version: 1,
      totalGeneral: asDecimal("355603.788000"),
      porCapituloRaiz: [
        { item: "1", descripcion: "Preliminares", total: asDecimal("120000.000000") },
      ],
    },
    {
      presupuestoId: 2,
      version: 2,
      totalGeneral: asDecimal("395115.320000"),
      porCapituloRaiz: [
        { item: "1", descripcion: "Preliminares", total: asDecimal("200000.000000") },
      ],
    },
  ],
};

describe("ComparadorVersiones", () => {
  it("muestra los dos totales generales", () => {
    renderConProviders(<ComparadorVersiones data={data} isLoading={false} />);
    expect(screen.getByText(/355\.603,79/)).toBeInTheDocument();
    expect(screen.getByText(/395\.115,32/)).toBeInTheDocument();
  });

  it("no calcula la diferencia de totales en el cliente", () => {
    renderConProviders(<ComparadorVersiones data={data} isLoading={false} />);
    expect(screen.queryByText(/39\.511,53/)).not.toBeInTheDocument();
  });

  it("no calcula la diferencia por capítulo en el cliente", () => {
    renderConProviders(<ComparadorVersiones data={data} isLoading={false} />);
    expect(screen.getByText(/120\.000,00/)).toBeInTheDocument();
    expect(screen.getByText(/200\.000,00/)).toBeInTheDocument();
    expect(screen.queryByText(/80\.000,00/)).not.toBeInTheDocument();
  });
});
