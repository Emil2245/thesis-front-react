import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COMPONENTE_META } from "@/features/presupuesto/components/ResumenComponentes";

// Tailwind v4 genera `bg-<nombre>` a partir de `--color-<nombre>` declarado en
// `@theme inline`. Una variable definida sólo en `:root` NO produce utilidad:
// la clase existe en el TSX, no falla en build y simplemente no pinta nada.
// Así se coló `bg-chart-1`, que dejaba «Equipo» sin punto de color ni segmento
// de barra en el desglose. Esto no se ve en un test de render (jsdom no aplica
// CSS de Tailwind), así que la guarda lee el CSS fuente.
const css = readFileSync("src/index.css", "utf8");
const temaInline = /@theme inline\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";

function estaMapeada(nombre: string): boolean {
  return new RegExp(`--color-${nombre}\\s*:`).test(temaInline);
}

describe("ResumenComponentes / tokens de color", () => {
  it("toda clase bg-* del desglose tiene su --color-* en @theme inline", () => {
    expect(temaInline).not.toBe("");

    const sinMapear = Object.values(COMPONENTE_META)
      .map((meta) => meta.color.replace(/^bg-/, ""))
      .filter((nombre) => !estaMapeada(nombre));

    expect(sinMapear).toEqual([]);
  });

  it("no queda ninguna variable --chart-* definida y sin mapear", () => {
    const definidas = [...css.matchAll(/^\s*--(chart-\d+)\s*:/gm)].map((m) => m[1]);
    const sinMapear = [...new Set(definidas)].filter((nombre) => !estaMapeada(nombre));

    expect(sinMapear).toEqual([]);
  });
});
