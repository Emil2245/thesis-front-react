# Plan 023: Sustituir `window.confirm` por el diálogo del sistema de diseño

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat ab31892..HEAD -- src/features/presupuesto/pages/PresupuestoPage.tsx src/features/presupuesto/pages/VersionesPage.tsx src/components/comunes/ConfirmarDestructivo.tsx`
> `PresupuestoPage.tsx` **tiene cambios sin commitear** del rediseño de UI.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: ninguno
- **Category**: tech-debt
- **Planned at**: commit `ab31892` + rediseño de UI sin commitear, 2026-08-24

## Why this matters

Quedan tres confirmaciones destructivas resueltas con `window.confirm`, mientras
el resto del sistema usa `ConfirmarDestructivo` (un `AlertDialog` de shadcn):

```
src/features/presupuesto/pages/PresupuestoPage.tsx:52   eliminar capítulo
src/features/presupuesto/pages/PresupuestoPage.tsx:108  eliminar rubro
src/features/presupuesto/pages/VersionesPage.tsx:41     eliminar versión
```

No es solo estética. `window.confirm` bloquea el hilo, no se puede estilar ni
traducir, ignora el tema, es imposible de testear sin mockear `window` (los
tests actuales hacen `window.confirm = vi.fn(() => true)` — es decir, la
confirmación nunca se ejerce de verdad), y en algunos navegadores móviles y
webviews sencillamente no aparece. Las tres son operaciones que borran datos.

Al aterrizar esto, todas las confirmaciones destructivas de la aplicación usan
el mismo componente, y los tests pueden ejercitar de verdad el camino de
cancelar.

## Current state

### El componente que ya existe

`src/components/comunes/ConfirmarDestructivo.tsx` — API **basada en trigger**:
envuelve al elemento que dispara la acción.

```tsx
export function ConfirmarDestructivo({
  titulo, descripcion, textoConfirmar = "Eliminar", onConfirmar, children,
}: {
  titulo: string; descripcion: string; textoConfirmar?: string;
  onConfirmar: () => void; children: ReactNode;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descripcion}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmar}>{textoConfirmar}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

Se usa así hoy (`src/features/proyectos/pages/ListaProyectosPage.tsx`):

```tsx
<ConfirmarDestructivo
  titulo="Eliminar proyecto"
  descripcion={`¿Eliminar "${p.nombreProyecto}"? Esta acción no se puede deshacer.`}
  textoConfirmar="Eliminar"
  onConfirmar={() => eliminar.mutate(p.id)}
>
  <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
    <Trash2Icon /> Eliminar
  </DropdownMenuItem>
</ConfirmarDestructivo>
```

### Por qué no encaja tal cual en `PresupuestoPage`

Los confirms viven en *callbacks* que la página pasa hacia abajo por el árbol;
el botón que dispara la acción está dentro de `FilaCapitulo` / `FilaRubro`, a
dos niveles de distancia:

```tsx
// src/features/presupuesto/pages/PresupuestoPage.tsx:50-57
const handleEliminarCapitulo = useCallback(
  (capitulo: CapituloResponse) => {
    if (window.confirm(`¿Eliminar capítulo "${capitulo.descripcion}" y su contenido?`)) {
      eliminar.mutate(capitulo.id);
    }
  },
  [eliminar],
);
```

No hay un `children` que envolver sin tocar `ArbolPresupuesto`, `FilaCapitulo` y
`FilaRubro`. Por eso este plan añade un **modo controlado** al componente en vez
de reestructurar el árbol.

La página ya tiene una máquina de estados de diálogos que encaja perfecto:

```tsx
// src/features/presupuesto/pages/PresupuestoPage.tsx:30-34
const [dialogo, setDialogo] = useState<{
  type: "crear" | "editar" | "mover" | "agregar";
  padreId?: number;
  capitulo?: CapituloResponse;
} | null>(null);
```

### Los tests que hoy neutralizan la confirmación

```ts
// src/features/presupuesto/pages/PresupuestoPage.test.tsx:10-13
beforeEach(() => {
  useSesionStore.setState({ usuario: usuarioFixture, cargando: false });
  window.confirm = vi.fn(() => true);
});
```

### Convenciones del repo

- **Regla del sistema de diseño**: los diálogos siempre llevan título
  (`AlertDialogTitle`), y las confirmaciones usan `AlertDialog`, no un `Dialog`
  cualquiera ni markup propio.
