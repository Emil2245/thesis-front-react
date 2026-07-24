# 003 — Testing harness: Vitest + RTL + MSW + Playwright + axe

- **Status:** TODO
- **Written against:** repo state after plans 001–002. Spec repo `/home/etverkade/workspace/thesis-docs` at commit `d7508eb`.
- **Depends on:** 001 (scripts), 002 (types + client to mock and to test).
- **Blocks:** the *verification* steps of 005–014, and plan 015 (E2E suite + CI).
- **Covers:** `../thesis-docs/plan/quality/01-testing-libraries.md` Part B, and the UI rows of `08-codebase-design.md §9` ("Superficies de test").

---

## 1. Why this matters

Plan 001 wrote `npm test` and `npm run e2e` into `package.json`; both currently fail because nothing is installed. Every feature plan (005–014) ends with "run `npm run verify`", which includes `npm test`. Until this plan lands, no feature plan can be verified.

Beyond mechanics, the spec assigns specific responsibilities to the frontend test suites (`08-codebase-design.md §9`):

| Seam | Suite | Cases |
|---|---|---|
| UI (hook / página) | Vitest + RTL + MSW | estados de S-xx; TC-P44-01 |
| Flujos completos | e2e (Playwright) | TC-P05-03 · TC-P06-04 · TC-P21-04 · TC-P35-01 · TC-P43-* |

And `quality/01 §B2` adds a rule worth obeying literally: *"Reuse the shipped Zod schemas in form tests (no test-only duplicate) so the RNF-09 ranges are asserted once."*

RNF-09 ranges (`../thesis-docs/res/docs/requirements/v1.1-non-functional-requirements.md §9`) — these are the numbers form tests will assert against, throughout the app:

| Restricción | Rango |
|---|---|
| % Herramienta Menor | 0 – 20 % |
| % Costos Indirectos | 0 – 100 % |
| % Descuento al CD | 0 – 50 % |
| IVA | 0 – 30 % |
| Precios / tarifas / costos de insumos | decimales > 0 |
| Rendimientos | decimales > 0 |
| Cantidades (APU y presupuesto) | decimales > 0, admiten fracciones (0.10) |

## 2. Files in scope

- `vitest.config.ts`, `playwright.config.ts` (create)
- `src/test/**` (create: setup, MSW server, handlers, render helper)
- `e2e/**` (create: Playwright specs directory + first smoke spec)
- `src/api/problem.test.ts`, `src/api/client.test.ts` (create — the first real tests)
- `package.json` (edit — devDependencies only)

**Out of scope:** any `src/features/**` file. **Never edit `plans/`** except this file's `Status:` line and `plans/README.md`'s table. **Never write to `../thesis-docs`.**

## 3. Steps

### Step 1 — Install

```bash
npm install -D vitest @vitest/coverage-v8 jsdom \
  @testing-library/react @testing-library/user-event @testing-library/jest-dom \
  msw @playwright/test @axe-core/playwright
npx playwright install --with-deps chromium
```

`quality/01 §B5` picks the **v8** coverage provider (not istanbul). `§B4` picks Playwright over Cypress. Do not substitute.

**Verify:** `npx vitest --version` and `npx playwright --version` both print a version.

### Step 2 — Vitest config

Create `vitest.config.ts`:

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    // Los e2e de Playwright viven en e2e/ y NO los corre Vitest.
    exclude: ["node_modules/**", "dist/**", "e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      exclude: ["src/components/ui/**", "src/test/**", "**/*.d.ts", "e2e/**"],
    },
  },
});
```

`src/components/ui/**` is excluded from coverage on purpose: those files are shadcn-generated code we own but did not write, and `02-shadcn-components.md §0` says they are copied in verbatim. Testing them tests Radix.

**Verify:** `npm test` runs and reports "no test files found" (exit code may be non-zero for no-tests; that is fine at this step, it becomes 0 after Step 6).

### Step 3 — Test setup

Create `src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());
```

`onUnhandledRequest: "error"` is deliberate: a component that calls an endpoint nobody mocked should fail loudly, not silently hang. That is how DTO/URL drift gets caught.

### Step 4 — MSW server and typed handlers

Create `src/test/server.ts`:

```ts
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
```

Create `src/test/handlers.ts`. Handlers are **typed from `src/api/contract.ts`** (`quality/01 §B6`: *"Drive its handlers from generated types so mocks can't drift from the real contract"*):

```ts
import { http, HttpResponse } from "msw";
import type { ApuResponse, Page, ProyectoResponse } from "@/api/contract";
import type { Problem } from "@/api/problem";

const API = "*/api/v1";

/** Helper: respuesta de error con el shape problem+json (architecture/07 §1). */
export const problema = (
  status: number,
  type: string,
  title: string,
  extra: Partial<Problem> = {},
) =>
  HttpResponse.json<Problem>(
    { type: `/problemas/${type}`, title, status, ...extra },
    { status, headers: { "Content-Type": "application/problem+json" } },
  );

/** Helper: envoltura de paginación (architecture/07 §1). */
export const pagina = <T>(contenido: T[]): Page<T> => ({
  contenido,
  page: 0,
  size: 25,
  totalElementos: contenido.length,
  totalPaginas: 1,
});

export const handlers = [
  http.get(`${API}/proyectos`, () => HttpResponse.json(pagina<ProyectoResponse>([]))),
];
```

Each feature plan (005–014) **adds its own handlers to this file** and its own fixtures. Keep fixtures in `src/test/fixtures/` — one file per module — so handlers stay readable.

Create `src/test/fixtures/.gitkeep`.

### Step 5 — Render helper

Every screen needs a QueryClientProvider and a router. Create `src/test/render.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement, ReactNode } from "react";

