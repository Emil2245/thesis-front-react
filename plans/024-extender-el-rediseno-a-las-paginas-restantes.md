# Plan 024: Extender el encabezado y la tarjeta de tabla a las 13 páginas restantes

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat ab31892..HEAD -- src/components/comunes/ src/features/`
> Los primitivos `EncabezadoPagina` y `TarjetaTabla` son **archivos nuevos sin
> commitear** del rediseño de UI: si no existen, este plan no aplica → STOP.

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: LOW
- **Depends on**: ninguno técnico. Ejecutar **después** de 019 y 020 si van en paralelo: aquellos tocan `ListaApusPage` y `CronogramaPage`, que también están aquí.
- **Category**: tech-debt
- **Planned at**: commit `ab31892` + rediseño de UI sin commitear, 2026-08-24
- **Status**: implementado en `plan/024`, 2026-08-24. Trece paginas migradas a EncabezadoPagina (+TarjetaTabla donde hay tabla), cero `p-6` en src/features, 11 capturas regeneradas sin PAGE ERROR.

## Why this matters

El rediseño de la interfaz convirtió cuatro pantallas (lista de proyectos,
resumen de proyecto, editor de APU y presupuesto) al vocabulario nuevo:
`EncabezadoPagina` para el encabezado y `TarjetaTabla` para los listados. Las
otras **trece** siguen con el patrón viejo: un `<h1 className="text-xl
font-semibold">` suelto, `space-y-4` como sistema de espaciado y tablas sin
contenedor.

El resultado es una aplicación que cambia de aspecto según la ruta: distinto
espaciado sobre el encabezado, distinta relación entre título y acciones, tablas
que a veces flotan y a veces tienen borde. Es exactamente la incoherencia que
motivó el rediseño, resuelta a medias.

Al aterrizar esto, las diecisiete pantallas comparten encabezado, densidad y
superficie, y `grep "text-xl font-semibold"` deja de encontrar encabezados
artesanales.

## Current state

### Los primitivos que hay que usar

`src/components/comunes/EncabezadoPagina.tsx`:

```tsx
export function EncabezadoPagina({
  titulo,        // ReactNode — el título de la página
  descripcion,   // ReactNode — una línea de contexto bajo el título
  insignia,      // ReactNode — chip junto al título (estado, etc.)
  meta,          // ReactNode — datos secundarios en fila, separados por <PuntoMeta />
  acciones,      // ReactNode — botones alineados a la derecha
}: { … })
```

Exporta también `PuntoMeta`, un separador vertical fino para la fila `meta`.

`src/components/comunes/TarjetaTabla.tsx`:

```tsx
export function TarjetaTabla({
  titulo,    // ReactNode — cabecera opcional de 44 px
  accion,    // ReactNode — a la derecha de la cabecera
  pie,       // ReactNode — pie con fondo muted
  className,
  children,  // la <Table>, sin padding: llega hasta el filo
}: { … })
```

### Ejemplar a copiar

`src/features/proyectos/pages/ListaProyectosPage.tsx` es la referencia canónica:
devuelve un fragmento (`<>…</>`, **sin** `div` envolvente y **sin** `space-y-*`,
porque `AppShell` ya aplica `flex flex-col gap-5 p-6`), con `EncabezadoPagina`
primero y `TarjetaTabla` envolviendo la `Table`:

```tsx
return (
  <>
    <EncabezadoPagina
      titulo="Proyectos"
      descripcion={`${total} proyectos · ${enProceso} en proceso`}
      acciones={
        <Button onClick={() => setAsistenteAbierto(true)}>
          <PlusIcon data-icon="inline-start" /> Nuevo proyecto
        </Button>
      }
    />
    <TarjetaTabla pie={<span>Mostrando {total} de {total} proyectos</span>}>
      <Table>…</Table>
    </TarjetaTabla>
    <AsistenteCrearProyecto … />
  </>
);
```

Nótese `data-icon="inline-start"` en el icono dentro del `Button`: es la regla
del sistema de diseño; los iconos **no** llevan clases de tamaño propias.

### El shell ya pone el espaciado

`src/shell/AppShell.tsx`:

```tsx
<main className="flex flex-1 flex-col gap-5 p-6">
```

Por eso las páginas migradas no envuelven en `<div className="space-y-4">`: eso
duplicaría el espaciado. `PresupuestoPage` además tenía su propio `p-6` encima
del `p-6` del shell — doble padding — y se corrigió al migrarla.

