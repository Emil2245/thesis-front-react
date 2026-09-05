# Plan 050 — Enable admin module (N04 §11)

**Status:** TODO
**Written against:** `e44c608`
**Spec source:** `07-api-contract.md` §11; backend branch `test/stuff` @ `eb9a1da`
**Effort:** L (1-2 days, 6 independent slices)
**Risk:** MEDIUM — every admin hook currently points at a URL the backend does not serve

## Why

The `admin` module is gated behind `MODULOS_SIN_BACKEND` in `src/lib/disponibilidad.ts`. Six pages ship a fully-written `*PageActiva` implementation behind a `ModuloNoDisponible` stub, written in plan 027 when no admin backend existed.

The backend on `test/stuff` now implements **four of the six**. But the frontend hooks were written speculatively and **not one of them matches the real API**. Un-gating the module without fixing the hooks would replace "not available" screens with 404s.

Verified against the backend source, not the docs:

| Hook | Calls today | Backend reality |
|---|---|---|
| `useAdminBases` | `GET /admin/bases` → `Page<T>` | `GET /admin/bases-centrales` → **`List<T>`, not paged** |
| `useCrearBase` | `POST /admin/bases` | `POST /admin/bases-centrales` |
| `useEliminarBase` | `DELETE /admin/bases/{id}` | **no such endpoint** — archive is the only removal |
| `useArchivarBase` | `POST /admin/bases/{id}/archivar`, `id: number` | `POST /admin/bases-centrales/{id}/archivar`, **`id` is UUIDv7 string** |
| — | *(missing)* | `PUT /admin/bases-centrales/{id}` renombrar |
| `useInvitarUsuario` | `POST /admin/usuarios/invitar` | **no such endpoint** (`grep -rni invitar` on the backend returns nothing) |
| `useEditarUsuario` | `PATCH /admin/usuarios/{id}` | `PUT /admin/usuarios/{id}` |
| `useRestaurarUsuario` | `POST /admin/usuarios/{id}/restaurar` | `POST /admin/usuarios/{id}/reactivar` |
| `useEliminarUsuario` | `DELETE`, toasts *"desactivado"* | `DELETE` is a **hard delete**; `POST /{id}/desactivar` is the soft one |
| `useActualizarParametros` | `PUT /proyectos/parametros-sistema` | `PUT /admin/parametros-sistema` |
| `useAdminPlantillas` | `/admin/plantillas` | **no such endpoint** |
| `useValoresReferencia` | `/admin/valores-referencia` | **no such endpoint** |

### Two pages stay degraded — do not invent endpoints for them

**`AdminValoresPage`** — `grep -rni "valores-referencia\|ValorReferencia"` over `../thesis-back-quarkus` on `test/stuff` returns **zero hits**. There is no valores-de-referencia concept in the backend at all. Leave the page gated.

**`AdminPlantillasPage`** — system APU templates are **read-only by design**, not merely unimplemented:
- `PlantillaApuCrearRequest` javadoc: *"El sistema fija `tipo=PERSONAL`"* — creation can never produce a SISTEMA template.
- `PlantillaApuService:133,153` — edit and delete on a SISTEMA template return **404** deliberately (`RNF-05`, does not leak existence).

So `POST`/`DELETE /admin/plantillas` cannot be wired to anything. Leave the page gated. Listing SISTEMA templates already works for regular users through `GET /plantillas-apu` (plan 048); an admin CRUD screen would need new backend work that is out of scope here.

## What changes

1. Realign the admin section of `contract.ts` with the real DTOs (field renames, UUID vs Long).
2. Rewrite the four viable hook files against real URLs and verbs; delete the three dead mutations.
3. Un-gate `usuarios`, `bases`, `logs`; enable the disabled *Guardar* on `parametros`.
4. Split the `"admin"` availability key so `plantillas` and `valores` stay gated on their own.
5. Replace the degraded-state tests with behaviour tests at the page seam.

## Seams under test

Tests go at the **page seam** — render the page with MSW serving the real URL shapes, assert on what the user sees. No hook-level or internal-state tests.

