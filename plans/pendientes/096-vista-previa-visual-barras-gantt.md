# Plan 096: La barra del Gantt debe moverse visualmente durante la vista previa

> **Instrucciones para quien ejecute**: sigue este plan paso a paso. Corre cada
> comando de verificación y confirma el resultado esperado antes de avanzar al
> siguiente paso. Si ocurre algo listado en "Condiciones STOP", detente y
> repórtalo — no improvises. Al terminar, actualiza la fila de este plan en
> [`../00.INDEX.md`](../00.INDEX.md), salvo que quien te despache te diga que
> él mantiene el índice.
>
> **Comprobación de deriva (ejecutar primero)**:
> `git diff --stat 246cbf6..HEAD -- src/features/cronograma/components/GanttJerarquicoInteractivo.tsx src/test/features/cronograma/components/GanttJerarquicoInteractivo.test.tsx`
> Si alguno de estos archivos cambió desde que se escribió este plan, compara
> los fragmentos de "Estado actual" contra el código real antes de continuar;
> si no coinciden, trátalo como condición STOP.

## Estado

- **Prioridad**: P2
- **Esfuerzo**: S
- **Riesgo**: LOW — cambia cómo se calculan `left`/`width` de un `<div>` ya
  existente a partir de un estado que ya se calcula hoy; no toca la mutación,
  el contrato con el backend ni el árbol de accesibilidad existente.
- **Depende de**: ninguno
- **Categoría**: bug (UX/interacción)
- **Planificado en**: commit `246cbf6`, 2026-09-11

## Por qué importa

En el Gantt jerárquico (`/proyectos/{uuid}/cronograma?vista=gantt`), al
arrastrar una barra o su extremo — o al mover/redimensionar por teclado — el
gesto **sí** calcula una vista previa (`vistaPrevia`, con `nuevoInicio` y
`nuevoFin`) y la muestra en un panel de texto con dos campos numéricos y un
botón "Confirmar". Pero la barra que el usuario está arrastrando **no se
mueve ni cambia de tamaño mientras arrastra**: sigue dibujada en su posición
original hasta que se hace clic en "Confirmar", momento en el que la mutación
se aplica, la query se invalida y el servidor devuelve el segmento nuevo — ahí
recién la barra salta a su posición final. El usuario percibe esto como "arrastro
y no pasa nada visualmente hasta que aprieto un botón", que es exactamente el
reporte: confuso, porque el gesto de arrastre (la barra) y su resultado (el
panel de texto) están visualmente desacoplados.

La causa es puntual: `TimelineGrid` —el componente que dibuja las barras—
calcula `left`/`width` de cada segmento a partir de `segmento.inicio`/
`segmento.fin` (los datos confirmados del servidor), y nunca mira el estado
`vistaPrevia` que el componente padre ya mantiene. El dato para dar feedback
visual inmediato ya existe en memoria; solo falta aplicarlo al segmento que se
está editando.

## Estado actual

Archivo relevante: `src/features/cronograma/components/GanttJerarquicoInteractivo.tsx`.

Tipos y helper ya existentes que este plan reutiliza sin modificar (líneas 59–91):

```ts
type OperacionSegmento = "MOVER_SEGMENTO" | "REDIMENSIONAR_SEGMENTO";

type VistaPrevia = {
  actividad: ActividadCronogramaResponse;
  segmento: SegmentoResponse;
  operacion: OperacionSegmento;
  nuevoInicio: number;
  nuevoFin: number;
};
// …
function segmentosIguales(a: VistaPrevia, b: { actividadId: string; segmento: SegmentoResponse }) {
  return (
    a.actividad.id === b.actividadId &&
    a.segmento.inicio === b.segmento.inicio &&
    a.segmento.fin === b.segmento.fin
  );
}
```

`TimelineGrid` hoy (líneas 168–283, fragmento relevante) **no recibe
`vistaPrevia`** y calcula la geometría solo desde `segmento`:

