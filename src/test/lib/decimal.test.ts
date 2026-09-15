import { describe, expect, it } from "vitest";
import {
  asDecimal,
  compararDecimal,
  esCero,
  formatearMoneda,
  formatearNumero,
  formatearPorcentaje,
  parsearEntradaDecimal,
  cuantizar,
  parsearEntradaNumerica,
  porcentajeAFraccion,
  fraccionAPorcentaje,
  ESCALA_DINERO,
  ESCALA_PORCENTAJE,
} from "@/lib/decimal";

describe("formateo es-EC", () => {
  it("formatea moneda con 2 decimales", () => {
    expect(formatearMoneda(asDecimal("61.390000"))).toContain("61.39");
  });

  it("muestra guion largo cuando no hay valor", () => {
    expect(formatearMoneda(null)).toBe("—");
    expect(formatearNumero(undefined)).toBe("—");
  });

  it("trata los porcentajes como fracción (0.1800 → 18 %)", () => {
    expect(formatearPorcentaje(asDecimal("0.1800"))).toMatch(/18\.0000\s?%/);
  });

  it("conserva los decimales significativos de un rendimiento", () => {
    expect(formatearNumero(asDecimal("0.100000"), { min: 2, max: 4 })).toBe("0.10");
  });
});

describe("parsearEntradaDecimal", () => {
  it("acepta coma o punto", () => {
    expect(parsearEntradaDecimal("7,20")).toBe("7.20");
    expect(parsearEntradaDecimal("7.20")).toBe("7.20");
  });

  it("rechaza basura", () => {
    expect(parsearEntradaDecimal("abc")).toBeNull();
    expect(parsearEntradaDecimal("")).toBeNull();
    expect(parsearEntradaDecimal("1.2.3")).toBeNull();
  });

  it("no pierde precisión: 14 dígitos con 6 decimales sobreviven", () => {
    expect(parsearEntradaDecimal("12345678.123456")).toBe("12345678.123456");
  });
});

describe("esCero", () => {
  it.each(["0", "0.00", "0.000000", "-0.0"])("%s es cero", (v) => {
    expect(esCero(asDecimal(v))).toBe(true);
  });
  it.each(["0.000001", "1", "-3.5"])("%s no es cero", (v) => {
    expect(esCero(asDecimal(v))).toBe(false);
  });

  it.each([0, 0.0])("%s (número) es cero", (v) => {
    expect(esCero(v)).toBe(true);
  });
  it("1 (número) no es cero", () => {
    expect(esCero(1)).toBe(false);
  });
  it("null/undefined son cero", () => {
    expect(esCero(null)).toBe(true);
    expect(esCero(undefined)).toBe(true);
  });
});

describe("compararDecimal", () => {
  it("ordena ascendente", () => {
    const xs = ["10.5", "2.25", "100"].map(asDecimal);
    expect([...xs].sort(compararDecimal)).toEqual(["2.25", "10.5", "100"]);
  });
});

describe("cuantizar", () => {
  it("mata el decimal fantasma de la resta de totales reales del proyecto", () => {
    expect(395115.32 - 355603.788).not.toBe(39511.532);
    expect(cuantizar(395115.32 - 355603.788, ESCALA_DINERO)).toBe(39511.532);
  });

  it("mata el 0.1 + 0.2", () => {
    expect(cuantizar(0.1 + 0.2, ESCALA_DINERO)).toBe(0.3);
  });

  it("recorta a la escala pedida", () => {
    expect(cuantizar(1.23456789, ESCALA_DINERO)).toBe(1.234568);
    expect(cuantizar(1.23456789, ESCALA_PORCENTAJE)).toBe(1.2346);
  });
});

describe("parsearEntradaNumerica", () => {
  it("acepta coma decimal y devuelve número", () => {
    expect(parsearEntradaNumerica("12,5", ESCALA_PORCENTAJE)).toBe(12.5);
  });

  it("cuantiza lo que el usuario teclea con más decimales de la cuenta", () => {
    expect(parsearEntradaNumerica("1.23456789", ESCALA_DINERO)).toBe(1.234568);
  });

  it("rechaza basura y vacío", () => {
    expect(parsearEntradaNumerica("abc", ESCALA_DINERO)).toBeNull();
    expect(parsearEntradaNumerica("", ESCALA_DINERO)).toBeNull();
  });
});

describe("porcentaje ↔ fracción", () => {
  it("12,5 % es la fracción 0.125", () => {
    expect(porcentajeAFraccion(12.5)).toBe(0.125);
  });

  it("la fracción 0.29 es 29 %, sin cola de float", () => {
    expect(Number("0.2900") * 100).not.toBe(29);
    expect(fraccionAPorcentaje(asDecimal("0.2900"))).toBe(29);
  });

  it("ida y vuelta conserva el valor", () => {
    expect(fraccionAPorcentaje(porcentajeAFraccion(18))).toBe(18);
  });
});
