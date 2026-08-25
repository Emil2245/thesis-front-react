# Plan 028: Validar las respuestas del backend con Zod en el seam de la API

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the `Status:` line in **this
> file only**; the orchestrator maintains `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 21d27f3..HEAD -- src/api/ src/features/apu-editor/hooks/ src/features/proyectos/hooks/ src/features/insumos/hooks/`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MEDIUM (toca el único seam por el que pasa todo el tráfico HTTP)
- **Depends on**: nada. `useProyectos` usa `placeholderData: keepPreviousData` (plan 022): consérvalo al migrar.
- **Category**: correctness / tech-debt
- **Planned at**: commit `21d27f3`, 2026-08-25

## Why this matters

`src/api/request.ts` es un **cast puro**. `get<T>()` promete `T` y no comprueba
absolutamente nada:

```ts
// src/api/request.ts:3-4  (estado actual, completo)
export const get = async <T>(url: string, params?: unknown): Promise<T> =>
  (await http.get<T>(url, { params })).data;
```

Consecuencia: una URL equivocada, un backend que deriva del contrato, o un mock
que no casa **no producen error de red ni error de tipos**. Producen un
`TypeError` críptico a mitad del render, o una pantalla en blanco.

No es hipotético. Tres bugs reales de este repositorio nacieron exactamente aquí:

1. **Plan 020** — `get<PlantillaApuDetalleResponse[]>("/plantillas-apu")` sobre
   el endpoint de *listado*, que no devuelve `snapshot`. Compilaba
   perfectamente; reventaba al abrir "Nuevo APU".
2. **`ApiError.slug`** — el cuerpo del error llegaba sin `type` y
   `this.problem.type.replace(...)` lanzaba
   `TypeError: Cannot read properties of undefined (reading 'replace')`.
   Ya lleva guarda (`src/api/problem.ts:48-52`), pero el hueco de fondo sigue.
3. **Plan 021** — el catch-all de Playwright devolvía `{}` cuando una ruta
   mockeada no casaba, y la página reventaba con
   `TypeError: Cannot read properties of undefined (reading 'length')` al hacer
   `data.contenido.length`. El plan arregló los mocks; **no** arregló que la
   página no tolere una respuesta con otra forma.

El patrón es siempre el mismo: **la UI indexa un campo que la respuesta no
trae**. Lo que este plan cambia es *dónde* se nota: en el seam, con un mensaje
legible, en vez de tres capas más arriba con un `TypeError` sin contexto.

### La tensión que debes conocer (y por qué el plan es incremental)

`plans/README.md` ya registró esta decisión con tres opciones: *(a)* endurecer
solo los listados (`contenido ?? []`), *(b)* validar con Zod en el seam, *(c)*
generar el cliente desde OpenAPI. Y recomendaba (a) + (c), anotando que
**(b) es trabajo que (c) tiraría**.

Este plan implementa (b) por decisión explícita del humano. Para que (c) no lo
tire entero cuando llegue, el diseño se ciñe a dos reglas:

- **La envoltura antes que el contenido.** El paso 1 cubre *todos* los listados
  con **un solo schema** que valida la forma de página, sin describir los items.
  Eso ataca el 90 % del daño observado con ~20 líneas que sobreviven a (c).
- **Adopción opt-in, nunca masiva.** No se escriben 75 schemas para las 75
  interfaces de `contract.ts`. Solo los DTOs que ya causaron un bug. Migrar un
  hook es una línea, y `contract.ts` sigue siendo la fuente de tipos.

Si en algún momento llega OpenAPI, lo que se tira son los ~4 schemas de item del
paso 2. `getValidado` y la validación de envoltura siguen sirviendo.

## Current state

### El seam completo

```ts
// src/api/request.ts  (archivo completo, 17 líneas)
import { http } from "./client";

export const get = async <T>(url: string, params?: unknown): Promise<T> =>
  (await http.get<T>(url, { params })).data;

export const post = async <T>(url: string, body?: unknown): Promise<T> =>
  (await http.post<T>(url, body)).data;
// … put, patch, del, descargar — misma forma
```

### La envoltura de página que el backend devuelve

`client.ts` ya normaliza la forma del backend a la del contrato, en un
interceptor de respuesta:

```ts
// src/api/client.ts:33-41
// El backend pagina con { items, total }; el contrato interno usa { contenido, totalElementos }.
const normalizarPaginado = (data: unknown): unknown => {
  if (data !== null && typeof data === "object" && "items" in data && !("contenido" in data)) {
    const { items, total, ...resto } = data as { items: unknown; total?: number };
    if (!Array.isArray(items)) return data;
    return { ...resto, contenido: items, totalElementos: total ?? items.length };
  }
  return data;
};
```

