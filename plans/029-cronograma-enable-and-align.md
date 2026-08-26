# 029 — Habilitar el cronograma: alinear endpoints, corregir índices, activar módulo y completar UX faltante

- **Status:** DONE (`90fc789`)
- **Written against:** commit `4e2609a`
- **Depends on:** 012 (original implementation, mostly done), 027 (degradación de módulos sin backend)
- **Blocks:** nada — el módulo queda funcional con MSW, listo para conectar al backend real
- **Covers:** P-33…P-36, S-33, S-34

---

## 1. Contexto

El cronograma ya está **construido** en `src/features/cronograma/` pero **desactivado** vía `MODULOS_SIN_BACKEND`. La implementación tiene varios desalineamientos con la especificación del API (`thesis-docs/plan/architecture/07-api-contract.md §7`) que se deben corregir antes de conectar al backend real. El objetivo es dejar el módulo habilitado con datos mock (MSW), tests cubriendo la funcionalidad, y el código alineado al contrato para que solo falte encender el backend.

**Componentes que ya existen y funcionan:**
- `CronogramaPage.tsx` / `CronogramaPageActiva` — página completa
- `GanttChart.tsx` — Gantt custom con barras horizontales (aceptable como "Gantt simplificado")
- `TablaActividades.tsx` — tabla de actividades
- `DialogoConfigurarCronograma.tsx` — diálogo crear/reconfigurar
- `DialogoEditarActividad.tsx` — diálogo editar avance por período
- `BadgeDesactualizado.tsx` — badge de desincronización
- `useCronograma.ts` — hooks para los 5 endpoints
- Fixture + MSW handlers + 8 tests unitarios

## 2. Hallazgos — qué está desalineado

### 2.1 Índices de período: 0-based vs 1-based (CRÍTICO)

**Especificación** (`07-api-contract.md §11`):
```json
"avancePorPeriodo": { "1": "2.1000", "2": "2.1000" }
```

**Frontend actual** (fixture `src/test/fixtures/cronograma.ts`):
```ts
avancePorPeriodo: { "0": "500.000000", "1": "1000.000000" }
```

Los componentes `GanttChart.tsx:43` y `TablaActividades.tsx:40` acceden `avancePorPeriodo[String(i)]` donde `i` empieza en 0. Con el backend real (1-based) las barras y celdas quedarían vacías.

`DialogoEditarActividad.tsx:33` inicializa con keys 0-based también.

### 2.2 Rutas de endpoints

| Endpoint (spec) | Frontend actual (`useCronograma.ts`) | Delta |
|---|---|---|
| `PUT /cronogramas/{id}` | `PUT /presupuestos/${presupuestoId}/cronograma` | ruta diferente |
| `PATCH /cronogramas/{id}/actividades/{aid}` | `PATCH /cronograma/${cronogramaId}/actividades/${actividadId}` | singular vs plural |
| `POST /cronogramas/{id}/revisado` | `PUT /cronograma/${cronogramaId}/revisar` | método y ruta diferentes |

`GET` y `POST` sobre `/presupuestos/{id}/cronograma` están correctos.

### 2.3 Funcionalidad faltante

1. **La tabla no tiene onClick** — `TablaActividades` renderiza filas sin `onClick`. El estado `actividadEdit` en `CronogramaPageActiva` existe pero no hay forma de activarlo. El usuario no puede editar avances.
2. **No hay manejo del 409 D-10** — al reconfigurar reduciendo períodos con avances asignados, el spec dice que el backend responde 409 `reduccion-periodos-requiere-confirmacion` con la lista de lo que se perdería. El frontend no tiene `DialogoConfirmarReduccion` y envía `confirmarPerdida: true` siempre sin preguntar.
3. **No hay estado vacío "sin ítems"** — si el presupuesto no tiene rubros, debería decir "Agrega ítems al presupuesto antes de configurar el cronograma".
4. **`useCrearCronograma` usa `CronogramaConfigurarRequest` en vez de `CronogramaCrearRequest`** — funciona porque `CronogramaCrearRequest` es un subconjunto, pero el tipado es incorrecto.

## 3. Archivos en alcance

```
src/features/cronograma/
  pages/CronogramaPage.tsx                    ← habilitar, completar UX
  components/TablaActividades.tsx             ← añadir onClick por fila
  components/GanttChart.tsx                   ← corregir índice 1-based
  components/DialogoEditarActividad.tsx        ← corregir índice 1-based
  components/DialogoConfigurarCronograma.tsx   ← sin cambios
  components/BadgeDesactualizado.tsx           ← sin cambios
  hooks/useCronograma.ts                      ← corregir rutas + tipos
  pages/CronogramaPage.test.tsx               ← actualizar + añadir tests
src/test/fixtures/cronograma.ts               ← corregir a 1-based
src/test/handlers.ts                          ← corregir rutas mock
src/lib/disponibilidad.ts                     ← quitar "cronograma"
src/api/contract.ts                           ← sin cambios (tipos están bien)
```

