# Plan 095: Arreglar el desborde del gráfico de Curva S

> **Instrucciones para quien ejecute**: sigue este plan paso a paso. Corre cada
> comando de verificación y confirma el resultado esperado antes de avanzar al
> siguiente paso. Si ocurre algo listado en "Condiciones STOP", detente y
> repórtalo — no improvises. Al terminar, actualiza la fila de este plan en
> [`../00.INDEX.md`](../00.INDEX.md), salvo que quien te despache te diga que
> él mantiene el índice.
>
> **Comprobación de deriva (ejecutar primero)**:
> `git diff --stat 246cbf6..HEAD -- src/features/cronograma/components/CurvaSChart.tsx src/features/cronograma/components/GanttChart.tsx src/features/cronograma/components/TablaActividades.tsx src/features/cronograma/pages/CronogramaPage.tsx src/components/ui/tabs.tsx`
> Si alguno de estos archivos cambió desde que se escribió este plan, compara
> los fragmentos de "Estado actual" contra el código real antes de continuar;
> si no coinciden, trátalo como condición STOP.

## Estado

- **Prioridad**: P2
- **Esfuerzo**: S
- **Riesgo**: LOW — un cambio de dos clases de Tailwind en un único `div`,
  con patrón ya probado en dos componentes hermanos del mismo módulo.
- **Depende de**: ninguno
- **Categoría**: bug (CSS/layout)
- **Planificado en**: commit `246cbf6`, 2026-09-11

## Por qué importa

En `/proyectos/{uuid}/cronograma?vista=curva-s`, el SVG de la Curva S se sale
del `div` que lo contiene en vez de quedarse dentro con scroll horizontal,
como sí hacen sus dos componentes hermanos del mismo módulo (`GanttChart` y
`TablaActividades`) para el mismo problema (contenido más ancho que el
viewport). El contenedor del SVG tiene `overflow-x-auto` pero le falta la
combinación de clases que, en este mismo repo, es la que realmente evita que
el contenedor crezca más allá del ancho disponible y fuerza el scroll interno
en su lugar. El resultado visible: la gráfica se ve rota, sobresaliendo del
recuadro que la enmarca.

## Estado actual

Archivos relevantes:

- `src/features/cronograma/components/CurvaSChart.tsx` — dibuja el SVG de la
  Curva S; el contenedor del SVG es el que tiene el bug.
- `src/features/cronograma/components/GanttChart.tsx` — mismo tipo de
  problema (contenido ancho en una vista de cronograma), ya resuelto.
- `src/features/cronograma/components/TablaActividades.tsx` — idem, ya
  resuelto.
- `src/features/cronograma/pages/CronogramaPage.tsx` — monta `CurvaSChart`
  dentro de `<TabsContent value="curva-s">`, en la pestaña Curva S de
  `/proyectos/{uuid}/cronograma`.

El contenedor con el bug, tal como está hoy:

```tsx
// src/features/cronograma/components/CurvaSChart.tsx:184-191
<div className="overflow-x-auto rounded-lg border">
  <svg
    role="img"
    aria-labelledby={tituloId}
    aria-describedby={descripcionId}
    viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
    className="h-auto min-w-[36rem] w-full text-foreground"
    preserveAspectRatio="xMidYMid meet"
  >
```

El SVG fuerza un ancho mínimo de `min-w-[36rem]` (576px) para que la gráfica
siga siendo legible en pantallas angostas; ese ancho mínimo es intencional
(no lo quites). El problema es que el `div` que lo envuelve solo tiene
`overflow-x-auto rounded-lg border`, sin nada que le impida crecer más allá
del ancho disponible — así que en vez de quedarse en el ancho del contenedor
padre y activar el scroll horizontal, el `div` (y todo lo que tiene adentro)
crece hasta 576px aunque el espacio disponible sea menor, y se sale del
recuadro visual.

El patrón que sí funciona, usado por los dos componentes hermanos que resuelven
exactamente este mismo problema en el mismo módulo:

```tsx
// src/features/cronograma/components/TablaActividades.tsx:16
<div className="overflow-x-auto w-fit max-w-full border rounded-lg">
```

```tsx
// src/features/cronograma/components/GanttChart.tsx:25
<div className="overflow-x-auto w-fit max-w-full border rounded-lg">
```

La diferencia es `w-fit max-w-full`: el contenedor se ajusta a su contenido
(`w-fit`) pero nunca crece más allá del 100% del espacio disponible
(`max-w-full`), lo que deja que `overflow-x-auto` haga su trabajo. El `div`
del SVG en `CurvaSChart.tsx` es el único de los tres que no sigue este patrón.

