# 002 — The API seam: DTO types, HTTP client, error mapping, TanStack Query layer

- **Status:** DONE
- **Written against:** repo state after plan 001. Spec repo `/home/etverkade/workspace/thesis-docs` at commit `d7508eb`.
- **Depends on:** 001 (scaffold + verification baseline).
- **Blocks:** 005–014 (every feature module).
- **Covers:** the seam `../thesis-docs/plan/architecture/08-codebase-design.md §8` calls *"la costura única con el backend"*.

---

## 1. Why this matters

`08-codebase-design.md §8` states the frontend has exactly one seam with the backend, and `../thesis-docs/plan/quality/01-testing-libraries.md §B6` makes DTO drift a **compile error** by generating TypeScript types from the backend's OpenAPI document. Everything downstream — every screen, every MSW mock, every form — depends on those types existing and being right.

Two facts make this plan harder than "run openapi-typescript":

1. **The backend does not exist yet.** The Quarkus API (`../thesis-docs/plan/backend/01-quarkus-backend.md`) is a separate repository, and in the XP schedule (`../thesis-docs/plan/roadmap/01-plan-iteraciones-xp.md`) most endpoints land in iterations I-03 through I-11. There is no `/q/openapi` to generate from today. §4 Step 1 resolves this with a hand-written contract module that the generator later **replaces**.
2. **Money and percentages are decimal strings, not numbers.** `../thesis-docs/plan/architecture/07-api-contract.md §1` (DTOs bullet): *"Dinero/porcentajes como string decimal (`"61.390000"`) para no perder precisión en JS."* The database is `NUMERIC(14,6)` and the engine is `BigDecimal` (RNF-01, 0% deviation is a thesis variable). If any part of this client does `parseFloat` on a money field and sends it back, the thesis's headline metric breaks. The type system must make that hard.

## 2. Current state

After plan 001 the repo has an empty `src/api/` directory, path alias `@/`, `src/lib/env.ts` exporting `API_BASE_URL`, and no HTTP or state libraries installed.

## 3. Files in scope

- `src/api/**` (create)
- `src/lib/decimal.ts` (create — type only; *formatting* belongs to plan 004)
- `src/main.tsx` (edit — mount the QueryClientProvider)
- `package.json` (edit — dependencies and a `gen:api` script)

**Out of scope:** any `src/features/**` file, any component, any route. This plan ships infrastructure only. **Never edit `plans/`** except this file's `Status:` and the table in `plans/README.md`. **Never write to `../thesis-docs`.**

## 4. Steps

### Step 1 — Install dependencies

```bash
npm install @tanstack/react-query axios zustand react-router-dom
npm install -D openapi-typescript
```

**Verify:** `npm ls @tanstack/react-query axios zustand react-router-dom` resolves all four; `npm run typecheck` exits 0.

### Step 2 — The decimal string convention

Create `src/lib/decimal.ts`:

```ts
/**
 * Un valor monetario o porcentual tal como viaja por la API: string decimal
 * con hasta 6 decimales (NUMERIC(14,6) en la base, BigDecimal en el motor).
 *
 * NUNCA convertir a `number` para hacer aritmética: la exactitud de cálculo
 * (0 % de desviación) es una variable dependiente de la tesis y el cliente no
 * calcula — el servidor manda (ADR 9, architecture/08 §8).
 *
 * Contrato: architecture/07-api-contract.md §1.
 */
export type Decimal = string & { readonly __brand: "Decimal" };

/** Marca un string como Decimal. Úsalo solo en el borde (parseo de respuestas). */
export const asDecimal = (v: string): Decimal => v as Decimal;

/** Cero canónico, para inicializar formularios. */
export const DECIMAL_ZERO = asDecimal("0.000000");
```

The brand is what stops a weak caller from passing a `Decimal` where a `number` is expected, or doing `dto.costoTotal * 2` (branded strings fail arithmetic typechecking under `strict`).

**Verify:** add a temporary file with `const x: number = asDecimal("1") as unknown as number;` — no; instead verify by writing this test in plan 003's harness. For now: `npm run typecheck` exits 0.

### Step 3 — Hand-written DTO contract (the bridge until the backend exists)