**Nunca editar:** `plans/` (salvo `Status:`), `../thesis-docs`, `../thesis-back-quarkus`.

## 4. Convenciones del repo (para el ejecutor)

- **Idioma UI:** español (es-EC). Nombres de dominio en español en el código.
- **Moneda:** usar `formatearMoneda()` y `formatearPorcentaje()` de `@/lib/decimal`. Nunca `toFixed()`, nunca `parseFloat()` para enviar al servidor.
- **Estado servidor:** TanStack Query. Mutations hacen `setQueryData` optimista.
- **Formularios:** `react-hook-form` + zod donde se valide input del usuario.
- **Componentes UI:** ShadCN (`src/components/ui/`). Seguir el patrón existente de Dialog, Button, Input, Select.
- **Estilo:** Tailwind v4, sin clases de color crudo — usar tokens del tema (`text-muted-foreground`, `bg-muted`, etc.).
- **API:** solo `get`/`post`/`put`/`patch`/`del` de `@/api/request`. Nunca importar axios en features.
- **Tests:** Vitest + RTL + MSW. Fixture en `src/test/fixtures/`, handlers en `src/test/handlers.ts`. Usar `renderConProviders` de `@/test/render`.

Ejemplo de componente similar bien hecho: `src/features/apu-editor/components/CeldaEditable.tsx` para la edición inline; `src/features/presupuesto/components/ArbolPresupuesto.tsx` para filas clickeables.

## 5. Pasos

### Paso 1 — Corregir fixture a 1-based

**Archivo:** `src/test/fixtures/cronograma.ts`

Cambiar todas las keys de `avancePorPeriodo` de 0-based a 1-based:

```ts
// ANTES
avancePorPeriodo: { "0": "500.000000" as never, "1": "1000.000000" as never, "2": "500.000000" as never }

// DESPUÉS
avancePorPeriodo: { "1": "500.000000" as never, "2": "1000.000000" as never, "3": "500.000000" as never }
```

Hacer lo mismo para las tres actividades del fixture.

**Verificación:** `pnpm test -- cronograma` — los tests existentes fallarán (esperado, se arreglan en pasos siguientes).

### Paso 2 — Corregir componentes a 1-based

**`GanttChart.tsx:42-43`** — cambiar el iterador:
```tsx
// ANTES
Array.from({ length: numeroPeriodos }, (_, p) => {
  const val = Number(act.avancePorPeriodo[String(p)] || 0);

// DESPUÉS
Array.from({ length: numeroPeriodos }, (_, p) => {
  const periodo = p + 1;
  const val = Number(act.avancePorPeriodo[String(periodo)] || 0);
```

**`TablaActividades.tsx:38-42`** — igual:
```tsx
// ANTES
{Array.from({ length: periodos }, (_, i) => (
  <td ...>
    {act.avancePorPeriodo[String(i)]

// DESPUÉS
{Array.from({ length: periodos }, (_, i) => {
  const periodo = String(i + 1);
  return (
    <td ...>
      {act.avancePorPeriodo[periodo]
```

**`DialogoEditarActividad.tsx:32-34`** — inicializar con 1-based:
```tsx
// ANTES
for (let i = 0; i < numeroPeriodos; i++) {
  init[String(i)] = actividad.avancePorPeriodo[String(i)] || "0.000000";

// DESPUÉS
for (let i = 1; i <= numeroPeriodos; i++) {
  init[String(i)] = actividad.avancePorPeriodo[String(i)] || "0.000000";
```

Y el label del período (`línea 53`) ya muestra `i + 1` que ahora debería cambiar a solo `i`:
```tsx
// ANTES (con i 0-based)
<Label htmlFor={`p${i}`}>Período {i + 1}</Label>

// DESPUÉS (con i 1-based)
<Label htmlFor={`p${i}`}>Período {i}</Label>
```

Y el `htmlFor` y `id` también deben usar `i` directamente (ya son 1-based).

**Verificación:** `pnpm test -- cronograma` — debería volver a pasar con los datos del fixture corregido.

### Paso 3 — Corregir rutas de endpoints en hooks

**Archivo:** `src/features/cronograma/hooks/useCronograma.ts`