```tsx
function TimelineGrid({
  periodos,
  segmentos = [],
  actividad,
  unidadTiempo,
  onSegmentClick,
  onSegmentKeyDown,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onHandlePointerDown,
  onHandlePointerMove,
  onHandlePointerUp,
  onHandlePointerCancel,
}: {
  // … (sin prop de vistaPrevia)
}) {
  return (
    <div className="relative grid min-h-12" style={{ /* … */ }}>
      {/* … */}
      {actividad &&
        segmentos.map((segmento, index) => {
          const left = (segmento.inicio - 1) * PERIOD_WIDTH + 3;
          const width = (segmento.fin - segmento.inicio + 1) * PERIOD_WIDTH - 6;
          const etiqueta = `Segmento ${nombreSegmento(segmento)} de ${actividad.descripcion}`;
          return (
            <div
              key={`${segmento.inicio}-${segmento.fin}-${index}`}
              role="button"
              tabIndex={0}
              aria-label={etiqueta}
              data-testid={`segmento-${actividad.id}-${segmento.inicio}-${segmento.fin}`}
              className="absolute top-2 z-10 flex h-8 items-center rounded bg-foreground/75 px-2 text-xs text-background shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ left, width }}
              /* …handlers… */
            >
              <span className="truncate">{nombreSegmento(segmento)}</span>
              {/* …manijas de inicio/fin… */}
            </div>
          );
        })}
```

`TimelineGrid` se invoca para la fila de actividad así (líneas 879–903), sin
pasarle `vistaPrevia` (que el componente padre ya calcula en la línea 317,
`const [vistaPrevia, setVistaPrevia] = useState<VistaPrevia | null>(null);`):

```tsx
<TimelineGrid
  periodos={periodos}
  segmentos={actividad.segmentos}
  actividad={actividad}
  unidadTiempo={cronograma.unidadTiempo}
  onSegmentClick={manejarClick}
  onSegmentKeyDown={/* … */}
  onPointerDown={/* … */}
  onPointerMove={moverArrastre}
  onPointerUp={finalizarArrastre}
  onPointerCancel={finalizarArrastre}
  onHandlePointerDown={/* … */}
  onHandlePointerMove={moverArrastre}
  onHandlePointerUp={finalizarArrastre}
  onHandlePointerCancel={finalizarArrastre}
/>
```

`TimelineGrid` también se usa para las filas de capítulo y rubro (líneas 721
y 776), sin `actividad`/`segmentos` — esas invocaciones no dibujan barras y no
necesitan tocarse.

## Comandos que necesitarás

| Propósito         | Comando                                                                                                   | Resultado esperado |
| ------------------ | ----------------------------------------------------------------------------------------------------------- | -------------------- |
| Typecheck          | `pnpm run typecheck`                                                                                        | exit 0                |
| Lint               | `pnpm run lint`                                                                                              | exit 0                |
| Formato            | `pnpm run format:check`                                                                                     | exit 0                |
| Tests focalizados  | `pnpm exec vitest run src/test/features/cronograma/components/GanttJerarquicoInteractivo.test.tsx`         | todos en verde        |
| Captura E2E        | `pnpm run e2e:screenshots`                                                                                  | `10-cronograma` pasa  |
| Verify completo    | `pnpm run verify`                                                                                            | exit 0                |

## Alcance

**En alcance (únicos archivos que debes modificar):**

- `src/features/cronograma/components/GanttJerarquicoInteractivo.tsx`
- `src/test/features/cronograma/components/GanttJerarquicoInteractivo.test.tsx` (añadir pruebas, no borrar ni relajar las existentes)

**Fuera de alcance (no toques, aunque se parezca):**

- El panel de texto "Vista previa" (líneas 525–596) y sus campos numéricos —
  siguen existiendo tal cual, este plan no los reemplaza, los complementa con
  feedback visual en la barra.
