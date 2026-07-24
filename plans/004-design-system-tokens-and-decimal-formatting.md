# 004 — Design system: tokens, base components, and es-EC decimal formatting

- **Status:** TODO
- **Written against:** repo state after plans 001–003. Spec repo `/home/etverkade/workspace/thesis-docs` at commit `d7508eb`.
- **Depends on:** 001 (shadcn init), 002 (`Decimal` type), 003 (test harness).
- **Blocks:** 005–014 (every screen uses these tokens, components and formatters).
- **Covers:** `../thesis-docs/plan/design/01-ui-ux-design.md §2, §7, §8`; the cross-cutting component rows of `../thesis-docs/plan/frontend/02-shadcn-components.md §1`.

---

## 1. Why this matters

Two independent jobs, both foundational:

**(a) The design tokens.** `design/01 §2` specifies a 60-30-10 colour discipline, tabular numerals in every cost column, compact grid density, and `es-EC` / USD number formatting. It also names the design-token definition as a **thesis deliverable** (`design/01 §9`). Fix it once here and every screen inherits it; leave it to each screen and the app ends up with four different table densities.

**(b) Decimal formatting — the correctness-critical half.** Money and percentages arrive from the API as decimal strings (`"61.390000"`, `07-api-contract.md §1`), precisely so JavaScript's binary floats never touch them. The thesis's headline dependent variable is `exactitud_calculo`: **0 % deviation** (RNF-01). If a screen does `Number(dto.costoTotal).toFixed(2)`, the number displayed is no longer provably the number the engine computed — and rounding to 2 decimals is specified to happen **only at export**, server-side (`07-api-contract.md §8`, RNF-01).

So: this plan builds display-only formatters that go string → string, and forbids the arithmetic path.

## 2. Current state

