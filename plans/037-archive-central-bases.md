# Plan 037 — Archive central bases (N04 §D-12)

**Status:** TODO
**Written against:** `7d6223c`
**Spec source:** `07-api-contract.md` lines 218-222; N04 §D-12
**Effort:** S (1-2 hours)
**Risk:** LOW — adding a toggle button to existing admin page

## Why

N04 §D-12 says central bases can be **archived** (hidden from the user catalog but not deleted). The backend provides `POST /admin/bases-centrales/{id}/archivar` which toggles the `archivada` flag on `BaseInsumosResponse`. The frontend's `AdminBasesPage` already has a placeholder (`AdminBasesPageActiva`) that shows a table of bases with create/delete — but no archive/restore toggle. The `BaseInsumosResponse` type already includes `archivada: boolean`. The admin list endpoint accepts `?incluirArchivadas=true|false`.

## What changes

1. **Add archive mutation hook** to `useAdminBases.ts`.
2. **Add archive/restore button** in `AdminBasesPageActiva`.
3. **Add "Incluir archivadas" filter toggle** in the page.
4. **Style archived rows** differently (muted/dimmed).

## Steps

### Step 1 — Add mutation to `src/features/admin/hooks/useAdminBases.ts`

```typescript
export function useArchivarBase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      post<BaseInsumosResponse>(`/admin/bases-centrales/${id}/archivar`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.adminBases() });
      toast.success("Base archivada/restaurada");
    },
  });
}
```

### Step 2 — Update `useAdminBases` query to pass filter

```typescript
export function useAdminBases(filtros?: { incluirArchivadas?: boolean }) {
  return useQuery({
    queryKey: [...qk.adminBases(), filtros],
    queryFn: () =>
      get<Page<BaseInsumosResponse>>(
        `/admin/bases-centrales${filtros?.incluirArchivadas ? "?incluirArchivadas=true" : ""}`,
      ),
  });
}
```

If the current hook uses `qk.adminBases()` already, add the filter to the key.

### Step 3 — Update `AdminBasesPageActiva`

In `src/features/admin/pages/AdminBasesPage.tsx`:

Add state for the filter:

```typescript
const [incluirArchivadas, setIncluirArchivadas] = useState(true);
const { data: bases } = useAdminBases({ incluirArchivadas });
const archivar = useArchivarBase();
```

Add a toggle above the table:

```tsx
<div className="flex items-center gap-2">
  <Switch
    checked={incluirArchivadas}
    onCheckedChange={setIncluirArchivadas}
  />
  <Label>Incluir archivadas</Label>
</div>
```

Add archive button per row:

```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={() => archivar.mutate(base.id)}
>
  {base.archivada ? "Restaurar" : "Archivar"}
</Button>
```

Style archived rows:

```tsx
<tr className={cn(base.archivada && "opacity-50")}>
```

Add a visual indicator for archived status:

```tsx
<td>
  {base.nombre}
  {base.archivada && (
    <Badge variant="outline" className="ml-2">Archivada</Badge>
  )}
</td>
```

### Step 4 — Ensure user views hide archived bases

In the user-facing base explorer (where users copy bases to their project), the `GET /bases-centrales` endpoint by default excludes archived bases (no query param needed). Verify that `src/features/insumos/` doesn't pass `incluirArchivadas=true` — it shouldn't.

### Step 5 — Add MSW handler

In `src/test/handlers.ts`, if there's an admin bases handler:

```typescript
http.post("*/admin/bases-centrales/:id/archivar", async ({ params }) => {
  // toggle archivada on the fixture
  return HttpResponse.json({ id: Number(params.id), nombre: "Base test", tipo: "CENTRAL", archivada: true, totalInsumos: 10 });
}),
```

### Step 6 — Verify

```bash
pnpm run typecheck   # zero errors
pnpm run test        # all tests pass
pnpm run lint        # clean
```

## Out of scope

- Preventing deletion of archived bases — the spec says "NO se bloquea el borrado posterior," so delete works on archived bases.
- Bulk archive/restore.

## Escape hatches

- The `POST /admin/bases-centrales/{id}/archivar` is a toggle — calling it on an archived base restores it. If the backend instead uses separate `/archivar` and `/restaurar` endpoints, add a second mutation or adjust the URL based on `base.archivada`.

## Maintenance notes

The `archivada` field is already on `BaseInsumosResponse`. If the backend adds separate archive/unarchive endpoints, split the mutation. The filter toggle defaults to showing all (including archived) for the admin view so they can see and restore archived bases.