- La mutación (`useProgramarActividad`, `confirmarVistaPrevia`), el mapeo a
  `MOVER_SEGMENTO`/`REDIMENSIONAR_SEGMENTO`, y el manejo de `409
  segmento-solapado` — no cambian de comportamiento, siguen disparando solo al
  confirmar.
- El `aria-label` del segmento (`Segmento {…} de {descripcion}`) — sigue
  identificando el segmento por su rango **confirmado**, no por el
  previsualizado; la región `aria-live="polite"` del panel de vista previa ya
  anuncia los números pendientes a lectores de pantalla, así que no dupliques
  el anuncio en el `aria-label` de la barra.
- `SummaryTimeline` (líneas 285–304, filas "Avance por período"/"Avance
  acumulado") — no tiene segmentos arrastrables, no aplica.
- Cualquier cambio a `iniciarMovimiento`, `iniciarRedimension`,
  `iniciarVistaPrevia`, `moverArrastre`, `rangoValido` o `mensajeRango` — la
  lógica que calcula `nuevoInicio`/`nuevoFin` ya es correcta (lo confirman los
  tests de teclado y drag existentes); este plan solo consume ese resultado
  para dibujar la barra, no lo recalcula.

## Flujo de git

- Rama: `fix/096-vista-previa-visual-barras-gantt` (o la convención vigente del repo)
- Commit(s) con mensaje convencional en español (`fix(cronograma): …`,
  `test(cronograma): …`)
- No hagas push ni abras PR salvo que se te indique explícitamente.

## Pasos

### Paso 1: propagar `vistaPrevia` a `TimelineGrid`

En `TimelineGrid`, añade `vistaPrevia?: VistaPrevia | null;` a la firma de
props (junto a `actividad?: ActividadCronogramaResponse;`), y recíbelo en la
desestructuración de parámetros.

En la invocación de `TimelineGrid` para la fila de actividad (la que hoy pasa
`segmentos={actividad.segmentos}`), añade `vistaPrevia={vistaPrevia}` (el
estado que el componente padre ya mantiene). No se lo pases a las
invocaciones de capítulo/rubro (no tienen `actividad`, la prop sería
irrelevante).

**Verificar**: `pnpm run typecheck` → exit 0

### Paso 2: usar la vista previa para calcular la geometría de la barra en curso

Dentro de `TimelineGrid`, en el `segmentos.map(...)` que calcula `left`/
`width`, reemplaza:

```tsx
const left = (segmento.inicio - 1) * PERIOD_WIDTH + 3;
const width = (segmento.fin - segmento.inicio + 1) * PERIOD_WIDTH - 6;
const etiqueta = `Segmento ${nombreSegmento(segmento)} de ${actividad.descripcion}`;
```

por:

```tsx
const enVistaPrevia =
  !!vistaPrevia && segmentosIguales(vistaPrevia, { actividadId: actividad.id, segmento });
const inicioMostrado = enVistaPrevia ? vistaPrevia.nuevoInicio : segmento.inicio;
const finMostrado = enVistaPrevia ? vistaPrevia.nuevoFin : segmento.fin;
const left = (inicioMostrado - 1) * PERIOD_WIDTH + 3;
const width = (finMostrado - inicioMostrado + 1) * PERIOD_WIDTH - 6;
const etiqueta = `Segmento ${nombreSegmento(segmento)} de ${actividad.descripcion}`;
```

`segmentosIguales` ya está definida en este mismo archivo (línea 85) y ya se
usa con esta misma forma de argumento en `manejarTecladoSegmento`; no la
reimplementes.

No cambies `etiqueta` (el `aria-label`) — debe seguir describiendo el
segmento confirmado, según la nota de "Fuera de alcance".

**Verificar**: `pnpm run typecheck` → exit 0

### Paso 3: distinguir visualmente la barra en vista previa de una confirmada

En el mismo `<div>` del segmento, cambia la clase fija:

```tsx
className="absolute top-2 z-10 flex h-8 items-center rounded bg-foreground/75 px-2 text-xs text-background shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

por una que module la opacidad según `enVistaPrevia` (mismo mecanismo de
"opacidades decrecientes de `bg-foreground`" que ya usa este módulo para
distinguir estados sin depender de color crudo — ver `AGENTS.md` "Colores"):

```tsx
className={cn(
  "absolute top-2 z-10 flex h-8 items-center rounded px-2 text-xs text-background shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
  enVistaPrevia
    ? "bg-foreground/50 outline-dashed outline-2 outline-offset-1 outline-foreground/60"
    : "bg-foreground/75",
)}
```

Importa `cn` desde `@/lib/utils` (mismo helper que usan
`Numero.tsx`/`Moneda.tsx`/`Porcentaje.tsx`) al inicio del archivo si no está
ya importado.

**Verificar**: `pnpm run lint` → exit 0

### Paso 4: pruebas — la barra debe moverse durante el drag y durante el teclado

Añade dos pruebas a
`src/test/features/cronograma/components/GanttJerarquicoInteractivo.test.tsx`,
siguiendo el patrón de las pruebas existentes en el mismo archivo (usan
`data-testid` de la forma `segmento-${ACTIVIDAD_3}-2-2` para ubicar la barra —
el testid se arma con el segmento **confirmado**, así que sigue siendo
`...-2-2` durante toda la vista previa, aunque la barra visualmente se mueva).

1. **Drag mueve la barra visualmente antes de confirmar** — modela la
   prueba `"convierte un drag de barra en un preview ordinal"` (línea 118):
   después del mismo `pointerDown`/`pointerMove`/`pointerUp` con
   `clientX: 0 → 64` sobre `segmento-${ACTIVIDAD_3}-2-2`, además de la
   aserción existente sobre el panel de texto, agrega:

   ```ts
   const barra = screen.getByTestId(`segmento-${ACTIVIDAD_3}-2-2`);
   expect(barra.style.left).toBe("131px"); // (nuevoInicio 3 - 1) * 64 + 3
   ```

   (con el segmento original en `inicio: 2, fin: 2`, `PERIOD_WIDTH = 64`, y un
   desplazamiento de un período: `left` antes del drag es `67px`
   ((2-1)*64+3); confirma ese valor inicial también, antes del
   `pointerMove`, para dejar registrado el "antes" y el "después" en la misma
   prueba).

2. **Teclado mueve la barra visualmente antes de confirmar** — modela la
   prueba `"mueve un segmento desde el teclado con el cuerpo canónico"`
   (línea 46): tras `segmento.focus(); await user.keyboard("{ArrowRight}")`,
   antes de hacer clic en "Confirmar", agrega:

   ```ts
   expect(segmento.style.left).toBe("131px");
   ```

   reutilizando el mismo elemento `segmento` que la prueba ya obtiene con
   `screen.getByRole("button", { name: "Segmento 2–2 de Transporte material" })`.

No borres ni debilites ninguna aserción existente en este archivo.

**Verificar**: `pnpm exec vitest run src/test/features/cronograma/components/GanttJerarquicoInteractivo.test.tsx` → todos en verde, incluidas las 2 pruebas nuevas

### Paso 5: verificación visual y completa

1. Levanta (o reinicia si ya estaba corriendo desde antes del cambio)
   `pnpm run dev`, abre `/proyectos/{uuid}/cronograma?vista=gantt` con un
   cronograma que tenga actividades programadas, y arrastra una barra o su
   extremo: confirma que la barra se mueve/cambia de tamaño en el momento del
   gesto (con el estilo punteado de vista previa), no recién al hacer clic en
   "Confirmar".
2. `pnpm run e2e:screenshots` → la captura `10-cronograma` (vista Gantt, sin
   arrastre activo en el momento de la captura) sigue pasando igual que antes
   — este cambio no debe alterar el estado por defecto (sin `vistaPrevia`) de
   ninguna barra.

**Verificar**: `pnpm run verify` → exit 0

## Plan de pruebas

- Pruebas nuevas: las dos del Paso 4, en
  `src/test/features/cronograma/components/GanttJerarquicoInteractivo.test.tsx`,
  cubriendo el caso exacto reportado (drag) y su equivalente accesible
  (teclado) — ambos pasan por el mismo estado `vistaPrevia`, así que ambos
  deben quedar cubiertos para que un futuro cambio no rompa uno sin que el
  otro lo detecte.
- Patrón estructural: las pruebas `"convierte un drag de barra en un preview
  ordinal"` (línea 118) y `"mueve un segmento desde el teclado con el cuerpo
  canónico"` (línea 46) del mismo archivo — reutiliza sus mismos
  `fireEvent`/`user.keyboard`, solo añade la aserción de estilo.
- No se toca ningún test de `CronogramaPage.test.tsx` ni de otras vistas del
  cronograma — el cambio está contenido en `GanttJerarquicoInteractivo`.

## Criterios de cierre

Deben cumplirse TODOS:

- [ ] `pnpm run typecheck` sale con exit 0
- [ ] `pnpm run lint` sale con exit 0
- [ ] `pnpm run format:check` sale con exit 0
- [ ] `pnpm exec vitest run src/test/features/cronograma/components/GanttJerarquicoInteractivo.test.tsx` sale con exit 0, con las 2 pruebas nuevas del Paso 4 presentes y en verde
- [ ] `pnpm run e2e:screenshots` sale con exit 0, incluida `10-cronograma`
- [ ] Verificación manual del Paso 5.1 confirma que la barra se mueve durante el gesto, antes de confirmar
- [ ] Solo los dos archivos listados en "Alcance" aparecen modificados en `git status`
- [ ] `pnpm run verify` sale con exit 0
- [ ] Fila de este plan actualizada en `plans/00.INDEX.md`

## Condiciones STOP

Detente y reporta (no improvises) si:

- El código de `TimelineGrid` o de su invocación para la fila de actividad ya
  no coincide con los fragmentos citados en "Estado actual" (el repo cambió
  desde que se escribió este plan).
- Después del Paso 2, alguna prueba existente (no las nuevas del Paso 4)
  empieza a fallar — indicaría que otra parte del componente asumía
  implícitamente que `left`/`width` solo dependen de `segmento`, y el cambio
  tiene un efecto colateral no previsto aquí.
- El valor de `left`/`width` calculado en el Paso 4 no coincide con `131px`
  para el caso descrito (revisa `PERIOD_WIDTH`, que debe seguir siendo `64`,
  y los fixtures de `ACTIVIDAD_3`; si cambiaron, recalcula con la misma
  fórmula y usa el valor real en vez de forzar `131px`).
- Te piden además animar la transición (con `transition`/`framer-motion` o
  similar) — no lo hagas sin que te lo pidan explícitamente: no hay
  dependencia de animación en este repo (`package.json`) y agregar una está
  fuera del alcance de "que la barra refleje la vista previa".

## Notas de mantenimiento

- Si en el futuro se agrega un tercer punto de entrada que modifique
  `vistaPrevia` (hoy son: arrastre de puntero, teclado, y los botones de
  "Acciones de segmento"), no necesita tocar `TimelineGrid`: los tres ya
  convergen en el mismo estado `vistaPrevia`, y el Paso 2 lo consume sin
  importar su origen.
- Revisor: comprobar que el `aria-label` de la barra (`etiqueta`) sigue sin
  tocarse — es una decisión deliberada de este plan (ver "Fuera de alcance"),
  no un olvido; si un futuro plan quiere que el lector de pantalla anuncie
  también el rango previsualizado directamente en la barra (hoy solo lo hace
  el panel `aria-live="polite"` de más abajo), que sea una decisión explícita
  y no un cambio incidental.
