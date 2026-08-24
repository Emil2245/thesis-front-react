# Plan 016: Alinear crear/editar proyecto con el backend Quarkus real

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 3514822..HEAD -- src/api/contract.ts src/features/proyectos src/test/handlers.ts src/test/fixtures/proyectos.ts`
> If any of those files changed since `3514822`, compare the "Current state"
> excerpts below against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none (but execute after plans 017/018 are merged OR before them — see README ordering note; all three touch `src/test/handlers.ts`)
- **Category**: bug
- **Planned at**: commit `3514822`, 2026-08-24

## Why this matters

El frontend crea y edita proyectos con un contrato que el backend no implementa: envía `{ nombre, origenInsumos }` pero el backend espera `{ nombreProyecto, descripcion?, fechaInicio?, plazoEjecucion?, plazoUnidad?... }`. Hoy, pulsar "Crear proyecto" en la app produce un error del servidor (falta `nombreProyecto`) o un proyecto con campos vacíos. Este plan alinea DTOs, esquema zod, asistente de creación y diálogo de edición con los contratos verificados por la colección Bruno del backend (`api/bruno/06-proyecto/`), de modo que crear y editar proyectos funcionen contra `localhost:8080`.

## Current state

### Contrato verificado del backend (fuente de verdad)

De la colección Bruno `/home/etverkade/workspace/thesis-back-quarkus/api/bruno/06-proyecto/TC-06-01-crear-proyecto.bru` (y confirmado en `TC-07-00b-crear-proyecto-helper.bru`, que crea un proyecto enviando SOLO `nombreProyecto`, `anio`, `plazoEjecucion`, `plazoUnidad`, `direccionInstitucional`):

```
POST {{baseUrl}}/proyectos
{ "nombreProyecto": "Puente Tulcán", "codigo": "P-2026-01",
  "descripcion": "...", "anio": 2026, "fechaInicio": "2026-03-01",
  "plazoEjecucion": 6, "plazoUnidad": "MES",
  "direccionInstitucional": "...", "subdireccionInstitucional": "..." }
→ 201 { estado: "BORRADOR", nombreProyecto: "Puente Tulcán", ... }
```

```
PUT {{baseUrl}}/proyectos/{{proyectoId}}   # mismos campos, todos opcionales salvo comportamiento del server
→ 200 ProyectoResponse                     # TC-06-04-editar-proyecto.bru
```

- `plazoUnidad` solo acepta `"SEMANA" | "MES"` (enum Java `PlazoUnidad`).
- **NO existe** endpoint `POST /proyectos/{id}/duplicar` en el backend (verificado grepeando `@Path` en todo `src/main/java`). El front tiene `useDuplicarProyecto` y entradas "Duplicar" en la UI; quedará roto hasta que el backend lo implemente — este plan NO lo toca (ver Out of scope).
- `ProyectoResponse` del backend: `{ id, nombreProyecto, codigo, descripcion, anio, fechaInicio, plazoEjecucion, plazoUnidad, estado, direccionInstitucional, subdireccionInstitucional, tieneLogo, updatedAt }`. El front ya consume esta forma para listado/detalle (planes anteriores).

### Archivos del front a cambiar

- `src/api/contract.ts:110-134` — DTOs hoy:

```ts
export interface ProyectoCrearRequest {
  nombre: string;
  codigo: string;
  direccionInstitucional?: string;
  anio?: number;
  origenInsumos: OrigenInsumosRequest;
}

export interface OrigenInsumosRequest {
  tipo: "CENTRAL" | "PROYECTO" | "VACIA";
  baseId?: number;
  proyectoId?: number;
}

export interface ProyectoEditarRequest {
  nombre?: string;
  codigo?: string;
  direccionInstitucional?: string;
  anio?: number;
}

