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

> **CORREGIDO EL 2026-09-17 — lee esto antes que nada.** La primera versión de
> este plan traía un **paso C** que pedía formatear los números crudos
> (`77.000000`) de la tabla del workspace. **Ese paso ya está hecho** en la base
> de esta rama: `PresupuestoCompacto.tsx` ya usa `formatearNumero` y `Moneda`, y
> sus tres cabeceras numéricas ya llevan `text-right`. El paso C se ha retirado.
> El motivo del error: los fragmentos originales se leyeron de la rama
> `fix/cronograma`, que va 19 commits por detrás de `origin/main`, y ese archivo
> cambió 389 líneas entre las dos. De ese archivo sólo queda por tocar el
> chevron, que ahora es el **paso C**.
> Si al mirar el archivo ves números sin formatear, **para y repórtalo**: estás
> en una base distinta de la que asume este plan.

## Estado

- **Prioridad**: P2 — estético, sin impacto funcional
- **Esfuerzo**: S
- **Riesgo**: LOW — tres archivos, cambios de presentación. Ninguna petición,
  ningún cálculo, ningún contrato.
- **Depende de**: el plan `098`, ya integrado en esta rama (commit `d0e9b63`),
  porque el paso D toca el diálogo que creó. Los pasos A, B y C son
  independientes entre sí.
- **Categoría**: UX / consistencia visual
- **Planificado en**: commit `d0094f3`, 2026-09-16

## Por qué importa

Tres defectos visuales independientes —más una petición desperdiciada que se
coló en el paso D—, agrupados en un plan porque son de una línea cada uno y
viven en archivos distintos que nadie más está tocando.

**A. El sidebar usa el mismo icono para "Resumen" y para "Workspace".** Dos
entradas contiguas con el mismo dibujo son dos entradas que el ojo no
distingue.

**B. En la pestaña Resumen, los números no están alineados a la derecha** — ni
los de la franja de totales, ni la columna "Subtotal" de la tabla de Capítulos.
En el resto del software todos los números se alinean a la derecha; es lo que
hace la utilidad `.num` del tema, y aquí está explícitamente anulada.

**C. En la tabla del workspace, los desplegables de capítulo usan los
caracteres de texto `▾` / `▸` / `•`** en vez de los iconos de lucide que usa el
resto de la aplicación. Cambian de forma y de tamaño según la fuente del
sistema.

*(El antiguo punto C —números sin formatear— se retiró: ya está arreglado en
esta base. Ver la nota del encabezado.)*

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

### C — `src/features/workspace/components/PresupuestoCompacto.tsx`

El botón del desplegable:

```tsx
              className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded hover:bg-muted disabled:cursor-default disabled:opacity-40"
            >
              <span aria-hidden>{hasChildren ? (isExpanded ? "▾" : "▸") : "•"}</span>
            </button>
```

Está sobre la línea 268. Es **lo único** que queda por cambiar en este archivo.

El ejemplar a imitar es
`src/features/presupuesto/components/FilaCapitulo.tsx`, que resuelve lo mismo en
la otra pantalla:

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

Los pasos A, B y C son independientes entre sí; el D es aparte y lleva su
propio commit. Hazlos en orden y verifica cada uno.

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

### Paso C — Chevrons de lucide en el workspace

En `src/features/workspace/components/PresupuestoCompacto.tsx`:

1. Añade `ChevronDown`, `ChevronRight` y `Dot` al import de `lucide-react` que
   ya existe en el archivo (no crees un import nuevo).
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

**No toques nada más de este archivo.** En particular, ni `moverCapituloRelativo`,
ni `moverCapituloArrastrado`, ni `renderChapters`, ni el formateo numérico que
ya está bien.

Verificación:

```bash
pnpm run typecheck && pnpm run lint
```

### Paso D — Una petición desperdiciada al cerrar el comparador de versiones

Esto **no** es estético y **no** venía en la versión original del plan. Se
detectó revisando el plan 098, que ya está en esta rama (commit `d0e9b63`), y se
mete aquí porque es una línea y ningún otro plan toca ese archivo.

`src/features/presupuesto/pages/VersionesPage.tsx` remonta el diálogo con
`key={`${compararId}-${compararAbierto}`}`. Al **cerrarlo**, la key cambia, el
diálogo se remonta con los dos lados ya rellenos, `distintas` vale `true` y
`useComparacion` dispara una petición que nadie va a mirar.

Arréglalo en `src/features/presupuesto/components/DialogoCompararVersiones.tsx`
haciendo que la query dependa también de que el diálogo esté abierto:

```tsx
  const distintas = abierto && !!ladoA && !!ladoB && ladoA !== ladoB;
```

Comprueba que los dos tests de `VersionesPage.test.tsx` siguen verdes. Si alguno
se pone rojo, para y repórtalo: significa que el diálogo dependía de ese fetch
en un momento en el que no debería.

**Este paso va en su propio commit**, separado del de los estéticos. Mensaje:

```
fix(versiones): no pedir la comparación con el diálogo cerrado

Al cerrarlo, el `key` del padre remonta el diálogo con los dos lados ya
rellenos, así que la query salía igual y se gastaba una petición cuyo
resultado nadie mira.
```

Verificación:

```bash
pnpm exec vitest run src/test/features/presupuesto
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
- **Todo lo demás de `PresupuestoCompacto.tsx`**: el formateo numérico (ya
  correcto), `moverCapituloRelativo`, `moverCapituloArrastrado` y
  `renderChapters`. Esos tres últimos los cubre el plan `100` con un test; aquí
  no se tocan.
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
```

Y uno que sí debe tener exactamente una coincidencia:

```bash
grep -c 'Grid3x3Icon' src/shell/Sidebar.tsx   # 2 (el import y el uso)
```

## Verificación manual

`pnpm run dev`, sesión `john@uce.edu.ec` / `User123123`, proyecto
`0192f6c4-7c8a-7abc-8000-000000001103`.

1. Sidebar: "Resumen" y "Workspace" tienen iconos distintos; el de Workspace es
   una rejilla 3×3.
2. Pestaña **Resumen**: los importes bajo `Total general`, `Equipo · %`,
   `Mano de obra · %`, `Materiales · %` y `Transporte · %` están alineados a la
   derecha dentro de su tarjeta; la columna `Subtotal` de la tabla "Capítulos"
   también.
3. **Workspace**: los capítulos usan chevrons de lucide en vez de `▾`/`▸`.
4. **Versiones**: abre el comparador, ciérralo, y comprueba en la pestaña Red
   que al cerrarlo **no** sale ninguna petición nueva a `/comparar`.

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