/** QueryClient limpio por test: sin reintentos ni caché entre casos. */
export function crearQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function renderConProviders(
  ui: ReactElement,
  { ruta = "/", ...options }: RenderOptions & { ruta?: string } = {},
) {
  const client = crearQueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[ruta]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return {
    user: userEvent.setup(),
    client,
    ...render(ui, { wrapper: Wrapper, ...options }),
  };
}
```

**Convention for every later plan:** screens are tested through `renderConProviders`, queried by **accessible role/label** (`getByRole("button", { name: /guardar/i })`), never by test-id or class. That is RTL's philosophy and `quality/01 §B2` picked RTL for exactly that reason. Since the UI is Spanish, queries are Spanish.

### Step 6 — First real tests (against plan 002's module)

Plan 002 §6 specified these; write them now.

`src/api/problem.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ApiError, PROBLEM_TYPES } from "./problem";

describe("ApiError", () => {
  it("expone el slug sin el prefijo /problemas/", () => {
    const e = new ApiError(
      { type: "/problemas/insumo-en-uso", title: "En uso", status: 409 },
      409,
    );
    expect(e.slug).toBe("insumo-en-uso");
    expect(e.is("insumo-en-uso")).toBe(true);
    expect(e.is("codigo-duplicado")).toBe(false);
  });

  it("devuelve [] cuando no hay errores de campo", () => {
    const e = new ApiError({ type: "/problemas/no-encontrado", title: "x", status: 404 }, 404);
    expect(e.camposConError).toEqual([]);
  });

  it("expone los errores de campo de /problemas/validacion", () => {
    const e = new ApiError(
      {
        type: "/problemas/validacion",
        title: "Datos inválidos",
        status: 400,
        errores: [{ campo: "porcentaje", mensaje: "Debe estar entre 0 % y 50 %" }],
      },
      400,
    );
    expect(e.camposConError).toHaveLength(1);
    expect(e.camposConError[0].campo).toBe("porcentaje");
  });

  it("el catálogo de types coincide con architecture/07 §1", () => {
    expect(PROBLEM_TYPES).toHaveLength(16);
  });
});
```

`src/api/client.test.ts` — the refresh behaviour:

```ts
import { http as mswHttp, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { server } from "@/test/server";
import { get } from "./request";
import {
  setAccessToken,
  setOnSesionExpirada,
  setRefrescador,
} from "./client";

afterEach(() => {
  setAccessToken(null);
  setRefrescador(null);
  setOnSesionExpirada(null);
});

describe("interceptor de 401", () => {
  it("refresca una vez y reintenta la petición original", async () => {
    let llamadas = 0;
    server.use(
      mswHttp.get("*/api/v1/perfil", () => {
        llamadas += 1;
        if (llamadas === 1) {
          return HttpResponse.json(
            { type: "/problemas/token-invalido-o-expirado", title: "x", status: 401 },
            { status: 401 },
          );
        }
        return HttpResponse.json({ id: 1, nombre: "Ana" });
      }),
    );
    const refrescar = vi.fn().mockResolvedValue("token-nuevo");
    setRefrescador(refrescar);

    await expect(get("/perfil")).resolves.toMatchObject({ id: 1 });
    expect(refrescar).toHaveBeenCalledTimes(1);
    expect(llamadas).toBe(2);
  });

  it("avisa de sesión expirada cuando el refresh falla", async () => {
    server.use(
      mswHttp.get("*/api/v1/perfil", () =>
        HttpResponse.json(
          { type: "/problemas/token-invalido-o-expirado", title: "x", status: 401 },
          { status: 401 },
        ),
      ),
    );
    setRefrescador(vi.fn().mockResolvedValue(null));
    const expirada = vi.fn();
    setOnSesionExpirada(expirada);

    await expect(get("/perfil")).rejects.toThrow();
    expect(expirada).toHaveBeenCalledTimes(1);
  });
});
```

**Verify:** `npm test` exits 0 with 5+ passing tests.

### Step 7 — Playwright config

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["html"], ["github"]] : [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    trace: "on-first-retry",
    video: "retain-on-failure",
    locale: "es-EC",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
  },
});
```

`trace`/`video` are on for failures on purpose — `quality/01 §B4` calls them *"useful thesis evidence"*.

`locale: "es-EC"` matters: the app formats numbers and currency with that locale (plan 004), and an E2E asserting `"1.234,56"` will fail under a different locale.

### Step 8 — Smoke E2E

Create `e2e/smoke.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("la aplicación carga", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Sistema APU/i);
});
```

**Verify:** `npm run e2e` passes. (If the app root currently renders Vite's default page, adjust the assertion to whatever plan 001 set as the title — it set `Sistema APU`.)

### Step 9 — Accessibility helper

`quality/01 §B7`: axe scan on key screens, no critical violations. Create `e2e/axe.ts`:

```ts
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/** Escanea la página y falla si hay violaciones serias o críticas. */
export async function sinViolacionesA11y(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  const graves = violations.filter((v) => v.impact === "critical" || v.impact === "serious");
  expect(
    graves,
    `Violaciones a11y:\n${graves.map((v) => `- ${v.id}: ${v.help}`).join("\n")}`,
  ).toEqual([]);
}
```

Plan 015 applies this to the N-priority screens.

### Step 10 — Document the conventions

Create `src/test/README.md`:

```markdown
# Convenciones de test (frontend)

Fuente: thesis-docs/plan/quality/01-testing-libraries.md Parte B ·
architecture/08-codebase-design.md §9.

- **Unit/componente:** Vitest + React Testing Library + user-event. Consulta por
  rol/etiqueta accesible en español (`getByRole("button", { name: /guardar/i })`).
  Nunca por test-id ni por clase.
- **Red:** siempre MSW. `onUnhandledRequest: "error"` — si un test falla por una
  petición no mockeada, el defecto es la URL o el handler, no el test.
- **Handlers tipados** desde `src/api/contract.ts`. Un mock que no compila es
  deriva de contrato detectada.
- **Zod:** los tests de formulario importan el schema real del módulo. Nunca se
  duplica un schema en un test (los rangos RNF-09 se afirman una sola vez).
- **No se testea "por dentro" de un módulo profundo** (architecture/08 §9): el
  editor de APU se prueba por su hook `useApuEditor`, no por sus internos.
- **E2E (Playwright):** solo los flujos que cruzan pantallas —
  TC-P05-03, TC-P06-04, TC-P21-04, TC-P35-01, TC-P43-01/02, TC-P44-01.
  Todo lo demás es más barato y más estable como test de componente.
```

### Step 11 — Commit

```bash
npm run verify
git add -A && git commit -m "test: vitest + RTL + MSW + playwright harness"
```

## 4. Done criteria (machine-checkable)

| Command | Expected |
|---|---|
| `npm test` | exit 0, ≥ 5 tests passing |
| `npm run test:coverage` | exit 0, writes `coverage/` |
| `npm run e2e` | exit 0, smoke spec passes |
| `npm run verify` | exit 0 **(this is the first time the full gate can pass)** |
| `test -f src/test/setup.ts src/test/server.ts src/test/handlers.ts src/test/render.tsx` | exit 0 |
| `grep -q 'onUnhandledRequest: "error"' src/test/setup.ts` | exit 0 |
| `grep -q '"es-EC"' playwright.config.ts` | exit 0 |

## 5. Test plan

The tests in Step 6 *are* this plan's test plan — they exercise plan 002's error model and refresh interceptor, which are the two pieces of infrastructure most likely to be subtly wrong.

Deliberately **not** covered here (later plans own them): form-schema tests (each feature plan), screen state tests (each feature plan), full-flow E2E (plan 015).

## 6. Boundaries

- **Do not** write tests for feature modules — they do not exist yet. If you find yourself creating `src/features/…/*.test.tsx`, you have left this plan's scope.
- **Do not** add Jest, ts-jest, Babel, Enzyme, or Cypress. All four are explicitly rejected in `quality/01 §B1/§B2/§B4`.
- **Do not** add Chromatic or any paid visual-testing SaaS (`quality/01 §B7` rejects it on budget grounds).
- **Do not** lower `onUnhandledRequest` to `"warn"` or `"bypass"` to make a test pass. If a test hits an unmocked endpoint, add the handler.
- **Do not** set a global coverage threshold yet — `quality/01 §D.5` lists thresholds as an *open decision*. Report only.

## 7. Escape hatches

- If MSW v2's API differs from the `http`/`HttpResponse` style above (v1 used `rest`/`res(ctx…)`), follow the installed version's docs and keep the same behaviour. **Do not** downgrade MSW to match this snippet.
- If `npx playwright install` cannot download browsers (offline/sandboxed CI), install chromium only and record the limitation; if it fails entirely, **STOP and report** — plan 015 depends on Playwright working.
- If jsdom cannot handle something a screen needs later (e.g. `ResizeObserver` for the Gantt), add a targeted polyfill to `src/test/setup.ts` when that plan needs it — don't pre-emptively stub things now.

## 8. Maintenance note

`src/test/handlers.ts` grows with every feature plan and will become the most-edited file in the repo. Watch two failure modes in review: (a) a handler drifting from `contract.ts` because someone typed a literal object instead of annotating it, and (b) handlers with baked-in state shared between tests. Prefer `server.use(...)` per test for anything stateful over mutating the base handler list.
