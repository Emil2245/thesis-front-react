# Plan 052 — Re-enable stale `MOTIVO_SIN_BACKEND` actions

> ## Revisión 2026-09-06 — **parcialmente inválido**, lee esto antes
>
> Escrito contra `test/stuff`, que no está mergeada. Veredictos re-verificados contra
> `origin/main` @ `c337950`:
>
> | Acción | Veredicto original | Veredicto real |
> |---|---|---|
> | Duplicar APU | encender | ✅ **correcto** — `POST /apus/{apuId}/duplicar` |
> | Guardar como plantilla | encender | ✅ **correcto** — `POST /apus/{apuId}/guardar-plantilla` |
> | Desglose (`/calculo`) | encender | ⚠️ **el endpoint existe, la forma del DTO no coincide** — antes hay que hacer [`059`](059-corregir-formas-de-dto.md) §1 |
> | **Descuento de APU** | «encender, pero el hook está mal» | ❌ **BORRAR, no encender.** El endpoint está **retirado por diseño** y dos contract tests del backend lo custodian; los docs lo marcaron **WITHDRAWN** el 2026-08-31 (v1.3 §2.5.4 / N04 §A1). La rebanada 4 de este plan está anulada — la sustituye la rebanada 4 del [`054`](054-degradar-descuento-global-y-bugs-silenciosos.md). |
> | Guardar parámetros de sistema | «diferir al 050» | ✅ correcto, pero por otra razón: el endpoint es `PUT /proyectos/parametros-sistema`, **no** `/admin/`, y exige **11 campos `@NotNull`**. Ver [`050`](050-enable-admin-module.md) rebanada 5. |
> | Guardar plantilla de proyecto | diferir al 049 | ✅ correcto |
> | Ver uso de insumo | mantener deshabilitado | ✅ correcto — el handler devuelve `List.of()`; además la ruta es `/usos` y la forma del DTO difiere ([`059`](059-corregir-formas-de-dto.md) §3) |
> | Duplicar proyecto | mantener deshabilitado | ✅ correcto — no existe en main |
>
> **El bug 2 que este plan documenta (`porcentajeIndirecto` descartado en silencio) es real y sigue
> vivo**; lo arregla la rebanada 2 del `054`. El bug 1 (`aplicarDescuento`) ya no se arregla: se
> borra.
>
> Ejecuta este plan **solo** para las tres acciones marcadas ✅ de encender, y después del `059`
> para el desglose.

**Status:** TODO
**Written against:** `e44c608`
**Spec source:** backend `ApuResource`, `InsumoResource` on `test/stuff` (`eb9a1da`); `plans/ROADMAP-V2-BACKEND-PARITY.md`
**Effort:** M (3-4 hours across independent slices)
**Depende de:** `059` cerrado — el desglose necesita la forma correcta de `ApuCalculoResponse`
**Risk:** LOW per slice — each is separately committable and revertible

## Why

Eight actions are `disabled` behind a `MOTIVO_SIN_BACKEND` tooltip, written when the backend had
none of these endpoints. `test/stuff` now serves most of them.

**The hooks are already written and already point at the correct URLs.** `useDuplicarApu`,
`useGuardarPlantilla` and the desglose query all match the backend exactly. For those three the
entire change is deleting a `<Tooltip>` wrapper and a `disabled` prop.

Two of the eight must stay disabled. And auditing the surrounding code turned up **two live
bugs in adjacent, never-disabled controls** — the `disabled` flags were hiding a neighbourhood,
not just a feature.

### Verdicts