| File | Covers |
|---|---|
| `src/test/features/admin/pages/AdminUsuariosPage.test.tsx` | new — list, desactivar, reactivar |
| `src/test/features/admin/pages/AdminBasesPage.test.tsx` | **replaces** the existing degraded-state test |
| `src/test/features/admin/pages/AdminLogsPage.test.tsx` | new — list, filter by evento |
| `src/test/features/admin/pages/AdminParametrosPage.test.tsx` | new — Guardar enabled, PUT fires |
| `src/test/features/admin/pages/AdminPlantillasPage.test.tsx` | new — asserts it *stays* degraded |
| `src/test/features/admin/pages/AdminValoresPage.test.tsx` | new — asserts it *stays* degraded |
| `src/test/shell/Sidebar.test.tsx` | update — `pronto` badge gone from Usuarios/Bases/Logs, still on Plantillas/Valores ref. |

MSW runs with `onUnhandledRequest: "error"`, so a hook pointing at a stale URL fails the test rather than silently returning undefined. That is the safety net for this whole plan — **do not add a catch-all handler**.

Every slice must leave `npm run typecheck`, `npx vitest run` and `npm run lint` clean before it is committed.

## Slices

Six slices. **Slice 1 is a prerequisite for 2-5**; those four are mutually independent and each is committable on its own. Slice 6 lands last.

---

### Slice 1 — Contract + query keys (prerequisite)

**`src/api/contract.ts`**, admin section (~line 573+).

`UsuarioAdminResponse.fechaCreacion` → `createdAt` (backend record field name):

```typescript
export interface UsuarioAdminResponse {
  id: number;              // Long — admin users are NOT UUIDv7
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  emailVerificado: boolean;
  createdAt: string;
}
```

`LogActividadResponse` is missing two fields and names the timestamp wrong:

```typescript
export interface LogActividadResponse {
  id: number;
  usuarioId: number;
  usuarioNombre?: string;
  evento: string;
  entidad: string;
  entidadId?: number;
  detalle?: Record<string, unknown>;
  createdAt: string;
}
```

Add the admin base type — it is **not** `BaseInsumosResponse`; the id is a UUIDv7 string:

```typescript
export interface AdminBaseCentralResponse {
  id: string;              // UUIDv7
  nombre: string;
  tipo: string;            // always "CENTRAL" on this resource
  archivada: boolean;
  totalInsumos: number;
}
```

Widen `ParametrosSistemaActualizarRequest` to the ranges the backend accepts (all optional):

```typescript
export interface ParametrosSistemaActualizarRequest {
  porcentajeHerramientaMenor?: Decimal;
  porcentajeIndirecto?: Decimal | null;
  iva?: Decimal;
  moneda?: string;
  rangoHmMin?: Decimal;         rangoHmMax?: Decimal;
  rangoCiMin?: Decimal;         rangoCiMax?: Decimal;
  rangoDescuentoMin?: Decimal;  rangoDescuentoMax?: Decimal;
  rangoIvaMin?: Decimal;        rangoIvaMax?: Decimal;
}
```

Delete `UsuarioInvitarRequest` — nothing can consume it (see slice 2).

Leave `ValorReferenciaResponse` / `ValorReferenciaRequest` in place; the page stays degraded but still compiles.

**`src/api/queryKeys.ts`** — rename the bases key so it does not read as the removed `/admin/bases` route:

```typescript
adminBases: (f?: Record<string, unknown>) => ["admin", "bases-centrales", f ?? {}] as const,
```

Drop `adminPlantillas` and `adminValores` only if slice 6 also deletes their hooks; otherwise leave them.

> Plan 046 is migrating IDs repo-wide in parallel. This slice follows its convention: **UUIDv7 entities are `string`, Long entities are `number`.** Admin usuarios and logs are Long; bases-centrales and insumos are UUIDv7. If 046 has already landed, verify rather than re-apply.

---

### Slice 2 — Usuarios

**`src/features/admin/hooks/useAdminUsuarios.ts`**

Fix the verb and the reactivate path; add the soft-delete the UI actually wants:

```typescript
export function useEditarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UsuarioAdminEditarRequest }) =>
      put<UsuarioAdminResponse>(`/admin/usuarios/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminUsuarios() });
      toast.success("Usuario actualizado");
    },
    onError: () => toast.error("Error al actualizar usuario"),
  });
}

export function useDesactivarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => post<UsuarioAdminResponse>(`/admin/usuarios/${id}/desactivar`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminUsuarios() });
      toast.success("Usuario desactivado");
    },
    onError: () => toast.error("Error al desactivar usuario"),
  });
}

