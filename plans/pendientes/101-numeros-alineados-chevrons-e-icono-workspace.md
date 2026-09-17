# Plan 101: Números sin alinear, chevrons de texto y un icono de sidebar repetido

> **Instrucciones para quien ejecute**: sigue este plan paso a paso. Corre cada
> comando de verificación y confirma el resultado esperado antes de avanzar al
> siguiente paso. Si ocurre algo listado en "Condiciones STOP", detente y
> repórtalo — no improvises. Al terminar, actualiza la fila de este plan en
> [`../00.INDEX.md`](../00.INDEX.md), salvo que quien te despache te diga que
> él mantiene el índice.
>
> **Comprobación de deriva (ejecutar primero)**:
> `git diff --stat d0094f3..HEAD -- src/features/proyectos/pages/ResumenProyectoPage.tsx src/features/workspace/components/PresupuestoCompacto.tsx src/shell/Sidebar.tsx`
> Si alguno de estos archivos cambió desde que se escribió este plan, compara
> los fragmentos de "Estado actual" contra el código real antes de continuar;
> si no coinciden, trátalo como condición STOP.

## Estado

- **Prioridad**: P2 — estético, sin impacto funcional
- **Esfuerzo**: S
- **Riesgo**: LOW — tres archivos, cambios de presentación. Ninguna petición,
  ningún cálculo, ningún contrato.
- **Depende de**: ninguno. Puede ejecutarse en paralelo con 097–100, pero el
  paso C toca `PresupuestoCompacto.tsx`, que **no** toca ningún otro plan de esta
  tanda; no hay conflicto.
- **Categoría**: UX / consistencia visual
- **Planificado en**: commit `d0094f3`, 2026-09-16

## Por qué importa

Cuatro defectos visuales independientes, agrupados en un plan porque son de una
línea cada uno y viven en tres archivos distintos que nadie más está tocando.

**A. El sidebar usa el mismo icono para "Resumen" y para "Workspace".** Dos
entradas contiguas con el mismo dibujo son dos entradas que el ojo no
distingue.

**B. En la pestaña Resumen, los números no están alineados a la derecha** — ni
los de la franja de totales, ni la columna "Subtotal" de la tabla de Capítulos.
En el resto del software todos los números se alinean a la derecha; es lo que
hace la utilidad `.num` del tema, y aquí está explícitamente anulada.

**C. En el workspace, la tabla del presupuesto pinta los números en crudo**:
`77.000000`, `2363.900000`, sin separador de miles, sin símbolo de moneda y
alineados a la izquierda. Es el único sitio de la aplicación que imprime el
`Decimal` del transporte tal cual llega del servidor.

**D. En esa misma tabla, los desplegables de capítulo usan los caracteres de
texto `▾` / `▸` / `•`** en vez de los iconos de lucide que usa el resto de la
aplicación. Cambian de forma y de tamaño según la fuente del sistema.

## Estado actual

### A — `src/shell/Sidebar.tsx`

```tsx
const RUTAS_PROYECTO: {
  sufijo: string;
  icono: typeof LayoutDashboardIcon;
  etiqueta: string;
  modulo?: ModuloSinBackend;
}[] = [
  { sufijo: "", icono: LayoutDashboardIcon, etiqueta: "Resumen" },
  { sufijo: "/workspace", icono: LayoutDashboardIcon, etiqueta: "Workspace" },
  …
```

`LayoutDashboardIcon` dos veces seguidas.

### B — `src/features/proyectos/pages/ResumenProyectoPage.tsx`

La utilidad del tema, en `src/index.css`:

```css
@layer utilities {
  .num {
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum";
    text-align: right;
  }
}
```

El componente `Moneda` (`src/components/comunes/Moneda.tsx`) ya la aplica:

```tsx
  return (
    <span className={cn("num", className)}>{formatearMoneda(valor, dp ?? precisionDinero)}</span>
  );
```

Pero en `FranjaTotales` se anula a mano, en **dos** sitios:

```tsx
        <span className="num text-left text-xl font-semibold tracking-tight">
          <Moneda valor={total} className="text-left" />
        </span>
```

```tsx
            <span className="text-lg font-medium tracking-tight">
              <Moneda valor={c.total} className="text-left" />
            </span>
```

Ese `text-left` gana sobre el `text-align: right` de `.num` y es precisamente lo
que hay que quitar.

Y en la tabla de Capítulos, la cabecera sí está a la derecha pero la celda no:

```tsx
                    <TableHead className="w-40 text-right">Subtotal</TableHead>
```

```tsx
                      <TableCell>
                        <Moneda valor={c.total} />
                      </TableCell>
```

`Moneda` es un `<span>`, o sea una caja inline que se encoge a su contenido: su
`text-align: right` alinea el texto **dentro del span**, no el span dentro de la
celda. Por eso el número queda pegado a la izquierda de una celda de `w-40`. Lo
que tiene que llevar la alineación es el `<TableCell>`. Compara con la columna
"Rubros", dos líneas más arriba, que sí lo hace bien:

```tsx
                      <TableCell className="num text-muted-foreground">
```

### C y D — `src/features/workspace/components/PresupuestoCompacto.tsx`