Confirmado además que las otras dos vistas de la misma pestañera
(`GanttJerarquicoInteractivo` en la pestaña "Gantt", `CronogramaValorizado`
en la pestaña "Cronograma valorizado") no reportan este problema — descarta
que la causa esté en el contenedor compartido (`Tabs`/`TabsContent` de
`src/components/ui/tabs.tsx`, que ya recibe `min-w-0` desde
`CronogramaPage.tsx:185`); el defecto está localizado en el propio
`CurvaSChart.tsx`.

## Comandos que necesitarás

| Propósito                    | Comando                                                                                                  | Resultado esperado |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------ | -------------------- |
| Typecheck                     | `pnpm run typecheck`                                                                                        | exit 0                |
| Lint                           | `pnpm run lint`                                                                                              | exit 0                |
| Formato                       | `pnpm run format:check`                                                                                     | exit 0                |
| Tests focalizados              | `pnpm exec vitest run src/test/features/cronograma/components/CurvaSChart.test.tsx src/test/features/cronograma/pages/CronogramaPage.test.tsx` | todos en verde        |
| Captura E2E de la vista       | `pnpm run e2e:screenshots`                                                                                  | `10-cronograma-curva-s` pasa, incluida la comprobación de accesibilidad (axe) del mismo test |
| Verify completo               | `pnpm run verify`                                                                                            | exit 0                |

Nota: `pnpm run e2e:screenshots` levanta/usa el servidor de Playwright con
`reuseExistingServer` — si venías con un `pnpm run dev` corriendo desde antes
del cambio, reinícialo primero o el resultado visual será el bundle viejo
(trampa de diagnóstico ya documentada en `AGENTS.md`).

## Alcance

**En alcance (único archivo que debes modificar):**

- `src/features/cronograma/components/CurvaSChart.tsx` — únicamente el `div`
  de la línea 184

**Fuera de alcance (no toques, aunque se parezcan):**

- El `min-w-[36rem]` del propio `<svg>` (línea 190) — es intencional, no es
  parte del bug.
- El otro `overflow-x-auto` del mismo archivo, en `tablaAlternativa` (línea
  92, `<div className="overflow-x-auto border-t">`, que envuelve la tabla
  accesible dentro del `<details>`) — esa tabla usa `min-w-full` (100% del
  contenedor, no un mínimo absoluto en rem como el SVG), así que no tiene el
  mecanismo que causa este bug. No la cambies salvo que la verificación visual
  del Paso 2 muestre que también se desborda; si eso pasa, repórtalo como
  hallazgo aparte en vez de ampliar este plan.