- Los tests consultan por rol y etiqueta accesible en español.
- Nada de `space-y-*`: `flex` con `gap-*`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm run typecheck` | exit 0 |
| Tests | `pnpm test` | todos pasan |
| Test dirigido | `pnpm test -- PresupuestoPage` | pasa |
| Gate | `pnpm run verify` | exit 0 |

## Scope

**In scope**:
- `src/components/comunes/ConfirmarDestructivo.tsx`
- `src/features/presupuesto/pages/PresupuestoPage.tsx`
- `src/features/presupuesto/pages/VersionesPage.tsx`
- `src/features/presupuesto/pages/PresupuestoPage.test.tsx`

**Out of scope** (NO tocar):
- `src/features/presupuesto/components/ArbolPresupuesto.tsx`,
  `FilaCapitulo.tsx`, `FilaRubro.tsx` — el modo controlado existe precisamente
  para no tener que cambiar el árbol. Si te ves modificándolos, para.
- Los usos actuales de `ConfirmarDestructivo` con trigger
  (`ListaProyectosPage`, `ResumenProyectoPage`) — deben seguir compilando y
  funcionando sin cambios. Este plan **añade** un modo, no sustituye el
  existente.
- `src/components/ui/alert-dialog.tsx` — primitiva de shadcn, no se toca.

## Git workflow

- Rama: `advisor/023-confirmar-destructivo`
- Estilo de commit: conventional commits, p. ej. `refactor: replace window.confirm with AlertDialog`
- No hagas push ni abras PR salvo instrucción explícita.

## Steps

### Step 1: Modo controlado en `ConfirmarDestructivo`

Haz `children` opcional y añade `abierto` / `onAbiertoChange`. Cuando se pasan,
el componente es controlado y no renderiza trigger:

```tsx
export function ConfirmarDestructivo({
  titulo,
  descripcion,
  textoConfirmar = "Eliminar",
  onConfirmar,
  children,
  abierto,
  onAbiertoChange,
}: {
  titulo: string;
  descripcion: string;
  textoConfirmar?: string;
  onConfirmar: () => void;
  /** Modo trigger: el elemento que abre el diálogo. */
  children?: ReactNode;
  /** Modo controlado: la página gobierna la apertura. Requiere `onAbiertoChange`. */
  abierto?: boolean;
  onAbiertoChange?: (v: boolean) => void;
}) {
  const controlado = abierto !== undefined;
  return (
    <AlertDialog
      {...(controlado ? { open: abierto, onOpenChange: onAbiertoChange } : {})}
    >
      {children ? <AlertDialogTrigger asChild>{children}</AlertDialogTrigger> : null}
      {/* ...el resto del contenido, sin cambios... */}
    </AlertDialog>
  );
}
```

No cambies el contenido del diálogo ni los textos de los botones. Los usos
existentes con `children` no pasan `abierto`, así que siguen igual.

**Verify**: `pnpm run typecheck` → exit 0 · `pnpm test -- ListaProyectosPage` → pasa (los usos con trigger no han cambiado)

### Step 2: `PresupuestoPage` — capítulo y rubro por la máquina de estados

Amplía el tipo del estado `dialogo` con dos variantes:

```tsx
const [dialogo, setDialogo] = useState<
  | { type: "crear" | "editar" | "mover" | "agregar"; padreId?: number; capitulo?: CapituloResponse }
  | { type: "eliminar-capitulo"; capitulo: CapituloResponse }
  | { type: "eliminar-rubro"; capituloId: number; rubroId: number }
  | null
>(null);
```

Los dos manejadores dejan de confirmar y solo abren el diálogo:

```tsx
const handleEliminarCapitulo = useCallback((capitulo: CapituloResponse) => {
  setDialogo({ type: "eliminar-capitulo", capitulo });
}, []);

const handleEliminarRubro = useCallback((capituloId: number, rubroId: number) => {
  setDialogo({ type: "eliminar-rubro", capituloId, rubroId });
}, []);
```

Y monta dos `ConfirmarDestructivo` controlados junto a los diálogos que ya hay
al final del JSX:

```tsx
<ConfirmarDestructivo
  abierto={dialogo?.type === "eliminar-capitulo"}
  onAbiertoChange={(v) => !v && setDialogo(null)}
  titulo="Eliminar capítulo"
  descripcion={
    dialogo?.type === "eliminar-capitulo"
      ? `¿Eliminar el capítulo "${dialogo.capitulo.descripcion}" y todo su contenido? Esta acción no se puede deshacer.`
      : ""
  }
  onConfirmar={() => {
    if (dialogo?.type === "eliminar-capitulo") eliminar.mutate(dialogo.capitulo.id);
    setDialogo(null);
  }}