Create `src/api/contract.ts`. Transcribe the DTO catalog from `../thesis-docs/plan/architecture/07-api-contract.md §11 (Apéndice B)` into TypeScript. Every money/percentage field is `Decimal`, every `?` in the appendix is `| null` or optional.

**Read that appendix in full before writing.** It is ~150 lines of JSONC covering six groups: Autenticación y cuenta · Proyectos, firmantes y parámetros · Insumos y bases · APU y plantillas · Presupuesto y versiones · Cronograma · Super-Admin.

Start it like this and continue through **every** DTO in the appendix:

```ts
import type { Decimal } from "@/lib/decimal";

// ————— Autenticación y cuenta (§11) —————

export type Rol = "USUARIO" | "SUPER_ADMIN";

export interface UsuarioResponse {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  emailVerificado: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
  recordarSesion: boolean;
}

export interface TokenResponse {
  accessToken: string;
  expiraEnSegundos: number;
  refreshToken?: string;
  usuario: UsuarioResponse;
}

// ————— APU (§11) —————

export type SeccionTipo = "EQUIPO" | "MANO_OBRA" | "MATERIAL" | "TRANSPORTE";

export interface ApuDetalleResponse {
  id: number;
  orden: number;
  descripcion: string;
  esHerramientaMenor: boolean;
  insumoId?: number | null;
  apuAuxiliarId?: number | null;
  cantidad?: Decimal | null;
  rendimiento?: Decimal | null;
  unidad?: string | null;
  precioEfectivo: Decimal;
  precioHeredado: boolean;
  costoHora?: Decimal | null;
  costo: Decimal;
}

export interface ApuResponse {
  id: number;
  codigo: string;
  descripcion: string;
  unidad: string;
  esAuxiliar: boolean;
  costoDirecto: Decimal;
  costoTotal: Decimal;
  vinculado: boolean;
  porcentajeIndirecto?: Decimal | null;
  porcentajeIndirectoEfectivo: Decimal;
  porcentajeDescuento: Decimal;
  cdAjustado: Decimal;
  costoIndirecto: Decimal;
  secciones: Array<{
    tipo: SeccionTipo;
    orden: number;
    subtotal: Decimal;
    detalles: ApuDetalleResponse[];
  }>;
}

// … continue for every DTO in Apéndice B …
```

Also transcribe the paginated envelope from §1:

```ts
export interface Page<T> {
  contenido: T[];
  page: number;
  size: number;
  totalElementos: number;
  totalPaginas: number;
}
```

**Verify:** `npm run typecheck` exits 0, and every DTO name in Apéndice B appears in `contract.ts`:

```bash
grep -oE '^[A-Z][A-Za-z]+(Request|Response)' ../thesis-docs/plan/architecture/07-api-contract.md \
  | sort -u > /tmp/dtos.txt
while read d; do grep -q "interface $d\|type $d" src/api/contract.ts || echo "FALTA: $d"; done < /tmp/dtos.txt
```

Expected output: nothing. Any `FALTA:` line is a defect — fix it before moving on.

### Step 4 — problem+json error model

`07-api-contract.md §1` fixes the error shape (RFC 7807) and a closed catalogue of `type` slugs. Create `src/api/problem.ts`:

```ts
/** RFC 7807 — contrato de errores, architecture/07 §1. */
export interface Problem {
  type: string;      // p.ej. "/problemas/insumo-en-uso"
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  /** Solo en /problemas/validacion */
  errores?: Array<{ campo: string; mensaje: string }>;
  /** Campos extra según el type (p.ej. `usos` en insumo-en-uso). */
  [k: string]: unknown;
}

/** Catálogo cerrado de `type` (slug relativo), architecture/07 §1. */
export const PROBLEM_TYPES = [
  "validacion",
  "credenciales-invalidas",
  "email-no-verificado",
  "cuenta-desactivada",
  "token-invalido-o-expirado",
  "cooldown-activo",
  "codigo-duplicado",
  "insumo-en-uso",
  "apu-referenciado",
  "version-vigente-protegida",
  "reduccion-periodos-requiere-confirmacion",
  "export-bloqueado",
  "csv-invalido",
  "flag-auxiliar-bloqueado",
  "fila-protegida",
  "no-encontrado",
] as const;

export type ProblemType = (typeof PROBLEM_TYPES)[number];

export class ApiError extends Error {
  constructor(
    readonly problem: Problem,
    readonly status: number,
  ) {
    super(problem.title);
    this.name = "ApiError";
  }
  /** Slug sin el prefijo "/problemas/". */
  get slug(): string {
    return this.problem.type.replace(/^\/problemas\//, "");
  }
  is(t: ProblemType): boolean {
    return this.slug === t;
  }
  /** Errores por campo, listos para RHF setError (plan 006 los consume). */
  get camposConError(): Array<{ campo: string; mensaje: string }> {
    return this.problem.errores ?? [];
  }
}

/** Fallback cuando el backend no devolvió problem+json (red caída, 502 de proxy…). */
export function problemDesconocido(status: number, detail?: string): Problem {
  return {
    type: "/problemas/no-encontrado",
    title: "Ocurrió un error inesperado",
    status,
    detail,
  };
}
```

