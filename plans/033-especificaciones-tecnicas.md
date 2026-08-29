# Plan 033 — P-45 Especificaciones Tecnicas

**Status:** TODO
**Written against:** `7d6223c`
**Spec source:** `07-api-contract.md` lines 139, 145; P-45; N04 §ESP
**Effort:** M (3-5 hours)
**Risk:** LOW — new panel in existing page; new endpoints only

## Why

P-45 (new in v1.3) requires that each APU have an optional free-text technical specification. The backend provides:
- `PUT /apus/{id}/especificacion-tecnica` with body `{ texto: string }` (max 64 KB)
- The `ApuResponse` returns `especificacionTecnica?: string | null`
- `GET /documentos/especificaciones-tecnicas/{presupuestoId}?formato=docx` exports a Word doc

The frontend has no UI for editing or viewing the ET, and the `ApuResponse` type doesn't include the field. Additionally, `ProyectoEditarRequest` should support `tituloEt1` and `tituloEt2` for the document export headings (per N04 §ESP and N04-bis).

## What changes

1. **Add `especificacionTecnica` field** to `ApuResponse` in `contract.ts`.
2. **Add `EspecificacionTecnicaRequest` type** to `contract.ts`.
3. **Add `tituloEt1`, `tituloEt2` fields** to `ProyectoEditarRequest` and `ProyectoResponse`.
4. **Create an ET panel component** shown in the APU editor page.
5. **Add a mutation hook** for saving the ET text.
6. **Add ET export** to the export page options.

## Steps

### Step 1 — Update `src/api/contract.ts`

Add to `ApuResponse`:

```typescript
export interface ApuResponse {
  // ... existing fields ...
  especificacionTecnica?: string | null;
}
```

Add new type:

```typescript
export interface EspecificacionTecnicaRequest {
  texto: string;
}
```

Add to `ProyectoResponse` and `ProyectoEditarRequest`:

```typescript
// In ProyectoResponse, add:
tituloEt1?: string | null;
tituloEt2?: string | null;

// In ProyectoEditarRequest, add:
tituloEt1?: string | null;
tituloEt2?: string | null;
```

Add to `ApuCrearRequest` (for duplicate with ET):

```typescript
export interface ApuDuplicarRequest {
  copiarET?: boolean;
}
```

### Step 2 — Create `src/features/apu-editor/components/PanelEspecificacionTecnica.tsx`

A collapsible panel below the grid sections in the APU editor. Uses a `<Textarea>` from shadcn. Auto-saves on blur (debounced) or explicit save button.

```tsx
import { useState, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDownIcon, SaveIcon } from "lucide-react";

interface PanelEspecificacionTecnicaProps {
  texto: string | null | undefined;
  onGuardar: (texto: string) => Promise<void>;
}

export function PanelEspecificacionTecnica({ texto, onGuardar }: Props) {
  const [valor, setValor] = useState(texto ?? "");
  const [guardando, setGuardando] = useState(false);
  const [abierto, setAbierto] = useState(!!texto);

  const guardar = useCallback(async () => {
    setGuardando(true);
    try {
      await onGuardar(valor);
    } finally {
      setGuardando(false);
    }
  }, [valor, onGuardar]);

  // Show character count. Max 64 KB UTF-8.
  const bytes = new TextEncoder().encode(valor).length;
  const excede = bytes > 65536;

  return (
    <Collapsible open={abierto} onOpenChange={setAbierto}>
      <Card>
        <CardHeader className="flex-row items-center justify-between py-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <ChevronDownIcon className={cn("size-4 transition-transform", abierto && "rotate-180")} />
              <CardTitle className="text-sm font-medium">Especificación Técnica</CardTitle>
            </Button>
          </CollapsibleTrigger>
          {abierto && (
            <Button size="sm" onClick={guardar} disabled={guardando || excede}>
              <SaveIcon data-icon="inline-start" /> {guardando ? "Guardando…" : "Guardar"}
            </Button>
          )}
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <Textarea
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="Describe las especificaciones técnicas de este rubro…"
              rows={8}
              className="font-mono text-xs"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {(bytes / 1024).toFixed(1)} KB / 64 KB
              {excede && <span className="text-destructive"> — excede el límite</span>}
            </p>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
```

### Step 3 — Add mutation in `useApuEditor.ts`

Add to the hook:

```typescript
guardarEspecificacionTecnica(texto: string): Promise<void>;
```

Implementation:

```typescript
const guardarEspecificacionTecnica = useCallback(
  async (texto: string) => {
    await put(`/apus/${apuId}/especificacion-tecnica`, { texto });
    queryClient.invalidateQueries({ queryKey: qk.apuDetalle(Number(apuId)) });
  },
  [apuId, queryClient],
);
```

Add `guardarEspecificacionTecnica` to the returned object and the `UseApuEditor` interface.

### Step 4 — Mount panel in `EditorApuPage.tsx`

After the grid sections and before `PieTotales`, add:

```tsx
<PanelEspecificacionTecnica
  texto={apu.especificacionTecnica}
  onGuardar={guardarEspecificacionTecnica}
/>
```

### Step 5 — Add ET export to ExportPage

In the `opcionesExport` array (inside `ExportPageActiva`), add an entry for ET:

```typescript
{
  nombre: "Especificaciones Técnicas",
  descripcion: "Documento Word con las ET de todos los APUs del presupuesto",
  formato: "docx",
  endpoint: `/documentos/especificaciones-tecnicas/${presupuestoId}`,
}
```

The export mechanism uses the same download pattern as other documents.

### Step 6 — Update fixtures

Add `especificacionTecnica: null` to `apuDetalleFixture` in `src/test/fixtures/apu.ts`.

### Step 7 — Add MSW handler

In `src/test/handlers.ts`:

```typescript
http.put("*/apus/:id/especificacion-tecnica", () => HttpResponse.json(apuDetalleFixture)),
```

### Step 8 — Verify

```bash
pnpm run typecheck   # zero errors
pnpm run test        # all tests pass
pnpm run lint        # clean
```

## Out of scope

- Rich text editing (TipTap/React-Quill) — the spec says "frontend puede serializar desde TipTap/React-Quill a texto plano" but plain `<Textarea>` is sufficient for MVP. Rich text can be added later.
- Word template customization — the backend handles DOCX generation.
- `tituloEt1`/`tituloEt2` UI in project settings — add to the project edit form as two optional text fields; follow the existing pattern in the form.

## Escape hatches

- If the backend `PUT /apus/{id}/especificacion-tecnica` is not yet deployed, the panel renders but save will 404 — guard with a try/catch and toast error.
- If the 64 KB limit is hit, the UI already shows the byte count and disables the save button.

## Maintenance notes

The ET text is returned inline in `ApuResponse`. For very long ETs across many APUs, the list endpoint (`ApuResumenResponse`) should NOT include the full text — only the detail endpoint does. This is already the pattern.