/>
```

y el equivalente para el rubro, con descripción
`"¿Eliminar este rubro del presupuesto? Esta acción no se puede deshacer."` y
`eliminarRubro.mutate({ capituloId, rubroId })`.

Al ampliar el tipo del estado, TypeScript señalará los sitios donde se leen
`dialogo.padreId` o `dialogo.capitulo` sin estrechar antes el `type`. Estrecha
con comparaciones de `dialogo?.type`; **no** uses `as` ni `!` para silenciarlo:
esos errores son el compilador haciendo su trabajo.

**Verify**: `pnpm run typecheck` → exit 0 · `grep -n "window.confirm" src/features/presupuesto/pages/PresupuestoPage.tsx` → sin resultados

### Step 3: `VersionesPage` — eliminar versión

Mismo patrón en `src/features/presupuesto/pages/VersionesPage.tsx:41`. Esta
página no tiene máquina de diálogos, así que basta un estado local con la
versión pendiente de borrar:

```tsx
const [versionAEliminar, setVersionAEliminar] = useState<number | null>(null);
```

El manejador hace `setVersionAEliminar(id)` y el `ConfirmarDestructivo`
controlado usa `abierto={versionAEliminar !== null}`. Conserva el texto actual
del aviso — "No se puede eliminar la versión vigente." — como parte de la
descripción, porque es información real para el usuario.

**Verify**: `grep -rn "window.confirm" src/` → sin resultados

### Step 4: Quitar el mock que neutralizaba la confirmación

En `src/features/presupuesto/pages/PresupuestoPage.test.tsx`, elimina
`window.confirm = vi.fn(() => true);` del `beforeEach` y el import de `vi` si
queda sin uso. Los tests que borraban algo ahora tienen que pulsar el botón
"Eliminar" del diálogo; actualízalos:

```tsx
await user.click(screen.getByRole("button", { name: /eliminar/i }));
const dialogo = await screen.findByRole("alertdialog");
await user.click(within(dialogo).getByRole("button", { name: "Eliminar" }));
```

`within` ya se importa en ese archivo.

**Verify**: `pnpm test -- PresupuestoPage` → pasa

## Test plan

En `src/features/presupuesto/pages/PresupuestoPage.test.tsx`:

1. **Eliminar capítulo pide confirmación** — pulsa el botón de eliminar de un
   capítulo y verifica que aparece un `alertdialog` cuyo texto contiene el
   nombre del capítulo.
2. **Cancelar no borra** — abre el diálogo, pulsa "Cancelar", y verifica que el
   capítulo **sigue** en el documento. Este caso es imposible de escribir hoy:
   es la razón principal del plan.
3. **Confirmar borra** — abre el diálogo, pulsa "Eliminar", y verifica que la
   mutación ocurre (el capítulo desaparece, o el handler de MSW recibe el
   DELETE).

Modela la interacción sobre los tests existentes del mismo archivo, que ya usan
`user` de `renderConProviders` y `findByRole("dialog")` para el diálogo de
capítulo.

**Verification**: `pnpm test -- PresupuestoPage` → pasa, con 3 tests nuevos.

## Done criteria

- [ ] `pnpm run verify` sale con exit 0
- [ ] `grep -rn "window.confirm\|window.alert\|window.prompt" src/` no devuelve nada
- [ ] `grep -rn "window.confirm = " src/` no devuelve nada (ningún test lo mockea)
- [ ] Los usos con trigger de `ConfirmarDestructivo` siguen pasando sus tests (`pnpm test -- ListaProyectosPage`)
- [ ] Los 3 tests nuevos existen y pasan, incluido el de cancelar
- [ ] `git status` no muestra archivos fuera de "In scope"
- [ ] Fila de estado actualizada en `plans/README.md`

## STOP conditions

Para y reporta si:

- Hacer controlado el componente rompe algún uso con trigger: significa que el
  branching de `open`/`onOpenChange` está mal y no debes "arreglarlo" tocando
  los llamadores.
- Te encuentras teniendo que modificar `ArbolPresupuesto`, `FilaCapitulo` o
  `FilaRubro`: para y reporta. El modo controlado existe para evitarlo.
- El estrechamiento de la unión de `dialogo` te obliga a más de un puñado de
  cambios en la página: reporta el alcance antes de continuar.

## Maintenance notes

- Regla a sostener: **ninguna confirmación destructiva usa APIs de diálogo del
  navegador**. Un `grep` de `window.confirm` en revisión de PR lo cubre.
- El componente ahora tiene dos modos. Si en el futuro casi todo el código usa
  el controlado, conviene partirlo en dos componentes en vez de mantener el
  branching; con tres usos de cada uno todavía no compensa.
- `DialogoMoverCapitulo` recibe un capítulo ficticio (`{ id: 0, item: "", … }`)
  cuando no hay ninguno seleccionado (`PresupuestoPage`, cerca del final del
  JSX). Es el mismo olor que este plan corrige — estado de diálogo modelado con
  centinelas en vez de con una unión — pero queda **deliberadamente fuera**:
  tocarlo implica cambiar la firma del componente.