export function useReactivarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => post<UsuarioAdminResponse>(`/admin/usuarios/${id}/reactivar`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminUsuarios() });
      toast.success("Usuario reactivado");
    },
    onError: () => toast.error("Error al reactivar usuario"),
  });
}
```

Swap `patch` for `put` in the imports. **Delete `useInvitarUsuario`** and **delete `useEliminarUsuario`** — the invite endpoint does not exist, and the hard `DELETE` is not what the trash icon means. If a hard delete is wanted later it needs its own confirm dialog; that is not this plan.

**`src/features/admin/pages/AdminUsuariosPage.tsx`**

- Delete the stub `AdminUsuariosPage` (the `ModuloNoDisponible` block) and rename `AdminUsuariosPageActiva` → `AdminUsuariosPage`.
- **Remove the invite dialog entirely** — the `Dialog`, the `Invitar` header button, and the `nombre`/`email`/`rol` state. There is no endpoint behind it. This drops the page's only header action; that is correct, not a regression.
- Point the row actions at the new hooks: `desactivar.mutate(u.id)` when `u.activo`, `reactivar.mutate(u.id)` otherwise. Keep the existing `Trash2Icon` / `RotateCcwIcon` pairing but retitle the destructive one to *Desactivar*.

Backend list is paged, so `data?.contenido.map(...)` stays as-is.

**`src/test/handlers.ts`** — replace the usuarios block:

```typescript
http.get(`${API}/admin/usuarios`, ({ request }) => { /* unchanged paging logic */ }),
http.put(`${API}/admin/usuarios/:id`, ({ params }) => { /* echo edited user */ }),
http.post(`${API}/admin/usuarios/:id/desactivar`, ({ params }) =>
  HttpResponse.json({ ...usuariosAdminFixture[0], id: Number(params.id), activo: false })),
http.post(`${API}/admin/usuarios/:id/reactivar`, ({ params }) =>
  HttpResponse.json({ ...usuariosAdminFixture[0], id: Number(params.id), activo: true })),
```

Delete the `/admin/usuarios/invitar`, `patch /admin/usuarios/:id` and `delete /admin/usuarios/:id` handlers.

Update `src/test/fixtures/admin.ts`: `fechaCreacion` → `createdAt`.

**Test** — `AdminUsuariosPage.test.tsx`, at the page seam:
- renders the users from the fixture (name, email, rol badge)
- clicking desactivar on an active user shows it as *Inactivo*
- clicking reactivar on an inactive user shows it as *Activo*

---

### Slice 3 — Bases centrales

**`src/features/admin/hooks/useAdminBases.ts`** — every URL changes, the list is not paged, and ids are strings:

```typescript
export function useAdminBases(filtros?: { incluirArchivadas?: boolean }) {
  return useQuery({
    queryKey: qk.adminBases(filtros),
    queryFn: () => get<AdminBaseCentralResponse[]>("/admin/bases-centrales", filtros),
  });
}

export function useCrearBase() { /* post to "/admin/bases-centrales" */ }

export function useRenombrarBase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, nombre }: { id: string; nombre: string }) =>
      put<AdminBaseCentralResponse>(`/admin/bases-centrales/${id}`, { nombre }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminBases() });
      toast.success("Base renombrada");
    },
    onError: () => toast.error("Error al renombrar base"),
  });
}