El botón del desplegable:

```tsx
              className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded hover:bg-muted disabled:cursor-default disabled:opacity-40"
            >
              <span aria-hidden>{hasChildren ? (isExpanded ? "▾" : "▸") : "•"}</span>
            </button>
```

Las celdas de la fila de rubro:

```tsx
                <td className="px-2 py-1.5">{rubro.item}</td>
                <td className="px-2 py-1.5">{rubro.descripcion}</td>
                <td className="px-2 py-1.5">{rubro.unidad}</td>
                <td className="px-2 py-1.5">{rubro.cantidad}</td>
                <td className="px-2 py-1.5">{rubro.precioUnitario}</td>
                <td className="px-2 py-1.5">{rubro.precioTotal}</td>
```

`rubro.cantidad`, `rubro.precioUnitario` y `rubro.precioTotal` son `Decimal`, o
sea cadenas a escala 6. Se pintan sin formatear.

El ejemplar a imitar es `src/features/presupuesto/components/FilaRubro.tsx`, que
resuelve exactamente lo mismo en la otra pantalla:

```tsx
      <span className="w-28 text-right font-mono tabular-nums text-xs text-muted-foreground">
        {formatearMoneda(rubro.precioUnitario)}
      </span>
```

y `src/features/presupuesto/components/FilaCapitulo.tsx` para los chevrons:

```tsx
        {tieneHijos ? (
          expandido ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )
        ) : (
          <FolderOpen className="size-4 text-muted-foreground" />
        )}
```

## Qué hay que hacer

Los cuatro pasos son independientes. Hazlos en orden y verifica cada uno.

### Paso A — Icono propio para Workspace

En `src/shell/Sidebar.tsx`:

1. Añade `Grid3x3Icon` a la lista de imports de `lucide-react` (está en la
   versión instalada, `lucide-react@^1.33.0`; **no inventes otro nombre**).
2. Cambia la entrada del workspace:

```tsx
  { sufijo: "/workspace", icono: Grid3x3Icon, etiqueta: "Workspace" },
```

Es la rejilla 3×3 que pidió el usuario ("una mesa de trabajo de Minecraft").
Deja `LayoutDashboardIcon` en "Resumen" — se sigue usando ahí y en la anotación
de tipo `icono: typeof LayoutDashboardIcon`, así que **no lo quites del import**.

Verificación:

```bash
pnpm run typecheck && pnpm run lint
```

### Paso B — Los números del Resumen, a la derecha

En `src/features/proyectos/pages/ResumenProyectoPage.tsx`:

1. En `FranjaTotales`, quita los dos `className="text-left"` de `<Moneda>` y el
   `text-left` del `<span className="num text-left …">`:

```tsx
        <span className="num text-xl font-semibold tracking-tight">
          <Moneda valor={total} />
        </span>
```

```tsx
            <span className="num text-lg font-medium tracking-tight">
              <Moneda valor={c.total} />
            </span>
```

   Fíjate en que al segundo `<span>` se le añade `num`: hoy no la tiene, y sin
   ella el `<span>` externo no alinea.

2. Las etiquetas de la franja (`Total general`, `Equipo · 18,00 %`, …) se quedan
   donde están, a la izquierda. **Sólo se alinean los números.** Si alineas
   también los títulos, la franja se descuadra.

3. En la tabla de Capítulos, dale la alineación a la celda:

```tsx
                      <TableCell className="num">
                        <Moneda valor={c.total} />
                      </TableCell>
```

Verificación:

```bash
pnpm run typecheck && pnpm run lint
```

### Paso C — Formatear y alinear los números del workspace

En `src/features/workspace/components/PresupuestoCompacto.tsx`:

1. Importa los formateadores:

```tsx
import { formatearMoneda, formatearNumero } from "@/lib/decimal";
```

2. Sustituye las tres celdas numéricas de la fila de rubro:

```tsx
                <td className="px-2 py-1.5">{rubro.item}</td>
                <td className="px-2 py-1.5">{rubro.descripcion}</td>
                <td className="px-2 py-1.5">{rubro.unidad}</td>
                <td className="num px-2 py-1.5">{formatearNumero(rubro.cantidad)}</td>
                <td className="num px-2 py-1.5">{formatearMoneda(rubro.precioUnitario)}</td>
                <td className="num px-2 py-1.5">{formatearMoneda(rubro.precioTotal)}</td>
```

   `cantidad` es una cantidad de obra, no dinero: va con `formatearNumero`, sin
   símbolo de moneda. `precioUnitario` y `precioTotal` sí son dinero.

3. Alinea también las tres cabeceras correspondientes:

```tsx
            <th className="px-2 py-1.5">Ítem</th>
            <th className="px-2 py-1.5">Descripción</th>
            <th className="px-2 py-1.5">Und.</th>
            <th className="px-2 py-1.5 text-right">Cantidad</th>
            <th className="px-2 py-1.5 text-right">P.U.</th>
            <th className="px-2 py-1.5 text-right">Parcial</th>
```