- `src/components/ui/tabs.tsx`, `src/features/cronograma/pages/CronogramaPage.tsx` — se
  investigaron como posible causa raíz y se descartaron (ver "Estado
  actual"); no los toques.
- `GanttChart.tsx`, `TablaActividades.tsx` — son el ejemplo del patrón
  correcto, no el objetivo del cambio; no los toques.
- Cualquier cambio a la geometría, los datos o la accesibilidad del SVG
  (`viewBox`, `role="img"`, `<title>`/`<desc>`, navegación por teclado) — este
  plan es puramente de contención visual del contenedor, no de la gráfica.

## Flujo de git

- Rama: `fix/095-desborde-grafico-curva-s` (o la convención vigente del repo)
- Un commit único, mensaje convencional en español (`fix(cronograma): …`)
- No hagas push ni abras PR salvo que se te indique explícitamente.

## Pasos

### Paso 1: aplicar el patrón `w-fit max-w-full` al contenedor del SVG

En `src/features/cronograma/components/CurvaSChart.tsx:184`, cambia:

```tsx
<div className="overflow-x-auto rounded-lg border">
```

por:

```tsx
<div className="overflow-x-auto w-fit max-w-full rounded-lg border">
```

(mismo orden de clases que `TablaActividades.tsx:16` y `GanttChart.tsx:25`,
para que un futuro `grep` de las tres líneas las reconozca como el mismo
patrón).

**Verificar**: `pnpm run lint` → exit 0; `pnpm run typecheck` → exit 0

### Paso 2: confirmar visualmente que ya no se desborda

1. Si hay un `pnpm run dev` corriendo desde antes de este cambio, deténlo y
   vuelve a levantarlo (ver nota de la tabla de comandos).
2. Corre `pnpm run e2e:screenshots`.
3. Abre `screenshots/10-cronograma-curva-s.png` (o la ruta que el runner
   reporte) y confirma a simple vista que el gráfico queda dentro de su
   recuadro con borde, sin sobresalir del contenedor ni tapar elementos
   vecinos.
4. Confirma en la salida del test que la comprobación de accesibilidad
   (`sinViolacionesA11y`, que ese mismo spec corre solo para `vista === "curva-s"`)
   sigue pasando — un cambio de solo clases de layout no debería afectarla,
   pero es la señal de que no rompiste el `role="img"`/`<title>`/`<desc>` de
   paso.

**Verificar**: `pnpm run e2e:screenshots` → `10-cronograma-curva-s` en verde,
sin violaciones de accesibilidad reportadas

### Paso 3: verificación completa

**Verificar**: `pnpm run verify` → exit 0

## Plan de pruebas

- No se agrega ninguna prueba unitaria nueva: es un cambio de clases CSS de
  contención, cubierto por verificación visual (captura Playwright existente)
  y no por aserciones de DOM — coincide con la política de `AGENTS.md`: "no
  exijas tests unitarios nuevos para... layout, estilos... compruébalos
  mediante... verificación manual focalizada en navegador cuando corresponda".
- La prueba que sí debe seguir pasando sin cambios es la captura E2E
  `10-cronograma-curva-s` de `e2e/screenshots.spec.ts:664-696`, que ya existe
  y ya corre `sinViolacionesA11y` para esta vista — es la regresión visual de
  referencia; no dupliques su lógica en una prueba unitaria nueva.
- `src/test/features/cronograma/components/CurvaSChart.test.tsx` no necesita
  cambios: no hace aserciones sobre clases de Tailwind ni sobre layout, solo
  sobre contenido/accesibilidad del SVG. Vuelve a correrla igual, como red de
  seguridad de que el cambio de clase no rompió nada del marcado.

## Criterios de cierre

Deben cumplirse TODOS:

- [ ] `pnpm run typecheck` sale con exit 0
- [ ] `pnpm run lint` sale con exit 0
- [ ] `pnpm run format:check` sale con exit 0
- [ ] `pnpm exec vitest run src/test/features/cronograma/components/CurvaSChart.test.tsx src/test/features/cronograma/pages/CronogramaPage.test.tsx` sale con exit 0
- [ ] `pnpm run e2e:screenshots` sale con exit 0, incluida la captura `10-cronograma-curva-s`
- [ ] Inspección visual de `screenshots/10-cronograma-curva-s.png`: el
      gráfico queda contenido dentro de su recuadro, sin sobresalir
- [ ] `grep -n "overflow-x-auto" src/features/cronograma/components/CurvaSChart.tsx` muestra `w-fit max-w-full` en la línea del contenedor del SVG (línea 184 original)
- [ ] Solo `src/features/cronograma/components/CurvaSChart.tsx` aparece modificado en `git status`
- [ ] `pnpm run verify` sale con exit 0
- [ ] Fila de este plan actualizada en `plans/00.INDEX.md`

## Condiciones STOP

Detente y reporta (no improvises) si:

- El `div` de la línea 184 ya no tiene el aspecto citado en "Estado actual"
  (indicaría que el repo cambió desde que se escribió este plan).
- Tras el Paso 1, el gráfico sigue desbordándose visualmente — indicaría que
  la causa real no es la que este plan identificó, y forzar más clases a
  ciegas (por ejemplo `overflow-hidden` en un ancestro) podría ocultar el
  síntoma en vez de corregirlo. Reporta el hallazgo con capturas en vez de
  seguir probando clases.
- La captura `10-cronograma-curva-s` empieza a fallar por accesibilidad
  (`sinViolacionesA11y`) tras el cambio — un cambio de solo layout no debería
  tocar el árbol de accesibilidad del SVG; si ocurre, no lo silencies.
- La tabla accesible dentro de `tablaAlternativa` (línea 92) también se
  desborda en la verificación visual del Paso 2 — es una vista secundaria no
  reportada por el usuario; no la arregles en este plan, repórtala como
  hallazgo nuevo.

## Notas de mantenimiento

- El patrón `overflow-x-auto w-fit max-w-full` para contener contenido más
  ancho que su viewport dentro de un `div` con borde es ya una convención
  repetida tres veces en `src/features/cronograma/components/` (Gantt, tabla
  de actividades, y ahora Curva S). Si aparece un cuarto gráfico o tabla ancha
  en este módulo, aplicar el mismo patrón desde el principio evita repetir
  este bug.
- Revisor: comprobar que el diff es exactamente esas dos clases añadidas en
  una línea — cualquier cambio adicional (por ejemplo tocar `TabsContent` en
  `src/components/ui/tabs.tsx`, que afectaría a *todas* las pestañas de la
  aplicación, no solo a Curva S) está fuera de alcance y debe rechazarse
  aunque "también" arregle el síntoma.
