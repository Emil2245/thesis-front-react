# Plan 035 — P-46 Project Templates

**Status:** TODO
**Written against:** `7d6223c`
**Spec source:** `07-api-contract.md` lines 146-149, 398-399, 416; P-46; N04 §A8
**Effort:** M (4-6 hours)
**Risk:** LOW — new feature, no existing code to break

## Why

P-46 (new in v1.3, N04 §A8) lets users save a project as a reusable template and create new projects from that template. The backend provides:
- `GET /plantillas-proyecto` → `PlantillaProyectoResponse[]` (user's personal templates)
- `POST /plantillas-proyecto` → create template from an existing project
- `POST /proyectos/{proyectoId}/desde-plantilla/{plantillaId}` → create a new project from template
- `DELETE /plantillas-proyecto/{id}` → delete a template

The frontend has no types, hooks, pages, or routes for this feature.

## What changes

1. **Add types** to `contract.ts`.
2. **Add query keys** to `queryKeys.ts`.
3. **Add hooks** for CRUD operations.
4. **Create a "Mis Plantillas de Proyecto" page**.
5. **Add "Guardar como plantilla" action** in the project summary page.
6. **Add "Desde plantilla" tab** in the project creation dialog/page.
7. **Add route** for the templates page.

## Steps

### Step 1 — Add types to `src/api/contract.ts`

```typescript
// ————— Plantillas de proyecto (P-46) —————
export interface PlantillaProyectoResponse {
  id: number;
  nombre: string;
  fechaCreacion: string;
  snapshot: unknown;  // opaque JSONB — project metadata
}

export interface PlantillaProyectoCrearRequest {
  nombre: string;
  descripcion?: string;
}

export interface ProyectoDesdePlantillaRequest {
  nombre: string;
}
```

### Step 2 — Add query keys to `src/api/queryKeys.ts`

```typescript
plantillasProyecto: () => ["plantillas-proyecto"] as const,
```

### Step 3 — Create `src/features/plantillas-proyecto/hooks/usePlantillasProyecto.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, del } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type {
  PlantillaProyectoResponse,
  PlantillaProyectoCrearRequest,
  ProyectoDetalleResponse,
} from "@/api/contract";
import { toast } from "sonner";

export function usePlantillasProyecto() {
  return useQuery({
    queryKey: qk.plantillasProyecto(),
    queryFn: () => get<PlantillaProyectoResponse[]>("/plantillas-proyecto"),
  });
}

export function useGuardarPlantillaProyecto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: PlantillaProyectoCrearRequest & { proyectoId: number }) =>
      post<PlantillaProyectoResponse>("/plantillas-proyecto", {
        nombre: req.nombre,
        descripcion: req.descripcion,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.plantillasProyecto() });
      toast.success("Plantilla guardada");
    },
  });
}

export function useCrearDesdePlantilla() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ proyectoId, plantillaId, nombre }: {
      proyectoId: number; plantillaId: number; nombre: string;
    }) => post<ProyectoDetalleResponse>(
      `/proyectos/${proyectoId}/desde-plantilla/${plantillaId}`,
      { nombre },
    ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proyectos"] });
      toast.success("Proyecto creado desde plantilla");
    },
  });
}

export function useEliminarPlantillaProyecto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => del(`/plantillas-proyecto/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.plantillasProyecto() });
      toast.success("Plantilla eliminada");
    },
  });
}
```

### Step 4 — Create `src/features/plantillas-proyecto/pages/PlantillasProyectoPage.tsx`

A page listing the user's project templates. Table with columns: Nombre, Fecha. Actions: Delete. Follow the pattern in `MisPlantillasPageActiva` (from `src/features/plantillas/pages/MisPlantillasPage.tsx`).

Use shadcn `Table` component. Destructive delete with `AlertDialog` confirmation.

### Step 5 — Add "Guardar como plantilla" to `ResumenProyectoPage.tsx`

In the actions area of the project summary page, add a button:

```tsx
<Button variant="outline" onClick={() => setDialogoPlantillaAbierto(true)}>
  Guardar como plantilla
</Button>
```

With a simple dialog that asks for a template name:

```tsx
<Dialog open={dialogoPlantillaAbierto} onOpenChange={setDialogoPlantillaAbierto}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Guardar como plantilla</DialogTitle>
    </DialogHeader>
    <Input
      placeholder="Nombre de la plantilla"
      value={nombrePlantilla}
      onChange={(e) => setNombrePlantilla(e.target.value)}
    />
    <DialogFooter>
      <Button onClick={guardarPlantilla} disabled={!nombrePlantilla.trim()}>
        Guardar
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Step 6 — Add "Desde plantilla" option in project creation

In the existing project creation flow (likely a page or dialog), add a tab or section that lists available project templates and lets the user select one. When selected, call `POST /proyectos/{proyectoId}/desde-plantilla/{plantillaId}`.

Locate the project creation component (check `src/features/proyectos/pages/` for a create page or dialog) and add the template selection.

### Step 7 — Add route

In `src/routes/index.tsx`, add:

```typescript
{
  path: "plantillas-proyecto",
  lazy: () => import("@/features/plantillas-proyecto/pages/PlantillasProyectoPage"),
}
```

Add a navigation link in the sidebar or wherever project-level navigation lives.

### Step 8 — Add to `src/lib/disponibilidad.ts`

Remove `plantillas` from the modules-without-backend list (or check if it's already granular enough). The `plantillas` module listed there may refer to APU templates — if so, add `plantillas-proyecto` separately or keep as-is if the route is new.

### Step 9 — Verify

```bash
pnpm run typecheck   # zero errors
pnpm run test        # all tests pass
pnpm run lint        # clean
```

## Out of scope

- Editing a project template after creation — the spec says create and delete only.
- Previewing the template's snapshot content — just show metadata.
- Admin-level system project templates — only personal templates per the spec.

## Escape hatches

- If `POST /plantillas-proyecto` requires a `proyectoId` in the URL rather than the body, adjust the hook accordingly. The contract shows `POST /plantillas-proyecto` with `PlantillaProyectoCrearRequest` body.
- If the creation-from-template flow is different (e.g., `POST /proyectos` with a `plantillaProyectoId` field), adapt.

## Maintenance notes

Project templates are a thin wrapper — the backend handles all snapshot logic. The frontend only manages CRUD. If the template schema changes, only the types in `contract.ts` and the create/list hooks need updating.