**No metas aritmética de dinero aquí.** `formatearMoneda` y `formatearNumero`
son formateadores puros de `src/lib/decimal.ts`, el único sitio del repo donde
se permite `toFixed`/`parseFloat` (ADR 9, y lo vigila `pnpm run guard:adr9`
dentro de `verify`). No sumes, no restes, no calcules porcentajes.

Verificación:

```bash
pnpm run typecheck && pnpm run guard:adr9
```

### Paso D — Chevrons de lucide en el workspace

En el mismo archivo:

1. Importa `import { ChevronDown, ChevronRight, Dot } from "lucide-react";`
2. Sustituye el `<span aria-hidden>` del botón:

```tsx
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDown className="size-4" aria-hidden />
                ) : (
                  <ChevronRight className="size-4" aria-hidden />
                )
              ) : (
                <Dot className="size-4 text-muted-foreground" aria-hidden />
              )}
```

**No toques el `aria-label` ni el `aria-expanded` del botón.** Son lo que hace
que el desplegable sea navegable y lo que consultan los tests; los iconos son
decorativos y por eso llevan `aria-hidden`.

Verificación:

```bash
pnpm run typecheck && pnpm run lint && pnpm run format:check
```

## Condiciones STOP

- Si `Grid3x3Icon` no existe en la versión instalada de `lucide-react`
  (compruébalo: `grep -o "Grid3x3Icon" node_modules/lucide-react/dist/lucide-react.d.ts`),
  para y reporta en vez de elegir otro icono por tu cuenta.
- Si algún test existente se pone rojo porque buscaba los caracteres `▾` / `▸`
  literalmente en el DOM, **no borres el test**: actualízalo para que consulte
  por el `aria-label` o el `aria-expanded` del botón, que es la forma correcta
  y la que el repo usa en el resto de pruebas. Dilo en tu reporte.
- Si al quitar `text-left` de la franja de totales el layout se rompe (los
  números se salen de su tarjeta), para y reporta con una captura: puede que
  haga falta ajustar el contenedor, y eso ya no es "quitar una clase".
- Si `pnpm run guard:adr9` se pone rojo, has metido aritmética donde no debía.
  Revierte ese paso.

## Fuera de alcance

- Cualquier otro icono del sidebar.
- La jerarquía y el orden del árbol del workspace — eso es el plan `100`.
- `src/index.css` y los tokens del tema. `.num` ya hace lo correcto; el problema
  era que se anulaba.
- `src/components/comunes/Moneda.tsx`.
- Convertir `PresupuestoCompacto` en un componente de tabla compartido con
  `ArbolPresupuesto`. Son dos pantallas con interacciones distintas y
  unificarlas no es un cambio estético.

## Criterios de terminado (comprobables por máquina)

```bash
pnpm run typecheck
pnpm run lint
pnpm run format:check
pnpm run guard:adr9
pnpm exec vitest run src/test/features/workspace src/test/features/proyectos
pnpm run verify
```

Y estos `grep`, todos sin coincidencias:

```bash
grep -n 'text-left' src/features/proyectos/pages/ResumenProyectoPage.tsx
grep -n '▾\|▸' src/features/workspace/components/PresupuestoCompacto.tsx
grep -n '{rubro.precioTotal}' src/features/workspace/components/PresupuestoCompacto.tsx
```

Y uno que sí debe tener exactamente una coincidencia:

```bash
grep -c 'Grid3x3Icon' src/shell/Sidebar.tsx   # 2 (el import y el uso)
```

## Verificación manual

`pnpm run dev`, sesión `john.doe@uce.edu.ec` / `Clave1234`, proyecto
`0192f6c4-7c8a-7abc-8000-000000001103`.

1. Sidebar: "Resumen" y "Workspace" tienen iconos distintos; el de Workspace es
   una rejilla 3×3.
2. Pestaña **Resumen**: los importes bajo `Total general`, `Equipo · %`,
   `Mano de obra · %`, `Materiales · %` y `Transporte · %` están alineados a la
   derecha dentro de su tarjeta; la columna `Subtotal` de la tabla "Capítulos"
   también.
3. **Workspace**: los capítulos usan chevrons de lucide; las columnas
   `Cantidad`, `P.U.` y `Parcial` salen formateadas (`77,00`, `$ 30,70`,
   `$ 2.363,90` — con el separador que corresponda al locale del formateador) y
   alineadas a la derecha, **no** `77.000000`.

Si el navegador sigue mostrando lo viejo, reinicia el dev server:
`reuseExistingServer` en `playwright.config.ts` hace que un `vite` de antes
sirva el bundle obsoleto.

## Nota de mantenimiento

La regla de la casa, escrita: **todo número se alinea a la derecha con la
utilidad `.num`, y ningún `Decimal` llega al DOM sin pasar por un formateador de
`src/lib/decimal.ts`.**

Los dos antipatrones que este plan retira y conviene reconocer en revisión:

- Pasar `className="text-left"` a un componente que ya trae `.num`: anula el
  tema desde fuera y no deja rastro de por qué.
- Poner `text-right` en el `<TableHead>` y olvidarlo en el `<TableCell>`. La
  cabecera se alinea y la cifra no, y en una captura pequeña parece que la tabla
  está bien.