**Verify:** `npm run typecheck` exits 0.

### Step 5 — Axios instance with JWT + refresh

`07-api-contract.md §1` (Auth) and decision D-02 (`../thesis-docs/plan/design/03-procesos-detalle.md §J`): access JWT lives 60 min; a refresh token lives 30 days when the user ticked "recordar sesión", otherwise for the browser session.

Create `src/api/client.ts`:

```ts
import axios, { AxiosError } from "axios";
import { API_BASE_URL } from "@/lib/env";
import { ApiError, problemDesconocido, type Problem } from "./problem";

export const http = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// — token store —
// El access token vive solo en memoria (no localStorage: reduce la superficie
// XSS, RNF-05). El refresh token lo persiste el módulo auth (plan 005), que es
// quien conoce "recordar sesión" (D-02).
let accessToken: string | null = null;
export const setAccessToken = (t: string | null) => { accessToken = t; };
export const getAccessToken = () => accessToken;

/** Lo instala el módulo auth (plan 005). Devuelve el nuevo access token o null. */
let refrescar: (() => Promise<string | null>) | null = null;
export const setRefrescador = (f: typeof refrescar) => { refrescar = f; };

/** Lo instala el shell (plan 006): qué hacer cuando la sesión murió del todo. */
let onSesionExpirada: (() => void) | null = null;
export const setOnSesionExpirada = (f: typeof onSesionExpirada) => { onSesionExpirada = f; };

http.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

http.interceptors.response.use(
  (r) => r,
  async (error: AxiosError<Problem>) => {
    const original = error.config as (typeof error.config & { _reintentado?: boolean });
    const status = error.response?.status ?? 0;

    // 401 → un único intento de refresh, y solo si no es el propio /auth/refresh
    if (
      status === 401 &&
      original &&
      !original._reintentado &&
      !original.url?.includes("/auth/")
    ) {
      original._reintentado = true;
      const nuevo = refrescar ? await refrescar() : null;
      if (nuevo) {
        setAccessToken(nuevo);
        return http(original);
      }
      onSesionExpirada?.();
    }

    const problem = error.response?.data ?? problemDesconocido(status, error.message);
    throw new ApiError(problem, status);
  },
);
```

Note what this does **not** do: it does not retry beyond once, it does not queue concurrent 401s into a single refresh. That is deliberate simplicity for a thesis-scale app; if you observe a refresh storm in plan 015's E2E run, report it rather than adding a mutex here on your own initiative.

**Verify:** `npm run typecheck` exits 0.

### Step 6 — TanStack Query setup and the query-key registry

`08-codebase-design.md §8`: *"Estado de servidor solo en TanStack Query (una clave por read model: árbol de presupuesto completo, APU, cronograma)"*. And `07-api-contract.md §6`: budget mutations return the whole recalculated `PresupuestoResponse` — *"una sola cache key de TanStack Query en el cliente"*.

That is a design instruction, not a suggestion: do **not** create fine-grained keys per capítulo or per rubro. One key for the whole tree; mutations write the returned response straight into it with `setQueryData`.

Create `src/api/queryKeys.ts` — the single registry (never inline a key array at a call site):