| Action | Backend | Verdict |
|---|---|---|
| Duplicar APU | `POST /apus/{apuId}/duplicar` | **enable** — hook correct |
| Guardar como plantilla | `POST /apus/{apuId}/guardar-plantilla` | **enable** — hook correct |
| Desglose | `GET /apus/{apuId}/calculo` | **enable** — hook correct |
| Descuento | `PATCH /apus/{apuId}/porcentaje-descuento` | **enable, but the hook is wrong** — slice 4 |
| Guardar parámetros sistema | `PUT /admin/parametros-sistema` | defer → `plans/050` |
| Guardar plantilla de proyecto | `POST /proyectos/{id}/guardar-plantilla` | defer → `plans/049` (live, broken) |
| **Ver uso de insumo** | route exists, returns `[]` | **keep disabled** — slice 6 |
| **Duplicar proyecto** | no endpoint | **keep disabled** — slice 7 |

### Two live bugs found next door

Neither is behind a `disabled` flag; both fail silently today.

1. **`aplicarDescuento` posts to a path that does not exist.**
   `useApuEditor.ts:156-157` sends `POST /apus/{apuId}/descuento` with `{porcentaje}`.
   The backend has `PATCH /apus/{apuId}/porcentaje-descuento` taking a **raw `BigDecimal`**
   (`ApuResource.java:148-153`). Wrong method, wrong path, wrong body shape.

2. **`editarPorcentajeCi` sends a field the backend record does not declare.**
   `useApuEditor.ts:146` PATCHes `/apus/{apuId}` with `ApuPatchRequest`, and
   `editarPorcentajeCi` (line ~294) puts `porcentajeIndirecto` in that body. The backend's
   record is `ApuPatchRequest(JsonNullable<String> codigo, descripcion, unidad)` — no
   percentage field. The value is dropped on the floor. The real endpoint is
   `PATCH /apus/{apuId}/porcentaje-indirecto`, also a raw `BigDecimal`
   (`ApuResource.java:141-146`).

   The frontend's `ApuPatchRequest` in `contract.ts` declares `porcentajeIndirecto?: Decimal | null`,
   which the backend has never accepted. Delete that field.

Bug 2 is **not** an un-gating task, but it lives in the same hook and the same UI panel as the
descuento fix, and a plan that repairs one while leaving the other is a plan someone has to
re-open next week. Slice 5.

## What changes

Seven independent slices. Each ends green and committable on its own; take them in any order.

## Steps

### Slice 1 — Duplicar APU

`src/features/apu-editor/pages/ListaApusPage.tsx:158-168`. The hook
(`useApus.ts:36-39`, `POST /apus/${apuId}/duplicar`) is already correct and already wired to
`onClick`. Unwrap and un-disable:

```tsx
<DropdownMenuItem onClick={() => duplicar.mutate(apu.id)}>
  <CopyIcon /> Duplicar
</DropdownMenuItem>
```

Drop the `MOTIVO_SIN_BACKEND` import if this was the file's last use.

The backend accepts an optional `{copiarET?: boolean}` body and defaults it to `false`. Sending
no body keeps that default — fine. Offering the toggle is a separate feature; out of scope.

**Red first:** a test that clicking *Duplicar* issues `POST /apus/:id/duplicar`. It fails today
because the item is `disabled` and the click never fires.

### Slice 2 — Guardar como plantilla

`src/features/apu-editor/pages/EditorApuPage.tsx:92-107`. `usePlantillas.ts:54` already posts to
`/apus/${apuId}/guardar-plantilla`, and `DialogoGuardarPlantilla` is built. Unwrap:

```tsx
<div className="flex justify-end">
  <Button variant="outline" size="sm" onClick={() => setGuardarPlantillaDialogAbierto(true)}>
    <SaveIcon data-icon="inline-start" /> Guardar como plantilla
  </Button>
</div>
```

> `DialogoGuardarPlantilla.tsx:42` calls `post` inline while `usePlantillas.ts:54` wraps the
> same call in a hook. Two paths to one endpoint. Not a bug — but pick one while you are here,
> preferably the hook, so cache invalidation happens in a single place.

### Slice 3 — Desglose

`src/features/apu-editor/components/PieTotales.tsx:150-160`. `PopoverDesglose.tsx:22` already
queries `GET /apus/${apuId}/calculo`. Unwrap:

