# Plan 049 — Enable plantillas de proyecto (un-gate `plantillas-proyecto`)

**Status:** TODO
**Written against:** `e44c608`
**Spec source:** backend `test/stuff` @ `eb9a1da`, `PlantillaProyectoResource`; supersedes the gate added in plan 035
**Effort:** M (3-4 hours)
**Risk:** MEDIUM — un-gating exposes four contract bugs that are latent today because nothing calls the endpoints

## Why

`PlantillasProyectoPage` renders a `ModuloNoDisponible` stub because `/plantillas-proyecto` did not exist when plan 035 landed. It exists now on `test/stuff`:

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/plantillas-proyecto` | — | `PlantillaProyectoResponse[]` |
| GET | `/plantillas-proyecto/{id}` | — | `PlantillaProyectoResponse` |
| DELETE | `/plantillas-proyecto/{id}` | — | 204 |
| POST | `/proyectos/{proyectoId}/guardar-plantilla` | `{nombre, descripcion?}` | 201 `PlantillaProyectoResponse` |
| POST | `/proyectos/desde-plantilla/{plantillaId}` | `{nombre}` | 201/200 `ProyectoDesdePlantillaResponse` |

All ids are **UUIDv7 strings**. Unlike plan 048, this module is *not* nearly-ready — the stub hid four genuine defects:

1. **`useGuardarPlantillaProyecto` posts to the wrong URL.** It sends `POST /plantillas-proyecto` with `proyectoId` in the body. The real endpoint is `POST /proyectos/{proyectoId}/guardar-plantilla`, with `proyectoId` as a **path param** and no such body field. This would 404 today.
2. **`useCrearDesdePlantilla` types the wrong response.** It declares `ProyectoDetalleResponse`, but the backend returns `ProyectoDesdePlantillaResponse{proyecto, advertencias?}` — a **wrapper**. The page then does `navigate(\`/proyectos/${proyecto.id}\`)`, which would navigate to `/proyectos/undefined`.
3. **Numeric-sentinel state.** The page uses `useState(0)` with `usarId > 0` as "dialog open". With UUID strings, `"..." > 0` is always `false` — the dialog would never open.
4. **Numeric ids throughout** — `plantillaId: number`, `id: number`, `proyectoId: number`, and `PlantillaProyectoResponse.id: number`.

`PlantillaProyectoResponse` is also missing `snapshotEstructura`.

> **"Duplicar proyecto" stays disabled.** The two `MOTIVO_SIN_BACKEND` tooltips in `ListaProyectosPage.tsx:254` and `ResumenProyectoPage.tsx:114` both guard *Duplicar*, and **no `/proyectos/{id}/duplicar` endpoint exists** on `test/stuff`. Leave them.
>
> **"Guardar como plantilla" is already enabled** in the UI (`ResumenProyectoPage.tsx:116`) — it is not behind a tooltip. It is simply calling the wrong URL. This plan fixes the call, it does not un-disable a button.

## What changes

1. **Fix the contract types** — string ids, drop `proyectoId` from the create body, add the `ProyectoDesdePlantillaResponse` wrapper and `snapshotEstructura`.
2. **Fix `useGuardarPlantillaProyecto`** to hit `/proyectos/{proyectoId}/guardar-plantilla`.
3. **Fix `useCrearDesdePlantilla`** to unwrap the response.
4. **Fix the page's numeric sentinel** and the navigate target.
5. **Remove `"plantillas-proyecto"`** from `MODULOS_SIN_BACKEND`, delete the stub.
6. **Update handlers, fixtures and tests.**

## Steps

### Step 1 — Fix `src/api/contract.ts`

```typescript
export interface PlantillaProyectoResponse {
  id: string;
  nombre: string;
  descripcion?: string;
  snapshotEstructura: unknown;
  fechaCreacion: string;
}

export interface PlantillaProyectoCrearRequest {
  nombre: string;
  descripcion?: string;
  // proyectoId removed — it is a path param, never a body field
}

export interface ProyectoDesdePlantillaRequest {
  nombre: string;
}

export interface ProyectoDesdePlantillaResponse {
  proyecto: ProyectoResponse;
  advertencias?: string[];
}
```

Confirm the element type of `advertencias` against the backend DTO before committing — if it is a record rather than a string, mirror `AdvertenciaPlantillaResponse` as the APU side does.

### Step 2 — Fix `src/features/plantillas-proyecto/hooks/usePlantillasProyecto.ts`

`useGuardarPlantillaProyecto` needs the project id, so it takes it as an argument:

```typescript
export function useGuardarPlantillaProyecto(proyectoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PlantillaProyectoCrearRequest) =>
      post<PlantillaProyectoResponse>(`/proyectos/${proyectoId}/guardar-plantilla`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.plantillasProyecto() });
      toast.success("Plantilla guardada");
    },
    onError: () => toast.error("Error al guardar la plantilla"),
  });
}
```

`useCrearDesdePlantilla` unwraps the response so callers keep getting a project:

```typescript
export function useCrearDesdePlantilla() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ plantillaId, body }: { plantillaId: string; body: ProyectoDesdePlantillaRequest }) =>
      post<ProyectoDesdePlantillaResponse>(`/proyectos/desde-plantilla/${plantillaId}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.proyectos() });
      toast.success("Proyecto creado desde la plantilla");
    },
    onError: () => toast.error("Error al crear el proyecto"),
  });
}
```

Keep the wrapper in the mutation's return type rather than mapping it away — `advertencias` is real information and the page should be free to surface it later.

`useEliminarPlantillaProyecto` takes `id: string`.

### Step 3 — Fix `DialogoGuardarComoPlantilla`

In `src/features/proyectos/components/DialogoGuardarComoPlantilla.tsx`:

- `proyectoId: string` in the props type.
- Pass it to the hook: `const guardar = useGuardarPlantillaProyecto(proyectoId);`
- Drop `proyectoId` from the `mutateAsync` body — it is now a path param:

```typescript
await guardar.mutateAsync({
  nombre: nombre.trim(),
  descripcion: descripcion.trim() || undefined,
});
```

### Step 4 — Fix the page

In `src/features/plantillas-proyecto/pages/PlantillasProyectoPage.tsx`:

Replace the numeric sentinel:

```typescript
const [usarId, setUsarId] = useState<string | null>(null);
```

```typescript
onClick={() => setUsarId(p.id)}
```

```tsx
<Dialog open={usarId != null} onOpenChange={(o) => !o && setUsarId(null)}>
```

And fix `handleCrear` — reset to `null`, and navigate through the wrapper:

```typescript
const handleCrear = async () => {
  if (!nombreNuevo.trim() || !usarId) return;
  const { proyecto } = await crearDesdePlantilla.mutateAsync({
    plantillaId: usarId,
    body: { nombre: nombreNuevo.trim() },
  });
  setUsarId(null);
  setNombreNuevo("");
  navigate(`/proyectos/${proyecto.id}`);
};
```

Note the added `!usarId` guard: the old code read `usarId` from state that could not be `0`-safe either. Keep it.

### Step 5 — Remove the module from the gate

In `src/lib/disponibilidad.ts`, drop `"plantillas-proyecto"` and update the doc comment (it names this module explicitly in a second paragraph — delete that paragraph).

### Step 6 — Delete the stub page

- Delete the comment block at lines 35-38 and the stub `export function PlantillasProyectoPage()` (lines 39-49).
- Rename `PlantillasProyectoPageActiva` → `PlantillasProyectoPage`.
- Drop the unused `ModuloNoDisponible` import.

```bash
grep -rn "PlantillasProyectoPageActiva" src/
```

### Step 7 — Fix the MSW handlers

In `src/test/handlers.ts`:

- Line 120 — **replace** `http.post(\`${API}/plantillas-proyecto\`, …)` with `http.post(\`${API}/proyectos/:proyectoId/guardar-plantilla\`, …)`.
- Line 127 — `/proyectos/desde-plantilla/:id` must return the **wrapper**:

```typescript
http.post(`${API}/proyectos/desde-plantilla/:id`, () =>
  HttpResponse.json(
    { proyecto: { ...proyectoDetalleFixture, nombreProyecto: "Nuevo desde plantilla" } },
    { status: 201 },
  ),
),
```

- Every plantilla-proyecto fixture id becomes a UUID string (line 122 currently returns `id: 2`; line 129 returns `id: 99`).

MSW runs with `onUnhandledRequest: "error"`, so a missed URL fails loudly — that is the safety net for Step 2.

### Step 8 — Update the tests

`src/test/features/plantillas-proyecto/pages/PlantillasProyectoPage.test.tsx`:

- Delete the `describe("PlantillasProyectoPage")` degraded block and the stale comment at lines 9-13.
- Import and render `PlantillasProyectoPage` directly.
- The existing "crea un proyecto desde la plantilla" test passes today only because the dialog assertion is loose. **Strengthen it**: assert the navigate target, so the wrapper-unwrapping in Step 4 is actually pinned.

`src/test/features/proyectos/components/DialogoGuardarComoPlantilla.test.tsx` — update the `proyectoId` prop to a UUID string and assert the request hits `/proyectos/{id}/guardar-plantilla`.

`src/test/shell/Sidebar.test.tsx` — add a no-`"pronto"` assertion for the plantillas-proyecto entry.

### Step 9 — Verify

```bash
npm run typecheck   # zero errors
npx vitest run     # all green
npm run lint       # clean
```

## Seams under test

TDD at the page and dialog seams, against MSW.

| File | Covers |
|---|---|
| `src/test/features/plantillas-proyecto/pages/PlantillasProyectoPage.test.tsx` | list, empty state, delete-with-confirm, **create-from-template navigates to the new project id** (pins the response wrapper), dialog opens on a string id (pins the sentinel fix) |
| `src/test/features/proyectos/components/DialogoGuardarComoPlantilla.test.tsx` | `POST /proyectos/{uuid}/guardar-plantilla` with `{nombre, descripcion?}` and **no `proyectoId` in the body** (pins the URL fix) |
| `src/test/shell/Sidebar.test.tsx` | the plantillas-proyecto entry is no longer badged "pronto" |

Write the two pinning tests **red first**. Both currently pass for the wrong reason — the dialog test because nothing asserts the URL, the navigate test because nothing asserts the destination. Make them fail against today's code before fixing the hooks, or you will not know the fix worked.

## Out of scope

- **Duplicar proyecto** — no backend endpoint; the tooltips stay.
- Surfacing `advertencias` in the UI after creating from a template. The type carries it; rendering it is a follow-up.
- Editing/renaming a project template — the backend exposes no `PUT /plantillas-proyecto/{id}`.

## Escape hatches

- If `POST /proyectos/desde-plantilla/{id}` returns a bare `ProyectoResponse` rather than the wrapper (check `ProyectoDesdePlantillaResponse` in the backend before starting), drop the destructure in Step 4 and the wrapper type in Step 1 — the rest of the plan is unaffected.
- If `guardar-plantilla` turns out to live under `/plantillas-proyecto` with a body id after all, keep the hook signature and revert only the URL. The MSW `onUnhandledRequest: "error"` setting will tell you immediately which one is right.

## Maintenance notes

`useGuardarPlantillaProyecto` gains a required `proyectoId` argument, which makes it unusable from a context that does not know the project — that is intentional and matches the endpoint. If a future "save any project as template" screen needs it, pass the id per-call in `mutateAsync` instead of at hook construction.
