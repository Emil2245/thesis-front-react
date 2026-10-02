import { describe, expect, it } from "vitest";

import { asDecimal } from "@/lib/decimal";
import {
  cuerpoProgramacion,
  detectarFijos,
  repartir,
} from "@/features/cronograma/components/programacionGantt";

// Lo que sale de aquí viaja tal cual en `REEMPLAZAR_AVANCES`: si la suma no
// cuadra con el peso, la actividad queda en BORRADOR y bloquea la exportación.
const mapa = (valores: Record<string, string>) =>
  Object.fromEntries(Object.entries(valores).map(([p, v]) => [p, asDecimal(v)]));

const suma = (reparto: Record<number, number>) =>
  Object.values(reparto).reduce((total, valor) => total + valor, 0);

describe("programacionGantt", () => {
  it("un reparto uniforme del backend, residual incluido, no tiene fijos", () => {
    expect(detectarFijos(mapa({ "1": "3.6036", "2": "3.6036", "3": "3.6036" }))).toEqual({});
    expect(detectarFijos(mapa({ "1": "1.3514", "2": "1.3513" }))).toEqual({});
  });

  it("el mes distinto al resto es el fijo", () => {
    expect(detectarFijos(mapa({ "1": "6.0000", "2": "2.4054", "3": "2.4054" }))).toEqual({
      1: 60000,
    });
    // Empate de dos: el libre es el del último mes, donde el backend deja el residual.
    expect(detectarFijos(mapa({ "2": "7.0000", "4": "3.8108" }))).toEqual({ 2: 70000 });
  });

  it("conserva los fijos y reparte el resto con suma exacta al peso", () => {
    const reparto = repartir([1, 2, 3, 4], 108108, { 2: 70000 });
    expect(reparto).toEqual({ 1: 12702, 2: 70000, 3: 12702, 4: 12704 });
    expect(suma(reparto)).toBe(108108);
  });

  it("sin meses libres, el último absorbe la diferencia", () => {
    expect(repartir([1, 2], 100000, { 1: 30000, 2: 30000 })).toEqual({ 1: 30000, 2: 70000 });
  });

  it("si los fijos ya no caben en el peso, vuelve al reparto uniforme", () => {
    expect(cuerpoProgramacion([1, 2], 50000, { 1: 60000 })).toEqual({
      operacion: "REEMPLAZAR_AVANCES",
      avancePorPeriodo: { "1": "2.5000", "2": "2.5000" },
    });
  });

  it("sin fijos deja el reparto al backend", () => {
    expect(cuerpoProgramacion([3, 1], 108108, {})).toEqual({
      operacion: "DISTRIBUIR_UNIFORME",
      periodos: [1, 3],
    });
  });
});