```tsx
<Button variant="outline" className="w-full" onClick={onAbrirDesglose}>
  <CalculatorIcon data-icon="inline-start" /> Desglose
</Button>
```

### Slice 4 — Descuento: fix the call, then enable

Two commits: fix red, then un-gate.

**4a — repair the mutation.** `src/features/apu-editor/hooks/useApuEditor.ts:155-165`:

```typescript
const descuentoMutation = useMutation({
  mutationFn: (porcentaje: Decimal) =>
    patch<ApuResponse>(`/apus/${apuId}/porcentaje-descuento`, porcentaje),
  onSuccess: (response) => {
    qc.setQueryData(qk.apu(apuId), response);
    if (presupuestoId) {
      qc.invalidateQueries({ queryKey: qk.presupuesto(presupuestoId) });
      qc.invalidateQueries({ queryKey: qk.cronograma(presupuestoId) });
    }
  },
});
```

and its caller (line ~302):

```typescript
const aplicarDescuento = useCallback(
  async (porcentaje: string) => {
    await descuentoMutation.mutateAsync(parsearEntradaDecimal(porcentaje)!);
  },
  [descuentoMutation],
);
```

The body is a **bare** decimal, not `{porcentaje: …}`. `DescuentoRubroRequest` in `contract.ts`
becomes unused — delete it, and check `patch()` in `src/api/request.ts` serialises a bare
string/number as a JSON scalar with `Content-Type: application/json` rather than form-encoding it.

`DialogoDescuentoRubro` needs no change: it already passes a string up through
`onAplicarDescuento`, clamps to 0–50, and sends `"0"` for *Quitar descuento* — which is exactly
how the backend clears it.

**4b — un-gate.** `PieTotales.tsx:140-149`:

```tsx
<Button variant="outline" className="w-full" onClick={onAbrirDescuento}>
  <PercentIcon data-icon="inline-start" /> Descuento
</Button>
```

Once 4b lands, `MOTIVO_SIN_BACKEND` is unused in `PieTotales.tsx` — remove the import and the
now-unused `Tooltip` imports.

### Slice 5 — Fix `porcentajeIndirecto` (live bug, no gate)

Same hook. Add a dedicated mutation instead of smuggling the field through `ApuPatchRequest`:

```typescript
const porcentajeCiMutation = useMutation({
  mutationFn: (valor: Decimal | null) =>
    patch<ApuResponse>(`/apus/${apuId}/porcentaje-indirecto`, valor),
  onSuccess: (response) => {
    qc.setQueryData(qk.apu(apuId), response);
    if (presupuestoId) qc.invalidateQueries({ queryKey: qk.apus(presupuestoId) });
  },
});
```

Point `editarPorcentajeCi` (line ~292) at it, and remove `porcentajeIndirecto` from
`ApuPatchRequest` in `src/api/contract.ts` so the type stops advertising a field the server
ignores.

Confirm how the backend reads `null` for "clear the override" — `actualizarPorcentajeIndirecto`
takes a `BigDecimal` that may be null. If a JSON `null` body is rejected at the JAX-RS layer,
fall back to whatever `ApuResource` expects and note it here.

**Red first, and this one matters:** today the CI edit "succeeds" — the request 200s, the field
is ignored. A test asserting only `mutateAsync` resolved passes against the bug. Assert the
**request URL and body**, then the returned `porcentajeIndirectoEfectivo`.

### Slice 6 — Ver uso de insumo: keep disabled, correct the reason

`src/features/insumos/components/TablaInsumos.tsx:169-185`. **Leave `disabled`.**

The route exists — `GET /proyectos/{proyectoId}/insumos/{insumoId}/usos` — and it validates the
project, resolves the insumo, and then:

```java
return java.util.List.of();
```

(`InsumoResource.java:155-167`.) It is a signature with no implementation. Enabling the item
would open a dialog that always reads "no usages" for an insumo that is in fact referenced —
worse than a disabled control, because it looks like an answer.