export function useArchivarBase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      post<AdminBaseCentralResponse>(`/admin/bases-centrales/${id}/archivar`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminBases() });
      toast.success("Base archivada/restaurada");
    },
    onError: () => toast.error("Error al archivar/restaurar base"),
  });
}
```

**Delete `useEliminarBase`** — there is no `DELETE` on this resource. Archiving is the removal mechanism (plan 037's premise still holds; only the URL was wrong).

**`src/features/admin/pages/AdminBasesPage.tsx`**

- Delete the stub, rename `AdminBasesPageActiva` → `AdminBasesPage`.
- `data?.contenido.map(...)` → `data?.map(...)` — **the response is a bare array**.
- Remove the destructive delete button and its `Trash2Icon` import.
- The *Nueva base* button currently posts `Base ${Date.now()}` as the name. Replace with a small prompt dialog reusing the same pattern as the rename, so the admin types a real name. Wire rename onto the row (pencil icon) now that `PUT` exists.

The `incluirArchivadas` switch, the `opacity-50` archived styling and the `Archivada` badge from plan 037 all carry over unchanged.

**`src/test/handlers.ts`** — retarget every `/admin/bases` handler to `/admin/bases-centrales`, return a bare array from the `GET`, honour `?incluirArchivadas`, drop the `DELETE`. Fixture ids in `src/test/fixtures/admin.ts` become UUIDv7 strings.

**Test** — rewrite `AdminBasesPage.test.tsx`, deleting the *"todavía no está disponible"* case:
- lists the bases from the fixture with their `totalInsumos`
- archiving a base flips its label to *Archivada*
- toggling *Incluir archivadas* off re-requests without the archived rows

---

### Slice 4 — Logs

**`src/features/admin/hooks/useAdminLogs.ts`** — URL is already correct; no change needed beyond the contract fields from slice 1.

**`src/features/admin/pages/AdminLogsPage.tsx`**

- Delete the stub, rename `AdminLogsPageActiva` → `AdminLogsPage`.
- `l.fecha` → `l.createdAt`.
- `l.usuarioNombre` is nullable — fall back to `usuario #${l.usuarioId}`.
- The `detalle` cell renders `JSON.stringify(l.detalle)`; guard the null case so it does not print `undefined`.
- Consider surfacing `entidad`/`entidadId`, now present in the DTO — a single `entidad #id` column is enough.

**`src/test/handlers.ts`** — existing `GET /admin/logs` handler stays; update the fixture field names.

**Test** — `AdminLogsPage.test.tsx`:
- renders log rows with evento badge and a formatted date
- typing in the evento filter re-requests with `?evento=`

---

### Slice 5 — Parámetros del sistema

This page is **not** behind `ModuloNoDisponible` — it already renders live, with one disabled *Guardar* button wrapped in a `MOTIVO_SIN_BACKEND` tooltip (`AdminParametrosPage.tsx`, the `Tooltip` block after the moneda field).

**`src/features/admin/hooks/useParametrosSistema.ts`**

Read can move to the admin resource now that it exists; write must:

```typescript
export function useParametrosSistema() {
  return useQuery({
    queryKey: qk.adminParametros(),
    queryFn: () => get<ParametrosSistemaResponse>("/admin/parametros-sistema"),
  });
}

export function useActualizarParametros() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ParametrosSistemaActualizarRequest) =>
      put<ParametrosSistemaResponse>("/admin/parametros-sistema", body),
    onSuccess: (data) => {
      qc.setQueryData(qk.adminParametros(), data);
      toast.success("Parámetros actualizados");
    },
    onError: () => toast.error("Error al actualizar parámetros"),
  });
}
```

Delete both stale comments about the write not existing.

> The page is reachable by any authenticated user today because the read sat on `/proyectos/parametros-sistema`. `/admin/*` is `SUPER_ADMIN`-only, and the route is already inside `RutaAdmin`, so this is consistent — but confirm no non-admin screen imports `useParametrosSistema`. If one does, leave that caller on `/proyectos/parametros-sistema` and give the admin page its own hook.

**`src/features/admin/pages/AdminParametrosPage.tsx`**

- Drop `disabled`, unwrap the `Tooltip`, remove the `MOTIVO_SIN_BACKEND` import and the stale comment.
- The four `as never` casts on the ref values are the same smell cleaned up in `e44c608`. The inputs are strings and the fields are `Decimal` (a branded string) — use `asDecimal(...)` from `@/lib/decimal` instead of `as never`.
- Show `actualizar.isPending` on the button.

**`src/test/handlers.ts`** — add `GET`/`PUT` on `/admin/parametros-sistema`; keep `/proyectos/parametros-sistema` for any remaining caller.

**Test** — `AdminParametrosPage.test.tsx`:
- Guardar is enabled (this is the regression guard for the whole slice)
- editing IVA and clicking Guardar issues the `PUT` and surfaces the success toast

---

### Slice 6 — Availability split, Sidebar, routes

`"admin"` is too coarse now: four pages work, two do not. Replace the single key with the two that genuinely lack a backend.

**`src/lib/disponibilidad.ts`**

