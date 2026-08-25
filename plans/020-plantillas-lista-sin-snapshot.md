# Plan 020: Arreglar el crash de "Nuevo APU" al listar plantillas (`p.snapshot` no existe)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat ab31892..HEAD -- src/features/apu-editor/components/DialogoNuevoApu.tsx src/features/apu-editor/hooks/usePlantillas.ts src/test/handlers.ts src/api/contract.ts`

## Status

- **Status**: done — implementado en rama `plan/020`, commit `478f715`, 2026-08-24
- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: ninguno
- **Category**: bug
- **Planned at**: commit `ab31892`, 2026-08-24

## Why this matters

`DialogoNuevoApu` renderiza la lista de plantillas leyendo `p.snapshot.costoTotal`.
El endpoint que consulta — `GET /plantillas-apu` — **no devuelve `snapshot`**: es
el endpoint de listado y su DTO es `PlantillaApuResponse` (id, nombre,
descripción, tipo, fechaCreacion). `snapshot` solo existe en
`PlantillaApuDetalleResponse`, que devuelve `GET /plantillas-apu/{id}`.

El resultado contra el backend real es un `TypeError: Cannot read properties of
undefined (reading 'costoTotal')` que tumba la pantalla entera al límite de
error. Está **reproducido hoy** en la suite de capturas:

```
$ pnpm exec playwright test --project=chromium e2e/screenshots.spec.ts -g "06-apus"
PAGE ERROR: LimiteDeError atrapó: TypeError: Cannot read properties of undefined (reading 'costoTotal')
```

TypeScript no lo detecta porque el componente **miente en el cast**: pide
`get<PlantillaApuDetalleResponse[]>` sobre una URL que devuelve otra cosa. Los
tests unitarios tampoco, porque el handler de MSW devuelve el fixture de
*detalle* para el endpoint de *lista*.

Al aterrizar esto, "Nuevo APU desde plantilla" deja de romperse y el fixture de
MSW deja de mentir sobre el contrato.

## Current state

### El contrato (fuente: `../thesis-docs/plan/architecture/07-api-contract.md`)

```
GET /plantillas-apu          → PlantillaApuResponse[]         (SIN snapshot)
GET /plantillas-apu/{id}     → PlantillaApuDetalleResponse    (CON snapshot)
```

`src/api/contract.ts:368-374` y `:386-392` — ya son correctos, no los toques:

```ts
export interface PlantillaApuResponse {
  id: number;
  nombre: string;
  descripcion?: string;
  tipo: "SISTEMA" | "PERSONAL";
  fechaCreacion: string;
}

export interface PlantillaApuDetalleResponse {
  id: number;
  nombre: string;
  descripcion?: string;
  tipo: "SISTEMA" | "PERSONAL";
  snapshot: ApuResponse;
}
```

### El componente roto

`src/features/apu-editor/components/DialogoNuevoApu.tsx:49-51` — query inlineada
con el tipo equivocado:

```tsx
const { data: plantillas } = useQuery({
  queryKey: qk.plantillas(),
  queryFn: () => get<PlantillaApuDetalleResponse[]>("/plantillas-apu"),
});
```

`src/features/apu-editor/components/DialogoNuevoApu.tsx:133-151` — los tres
accesos que revientan:

```tsx
{plantillas?.map((p) => (
  <button
    key={p.id}
    type="button"
    className={...}
    onClick={() => {
      setPlantillaId(p.id);
      setDescripcion(p.snapshot.descripcion);   // ← undefined.descripcion
      setUnidad(p.snapshot.unidad);             // ← undefined.unidad
    }}
  >
    <span>{p.nombre}</span>
    <span className="text-xs text-muted-foreground">
      {formatearMoneda(p.snapshot.costoTotal)}  // ← undefined.costoTotal (revienta al render)
    </span>
  </button>
))}
```

### El hook que ya existe y hace lo correcto

`src/features/apu-editor/hooks/usePlantillas.ts:11-27`:

```ts
export function usePlantillas(tipo?: string) {
  return useQuery({
    queryKey: qk.plantillas(tipo ? { tipo } : undefined),
    queryFn: () => {
      const params = tipo ? `?tipo=${tipo}` : "";
      return get<PlantillaApuResponse[]>(`/plantillas-apu${params}`);   // tipo correcto
    },
  });
}

export function usePlantillaDetalle(id: number) {
  return useQuery({
    queryKey: ["plantilla-apu", id],
    queryFn: () => get<PlantillaApuDetalleResponse>(`/plantillas-apu/${id}`),
    enabled: id > 0,
  });
}
```

### El fixture de MSW que enmascara el bug

`src/test/handlers.ts:228-242` — para el caso por defecto devuelve el fixture de
**detalle** (que sí trae `snapshot`, ver `src/test/fixtures/apu.ts:170`):