```ts
export const qk = {
  perfil: () => ["perfil"] as const,

  proyectos: (filtros?: Record<string, unknown>) => ["proyectos", filtros ?? {}] as const,
  proyecto: (id: number) => ["proyecto", id] as const,
  parametrosProyecto: (id: number) => ["proyecto", id, "parametros"] as const,
  firmantes: (id: number) => ["proyecto", id, "firmantes"] as const,

  insumos: (proyectoId: number, filtros?: Record<string, unknown>) =>
    ["proyecto", proyectoId, "insumos", filtros ?? {}] as const,
  insumoUso: (proyectoId: number, insumoId: number) =>
    ["proyecto", proyectoId, "insumos", insumoId, "uso"] as const,
  basesCentrales: () => ["bases-centrales"] as const,

  apus: (presupuestoId: number, filtros?: Record<string, unknown>) =>
    ["presupuesto", presupuestoId, "apus", filtros ?? {}] as const,
  apu: (apuId: number) => ["apu", apuId] as const,
  apuCalculo: (apuId: number) => ["apu", apuId, "calculo"] as const,
  plantillas: (filtros?: Record<string, unknown>) => ["plantillas-apu", filtros ?? {}] as const,

  /** El árbol completo. Read model único de la jerarquía (07 §6). */
  presupuesto: (presupuestoId: number) => ["presupuesto", presupuestoId] as const,
  presupuestoResumen: (id: number) => ["presupuesto", id, "resumen"] as const,
  presupuestoValidacion: (id: number) => ["presupuesto", id, "validacion"] as const,
  versiones: (proyectoId: number) => ["proyecto", proyectoId, "presupuestos"] as const,

  cronograma: (presupuestoId: number) => ["presupuesto", presupuestoId, "cronograma"] as const,

  adminUsuarios: (f?: Record<string, unknown>) => ["admin", "usuarios", f ?? {}] as const,
  adminBases: (f?: Record<string, unknown>) => ["admin", "bases", f ?? {}] as const,
  adminPlantillas: () => ["admin", "plantillas"] as const,
  adminParametros: () => ["admin", "parametros-sistema"] as const,
  adminValores: () => ["admin", "valores-referencia"] as const,
  adminLogs: (f?: Record<string, unknown>) => ["admin", "logs", f ?? {}] as const,
} as const;
```

Create `src/api/queryClient.ts`:

```ts
import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./problem";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (intentos, error) => {
        // No reintentar errores de negocio ni de auth: son deterministas.
        if (error instanceof ApiError && error.status < 500) return false;
        return intentos < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});
```

Mount it in `src/main.tsx`:

```tsx
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/api/queryClient";
// …
<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

**Verify:** `npm run build` exits 0 and the app still renders in `npm run dev`.

### Step 7 — Typed request helpers

Create `src/api/request.ts`. Thin wrappers so feature hooks never touch axios directly:

```ts
import { http } from "./client";

export const get = async <T>(url: string, params?: unknown): Promise<T> =>
  (await http.get<T>(url, { params })).data;

export const post = async <T>(url: string, body?: unknown): Promise<T> =>
  (await http.post<T>(url, body)).data;

export const put = async <T>(url: string, body?: unknown): Promise<T> =>
  (await http.put<T>(url, body)).data;

export const patch = async <T>(url: string, body?: unknown): Promise<T> =>
  (await http.patch<T>(url, body)).data;

export const del = async <T = void>(url: string): Promise<T> =>
  (await http.delete<T>(url)).data;

/** Descarga un adjunto (export de documentos, P-37). */
export const descargar = async (url: string, params?: unknown): Promise<Blob> =>
  (await http.get(url, { params, responseType: "blob" })).data;
