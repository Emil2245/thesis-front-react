# Plan 025: Migrar los colores crudos de Tailwind a tokens del tema

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat ab31892..HEAD -- src/index.css src/components/comunes/ChipEstado.tsx`
> `src/index.css` y `ChipEstado.tsx` **tienen cambios sin commitear** que
> introducen los tokens que este plan usa. Si `--exito-texto` no existe en
> `src/index.css`, este plan no aplica → STOP.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: ninguno
- **Category**: tech-debt
- **Planned at**: commit `ab31892` + rediseño de UI sin commitear, 2026-08-24

## Why this matters

Doce sitios pintan con la paleta cruda de Tailwind (`text-green-600`,
`bg-red-100`, `text-amber-500`…) en vez de con los tokens del tema. Tres
consecuencias concretas:

- **No responden al modo oscuro.** `bg-red-100 text-red-700` sobre un fondo
  oscuro es ilegible; algunos sitios parchean con `dark:` a mano y otros no.
- **No siguen la marca.** El tema define `--exito`, `--advertencia` y `--peligro`
  en oklch precisamente para que "correcto" y "peligro" tengan un solo color en
  toda la aplicación. Hoy hay verde-600, verde-100 y verde-800 conviviendo.
- **Contraste sin verificar.** El rediseño ya encontró este fallo en
  `ChipEstado`, que usaba `--exito-foreground` (casi blanco, pensado para
  relleno sólido) como color de texto sobre un tinte al 15 %: el texto
  desaparecía. Los colores crudos tienen el mismo riesgo, sin nadie mirándolo.

Al aterrizar esto, el `grep` de colores crudos sale vacío y el modo oscuro es
correcto por construcción en estos doce sitios.

## Current state

### Los tokens disponibles (`src/index.css`)

Semánticos, para relleno sólido:

```css
--exito: oklch(0.6 0.13 150);          --exito-foreground: oklch(0.98 0 0);
--advertencia: oklch(0.75 0.15 80);    --advertencia-foreground: oklch(0.25 0 0);
--peligro: oklch(0.58 0.2 25);         --peligro-foreground: oklch(0.98 0 0);
```

Y — añadidos por el rediseño — los de **texto sobre fondo tintado**, con sus
equivalentes de modo oscuro ya definidos:

```css
/* Texto sobre fondos tintados (los -foreground son para relleno sólido) */
--exito-texto: oklch(0.46 0.11 150);
--advertencia-texto: oklch(0.48 0.1 80);
--peligro-texto: oklch(0.5 0.19 25);
```

Expuestos a Tailwind en el bloque `@theme inline` como `text-exito-texto`,
`text-advertencia-texto`, `text-peligro-texto`, además de `bg-exito`,
`bg-advertencia`, `bg-peligro` y sus `-foreground`.

### El ejemplar a copiar

`src/components/comunes/ChipEstado.tsx` — es la referencia de cómo se pinta un
chip de estado con tokens: fondo al 15 %, borde al 30 %, texto con el token
`-texto`:

```ts
const VARIANTES: Record<string, string> = {
  conforme: "bg-exito/15 text-exito-texto border-exito/30",
  "no-conforme": "bg-peligro/15 text-peligro-texto border-peligro/30",
  borrador: "bg-muted text-muted-foreground border-border",
  "en-proceso": "bg-advertencia/15 text-advertencia-texto border-advertencia/30",
  finalizado: "bg-exito/15 text-exito-texto border-exito/30",
  vigente: "bg-primary/15 text-primary border-primary/30",
  auxiliar: "bg-secondary text-secondary-foreground border-border",
  desactualizado: "bg-advertencia/15 text-advertencia-texto border-advertencia/30",
};
```

Nótese que **no** hay ningún `dark:`: los tokens ya cambian de valor bajo
`.dark`, así que el modo oscuro sale gratis.

### Los doce sitios a migrar

| Archivo | Línea | Actual | Sustituir por |
|---|---|---|---|
| `src/features/presupuesto/components/ChipAlerta.tsx` | 12 | `bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400` | `bg-peligro/15 text-peligro-texto border-peligro/30` |
| `src/features/presupuesto/components/ChipAlerta.tsx` | 16 | `bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400` | `bg-advertencia/15 text-advertencia-texto border-advertencia/30` |
| `src/features/presupuesto/components/ChipAlerta.tsx` | 20 | `bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400` | `bg-advertencia/15 text-advertencia-texto border-advertencia/30` |
| `src/features/presupuesto/components/ChipAlerta.tsx` | 25 | `bg-gray-100 text-gray-700` (fallback) | `bg-muted text-muted-foreground border-border` |
| `src/features/presupuesto/components/ComparadorVersiones.tsx` | 34 | `text-green-600` / `text-red-600` | `text-exito-texto` / `text-peligro-texto` |
| `src/features/presupuesto/components/ComparadorVersiones.tsx` | 64 | `text-green-600` / `text-red-600` | idem |
| `src/features/presupuesto/components/FilaRubro.tsx` | 48 | `text-amber-500` | `text-advertencia-texto` |
| `src/features/insumos/components/BadgeDesactualizado.tsx` | 6 | `text-amber-600 border-amber-300` | `text-advertencia-texto border-advertencia/30` |
| `src/features/insumos/components/ComboboxUnidad.tsx` | 50 | `text-amber-600` | `text-advertencia-texto` |
| `src/features/apu-editor/components/BadgeHerencia.tsx` | 12 | `bg-green-100 text-green-800 hover:bg-green-100` | `bg-exito/15 text-exito-texto hover:bg-exito/15` |
| `src/features/apu-editor/components/DialogoNuevoApu.tsx` | ~154 | `text-amber-600` | `text-advertencia-texto` |
| `src/features/exportar/pages/ExportPage.tsx` | 98, 100 | `text-green-600` / `text-blue-600` | ver "Caso especial" |

Comando que regenera el listado:

```
grep -rEn "(text|bg|border)-(red|blue|green|amber|purple|orange|yellow|emerald|slate|gray|zinc)-[0-9]{2,3}" src/ --include=*.tsx | grep -v test
```

### Caso especial: `ExportPage`

Los dos colores ahí no son semánticos: distinguen **formato de archivo** (verde
= hoja de cálculo, azul = PDF), una convención que los usuarios reconocen de
Excel y Acrobat. No los mapees a `--exito` / `--primary`: "éxito" y "primario"
significan otra cosa y perderías la distinción en cuanto alguien cambie el color
de marca. Usa `text-chart-1` y `text-chart-2` (tokens de la rampa de gráficos,
pensados justo para categorías) o, si no dan contraste suficiente, déjalos y
documenta la excepción con un comentario de una línea explicando por qué.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm run typecheck` | exit 0 |
| Tests | `pnpm test` | todos pasan |
| Gate | `pnpm run verify` | exit 0 |
| Detección | `grep -rEn "(text\|bg\|border)-(red\|blue\|green\|amber\|purple\|orange\|yellow\|emerald\|slate\|gray\|zinc)-[0-9]{2,3}" src/ --include=*.tsx \| grep -v test` | solo la excepción documentada de `ExportPage` |