```ts
http.get(`${API}/plantillas-apu`, ({ request }) => {
  const url = new URL(request.url);
  const tipo = url.searchParams.get("tipo");
  if (tipo === "PERSONAL") {
    return HttpResponse.json([
      { id: 2, nombre: "Mi plantilla", descripcion: "Plantilla personal",
        tipo: "PERSONAL", fechaCreacion: "2026-07-20T00:00:00" },   // sin snapshot
    ]);
  }
  return HttpResponse.json([plantillaDetalleFixture]);                // CON snapshot ← miente
}),
```

Nótese que la rama `?tipo=PERSONAL` **sí** devuelve la forma correcta: si algún
test ejercitara esa ruta, ya estaría fallando.

### Convenciones del repo que aplican

- Las páginas y componentes consumen **hooks de feature**, no `useQuery`
  inlineado. `usePlantillas()` existe justo para esto.
- `src/api/` es la única capa que conoce HTTP (`README.md`, "Architecture").
- Los fixtures de test reflejan el contrato del backend, no lo que conviene al
  componente.

## Commands you will need

| Purpose     | Command                                                                        | Expected on success |
|-------------|--------------------------------------------------------------------------------|---------------------|
| Typecheck   | `pnpm run typecheck`                                                            | exit 0              |
| Tests       | `pnpm test`                                                                     | todos pasan         |
| Test dirigido | `pnpm test -- DialogoNuevoApu`                                                | pasa                |
| Repro E2E   | `pnpm exec playwright test --project=chromium e2e/screenshots.spec.ts -g "06-apus"` | pasa, sin `PAGE ERROR` |
| Gate        | `pnpm run verify`                                                               | exit 0              |

## Scope

**In scope**:
- `src/features/apu-editor/components/DialogoNuevoApu.tsx`
- `src/features/apu-editor/components/DialogoNuevoApu.test.tsx`
- `src/test/handlers.ts` (solo el handler de `GET /plantillas-apu`)

**Out of scope** (NO tocar):
- `src/api/contract.ts` — los DTOs ya son correctos. Si te tienta añadir
  `snapshot?` a `PlantillaApuResponse` para "que compile", **para**: eso
  falsearía el contrato para tapar el bug.
- `src/features/apu-editor/hooks/usePlantillas.ts` — ya es correcto.
- `src/features/plantillas/pages/MisPlantillasPage.tsx` — consume el mismo
  endpoint pero **no** lee `snapshot`; no tiene el bug.
- `e2e/screenshots.spec.ts` — la captura 06 se arregla sola al arreglar el
  componente. Los otros problemas del spec son el plan 021.

## Git workflow

- Rama: `advisor/020-plantillas-snapshot`
- Estilo de commit: conventional commits, p. ej.
  `fix: plantilla list has no snapshot, fetch detail on selection`
- No hagas push ni abras PR salvo instrucción explícita.

## Steps

### Step 1: Consumir el hook correcto y la lista sin `snapshot`

En `src/features/apu-editor/components/DialogoNuevoApu.tsx`:

1. Borra la query inlineada (líneas 49-51) y usa el hook:
   `const { data: plantillas } = usePlantillas();`
   Añade `import { usePlantillas } from "../hooks/usePlantillas";` y quita los
   imports que queden sin uso (`useQuery`, `get`, `qk`,
   `PlantillaApuDetalleResponse`) — oxlint los marcará.
2. En el `<button>` de cada plantilla, sustituye la celda de precio
   `{formatearMoneda(p.snapshot.costoTotal)}` por el **tipo** de plantilla, que
   sí viene en el listado:
   ```tsx
   <span className="text-xs text-muted-foreground">
     {p.tipo === "SISTEMA" ? "Sistema" : "Personal"}
   </span>
   ```
   No inventes un coste que la API no devuelve en este endpoint.

**Verify**: `pnpm run typecheck` → exit 0. Debe compilar **sin** `as` ni casts:
si necesitas un cast, es señal de que sigues leyendo un campo inexistente.

### Step 2: Traer el detalle al seleccionar

`setDescripcion(p.snapshot.descripcion)` y `setUnidad(p.snapshot.unidad)` sí
necesitan el snapshot, así que hay que pedirlo. Usa `usePlantillaDetalle`, que
ya existe y va deshabilitado hasta que haya id:

```tsx
const { data: detalle } = usePlantillaDetalle(plantillaId ?? 0);
```

El `onClick` solo fija el id:

```tsx
onClick={() => setPlantillaId(p.id)}
```

y un efecto rellena los campos cuando llega el detalle:

```tsx
useEffect(() => {
  if (!detalle) return;
  setDescripcion(detalle.snapshot.descripcion);
  setUnidad(detalle.snapshot.unidad);
}, [detalle]);
```