```ts
// useConfigurarCronograma — ANTES
put<CronogramaResponse>(`/presupuestos/${presupuestoId}/cronograma`, body)
// DESPUÉS: necesita cronogramaId, no presupuestoId
put<CronogramaResponse>(`/cronogramas/${cronogramaId}/`, body)

// useActualizarAvance — ANTES
patch<CronogramaResponse>(`/cronograma/${cronogramaId}/actividades/${actividadId}`, body)
// DESPUÉS
patch<CronogramaResponse>(`/cronogramas/${cronogramaId}/actividades/${actividadId}`, body)

// useRevisarCronograma — ANTES
put<CronogramaResponse>(`/cronograma/${cronogramaId}/revisar`)
// DESPUÉS
post<CronogramaResponse>(`/cronogramas/${cronogramaId}/revisado`)
```

Esto requiere cambiar la firma de `useConfigurarCronograma` — ahora necesita `cronogramaId` además de `presupuestoId`:

```ts
export function useConfigurarCronograma(cronogramaId: number, presupuestoId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CronogramaConfigurarRequest) =>
      put<CronogramaResponse>(`/cronogramas/${cronogramaId}`, body),
    onSuccess: (data) => {
      qc.setQueryData(qk.cronograma(presupuestoId), data);
      toast.success("Cronograma actualizado");
    },
    onError: () => toast.error("Error al configurar cronograma"),
  });
}
```

Y en `useRevisarCronograma`, cambiar `put` → `post` (importar `post` de `@/api/request`).

**Actualizar `CronogramaPageActiva`** para pasar `cronograma?.id ?? 0` a `useConfigurarCronograma`:
```ts
// ANTES
const configCrono = useConfigurarCronograma(versionId);
// DESPUÉS
const configCrono = useConfigurarCronograma(cronograma?.id ?? 0, versionId);
```

Corregir también el tipo de `useCrearCronograma`:
```ts
// ANTES
mutationFn: (body: CronogramaConfigurarRequest) =>
// DESPUÉS
mutationFn: (body: CronogramaCrearRequest) =>
```

(Importar `CronogramaCrearRequest` de `@/api/contract`.)

**Verificación:** `pnpm tsc --noEmit` — sin errores de tipos.

### Paso 4 — Corregir rutas MSW

**Archivo:** `src/test/handlers.ts`

Actualizar los handlers para que coincidan con las rutas corregidas:

```ts
// ANTES
http.put(`${API}/presupuestos/:id/cronograma`, () => ...)
http.patch(`${API}/cronograma/:id/actividades/:actId`, () => ...)
http.put(`${API}/cronograma/:id/revisar`, () => ...)

// DESPUÉS
http.put(`${API}/cronogramas/:id`, () => ...)
http.patch(`${API}/cronogramas/:id/actividades/:actId`, () => ...)
http.post(`${API}/cronogramas/:id/revisado`, () => ...)
```

**Verificación:** `pnpm test -- cronograma` — todos los tests existentes pasan.

### Paso 5 — Añadir onClick a TablaActividades

**Archivo:** `src/features/cronograma/components/TablaActividades.tsx`

Añadir prop `onClickActividad` y hacer las filas clickeables:

```tsx
interface TablaActividadesProps {
  actividades: ActividadResponse[];
  periodos: number;
  onClickActividad?: (actividad: ActividadResponse) => void;
}

export function TablaActividades({ actividades, periodos, onClickActividad }: TablaActividadesProps) {
  // ...
  <tr
    key={act.id}
    className="border-b hover:bg-muted/30 cursor-pointer"
    onClick={() => onClickActividad?.(act)}
  >
```

**Archivo:** `src/features/cronograma/pages/CronogramaPage.tsx`

Pasar el handler:
```tsx
<TablaActividades
  actividades={cronograma.actividades}
  periodos={cronograma.numeroPeriodos}
  onClickActividad={setActividadEdit}
/>
```

**Verificación:** `pnpm test -- cronograma` — pasa. Verificar visualmente que al hacer click en una fila se abre el diálogo de editar actividad.

### Paso 6 — Habilitar el módulo

**Archivo:** `src/lib/disponibilidad.ts`

Quitar `"cronograma"` del set:

```ts
export const MODULOS_SIN_BACKEND = new Set([
  "presupuesto",
  "versiones",
  "documentos",
  "plantillas",
  "admin",
] as const);
```

**Archivo:** `src/features/cronograma/pages/CronogramaPage.tsx`

Eliminar la función stub `CronogramaPage` y renombrar `CronogramaPageActiva` → `CronogramaPage`:

```tsx
// Eliminar el bloque de líneas 21-34 (el stub con ModuloNoDisponible)
// Renombrar:
export function CronogramaPage() {  // era CronogramaPageActiva
```