### Las trece páginas pendientes

```
src/features/proyectos/pages/ParametrosPage.tsx
src/features/insumos/pages/InsumosPage.tsx
src/features/apu-editor/pages/ListaApusPage.tsx
src/features/presupuesto/pages/VersionesPage.tsx
src/features/cronograma/pages/CronogramaPage.tsx
src/features/exportar/pages/ExportPage.tsx
src/features/plantillas/pages/MisPlantillasPage.tsx
src/features/admin/pages/AdminBasesPage.tsx
src/features/admin/pages/AdminLogsPage.tsx
src/features/admin/pages/AdminParametrosPage.tsx
src/features/admin/pages/AdminPlantillasPage.tsx
src/features/admin/pages/AdminUsuariosPage.tsx
src/features/admin/pages/AdminValoresPage.tsx
```

Comando que las regenera (por si el listado ha cambiado):

```
for f in $(grep -rln 'text-xl font-semibold' src/features/); do
  grep -q "EncabezadoPagina" "$f" || echo "$f";
done
```

### Convenciones del repo

- Nada de `space-y-*` / `space-x-*`: `flex` con `gap-*`
  (regla del sistema de diseño; hay ~98 ocurrencias en el repo, este plan
  reduce las de nivel de página).
- Colores semánticos (`bg-muted`, `text-muted-foreground`), nunca crudos
  (`bg-blue-500`). Los que quedan los aborda el plan 025.
- Los estados vacíos usan `EstadoVacio`; los de carga, `CargandoTabla` o
  `Skeleton`.