```ts
// src/api/contract.ts:4-10
export interface Page<T> {
  contenido: T[];
  page: number;
  size: number;
  totalElementos: number;
  totalPaginas: number;
}
```

**Nota importante**: `normalizarPaginado` se aplica *antes* que cualquier
validación que añadas en `request.ts`, porque vive en el interceptor de axios.
Tus schemas ven la forma ya normalizada (`contenido`), no la del backend
(`items`). No la vuelvas a normalizar.

### Cómo se usa Zod hoy en el repositorio

Zod ya es dependencia (`package.json:45`, `"zod": "^3.25.76"` — **v3**, no v4).
Se usa para validar **entradas de formulario**, un archivo `schemas.ts` por
feature:

```ts
// src/features/apu-editor/schemas.ts:1-9  (exemplar a imitar en estilo)
import { z } from "zod";
import { parsearEntradaDecimal } from "@/lib/decimal";

export const celdaCantidadSchema = z
  .string()
  .refine(
    (v) => parsearEntradaDecimal(v) !== null && Number(parsearEntradaDecimal(v)) > 0,
    "Debe ser mayor que 0",
  );
```

Este plan añade el primer uso de Zod para validar **salidas del servidor**. Van
en `src/api/schemas.ts`, no en los `schemas.ts` de feature.

### Un hook consumidor típico

```ts
// src/features/apu-editor/hooks/useApus.ts:6-12
export function useApus(presupuestoId: number, filtros?: Record<string, unknown>) {
  return useQuery({
    queryKey: qk.apus(presupuestoId, filtros),
    queryFn: () => get<Page<ApuResumenResponse>>(`/presupuestos/${presupuestoId}/apus`, filtros),
    enabled: presupuestoId > 0,
  });
}
```

### El catálogo de errores — NO lo toques

```ts
// src/api/problem.ts:17-36
export const PROBLEM_TYPES = [
  "validacion", "credenciales-invalidas", /* … 16 en total … */ "no-encontrado",
] as const;
export type ProblemType = (typeof PROBLEM_TYPES)[number];
```

`PROBLEM_TYPES` es el catálogo del **contrato del backend** (`architecture/07
§1`), y `src/api/problem.test.ts:39` afirma `toHaveLength(16)`. Un fallo de
validación es un problema del *cliente*, no un tipo del contrato: **no añadas
una entrada a este array**. El paso 1 construye un `Problem` sin registrarlo en
el catálogo.

### Convenciones del repo

- Gate: `pnpm run verify` (typecheck · lint · format:check · test · build).
  E2E aparte: `pnpm run e2e`. Baseline: **197 tests en 43 archivos**.
- Gestor: **pnpm**, nunca npm.
- Idioma de UI y dominio: español (es-EC).
- Tests: Vitest + RTL + MSW, consultando por rol/etiqueta accesible en español.
- Cero aritmética de costes en el cliente (ADR 9). Este plan no calcula nada.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Gate completo | `pnpm run verify` | exit 0, ≥197 tests |
| Solo tests | `pnpm test` | 43+ archivos en verde |
| Un archivo | `pnpm test src/api/schemas.test.ts` | verde |
| Typecheck | `pnpm run typecheck` | exit 0 |
| Formato | `pnpm exec prettier --write <archivos>` | — |

## Scope

**In scope**:
- `src/api/schemas.ts` (nuevo)
- `src/api/schemas.test.ts` (nuevo)
- `src/api/request.ts`
- `src/features/apu-editor/hooks/useApus.ts`
- `src/features/apu-editor/hooks/usePlantillas.ts`
- `src/features/proyectos/hooks/useProyectos.ts`
- `src/features/insumos/hooks/useInsumos.ts`

**Out of scope** (NO tocar):
- `src/api/contract.ts` — sigue siendo la fuente de tipos. Este plan **no**
  reescribe las 75 interfaces como schemas de Zod. Si crees que hace falta,
  para y reporta.
- `src/api/problem.ts` y `PROBLEM_TYPES` — ver arriba.
- `src/api/client.ts` y sus interceptores — la validación va en `request.ts`,
  después de la normalización, no dentro de ella.
- `post`, `put`, `patch`, `del` — solo se valida lo que se **lee**. Las
  respuestas de mutación se validarán en un plan posterior si hace falta.