export interface ProyectoDuplicarRequest {
  nombre: string;
  codigo: string;
}
```

- `src/features/proyectos/schemas.ts:15-27` — esquema zod con `nombre`, `origenInsumos`, `duplicarDesde`.
- `src/features/proyectos/components/AsistenteCrearProyecto.tsx` — asistente de 3 pasos; paso 1 es "Origen de insumos" (concepto sin soporte en el backend); construye el body en líneas 57-74.
- `src/features/proyectos/components/DialogoEditarProyecto.tsx` — form con `nombre/codigo/direccionInstitucional/anio`; usa `proyecto.nombreProyecto` para precargar (línea 46) pero envía `nombre:` en el PUT.
- `src/features/proyectos/hooks/useProyectos.ts` — `useCrearProyecto`/`useEditarProyecto` tipados con esos DTOs. `useDuplicarProyecto` existe pero queda fuera de alcance.
- `src/test/fixtures/proyectos.ts` — `proyectosFixture` ya usa `nombreProyecto` etc.; no hay fixture de request.
- `src/test/handlers.ts:95-96` — mocks `POST /proyectos` y `PUT /proyectos/:id`.
- `src/features/proyectos/components/AsistenteCrearProyecto.test.tsx` — test existente del asistente.

### Convenciones del repo (obligatorias)

- UI en español (es-EC); nombres de dominio en español (`insumo`, `rubro`, `apu`…). Ver `AGENTS.md`.
- Package manager: **pnpm** solamente.
- Tests: Vitest + RTL + MSW; consultar por rol/label accesible en español; wrapper compartido `src/test/render.tsx`; MSW con `onUnhandledRequest: "error"` (cualquier URL nueva sin mock rompe los tests).
- Comentarios: ninguno salvo que se pida.
- Estilo de commit: convencional corto en inglés (`feat:`, `fix:`, `chore:`).

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Install   | `pnpm install`       | exit 0              |
| Typecheck | `pnpm run typecheck` | exit 0              |
| Lint      | `pnpm run lint`      | exit 0 (solo warnings pre-existentes) |
| Format    | `pnpm exec prettier --write <files>` | exit 0 |
| Tests     | `pnpm run test -- src/features/proyectos` | all pass |
| Full gate | `pnpm run verify`    | typecheck + lint + format + tests + build, exit 0 |

## Scope

**In scope** (los únicos archivos a modificar):
- `src/api/contract.ts`
- `src/features/proyectos/schemas.ts`
- `src/features/proyectos/components/AsistenteCrearProyecto.tsx`
- `src/features/proyectos/components/AsistenteCrearProyecto.test.tsx`
- `src/features/proyectos/components/DialogoEditarProyecto.tsx`
- `src/features/proyectos/hooks/useProyectos.ts` (solo tipos de crear/editar)
- `src/test/handlers.ts` (solo handlers de POST/PUT `/proyectos`)
- `plans/README.md` (status row)

**Out of scope** (NO tocar aunque parezcan relacionados):
- `useDuplicarProyecto`, `DialogoDuplicar.tsx`, botones "Duplicar" en `ListaProyectosPage`/`ResumenProyectoPage` — el backend no tiene ese endpoint; se documenta en Maintenance notes, no se parcha aquí.
- Cualquier página de presupuesto/versiones/cronograma.
- `SelectorProyecto.tsx`, `ListaProyectosPage.tsx`, `ResumenProyectoPage.tsx` — ya consumen la forma correcta.
- No agregar campos nuevos al backend ni tocar `../thesis-back-quarkus`.

## Git workflow

- Trabaja sobre la rama actual del operador (no crees ramas ni PRs).
- Un commit por paso, estilo: `fix: align project create/edit DTOs with backend` / `feat: two-step create-project wizard`.

## Steps

### Step 1: Actualizar DTOs en `src/api/contract.ts`

Reemplaza `ProyectoCrearRequest`, `OrigenInsumosRequest` y `ProyectoEditarRequest` (bloque en líneas ~110-129) por:

```ts
export interface ProyectoCrearRequest {
  nombreProyecto: string;
  codigo?: string;
  descripcion?: string;
  anio?: number;
  fechaInicio?: string;
  plazoEjecucion?: number;
  plazoUnidad?: "SEMANA" | "MES";
  direccionInstitucional?: string;
  subdireccionInstitucional?: string;
}