- UI en español; los sustantivos de dominio se quedan en español.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm run typecheck` | exit 0 |
| Tests | `pnpm test` | todos pasan |
| Lint | `pnpm run lint` | exit 0 |
| Gate | `pnpm run verify` | exit 0 |
| Capturas | `pnpm exec playwright test --project=chromium e2e/screenshots.spec.ts` | 11 passed |

## Scope

**In scope**: las trece páginas listadas arriba y sus archivos `*.test.tsx`
hermanos, si un test se rompe por el cambio de estructura.

**Out of scope** (NO tocar):
- `src/components/comunes/EncabezadoPagina.tsx` y `TarjetaTabla.tsx` — son la
  referencia. Si una página necesita algo que no soportan, **para y reporta**
  en vez de añadir props: probablemente esa página necesita otra cosa, no el
  primitivo necesita crecer.
- Las cuatro páginas ya migradas (`ListaProyectosPage`, `ResumenProyectoPage`,
  `EditorApuPage`, `PresupuestoPage`).
- `src/components/ui/*` — primitivas de shadcn.
- **La lógica**: hooks, queries, mutaciones, manejadores. Este plan es
  presentación. Si te ves cambiando un `useQuery`, has salido del alcance.
- Los `space-y-*` dentro de **diálogos y formularios** — este plan solo elimina
  los de nivel de página. Los formularios son otro asunto (`FieldGroup`).

## Git workflow

- Rama: `advisor/024-encabezados-restantes`
- **Un commit por página.** Trece páginas en un commit es irrevisable y, si una
  sale mal, no se puede revertir sola.
- Estilo: conventional commits, p. ej. `style: migrate InsumosPage to EncabezadoPagina`
- No hagas push ni abras PR salvo instrucción explícita.

## Steps

Para **cada** página de la lista, en este orden (las más visibles primero:
`InsumosPage`, `ListaApusPage`, `VersionesPage`, `CronogramaPage`, `ExportPage`,
`MisPlantillasPage`, `ParametrosPage`, y luego las seis de admin), aplica la
misma receta de cinco puntos:

### Receta por página

1. **Sustituye el encabezado artesanal.** Localiza el bloque
   `<div className="flex items-center justify-between"><h1 className="text-xl
   font-semibold">…</h1><Button>…</Button></div>` y cámbialo por
   `<EncabezadoPagina titulo="…" acciones={…} />`. Si la página muestra un
   subtítulo o un contador, va en `descripcion`. Si muestra datos sueltos (un
   código, una fecha, un contador), van en `meta` separados por `<PuntoMeta />`.
2. **Quita el `div` envolvente y su `space-y-*`.** El componente devuelve un
   fragmento. Si la página tenía su propio `p-6`, quítalo: el shell ya lo pone.
3. **Envuelve la tabla principal en `TarjetaTabla`.** Si la página tiene una
   cabecera de sección sobre la tabla, pásala como `titulo`; si tiene un
   contador o paginación bajo la tabla, como `pie`.
4. **Iconos en botones**: añade `data-icon="inline-start"` al icono y quita
   cualquier `className="size-4"` / `w-4 h-4` que lleve.
5. **Verifica esa página sola** antes de pasar a la siguiente:
   `pnpm run typecheck && pnpm test -- <NombreDePagina>` → exit 0.

### Casos con matices

- **`CronogramaPage` y `ExportPage`** no son listados: su contenido principal no
  es una tabla (Gantt, tarjetas de descarga). Aplica solo los puntos 1, 2 y 4;
  **no** fuerces `TarjetaTabla` alrededor de algo que no es una tabla.
- **`ParametrosPage` y `AdminParametrosPage`** son formularios. Aplica 1, 2 y 4.
  Sus `space-y-*` internos quedan **fuera de alcance** (se resuelven migrando a
  `FieldGroup`/`Field`, que es otro trabajo).
- **`InsumosPage`** delega en `TablaInsumos`. Migra el encabezado en la página;
  el `TarjetaTabla` alrededor de la tabla va **dentro** de `TablaInsumos`, que
  es donde vive la `<Table>`. Es la única página en la que este plan toca un
  componente y no solo una página: es correcto.
- **`ListaApusPage` y `CronogramaPage`** también las tocan los planes 019 y 021.
  Si esos ya aterrizaron, rebasa antes de empezar.

## Test plan

Este plan **no debería necesitar tests nuevos**: es presentación pura y los
tests existentes consultan por rol y texto accesible, que no cambian.

Lo que sí debes hacer:

- Tras cada página, `pnpm test -- <NombreDePagina>`. Si un test se rompe, casi
  siempre es porque consultaba por una estructura del DOM (p. ej.
  `container.querySelector`) en vez de por rol. **Arregla el test para que
  consulte por rol accesible**, no cambies el marcado para complacer al test.
- Si un test se rompe porque el texto del encabezado dejó de existir, es que
  cambiaste el copy: restáuralo. Este plan no reescribe textos.
- Al final, regenera las capturas y revisa las 11 a ojo (ver "Done criteria").

## Done criteria

- [ ] `pnpm run verify` sale con exit 0
- [ ] El comando de detección no devuelve nada:
      `for f in $(grep -rln 'text-xl font-semibold' src/features/); do grep -q "EncabezadoPagina" "$f" || echo "$f"; done`
      → salida vacía (`ResumenProyectoPage` puede aparecer en el `grep` crudo:
      usa esa clase en una cifra, no en un encabezado; el filtro por
      `EncabezadoPagina` ya lo excluye)
- [ ] `grep -rn 'className="p-6' src/features/` no devuelve nada (el padding lo pone el shell)
- [ ] `pnpm exec playwright test --project=chromium e2e/screenshots.spec.ts` → 11 passed
- [ ] Trece commits, uno por página (`git log --oneline` en la rama)
- [ ] Ningún cambio en hooks, queries ni mutaciones: `git diff --stat` no toca `hooks/` ni `api/`
- [ ] Fila de estado actualizada en `plans/README.md`

## STOP conditions

Para y reporta si:

- Una página necesita una prop que `EncabezadoPagina` o `TarjetaTabla` no
  tienen. No amplíes los primitivos por tu cuenta: describe el caso y para.
- Migrar una página exige tocar su lógica de datos para que el marcado encaje.
- Un test se rompe y arreglarlo requeriría cambiar lo que la página **hace**, no
  cómo se ve.
- Tras migrar tres páginas, la receta claramente no encaja en el resto: reporta
  el patrón que falla antes de forzar diez más.

## Maintenance notes

- La regla a sostener: **ninguna página construye su propio encabezado**. En
  revisión de PR, un `<h1>` dentro de `src/features/**/pages/` es señal de
  alarma.
- Quedan ~98 usos de `space-y-*` / `space-x-*` en el repo, la mayoría dentro de
  diálogos y formularios. Este plan reduce los de nivel de página; los de
  formulario se resuelven migrando a `FieldGroup` + `Field`, que es un plan
  aparte y con más riesgo (cambia la accesibilidad de los formularios).
- `AppShell` fija `gap-5` entre los hijos de `<main>`. Si una página necesita
  otro espaciado, la respuesta es agrupar sus secciones en un contenedor
  propio, no cambiar el shell.