- Cualquier archivo bajo `src/features/**/pages/` o `components/` — este plan
  no cambia ninguna pantalla.

## Git workflow

- Rama: la que te haya asignado el orquestador. No crees otra.
- Commits conventional (`feat:`, `fix:`, `test:`), uno por paso.
- **No hagas push ni abras PR.**

## Steps

### Step 1: La infraestructura de validación

Crea `src/api/schemas.ts`:

```ts
import { z } from "zod";
import { ApiError } from "./problem";

/**
 * Envoltura de página del contrato (`Page<T>` en contract.ts). Valida la
 * *forma*, no los items: con esto, cualquier listado que reciba algo que no sea
 * una página falla aquí con un mensaje legible en vez de reventar más arriba
 * con `Cannot read properties of undefined (reading 'length')`.
 *
 * `contenido` es lo único obligatorio: es el campo que la UI indexa siempre.
 */
export const paginaDe = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    contenido: z.array(item),
    page: z.number().optional(),
    size: z.number().optional(),
    totalElementos: z.number().optional(),
    totalPaginas: z.number().optional(),
  });

/** Página cuyos items no se validan. El caso barato que cubre todos los listados. */
export const paginaLaxa = paginaDe(z.unknown());

/**
 * Un fallo de validación es un problema del cliente, no un tipo del contrato
 * (por eso `type` no sale de PROBLEM_TYPES). Se envuelve en ApiError para que
 * el manejo de errores existente lo trate como cualquier otro fallo de red.
 */
export function errorDeRespuesta(url: string, error: z.ZodError): ApiError {
  const detalle = error.issues
    .slice(0, 3)
    .map((i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`)
    .join("; ");
  return new ApiError(
    {
      type: "/problemas/respuesta-invalida",
      title: "El servidor devolvió una respuesta inesperada",
      status: 500,
      detail: `${url} — ${detalle}`,
    },
    500,
  );
}
```

Ahora añade `getValidado` a `src/api/request.ts`, **sin tocar `get`**:

```ts
import { http } from "./client";
import type { z } from "zod";
import { errorDeRespuesta } from "./schemas";

// … get, post, put, patch, del, descargar se quedan exactamente como están …

/**
 * Como `get`, pero comprueba la forma de la respuesta antes de devolverla.
 * El tipo se infiere del schema: no hay cast, así que el tipo no puede mentir.
 */
export const getValidado = async <S extends z.ZodTypeAny>(
  url: string,
  schema: S,
  params?: unknown,
): Promise<z.infer<S>> => {
  const { data } = await http.get(url, { params });
  const r = schema.safeParse(data);
  if (!r.success) throw errorDeRespuesta(url, r.error);
  return r.data;
};
```

**Verify**:
```
pnpm run typecheck    # exit 0
```

### Step 2: Tests de la infraestructura

Crea `src/api/schemas.test.ts`. Estos son el corazón del plan: prueban que una
respuesta malformada produce un `ApiError` legible **en vez de** un `TypeError`.

```ts
import { describe, it, expect } from "vitest";
import { z } from "zod";
import { http, HttpResponse } from "msw";
import { server } from "@/test/server";
import { getValidado } from "./request";
import { paginaDe, paginaLaxa } from "./schemas";
import { ApiError } from "./problem";

// Mismo patrón que src/test/handlers.ts:41 — comodín, no la URL absoluta.
const API = "*/api/v1";