**Archivo:** `src/features/cronograma/pages/CronogramaPage.test.tsx`

- Eliminar el import de `CronogramaPage` separado y el describe del stub.
- Cambiar todos los `CronogramaPageActiva` → `CronogramaPage`.
- El test "explica que el módulo todavía no está disponible" se elimina (ya no aplica).

**Verificación:** `pnpm test -- cronograma` — pasa (con un test menos). `pnpm tsc --noEmit` — sin errores.

### Paso 7 — Manejo del 409 D-10 (reducción de períodos)

**Archivo nuevo:** `src/features/cronograma/components/DialogoConfirmarReduccion.tsx`

Diálogo que recibe la lista de avances que se perderán (del body del error 409) y un callback de confirmación:

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DialogoConfirmarReduccionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  periodosAfectados: string[];
}

export function DialogoConfirmarReduccion({
  open, onOpenChange, onConfirm, periodosAfectados,
}: DialogoConfirmarReduccionProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar reducción de períodos</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Los avances asignados en los siguientes períodos se perderán:
        </p>
        <ul className="list-disc pl-5 text-sm space-y-1">
          {periodosAfectados.map((p) => <li key={p}>{p}</li>)}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Archivo:** `src/features/cronograma/hooks/useCronograma.ts`

En `useConfigurarCronograma`, el `onError` debe detectar el 409 y pasar los datos al diálogo en vez de mostrar un toast genérico. La forma más limpia es que el hook reciba un callback `on409`:

```ts
export function useConfigurarCronograma(
  cronogramaId: number,
  presupuestoId: number,
  on409?: (periodosAfectados: string[]) => void,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CronogramaConfigurarRequest) =>
      put<CronogramaResponse>(`/cronogramas/${cronogramaId}`, body),
    onSuccess: (data) => {
      qc.setQueryData(qk.cronograma(presupuestoId), data);
      toast.success("Cronograma actualizado");
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409 && on409) {
        on409(err.body?.periodosAfectados ?? []);
      } else {
        toast.error("Error al configurar cronograma");
      }
    },
  });
}
```

(Importar `ApiError` de `@/api/problem`.)

**Archivo:** `src/features/cronograma/pages/CronogramaPage.tsx`

Añadir estado para el diálogo de confirmación y conectar:

```tsx
const [reduccionData, setReduccionData] = useState<{ body: CronogramaConfigurarRequest; periodos: string[] } | null>(null);

const configCrono = useConfigurarCronograma(cronograma?.id ?? 0, versionId, (periodos) => {
  setReduccionData({ body: lastConfigBody, periodos });
});

// En handleConfigurar, guardar el body antes de enviar:
const [lastConfigBody, setLastConfigBody] = useState<CronogramaConfigurarRequest | null>(null);
```

Y renderizar el diálogo al final:
```tsx
<DialogoConfirmarReduccion
  open={!!reduccionData}
  onOpenChange={(open) => { if (!open) setReduccionData(null); }}
  onConfirm={() => {
    if (reduccionData) {
      configCrono.mutate({ ...reduccionData.body, confirmarPerdida: true });
      setReduccionData(null);
    }
  }}
  periodosAfectados={reduccionData?.periodos ?? []}
/>
```

**Quitar** el `confirmarPerdida: true` que se envía siempre en `handleConfigurar` (línea 54 actual).

**Verificación:** `pnpm tsc --noEmit` — sin errores.

### Paso 8 — Tests nuevos

**Archivo:** `src/features/cronograma/pages/CronogramaPage.test.tsx`

Añadir los siguientes tests:

```ts
it("abre diálogo de editar actividad al hacer click en una fila", async () => {
  const { user } = await setupCronogramaPage();
  await user.click(screen.getByText("Excavación a máquina"));
  await waitFor(() => {
    expect(screen.getByText(/Excavación a máquina/)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

it("muestra 'Crear cronograma' cuando no existe uno", async () => {
  renderConProviders(
    <Routes>
      <Route path="/proyectos/:id/cronograma" element={<CronogramaPage />} />
    </Routes>,
    { ruta: "/proyectos/1/cronograma?v=999" },
  );
  await waitFor(() => {
    expect(screen.getByText(/no hay cronograma/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /crear cronograma/i })).toBeInTheDocument();
  });
});

it("los períodos en la tabla usan índice 1-based", async () => {
  await setupCronogramaPage();
  expect(screen.getByText("P1")).toBeInTheDocument();
  expect(screen.getByText("P4")).toBeInTheDocument();
});

it("muestra BadgeDesactualizado cuando desactualizado es true", async () => {
  // Override MSW handler para este test
  server.use(
    http.get(`${API}/presupuestos/:id/cronograma`, () =>
      HttpResponse.json({ ...cronogramaFixture, desactualizado: true }),
    ),
  );
  renderConProviders(
    <Routes>
      <Route path="/proyectos/:id/cronograma" element={<CronogramaPage />} />
    </Routes>,
    { ruta: `/proyectos/1/cronograma?v=11` },
  );
  await waitFor(() => {
    expect(screen.getByText("Desactualizado")).toBeInTheDocument();
  });
});
```

Adaptar los imports necesarios (`server`, `http`, `HttpResponse`, `API`, `cronogramaFixture`).

**Verificación:** `pnpm test -- cronograma` — ≥ 12 tests pasando.

### Paso 9 — Verificación final

```bash
pnpm run verify  # typecheck + lint + format:check + test + build → exit 0
```

## 6. Criterios de aceptación

| Comando | Esperado |
|---|---|
| `pnpm run verify` | exit 0 |
| `pnpm test -- cronograma` | ≥ 12 tests pasando |
| `grep -rn '"0":' src/test/fixtures/cronograma.ts \| wc -l` | `0` (no hay keys 0-based) |
| `grep -rn 'MODULOS_SIN_BACKEND' src/lib/disponibilidad.ts \| grep cronograma \| wc -l` | `0` |
| `grep -rn '/cronograma/' src/features/cronograma/hooks/ \| grep -v cronogramas \| wc -l` | `0` (todas las rutas usan `/cronogramas/`) |
| `grep -rn 'confirmarPerdida: true' src/features/cronograma/pages/ \| wc -l` | solo dentro del handler de confirmación, no en `handleConfigurar` directamente |

## 7. Objetivos claros — "qué funciona"

Cuando este plan esté ejecutado, un desarrollador puede:

1. **Navegar a `/proyectos/:id/cronograma`** y ver la página activa (no el placeholder "no disponible")
2. **Crear un cronograma** eligiendo unidad de tiempo y número de períodos
3. **Ver la tabla de actividades** con columnas P1…Pn (1-based) y valores monetarios correctos
4. **Hacer click en una actividad** para abrir el diálogo de edición de avances
5. **Ver el diagrama de Gantt** con barras horizontales proporcionales al avance por período
6. **Ver avance por período y acumulado** en las secciones inferiores del Gantt
7. **Reconfigurar** el cronograma; si se reducen períodos con avances, ver un diálogo de confirmación
8. **Ver la badge "Desactualizado"** cuando el presupuesto cambió
9. **Marcar como revisado** para limpiar el estado de desincronización
10. Todo esto contra **datos mock (MSW)** — cuando el backend implemente los endpoints, solo hay que verificar que las rutas coincidan

## 8. Límites

- **No** implementar drag-to-reschedule en el Gantt (decisión abierta, se queda read-only)
- **No** instalar Kibo UI — el Gantt custom actual cumple con "Gantt simplificado" de v1.1
- **No** computar `pesoPonderado`, totales, ni `desviacion` en el cliente — todo viene del server
- **No** crear actividades manualmente — se auto-importan 1:1 desde rubros (RNF-02)
- **No** tocar el backend (`thesis-back-quarkus`) ni los docs (`thesis-docs`)

## 9. Escape hatches

- Si el backend real usa paths diferentes a los del spec (`/cronograma/` singular en vez de `/cronogramas/` plural), ajustar en `useCronograma.ts` y documentar la discrepancia.
- Si `ApiError` no expone `.body` con la estructura del 409, el `DialogoConfirmarReduccion` puede mostrar un mensaje genérico ("Se perderán avances en períodos que se eliminen") en lugar de listar los períodos específicos.
- Si algún test del Gantt es frágil por DOM interno, testear solo que el contenedor se renderiza con el número correcto de filas de actividades.

## 10. Nota de mantenimiento

Las keys de `avancePorPeriodo` son **strings de enteros 1-based** (`"1"`, `"2"`, …, `"n"`). Esto está alineado con el spec del API y con el `Consolidador.java` del backend. Si alguien cambia a 0-based, todas las visualizaciones se rompen silenciosamente (muestran ceros en vez de los valores reales).

El cambio de `PUT /presupuestos/{id}/cronograma` → `PUT /cronogramas/{id}` para reconfigurar requiere tener el `cronogramaId`, que solo existe después del primer `GET` o `POST`. El hook `useConfigurarCronograma` ahora lo recibe como parámetro — pasarle 0 antes de que exista el cronograma es seguro porque el botón "Reconfigurar" solo se muestra cuando `cronograma` existe.