export interface ProyectoEditarRequest {
  nombreProyecto?: string;
  codigo?: string;
  descripcion?: string;
  anio?: number;
  fechaInicio?: string;
  plazoEjecucion?: number;
  plazoUnidad?: "SEMANA" | "MES";
  direccionInstitucional?: string;
  subdireccionInstitucional?: string;
}
```

Borra `OrigenInsumosRequest`. **No borres** `ProyectoDuplicarRequest` (fuera de alcance; lo sigue usando `useDuplicarProyecto`).

**Verify**: `pnpm run typecheck` → fallará con errores SOLO en `schemas.ts`, `AsistenteCrearProyecto.tsx`, `AsistenteCrearProyecto.test.tsx` (referencias a `origenInsumos`/`nombre`). Anota la lista exacta; los siguientes pasos la resuelven.

### Step 2: Actualizar `src/features/proyectos/schemas.ts`

1. Elimina `origenInsumosSchema` completo y el campo `origenInsumos` de `proyectoSchema`.
2. Deja `duplicarDesde` tal cual (lo usa `DialogoDuplicar`, fuera de alcance).
3. Nuevo `proyectoSchema`:

```ts
export const proyectoSchema = z.object({
  nombreProyecto: z.string().min(1, "El nombre es obligatorio").max(200),
  codigo: z.string().max(50).optional(),
  descripcion: z.string().max(2000).optional(),
  anio: z.number().int().min(2000, "Año inválido").max(2100, "Año inválido").optional(),
  fechaInicio: z.string().optional(),
  plazoEjecucion: z.number().int().min(1, "Plazo inválido").max(600, "Plazo inválido").optional(),
  plazoUnidad: z.enum(["SEMANA", "MES"]).optional(),
  direccionInstitucional: z.string().max(200).optional(),
  subdireccionInstitucional: z.string().max(200).optional(),
  duplicarDesde: z
    .discriminatedUnion("tipo", [
      z.object({ tipo: z.literal("SISTEMA"), baseId: z.number() }),
      z.object({ tipo: z.literal("PROYECTO"), proyectoId: z.number() }),
    ])
    .optional(),
});
```

**Verify**: `pnpm run typecheck` → ahora los errores restantes apuntan solo a `AsistenteCrearProyecto.tsx/.test.tsx` y `DialogoEditarProyecto.tsx` (campo `nombre`).

### Step 3: Convertir el asistente a 2 pasos con campos reales

En `AsistenteCrearProyecto.tsx`:

1. `const PASOS = ["Datos generales", "Confirmar"];`
2. Elimina el estado `origen`, el import de `RadioGroup/RadioGroupItem` y todo el bloque del paso 1 ("¿De dónde copiar la base de insumos inicial?").
3. En el formulario (`defaultValues`): quita `origenInsumos`; deja `nombreProyecto: "", codigo: "", descripcion: ""`.
4. Paso 0 añade estos campos debajo de los existentes (renombra el label/id de Nombre a `nombreProyecto`):
   - `descripcion`: `<Input id="descripcion" {...form.register("descripcion")} />`, Label "Descripción".
   - `fechaInicio`: `<Input id="fechaInicio" type="date" {...form.register("fechaInicio")} />`, Label "Fecha de inicio".
   - `plazoEjecucion`: `<Input id="plazo" type="number" {...form.register("plazoEjecucion", { valueAsNumber: true })} />`, Label "Plazo de ejecución".
   - `plazoUnidad`: Select controlado con opciones `MES` ("Meses") y `SEMANA` ("Semanas"), valor por defecto `"MES"` vía `defaultValues` del form. Sigue el patrón del Select de moneda en `src/features/proyectos/pages/ParametrosPage.tsx:127-140`.
   - `subdireccionInstitucional`: Input, Label "Subdirección institucional".
5. `avanzar` valida `["nombreProyecto"]` en lugar de `["nombre", "codigo"]`.
6. `handleCrear` construye el body así (omite strings vacíos con `|| undefined`):

```ts
const body: ProyectoCrearRequest = {
  nombreProyecto: data.nombreProyecto,
  codigo: data.codigo || undefined,
  descripcion: data.descripcion || undefined,
  anio: data.anio || undefined,
  fechaInicio: data.fechaInicio || undefined,
  plazoEjecucion: data.plazoEjecucion || undefined,
  plazoUnidad: data.plazoUnidad ?? undefined,
  direccionInstitucional: data.direccionInstitucional || undefined,
  subdireccionInstitucional: data.subdireccionInstitucional || undefined,
};
```

7. El paso de confirmación muestra Nombre, Código y Año/Plazo (sin la línea "Origen insumos").

**Verify**: `pnpm run typecheck` → exit 0.

### Step 4: Actualizar `DialogoEditarProyecto.tsx`

1. Renombra el campo del form `nombre` → `nombreProyecto` (schema, `values:` de `useForm` línea ~44-51, `register("nombre")` → `register("nombreProyecto")`, `htmlFor`/`id` `edit-nombre` puede quedar igual).
2. Añade campos opcionales de descripción y plazo siguiendo el mismo patrón de Field/Label/Input (usa `proyecto.descripcion`, `proyecto.fechaInicio`, `proyecto.plazoEjecucion`, `proyecto.plazoUnidad`, `proyecto.subdireccionInstitucional ?? ""` para precargar).
3. El body enviado a `editar.mutateAsync` pasa a ser `ProyectoEditarRequest` con los nombres nuevos (omite vacíos).

**Verify**: `pnpm run typecheck` && `pnpm run test -- src/features/proyectos` → todos pasan (si `AsistenteCrearProyecto.test.tsx` falla, es el Step 5).

### Step 5: Actualizar tests y mocks

1. `src/features/proyectos/components/AsistenteCrearProyecto.test.tsx`: reemplaza consultas por label `Nombre` → sigue existiendo ("Nombre"); elimina interacciones con el paso de origen (radio "Empezar vacío" etc.) y avanza solo 2 pasos. Si el test aserciona el texto "Origen insumos", elimina esa aserción.
2. `src/test/handlers.ts` (~líneas 95-96): los mocks `POST ${API}/proyectos` (201 con `proyectoDetalleFixture`) y `PUT ${API}/proyectos/:id` no cambian de forma de respuesta; verifica que sigan registrados tras tus ediciones.
3. Corre el formateador sobre los archivos tocados.

**Verify**: `pnpm exec prettier --write src/api/contract.ts src/features/proyectos` && `pnpm run test -- src/features/proyectos` → all pass.

### Step 6: Verificación completa

**Verify**: `pnpm run verify` → exit 0 completo (typecheck, lint, format, 167+ tests, build).

## Test plan

- Ajusta `AsistenteCrearProyecto.test.tsx`: caso feliz = llenar "Nombre", avanzar, "Crear proyecto"; esperar llamada mock a `POST */api/v1/proyectos` con body que incluya `nombreProyecto` y **no** `origenInsumos` (puedo inspeccionarse con un handler que capture `request.json()` — patrón: `http.post(\`${API}/proyectos\`, async ({ request }) => { cuerpoCapturado = await request.json(); ... })`).
- Caso regresión: enviar sin nombre muestra "El nombre es obligatorio" (validación zod).
- Patrón estructural: `ListaProyectosPage.test.tsx` (renderConProviders + server.use + waitFor).

