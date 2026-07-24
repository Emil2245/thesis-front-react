import { describe, expect, it } from "vitest";
import {
  asDecimal,
  compararDecimal,
  esCero,
  formatearMoneda,
  formatearNumero,
  formatearPorcentaje,
  parsearEntradaDecimal,
} from "./decimal";

describe("formateo es-EC", () => {
  it("formatea moneda con 2 decimales", () => {
    expect(formatearMoneda(asDecimal("61.390000"))).toContain("61,39");
  });

  it("muestra guion largo cuando no hay valor", () => {
    expect(formatearMoneda(null)).toBe("—");
    expect(formatearNumero(undefined)).toBe("—");
  });

  it("trata los porcentajes como fracción (0.1800 → 18 %)", () => {
    expect(formatearPorcentaje(asDecimal("0.1800"))).toMatch(/18,00\s?%/);
  });

  it("conserva los decimales significativos de un rendimiento", () => {
    expect(formatearNumero(asDecimal("0.100000"), { min: 2, max: 4 })).toBe("0,10");
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
});

describe("compararDecimal", () => {
  it("ordena ascendente", () => {
    const xs = ["10.5", "2.25", "100"].map(asDecimal);
    expect([...xs].sort(compararDecimal)).toEqual(["2.25", "10.5", "100"]);
  });
});