Sharpen the tooltip so the next reader does not re-litigate it:

```tsx
<TooltipContent>
  El servidor todavía no calcula las referencias de un insumo.
</TooltipContent>
```

Then file a backend plan: implement `usos` by querying `apu_detalle` for the insumo, returning
`InsumoUsoResponse` per referencing APU. Note that `InsumoCrudService.conteoUsosApu` already
does the counting for the delete guard (`InsumoCrudService.java:67`) — the query exists, it just
is not surfaced.

### Slice 7 — Duplicar proyecto: keep disabled, record the option

`ListaProyectosPage.tsx:~247` and `ResumenProyectoPage.tsx:~107`. **Leave `disabled`.**
There is no `POST /proyectos/{id}/duplicar` in `test/stuff`.

It *could* be composed client-side from two endpoints that do exist:

1. `POST /proyectos/{id}/guardar-plantilla` → a template of the source project
2. `POST /proyectos/desde-plantilla/{plantillaId}` → a new project from it

That is a product decision, not a refactor: it leaves a stray template in the user's list,
it is two round-trips with no transaction, and a failure between them is visible garbage.
**Do not implement it on your own initiative.** Put it to the human; if they want duplication,
the clean answer is a backend endpoint.

Both call sites can keep the generic tooltip.

### Slice 8 — Parámetros sistema (cross-reference only)

`AdminParametrosPage.tsx:~80,~94` is inside the `admin` module, still gated in
`MODULOS_SIN_BACKEND`. Un-gating it belongs to **`plans/050`**. Do not touch it here — a
half-enabled admin page is worse than a gated one.

Likewise *Guardar plantilla de proyecto* (`ResumenProyectoPage.tsx:116`) belongs to
**`plans/049`**, which also repairs its broken URL.

### Verify

After each slice:

```bash
npm run typecheck   # zero errors
npx vitest run     # all pass
npm run lint       # no new warnings
```

Baseline at `e44c608`: 45 files / 207 tests green, `tsc` clean, lint warnings pre-existing only.

## Seams under test

- `src/test/features/apu-editor/pages/ListaApusPage.test.tsx` — duplicar (slice 1)
- `src/test/features/apu-editor/pages/EditorApuPage.test.tsx` — guardar plantilla (slice 2)
- `src/test/features/apu-editor/components/PieTotales.test.tsx` — desglose + descuento buttons
  are enabled and invoke their callbacks (slices 3, 4b)
- `src/test/features/apu-editor/hooks/useApuEditor.test.ts` — **the important seam.** Slices 4a
  and 5 are wire-format fixes; assert the request **method, URL and body** through MSW.

Create the files that do not exist yet, following the existing MSW+RTL setup.

The trap in this plan: for slices 4a and 5 the current code already "works" — the promise
resolves, no error surfaces, the value is silently discarded. A test that asserts only
"the mutation resolved" is green against the bug. **Assert what went over the wire**, and
run the test against the unfixed hook first to watch it fail.

## Out of scope

- The `copiarET` toggle on duplicar APU.
- Implementing `usos` server-side (slice 6 files it).
- Duplicar proyecto in any form (slice 7 escalates it).
- The admin module and plantillas-proyecto (plans 050 / 049).

## Escape hatches

- If `patch()` in `src/api/request.ts` cannot send a bare JSON scalar, add a small
  `patchRaw` helper next to it rather than reshaping the backend contract.
- If plan 046 has already moved APU ids to UUID strings, the hook signatures here take
  `string` instead of `number`. Nothing else in these slices changes.

## Maintenance notes

`MOTIVO_SIN_BACKEND` is a single shared string, so every tooltip reads identically no matter
why the control is off. After this plan only two uses remain and they have different causes —
"the server returns an empty list" and "the endpoint does not exist". Slice 6 gives the first
its own text; consider making the constant take a reason argument if a third case appears.
