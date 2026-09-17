import { describe, expect, it } from "vitest";
import type { CapituloResponse } from "@/api/contract";
import { asDecimal } from "@/lib/decimal";
import { compararItem, ordenarCapitulos } from "@/lib/ordenItem";

describe("compararItem", () => {
  it("ordena naturalmente los segmentos numéricos", () => {
    expect(["1.12", "1.2", "1.1", "1.10"].sort(compararItem)).toEqual([
      "1.1",
      "1.2",
      "1.10",
      "1.12",
    ]);
  });

  it("pone el padre antes que sus hijos", () => {
    expect(["2.1", "2", "2.10"].sort(compararItem)).toEqual(["2", "2.1", "2.10"]);
  });

  it("no revienta con segmentos no numéricos ni vacíos", () => {
    expect(() => ["1.a", "1.2", "1..2"].sort(compararItem)).not.toThrow();
    expect(compararItem("1.a", "1.2")).not.toBe(0);
  });
});

function capitulo(item: string, rubros: string[] = []): CapituloResponse {
  return {
    id: `cap-${item}`,
    item,
    descripcion: `Capítulo ${item}`,
    orden: Number(item.split(".").at(-1)),
    total: asDecimal("0.000000"),
    subcapitulos: [],
    rubros: rubros.map((itemRubro) => ({
      id: `rub-${itemRubro}`,
      item: itemRubro,
      codigo: `APU-${itemRubro}`,
      descripcion: `Rubro ${itemRubro}`,
      unidad: "u",
      cantidad: asDecimal("1.000000"),
      precioUnitario: asDecimal("1.000000"),
      precioTotal: asDecimal("1.000000"),
      apuId: `apu-${itemRubro}`,
    })),
  };
}

describe("ordenarCapitulos", () => {
  it("ordena en profundidad sin mutar la entrada", () => {
    const entrada: CapituloResponse[] = [
      { ...capitulo("2"), subcapitulos: [] },
      {
        ...capitulo("1"),
        subcapitulos: [capitulo("1.10", ["1.10.2", "1.10.1"]), capitulo("1.2"), capitulo("1.1")],
      },
    ];
    const antes = structuredClone(entrada);

    const ordenados = ordenarCapitulos(entrada);

    expect(ordenados.map((c) => c.item)).toEqual(["1", "2"]);
    expect(ordenados[0].subcapitulos.map((c) => c.item)).toEqual(["1.1", "1.2", "1.10"]);
    expect(ordenados[0].subcapitulos[2].rubros.map((r) => r.item)).toEqual(["1.10.1", "1.10.2"]);
    expect(entrada).toEqual(antes);
  });
});