describe("getValidado", () => {
  it("devuelve los datos cuando la respuesta casa con el schema", async () => {
    server.use(
      http.get(`${API}/cosas`, () =>
        HttpResponse.json({ contenido: [{ id: 1 }], totalElementos: 1 }),
      ),
    );
    const r = await getValidado("/cosas", paginaDe(z.object({ id: z.number() })));
    expect(r.contenido[0].id).toBe(1);
  });

  it("lanza ApiError legible cuando el listado no trae contenido", async () => {
    // Es exactamente lo que devolvía el catch-all de Playwright (plan 021).
    server.use(http.get(`${API}/cosas`, () => HttpResponse.json({})));
    await expect(getValidado("/cosas", paginaLaxa)).rejects.toBeInstanceOf(ApiError);
  });

  it("el error nombra la URL y el campo que falta", async () => {
    server.use(http.get(`${API}/cosas`, () => HttpResponse.json({})));
    const err = await getValidado("/cosas", paginaLaxa).catch((e) => e as ApiError);
    expect(err.problem.detail).toContain("/cosas");
    expect(err.problem.detail).toContain("contenido");
  });

  it("un item con el tipo equivocado también falla", async () => {
    server.use(
      http.get(`${API}/cosas`, () =>
        HttpResponse.json({ contenido: [{ id: "no soy un número" }] }),
      ),
    );
    await expect(
      getValidado("/cosas", paginaDe(z.object({ id: z.number() }))),
    ).rejects.toBeInstanceOf(ApiError);
  });
});
```

**Verificado al escribir el plan**: `src/test/server.ts:4` exporta
`export const server = setupServer(...handlers)`, y `src/test/handlers.ts:41`
define `const API = "*/api/v1"`. Usa el comodín, no `API_BASE_URL`: los
handlers del repo casan por patrón, no por host.

**Verify**:
```
pnpm test src/api/schemas.test.ts     # 4 passed
```

### Step 3: Schemas para los cuatro DTOs que ya causaron bugs

Añade a `src/api/schemas.ts`. Los campos y su opcionalidad salen literalmente de
`src/api/contract.ts` — **cópialos de ahí, no los inventes**:

```ts
export const proyectoSchema = z.object({
  id: z.number(),
  nombreProyecto: z.string(),
  codigo: z.string(),
  estado: z.enum(["BORRADOR", "EN_PROCESO", "FINALIZADO"]),
  descripcion: z.string().optional(),
  direccionInstitucional: z.string().optional(),
  subdireccionInstitucional: z.string().optional(),
  anio: z.number().optional(),
  fechaInicio: z.string().optional(),
  plazoEjecucion: z.number().optional(),
  plazoUnidad: z.string().optional(),
  tieneLogo: z.boolean().optional(),
  updatedAt: z.string().optional(),
});

export const insumoSchema = z.object({
  id: z.number(),
  codigo: z.string(),
  tipo: z.enum(["EQUIPO", "MANO_OBRA", "MATERIAL", "TRANSPORTE"]),
  descripcion: z.string(),
  unidad: z.string(),
  precioUnitario: z.number(),
  fechaActualizacion: z.string(),
  desactualizado: z.boolean(),
  fuente: z.enum(["LOCAL", "CENTRAL"]).optional(),
  baseNombre: z.string().optional(),
});

export const apuResumenSchema = z.object({
  id: z.number(),
  codigo: z.string(),
  descripcion: z.string(),
  unidad: z.string(),
  esAuxiliar: z.boolean(),
  costoDirecto: z.number(),
  costoTotal: z.number(),
  vinculado: z.boolean(),
});

// El DTO del bug del plan 020: el LISTADO no trae `snapshot`; el detalle sí.
export const plantillaApuSchema = z.object({
  id: z.number(),
  nombre: z.string(),
  descripcion: z.string().optional(),
  tipo: z.enum(["SISTEMA", "PERSONAL"]),
  fechaCreacion: z.string(),
});
```

**Sobre los importes**: `precioUnitario`, `costoDirecto` y `costoTotal` son
`z.number()` **a propósito**. El backend serializa `BigDecimal` como número JSON
(`JacksonConfig` no activa `WRITE_BIGDECIMAL_AS_PLAIN`), y los planes 017, 018 y
026 ya alinearon estos DTOs a `number`. No los pongas como `string`.

**Verify**:
```
pnpm run typecheck    # exit 0
```

### Step 4: Migrar los cuatro hooks de listado

Un cambio de una línea por hook. Ejemplo con `useApus`:

```ts
// ANTES
queryFn: () => get<Page<ApuResumenResponse>>(`/presupuestos/${presupuestoId}/apus`, filtros),