```

**PATCH semantics — inline this comment above `patch`,** it is load-bearing (`07-api-contract.md §1`, PATCH policy):

```
En PATCH: omitir un campo = no tocarlo; enviarlo `null` = limpiar/heredar
(null-means-inherit, DM §8/§17 #17). Por eso los callers deben construir el
body explícitamente y NUNCA usar un spread que elimine claves con valor null.
```

**Verify:** `npm run typecheck` exits 0.

### Step 8 — Wire the generator for later

Add to `package.json`:

```jsonc
"gen:api": "openapi-typescript ${OPENAPI_URL:-http://localhost:8080/q/openapi} -o src/api/schema.d.ts"
```

Create `src/api/README.md` explaining the migration path — this is the note that keeps the seam honest:

```markdown
# Seam con el backend

`contract.ts` está **escrito a mano** desde `thesis-docs/plan/architecture/07-api-contract.md`
§11 (Apéndice B) porque el backend Quarkus todavía no expone OpenAPI.

Cuando el backend publique `/q/openapi`:
1. `OPENAPI_URL=<url> npm run gen:api` → genera `src/api/schema.d.ts`.
2. Reescribe `contract.ts` para re-exportar desde `schema.d.ts`
   (`export type ApuResponse = components["schemas"]["ApuResponse"]`), manteniendo
   `Decimal` donde el generador diga `string` en campos de dinero/porcentaje.
3. Cualquier discrepancia entre lo generado y lo escrito a mano es un **defecto de
   contrato**: repórtalo, no lo parchees en el cliente.

Regla: este directorio es la ÚNICA costura con el backend (architecture/08 §8).
Ningún archivo bajo `src/features/**` importa axios ni construye una URL.
```

**Verify:** `test -f src/api/README.md` exits 0.

### Step 9 — Commit

```bash
npm run typecheck && npm run lint && npm run format:check && npm run build
git add -A && git commit -m "feat(api): DTO contract, problem+json errors, axios client, query layer"
```

## 5. Done criteria (machine-checkable)

| Command | Expected |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `npm run build` | exit 0 |
| the `FALTA:` loop in Step 3 | no output |
| `grep -rn "from \"axios\"" src/features \| wc -l` | `0` |
| `grep -c "PROBLEM_TYPES" src/api/problem.ts` | ≥ 1, and the array has exactly 16 entries |
| `test -f src/api/queryKeys.ts src/api/client.ts src/api/contract.ts src/api/problem.ts` | exit 0 |

## 6. Test plan

No tests here — the test harness arrives in plan 003, and it is 003's job to write the first tests **against this module**:

- `src/api/problem.test.ts` — `ApiError.slug` strips the prefix; `.is("insumo-en-uso")` matches; `camposConError` returns `[]` when absent.
- `src/api/client.test.ts` — with MSW: a 401 triggers exactly one refresh attempt and replays the original request; a second 401 calls `onSesionExpirada` once.

Write those file names into plan 003's step list when you get there (plan 003 already lists them).

## 7. Boundaries

- **Do not** create any file under `src/features/**`, `src/shell/**`, or `src/routes/**`.
- **Do not** implement auth screens or the refresh call itself — plan 005 installs the `refrescar` function via `setRefrescador`. This plan only defines the socket.
- **Do not** put the access token in `localStorage` or a cookie. In memory only (RNF-05, minimal XSS surface). The refresh token's storage is plan 005's decision.
- **Do not** add react-query devtools to the production bundle (dev-only import if you add it at all).
- **Do not** implement any cost formula, rounding, or total. `ADR 9` (`08-codebase-design.md §8`): *"ninguna fórmula de §16 existe en TypeScript"*. Totals come from the server.

## 8. Escape hatches

- If `Apéndice B` contains a DTO whose field types you genuinely cannot infer (e.g. `snapshotSecciones: { /* JSONB DM §12 */ }`), type it as `unknown` and add a `// TODO(contrato): tipar cuando el backend publique OpenAPI` comment. Do **not** invent a shape.
- If the appendix and a §2–§9 endpoint table disagree about a field, **STOP and report the contradiction** — that is a spec defect the humans must fix in `thesis-docs`, not something to paper over.
- If a backend OpenAPI document *is* already available when you run this plan, do Step 8 first and skip the hand-written transcription in Step 3 — but keep `Decimal` on money fields, because the generator will emit plain `string`.

## 9. Maintenance note

The riskiest future change is someone "simplifying" a money field from `Decimal` to `number` to make a chart or a sort work. Watch for it in review. The correct fix for sorting/charting is to convert at the *display* boundary only (plan 004's helpers), never in state or in a request body.

The second risk is query-key sprawl. `07 §6` deliberately gives the budget tree one key so that mutations returning `PresupuestoResponse` can `setQueryData` once. If a later plan starts adding `["capitulo", id]` keys, the write-through totals will go stale in the UI.