## Scope

**In scope**: los ocho archivos de la tabla y sus `*.test.tsx` hermanos si algún
test asertaba sobre una clase concreta.

**Out of scope** (NO tocar):
- `src/index.css` — los tokens que necesitas **ya existen**. Si crees que falta
  uno, para y reporta; añadir tokens es una decisión de sistema de diseño, no
  un paso de esta migración.
- `src/components/ui/*` — primitivas de shadcn; ya usan tokens.
- Cualquier cambio de **comportamiento**: este plan solo cambia clases de color.
- La estructura del marcado: no reordenes, no envuelvas, no extraigas
  componentes mientras estás dentro.

## Git workflow

- Rama: `advisor/025-tokens-de-color`
- Un commit por archivo o por grupo coherente (los tres chips juntos está bien).
- Estilo: conventional commits, p. ej. `style: use theme tokens in ChipAlerta`
- No hagas push ni abras PR salvo instrucción explícita.

## Steps

### Step 1: Los chips (`ChipAlerta`, `BadgeHerencia`, `BadgeDesactualizado`)

Aplica las sustituciones de la tabla. En los tres, **elimina los prefijos
`dark:`**: los tokens ya cambian bajo `.dark` y dejarlos crearía dos fuentes de
verdad contradictorias.

Si el componente usa `Badge` de shadcn, prefiere una `variant` existente antes
que clases sueltas — `variant="secondary"` o `variant="outline"` cubren varios
de estos casos. Solo añade clases cuando ninguna variante sirva.