`src/lib/utils.ts` (shadcn's `cn`) and `src/lib/decimal.ts` (the branded `Decimal` type from plan 002, containing only `Decimal`, `asDecimal`, `DECIMAL_ZERO`) exist. `src/components/ui/` is empty. No colours have been chosen beyond shadcn's default theme.

## 3. Files in scope

- `src/lib/decimal.ts` (extend), `src/lib/decimal.test.ts` (create)
- `src/index.css` (edit — CSS variables / tokens)
- `src/components/ui/**` (create via the shadcn CLI)
- `src/components/comunes/**` (create — small app-level primitives, see Step 5)
- `src/test/handlers.ts` (untouched here)

**Out of scope:** `src/features/**`, `src/shell/**`. **Never edit `plans/`** beyond this file's `Status:` and `plans/README.md`'s table. **Never write to `../thesis-docs`.**

## 4. Steps

### Step 1 — Decimal formatting helpers

Extend `src/lib/decimal.ts`. Everything below is **display-only**: input is a `Decimal` string, output is a display string. No `Number` ever round-trips back into state or into a request body.

```ts
/**
 * Formateo de valores decimales para PRESENTACIÓN.
 *
 * Regla dura (RNF-01, ADR 9): el cliente nunca calcula ni redondea valores que
 * viajen de vuelta al servidor. Estas funciones producen strings para mostrar.
 * El redondeo "de verdad" (2 dp) ocurre solo en el export, server-side
 * (architecture/07 §8).
 */

const LOCALE = "es-EC";

/** Formatea un Decimal como moneda USD: "61.39" → "$ 61,39". */
export function formatearMoneda(valor: Decimal | null | undefined, dp = 2): string {
  if (valor == null || valor === "") return "—";
  const n = Number(valor);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  }).format(n);
}

/** Formatea un Decimal como número plano: "7.200000" → "7,20". */
export function formatearNumero(
  valor: Decimal | null | undefined,
  { min = 2, max = 4 }: { min?: number; max?: number } = {},
): string {
  if (valor == null || valor === "") return "—";
  const n = Number(valor);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  }).format(n);
}

/**
 * Formatea una fracción decimal como porcentaje: "0.2000" → "20,00 %".
 * OJO: la API envía porcentajes como FRACCIÓN ("0.1800" = 18 %) —
 * ver ParametrosProyectoActualizarRequest en architecture/07 §11.
 */
export function formatearPorcentaje(valor: Decimal | null | undefined, dp = 2): string {
  if (valor == null || valor === "") return "—";
  const n = Number(valor);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(LOCALE, {
    style: "percent",
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  }).format(n);
}

/**
 * Convierte lo que el usuario escribe (coma o punto decimal) en el string
 * decimal que espera la API. Sin aritmética: normaliza el separador y valida
 * la forma. Devuelve null si no es un decimal válido.
 */
export function parsearEntradaDecimal(entrada: string): Decimal | null {
  const limpio = entrada.trim().replace(/\s/g, "").replace(",", ".");
  if (limpio === "") return null;
  if (!/^-?\d+(\.\d+)?$/.test(limpio)) return null;
  return asDecimal(limpio);
}

/** Comparación de Decimals sin convertir a number (para ordenar tablas). */
export function compararDecimal(a: Decimal, b: Decimal): number {
  const na = Number(a);
  const nb = Number(b);
  // Se permite aquí porque el resultado es un ORDEN, nunca un valor mostrado
  // ni enviado. Documentado a propósito.
  return na === nb ? 0 : na < nb ? -1 : 1;
}

/** ¿Es cero? Sin float: "0", "0.00", "0.000000" son todos cero. */
export function esCero(valor: Decimal | null | undefined): boolean {
  if (valor == null) return true;
  return /^-?0+(\.0+)?$/.test(valor.trim());
}
```

Note the honesty in `compararDecimal` and in the formatters: they *do* touch `Number`, but only to produce an ordering or a display string that never returns to the server. The comment says so. That is the line — do not let a later plan blur it.

`esCero` is regex-based rather than `Number(v) === 0` because it is used for the P-32 integrity alerts (`PU = 0`, `cantidad = 0`) where a false negative shows the user a wrong warning badge.

**Verify:** `npm run typecheck` exits 0.

### Step 2 — Tests for the formatters (write these; they are cheap and they matter)

Create `src/lib/decimal.test.ts`:

```ts
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
```

**Verify:** `npm test` exits 0 with these passing. If `formatearMoneda` produces `US$ 61,39` or `$61,39` depending on the Node ICU build, relax the assertion to `toContain("61,39")` (already written that way) rather than changing the formatter.

### Step 3 — Colour tokens (60-30-10)

`design/01 §2` maps the discipline onto shadcn's CSS variables explicitly: *"`background`/`card` (60), `secondary`/`muted`/`sidebar` (30), `primary`/`accent`/`ring` (10)"*, with semantic green/amber/red **outside** the ratio.

Edit `src/index.css`. Keep shadcn's generated variable block and set the values to a professional blue accent over a neutral slate base, then add the four semantic tokens shadcn does not ship:

```css
@layer base {
  :root {
    /* — 10 %: acento (azul profesional). Solo acciones, nav activa, foco. — */
    --primary: oklch(0.55 0.16 255);
    --primary-foreground: oklch(0.98 0 0);
    --ring: oklch(0.55 0.16 255);

    /* — Semánticos (fuera de la proporción 60-30-10): señales funcionales — */
    --exito: oklch(0.60 0.13 150);
    --exito-foreground: oklch(0.98 0 0);
    --advertencia: oklch(0.75 0.15 80);
    --advertencia-foreground: oklch(0.25 0 0);
    --peligro: oklch(0.58 0.20 25);
    --peligro-foreground: oklch(0.98 0 0);

    /* — Densidad de grid (design/01 §2: compacto para tablas) — */
    --altura-fila-grid: 2rem;
  }
}
```

Leave `--background`, `--card`, `--secondary`, `--muted`, `--sidebar` at shadcn's neutral defaults — those *are* the 60 and the 30.

Then expose the semantic tokens to Tailwind v4 via `@theme` in the same file:

```css
@theme inline {
  --color-exito: var(--exito);
  --color-exito-foreground: var(--exito-foreground);
  --color-advertencia: var(--advertencia);
  --color-advertencia-foreground: var(--advertencia-foreground);
  --color-peligro: var(--peligro);
  --color-peligro-foreground: var(--peligro-foreground);
}
```

Dark mode is **low priority** (`design/01 §2` "Light default; dark mode optional") and an open decision (`design/01 §10.2`). Set the `.dark` block to shadcn's defaults and move on — do not invest in tuning it.

**Verify:** `npm run build` succeeds; `npm run dev` shows a page where a `bg-primary` element is blue.

### Step 4 — Tabular numerals

`design/01 §2`: *"tabular/monospaced numerals for all cost columns (alignment matters in dense grids)"*. Add a utility class in `src/index.css`:

```css
@layer utilities {
  /* Cifras de ancho fijo: obligatorio en toda columna de costo/cantidad. */
  .num {
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum";
    text-align: right;
  }
}
```

**Convention every later plan must follow:** any table cell showing money, a quantity, a yield, or a percentage carries `className="num"`.

### Step 5 — Install the cross-cutting shadcn components

`02-shadcn-components.md §4` gives the install batches. Install only the cross-cutting set now; feature-specific components arrive with their plan (XP simplicity, §5 of that doc).

```bash
npx shadcn@4 add button card badge separator skeleton sonner alert alert-dialog \
  dialog dropdown-menu tooltip popover input label field select textarea checkbox \
  table scroll-area tabs
```

**Verify:** `ls src/components/ui/` lists ~20 files; `npm run build` exits 0; `npm run lint` exits 0 (if shadcn's generated code trips a lint rule, add a narrow `eslint-disable` **inside `src/components/ui/` only**, or add that directory to the lint ignore list — do not weaken the rule globally).

### Step 6 — App-level primitives

Create `src/components/comunes/` — thin wrappers that encode the repeated decisions so screens don't re-derive them.

`src/components/comunes/Moneda.tsx`:

```tsx
import { formatearMoneda } from "@/lib/decimal";
import type { Decimal } from "@/lib/decimal";
import { cn } from "@/lib/utils";

/** Muestra un valor monetario con cifras tabulares y alineado a la derecha. */
export function Moneda({
  valor,
  dp = 2,
  className,
}: {
  valor: Decimal | null | undefined;
  dp?: number;
  className?: string;
}) {
  return <span className={cn("num", className)}>{formatearMoneda(valor, dp)}</span>;
}
```

Do the same for `Numero.tsx` and `Porcentaje.tsx`.

`src/components/comunes/EstadoVacio.tsx` — `design/01 §7`: *"every table/module has a first-run empty state with a primary CTA"*:

```tsx
import type { ReactNode } from "react";

export function EstadoVacio({
  titulo,
  descripcion,
  accion,
  icono,
}: {
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
  icono?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
      {icono}
      <h3 className="text-lg font-medium">{titulo}</h3>
      {descripcion ? (
        <p className="max-w-md text-sm text-muted-foreground">{descripcion}</p>
      ) : null}
      {accion}
    </div>
  );
}
```

`src/components/comunes/CargandoTabla.tsx` — skeleton rows for TanStack Query loading states (`design/01 §7`).

`src/components/comunes/ConfirmarDestructivo.tsx` — wraps shadcn's `AlertDialog`; every destructive action in the app goes through it (`design/01 §7`, and TC-P44-01 asserts *"confirmación en toda acción destructiva"*). Props: `titulo`, `descripcion`, `textoConfirmar` (default `"Eliminar"`), `onConfirmar`, `children` (the trigger).

`src/components/comunes/ChipEstado.tsx` — the status chips (`conforme` / `no conforme` / `borrador` / `en proceso` / `finalizado` / `vigente` / `auxiliar` / `desactualizado`), using the semantic tokens from Step 3. **Colour is never the only signal** (`design/01 §8`): every chip carries an icon or text, not just a hue.

**Verify:** write `src/components/comunes/Moneda.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { asDecimal } from "@/lib/decimal";
import { Moneda } from "./Moneda";

it("muestra el valor con cifras tabulares", () => {
  render(<Moneda valor={asDecimal("1234.500000")} />);
  const el = screen.getByText(/1\.234,50/);
  expect(el).toHaveClass("num");
});
```

`npm test` exits 0.

### Step 7 — Toaster mount

`sonner` is the app's toast (`02-shadcn-components.md §1`, cross-cutting). Mount `<Toaster richColors position="top-right" />` once in `src/App.tsx`. Screens call `toast.success(...)` / `toast.error(...)` from `sonner` directly.

**Verify:** `npm run build` exits 0.

### Step 8 — Document the design tokens (thesis deliverable)

`design/01 §9` lists *"a documented design-token/palette spec"* as a thesis deliverable. Create `src/components/comunes/README.md` recording: the 60-30-10 assignment of shadcn variables, the semantic tokens and their meanings, the `.num` rule, the density value, and the `es-EC`/USD formatting rules. Keep it short — it exists so the thesis chapter can cite something real.

### Step 9 — Commit

```bash
npm run verify
git add -A && git commit -m "feat(ui): design tokens, es-EC decimal formatting, cross-cutting components"
```

## 5. Done criteria (machine-checkable)

| Command | Expected |
|---|---|
| `npm run verify` | exit 0 |
| `npm test -- decimal` | ≥ 14 assertions passing |
| `grep -c "font-variant-numeric" src/index.css` | ≥ 1 |
| `grep -c -- "--exito\|--advertencia\|--peligro" src/index.css` | ≥ 3 |
| `ls src/components/ui \| wc -l` | ≥ 18 |
| `test -f src/components/comunes/{Moneda,EstadoVacio,ConfirmarDestructivo,ChipEstado}.tsx` | exit 0 |
| `grep -rn "toFixed\|parseFloat" src/features src/components \| wc -l` | `0` |

That last one is the important gate: **no `toFixed`, no `parseFloat` anywhere outside `src/lib/decimal.ts`.**

## 6. Test plan

- `src/lib/decimal.test.ts` — as written in Step 2. This is the highest-value test file in the whole frontend: it guards the boundary between decimal strings and display.
- `src/components/comunes/Moneda.test.tsx` — rendering + the `num` class.
- Add one test per remaining `comunes` component as you write it: `EstadoVacio` renders its CTA; `ConfirmarDestructivo` does not call `onConfirmar` until the confirm button is clicked; `ChipEstado` renders text alongside colour.

Follow `src/api/problem.test.ts` (from plan 003) as the style exemplar: `describe`/`it` in Spanish, accessible queries, no snapshots.

## 7. Boundaries

- **Do not** add a decimal arithmetic library (`decimal.js`, `big.js`). The client does no arithmetic (ADR 9). If a screen appears to need one, that is a signal the server should be returning the value — report it.
- **Do not** build a Figma-fidelity visual design. `design/01 §10.1` lists fidelity as an **open decision**; low-fi wireframes are the current baseline.
- **Do not** invest in dark mode beyond leaving shadcn's defaults intact (`design/01 §10.2`, open decision).
- **Do not** install feature-specific components (`data-table`, `combobox`, `command`, `calendar`, `date-picker`, `progress`, `chart`, `accordion`, `collapsible`, `sidebar`, `breadcrumb`, `sheet`, `drawer`, `pagination`, `input-otp`, `radio-group`, `switch`, `button-group`, `native-select`, `empty`, `spinner`). Their owning plans install them.
- **Do not** modify `src/api/**`.

## 8. Escape hatches

- If shadcn's generated `index.css` uses HSL variables rather than OKLCH, keep its colour space and translate the values — do not rewrite its theme system.
- If `Intl.NumberFormat` with `es-EC` is unavailable in the Node build running Vitest (small-icu), the tests will produce `1,234.50` instead of `1.234,50`. **Report this** rather than changing the locale: `playwright.config.ts` already pins `es-EC` and the thesis specifies it. The fix is a full-icu Node, not a code change.
- If the 60-30-10 hues need choosing more precisely, note that `design/01 §10.5` marks the exact hues as *"currently considering"* — pick sane values, record them in the README from Step 8, and flag in your report that the humans should confirm.

## 9. Maintenance note

The `grep -rn "toFixed\|parseFloat"` gate in §5 should migrate into CI (plan 015) as a lint rule or a CI step. It is the cheapest possible guard on the thesis's exactitud variable, and it will start failing the moment somebody "just formats a number quickly" inside a screen.

When the exact palette is confirmed by the humans (`design/01 §10.5`), only `src/index.css` should need to change. If a hue has leaked into a component's class names, that is a defect.