## Done criteria

- [ ] `grep -rn "origenInsumos" src/` → sin resultados
- [ ] `grep -rn "OrigenInsumosRequest" src/` → sin resultados
- [ ] `grep -n "nombre:" src/features/proyectos/schemas.ts` → no aparece `nombre:` en `proyectoSchema` (sí `nombreProyecto:`)
- [ ] `pnpm run verify` → exit 0
- [ ] `git status` → solo archivos del Scope modificados
- [ ] `plans/README.md` fila 016 actualizada

## STOP conditions

- El drift check muestra cambios en archivos in-scope posteriores a `3514822` que contradigan los excerpts.
- `typecheck` reporta errores en archivos fuera del Scope tras el Step 2 (indica otro consumidor desconocido de `OrigenInsumosRequest`).
- Encuentras que el backend YA tiene `POST /proyectos/{id}/duplicar` (entonces reporta y detente; cambia el alcance).
- Un paso falla dos veces tras intento razonable de arreglo.

## Maintenance notes

- `POST /proyectos/{id}/duplicar` no existe en el backend: las acciones "Duplicar" de la UI seguirán mostrando toast de error hasta que el back lo implemente. Próximo plan candidato cuando el back lo agregue.
- Si el backend agrega validación obligatoria de `codigo` o `fechaInicio`, actualizar `proyectoSchema` (hoy `.optional()`).
- Revisor: verificar que ningún `select` nuevo use labels en inglés y que el wizard quede en 2 pasos en la UI.