**Verify**: `pnpm run typecheck` → exit 0 · `pnpm test -- ChipAlerta` → pasa (si existe ese test)

### Step 2: Los textos de variación (`ComparadorVersiones`, `FilaRubro`, `ComboboxUnidad`, `DialogoNuevoApu`)

Sustituciones directas de la tabla. En `ComparadorVersiones` el color codifica
el signo de una diferencia monetaria (verde = sube, rojo = baja), que **sí** es
semántico: `text-exito-texto` / `text-peligro-texto` es el mapeo correcto.

Comprueba que el caso "sin diferencia" siga sin color (hoy es `""`).

**Verify**: `pnpm run typecheck` → exit 0

### Step 3: `ExportPage` — decidir y documentar

Aplica lo descrito en "Caso especial". Sea cual sea la decisión, deja **un
comentario de una línea** en el código explicándola, para que la próxima persona
que corra el `grep` no vuelva a plantearse lo mismo.

**Verify**: `pnpm run verify` → exit 0

### Step 4: Revisar el contraste a ojo, en los dos temas

Levanta la aplicación (`pnpm run dev`) y visita las pantallas afectadas en tema
claro y oscuro. Lo que buscas es texto que desaparezca sobre su fondo — es
exactamente el fallo que tenía `ChipEstado` antes del rediseño.

Si un token no da contraste suficiente sobre su tinte, **no lo ajustes en
`index.css`**: para y reporta cuál y dónde. Cambiar un token afecta a toda la
aplicación y es una decisión de sistema de diseño.

**Verify**: inspección visual en `/proyectos`, `/proyectos/1/presupuesto`,
`/proyectos/1/insumos` y `/proyectos/1/versiones`, en ambos temas.

## Test plan

No hay tests nuevos: es una migración de clases de presentación.

Lo que sí puede pasar: algún test asertaba sobre una clase concreta
(`toHaveClass("text-green-600")`). Búscalos antes de empezar:

```
grep -rn "toHaveClass" src/ | grep -E "red|green|amber|blue|orange|gray"
```

Si aparece alguno, actualízalo al token nuevo. Si un test **solo** comprueba una
clase de color y nada más, considera reportarlo: asertar sobre clases de
Tailwind es frágil y ese test no protege nada real.

**Verification**: `pnpm test` → todos pasan.

## Done criteria

- [ ] `pnpm run verify` sale con exit 0
- [ ] El `grep` de detección devuelve como mucho las líneas de `ExportPage`, y esas llevan un comentario que explica la excepción
- [ ] `grep -rn "dark:bg-\|dark:text-" src/features/` no devuelve nada (los tokens ya gestionan el tema)
- [ ] Revisión visual hecha en tema claro y oscuro, sin texto ilegible
- [ ] `git diff` solo muestra cambios en atributos `className`
- [ ] Fila de estado actualizada en `plans/README.md`

## STOP conditions

Para y reporta si:

- Un token existente no da contraste suficiente. No ajustes `src/index.css`.
- Un color codifica algo que **no** tiene token semántico (como los formatos de
  archivo de `ExportPage`) y `chart-*` tampoco encaja: documenta y para.
- Al quitar los `dark:` alguna pantalla queda peor en modo oscuro: significa que
  el token no está bien definido para ese tema → reporta, no parchees con
  `dark:` de vuelta.

## Maintenance notes

- Regla a sostener: **ninguna clase de color cruda de Tailwind en `src/`**. El
  `grep` de detección de arriba sirve como comprobación de revisión; si el
  equipo quiere, puede convertirse en una regla de oxlint
  (`no-restricted-syntax` sobre el atributo `className`), que sería lo
  definitivo.
- La distinción que hay que entender y que ya causó un bug: `--exito` es el
  color de relleno, `--exito-foreground` es el texto **sobre** ese relleno
  sólido (casi blanco), y `--exito-texto` es el texto sobre un **tinte** claro.
  Confundir los dos últimos hace desaparecer el texto.
- Si aparecen más categorías que colorear (más allá de éxito / advertencia /
  peligro), la rampa `--chart-1..5` es el sitio correcto, y hoy es casi toda
  gris: `--chart-2..5` son neutros. Ampliarla es una decisión de diseño previa
  a usarla.