```typescript
/**
 * Módulos cuyo backend todavía no existe (verificado en ../thesis-back-quarkus,
 * rama test/stuff).
 *
 * "admin-plantillas": las plantillas SISTEMA son de solo lectura por diseño —
 * PlantillaApuCrearRequest fija tipo=PERSONAL y editar/borrar una SISTEMA
 * devuelve 404 (PlantillaApuService:133,153). No hay CRUD que conectar.
 * "admin-valores": no existe ningún concepto de valores de referencia en el
 * backend (grep de "ValorReferencia" sin resultados).
 */
export const MODULOS_SIN_BACKEND = new Set([
  "documentos",
  "plantillas",
  "plantillas-proyecto",
  "admin-plantillas",
  "admin-valores",
] as const);
```

**`src/shell/Sidebar.tsx`** — update the admin entries (lines ~94-99):

```typescript
{ ruta: "/admin/usuarios",   icono: UsersIcon,        etiqueta: "Usuarios" },
{ ruta: "/admin/bases",      icono: DatabaseIcon,     etiqueta: "Bases" },
{ ruta: "/admin/plantillas", icono: BookTemplateIcon, etiqueta: "Plantillas",  modulo: "admin-plantillas" },
{ ruta: "/admin/parametros", icono: SettingsIcon,     etiqueta: "Parámetros" },
{ ruta: "/admin/valores",    icono: ScrollTextIcon,   etiqueta: "Valores ref.", modulo: "admin-valores" },
{ ruta: "/admin/logs",       icono: ActivityIcon,     etiqueta: "Logs" },
```

Delete the now-stale comment above the list about "Parámetros" being kept out of the admin group.

**`src/features/admin/pages/AdminPlantillasPage.tsx`** and **`AdminValoresPage.tsx`** — keep the stub export, but rewrite the comment to say *why* it will not be enabled, so the next reader does not re-litigate it:

```typescript
// Las plantillas SISTEMA son de solo lectura por diseño: PlantillaApuCrearRequest
// fija tipo=PERSONAL y editar/borrar una SISTEMA devuelve 404
// (PlantillaApuService:133,153). Esta pantalla necesitaría endpoints nuevos en
// el backend, no una reactivación. Ver plan 050.
```

Their `*PageActiva` variants and the `useAdminPlantillas` / `useValoresReferencia` hooks now have no reachable caller. **Delete the hooks and the `*Activa` components** along with their MSW handlers and fixtures — they encode endpoints that do not exist and will rot. The stub pages stay. (If you would rather keep the UI around, say so in the commit message; the default here is deletion.)

**`src/test/shell/Sidebar.test.tsx`** — assert `pronto` is absent for Usuarios, Bases, Logs and Parámetros, and present for Plantillas and Valores ref.

**Tests** — `AdminPlantillasPage.test.tsx` and `AdminValoresPage.test.tsx` assert the degraded copy renders and **no request is made** (same shape as the test being deleted in slice 3; MSW's `onUnhandledRequest: "error"` does the enforcing).

## Out of scope

- Inviting users — no backend. If it is wanted, it is a backend plan first.
- Hard-deleting users — the endpoint exists but needs a confirm-destructive flow; not part of un-gating.
- Admin CRUD over insumos inside a central base (`POST/PUT/DELETE /admin/bases-centrales/{id}/insumos`, and the multipart import). Those endpoints exist and are worth a follow-up plan, but the current `AdminBasesPage` has no per-base insumo editor to hook them to. Not in this plan.
- Admin CRUD over system APU templates — needs new backend work.
- Plan 046's repo-wide ID migration. This plan assumes its convention and touches only the admin slice of `contract.ts`.

## Escape hatches

- **If `PUT /admin/parametros-sistema` rejects the rango fields**, the backend's `ParametrosSistemaActualizarRequest` has diverged; narrow the frontend type to whatever it validates and note it here.
- **If `GET /admin/bases-centrales` turns out to be paged** by the time this runs, revert the `data?.map` change back to `data?.contenido.map`. The `List<T>` return is verified at `AdminBaseCentralResource.java:100`.
- **If a non-admin screen imports `useParametrosSistema`**, do not move its URL — see the note in slice 5.

## Maintenance notes

The root cause of this plan's size is that plan 027's hooks were written against an imagined API and nothing failed until now. The MSW `onUnhandledRequest: "error"` setting is what makes the mismatch visible; keep it. Plan 028 (Zod at the seam) is the durable fix — once responses are parsed rather than cast, a renamed field like `fecha` → `createdAt` fails loudly instead of rendering *Invalid Date*.