// DESPUÉS
queryFn: () => getValidado(`/presupuestos/${presupuestoId}/apus`, paginaDe(apuResumenSchema), filtros),
```

Aplícalo a los cuatro:

| Hook | Endpoint | Schema |
|---|---|---|
| `useApus` (`src/features/apu-editor/hooks/useApus.ts:9`) | `/presupuestos/{id}/apus` | `paginaDe(apuResumenSchema)` |
| `useProyectos` (`src/features/proyectos/hooks/useProyectos.ts:16`) | `/proyectos` | `paginaDe(proyectoSchema)` |
| `useInsumos` (`src/features/insumos/hooks/useInsumos.ts:9`) | `/proyectos/{id}/insumos` | `paginaDe(insumoSchema)` |
| `usePlantillas` (`src/features/apu-editor/hooks/usePlantillas.ts:11`) | `/plantillas-apu` | `z.array(plantillaApuSchema)` — **no es página, es array plano**; además acepta `?tipo=`, que se pasa como tercer argumento |

Quita los imports de tipo que queden sin usar (`typecheck` te los señalará).
**No cambies la firma pública de ningún hook**: los componentes que los usan no
se tocan en este plan.

**Verify** tras cada hook:
```
pnpm run typecheck && pnpm test
```

Al terminar los cuatro:
```
pnpm run verify        # exit 0, ≥197 tests
```

**Si algún test existente falla aquí**, es la señal valiosa del plan: significa
que un fixture de `src/test/handlers.ts` o `src/test/fixtures/` **no casa con el
contrato declarado**. Lee el error de Zod, que nombra el campo. Entonces:

- Si el fixture está mal → arréglalo, es deriva de mock.
- Si el schema está mal respecto a `contract.ts` → arregla el schema.
- **Si `contract.ts` está mal respecto al backend real** → PARA y reporta. No
  relajes el schema con `.optional()` o `.passthrough()` para que pase: eso
  reintroduce exactamente el problema que este plan existe para cerrar.

## Test plan

- `src/api/schemas.test.ts` (paso 2) — 4 tests: caso feliz, listado sin
  `contenido`, mensaje de error útil, item con tipo equivocado.
- Los tests existentes de los cuatro hooks migrados **deben seguir pasando sin
  modificarlos**. Si uno necesita cambios, es porque su fixture miente: arregla
  el fixture, no el test.
- No hace falta test nuevo por hook: el schema es declarativo y los tests de
  `getValidado` ya cubren el mecanismo.

## Done criteria

- [ ] `pnpm run verify` exit 0, con **≥201 tests** (197 + los 4 nuevos)
- [ ] `pnpm run e2e` exit 0 (20 passed) — la validación no rompe las capturas
- [ ] `grep -c "getValidado" src/features/` → **4**
- [ ] `grep -n "PROBLEM_TYPES" src/api/problem.ts` sigue mostrando 16 entradas y
      `src/api/problem.test.ts` sigue afirmando `toHaveLength(16)`
- [ ] `git diff --stat` no toca `src/api/contract.ts`, `src/api/client.ts`,
      `src/api/problem.ts`, ni ningún archivo bajo `pages/` o `components/`
- [ ] `grep -rn "passthrough\|z.any()" src/api/schemas.ts` → sin resultados
- [ ] Línea `Status:` actualizada **en este archivo**, no en `plans/README.md`

## STOP conditions

Para y reporta si:

- **Un test existente falla y la causa es que `contract.ts` no describe lo que
  el backend manda de verdad.** Es un defecto de contrato: merece su propio
  plan, y taparlo relajando el schema anula este.
- **Necesitas `.passthrough()`, `.any()` o `.optional()` en un campo que
  `contract.ts` declara obligatorio** para que algo pase. Es la misma señal.
- **`getValidado` obliga a cambiar la firma de un hook** o a tocar un componente:
  el alcance de este plan es el seam y los hooks, no las pantallas.
- **La validación aparece en un perfil como coste medible** en listados grandes.
  No lo asumas ni optimices por si acaso; si lo mides, repórtalo.
- El repositorio tiene Zod v4 en vez de v3.25 (`grep '"zod"' package.json`): la
  API de `safeParse` y `z.infer` es compatible, pero `error.issues` y los
  mensajes cambian, y los tests del paso 2 asertan sobre el detalle.

## Maintenance notes

- **La regla que hay que sostener**: si un hook nuevo lee un listado, usa
  `getValidado` con `paginaDe(...)`. Un `get<Page<X>>` nuevo es deuda.
- **Este plan es deliberadamente parcial.** Cubre 4 de ~40 endpoints de lectura.
  Ampliar es barato (un schema + una línea por hook), pero no lo hagas de golpe:
  el valor está concentrado en los listados, y `contract.ts` sigue siendo la
  fuente de tipos para el resto.
- **Cuando el backend publique OpenAPI** (`/q/openapi`, ver `src/api/README.md`),
  el paso 3 es lo que se tira: los schemas de item los sustituye el generador.
  `getValidado`, `paginaDe` y `errorDeRespuesta` sobreviven — son la capa de
  runtime que un generador de tipos no da.
- **Cuidado con el orden de los interceptores**: `normalizarPaginado`
  (`client.ts:33`) transforma `{items, total}` en `{contenido, totalElementos}`
  antes de que tu schema lo vea. Si algún día se quita ese interceptor, todos
  los `paginaDe` empiezan a fallar a la vez — y ese fallo, ahora, será legible.