Revisa el tipo real de `plantillaId` en el componente antes de escribir
`?? 0` — si ya es `number | null`, encaja; si es otra cosa, adáptalo sin
cambiar su semántica.

**Verify**: `pnpm run typecheck` → exit 0 · `pnpm run lint` → exit 0

### Step 3: Que el fixture de MSW diga la verdad

En `src/test/handlers.ts`, el handler de `GET /plantillas-apu` debe devolver
objetos con forma `PlantillaApuResponse` en **ambas** ramas — es decir, quitar
`snapshot`. Reemplaza `HttpResponse.json([plantillaDetalleFixture])` por una
lista literal sin snapshot:

```ts
return HttpResponse.json([
  {
    id: plantillaDetalleFixture.id,
    nombre: plantillaDetalleFixture.nombre,
    descripcion: plantillaDetalleFixture.descripcion,
    tipo: plantillaDetalleFixture.tipo,
    fechaCreacion: "2026-07-01T00:00:00",
  },
]);
```

El handler de `GET /plantillas-apu/:id` (línea siguiente) **sigue** devolviendo
`plantillaDetalleFixture` completo: eso es correcto.

**Verify**: `pnpm test` → todos pasan. Si algún test falla aquí y **no** es de
`DialogoNuevoApu`, para y reporta: significa que otro componente también
depende del campo que el listado no trae.

### Step 4: Confirmar que la captura 06 deja de romperse

**Verify**:
`pnpm exec playwright test --project=chromium e2e/screenshots.spec.ts -g "06-apus" 2>&1 | grep -c "PAGE ERROR"`
→ `0`

Abre `screenshots/06-apus.png` y confirma que muestra la tabla de APUs, no
"Algo salió mal en esta sección."

## Test plan

En `src/features/apu-editor/components/DialogoNuevoApu.test.tsx`, modelado
sobre los tests existentes del mismo archivo:

1. **Renderiza la lista sin reventar** — abre el diálogo con el handler de MSW
   ya corregido (sin `snapshot`) y verifica que aparece el nombre de la
   plantilla. Este es el test de regresión del bug: contra el código viejo
   lanza `TypeError`.
2. **Al seleccionar una plantilla se rellenan descripción y unidad** — haz clic
   en la plantilla y espera (`findBy`) a que el input de descripción tenga el
   valor del snapshot de `plantillaDetalleFixture`. Cubre el paso 2.
3. **La celda derecha muestra el tipo** — verifica que se ve "Sistema" y que
   **no** aparece un importe con `$`.

**Verification**: `pnpm test -- DialogoNuevoApu` → pasa, con 3 tests nuevos.

## Done criteria

- [ ] `pnpm run verify` sale con exit 0
- [ ] `grep -n "snapshot" src/features/apu-editor/components/DialogoNuevoApu.tsx` solo aparece dentro del efecto que usa `detalle`, nunca sobre un elemento de la lista
- [ ] `grep -n "PlantillaApuDetalleResponse\[\]" src/` no devuelve nada
- [ ] `grep -n "useQuery" src/features/apu-editor/components/DialogoNuevoApu.tsx` no devuelve nada
- [ ] `pnpm exec playwright test --project=chromium e2e/screenshots.spec.ts -g "06-apus"` pasa y no imprime `PAGE ERROR`
- [ ] Los 3 tests nuevos existen y pasan
- [ ] `git status` no muestra archivos fuera de "In scope"
- [ ] Fila de estado actualizada en `plans/README.md`

## STOP conditions

Para y reporta si:

- El backend real sí devuelve `snapshot` en `GET /plantillas-apu` (comprobable
  en `../thesis-docs/plan/architecture/07-api-contract.md` §11, Apéndice B). En
  ese caso el bug está en el DTO, no en el componente, y el arreglo es otro.
- Al corregir el fixture de MSW (paso 3) falla un test que **no** es de
  `DialogoNuevoApu`: reporta cuál y para.
- `usePlantillaDetalle` dispara una petición por cada plantilla renderizada en
  vez de solo por la seleccionada — revisa su `enabled` antes de seguir.

## Maintenance notes

- La causa raíz no es el campo: es que `get<T>()` **no valida nada** en runtime
  (`src/api/request.ts:3-4` es un cast puro). Cualquier `get<X>` con la URL
  equivocada compila y revienta en producción. Esta clase de bug se elimina
  validando en el seam o generando el cliente desde OpenAPI — `plans/README.md`
  ya registra la falta de `openapi-typescript` como el gap #1 del proyecto.
- En revisión de PR: desconfiar de cualquier `get<AlgoDetalleResponse[]>`. El
  plural con "Detalle" casi siempre indica esta confusión lista/detalle.
- Hay un cuarto sitio con el mismo antipatrón de query inlineada duplicando un
  hook existente (`ListaProyectosPage` y `SelectorProyecto` duplican
  `useProyectos`); lo aborda el plan 022.
