# 001 — Scaffold the Vite/React/TS app and establish a verification baseline

- **Status:** DONE
- **Written against:** `/home/etverkade/workspace/thesis-front-react` in a **partially-scaffolded state** (see §2). Spec repo `/home/etverkade/workspace/thesis-docs` at commit `d7508eb`.
- **Depends on:** nothing. **This plan must land before every other plan in `plans/`.**
- **Revision note (2026-07-23):** original plan assumed an empty directory and npm + ESLint. The repo was found already scaffolded with **pnpm + oxlint** (verified by advisor). User confirmed: **keep pnpm + oxlint**. Plan re-derived from that state; the change propagates to every downstream plan's `verify` script name (`pnpm run verify` instead of `npm run verify`) — the advisor will update plans 002–015 in a follow-up pass.
- **Covers:** XP iteration I-01 (foundations), the frontend half of "esqueletos Quarkus + React desplegados con CI/CD".

---

## 1. Why this matters

The repository has a Vite scaffold but no verification command, no git history, no design-system foundation, and no feature-module structure. Every subsequent plan in `plans/` ends with `pnpm run verify` — that script does not exist yet, so no plan can be verified until this one lands.

Beyond the mechanics, this is where the project's **conventions get frozen**. The spec repo (`../thesis-docs`) has already decided the stack; your job is to realise it exactly, record the resolved versions, and leave a `verify` gate that every future plan can rely on.

Domain context so the folder names make sense: this is a Spanish-language web app for Ecuadorian civil-works contractors. It builds three documents for public-procurement bids — **APU** (unit price analysis), **presupuesto** (budget), **cronograma** (schedule). Domain nouns stay in Spanish in code and UI (`insumo`, `rubro`, `apu`, `presupuesto`, `cronograma`, `capitulo`, `rendimiento`). Do not translate them.

## 2. Current state (verified 2026-07-23)

```
/home/etverkade/workspace/thesis-front-react/
  .agents/skills/               ← pre-existing, unrelated, DO NOT TOUCH
  .gitignore                    ← Vite default
  .oxlintrc.json                ← oxlint config (keep)
  index.html
  node_modules/                 ← already installed via pnpm
  package.json                  ← see below
  pnpm-lock.yaml                ← authoritative lockfile
  public/{favicon.svg,icons.svg}
  src/
    App.css · App.tsx · index.css · main.tsx
    assets/{hero.png,react.svg,vite.svg}
  tsconfig.json · tsconfig.app.json · tsconfig.node.json
  vite.config.ts
  plans/                        ← this plan and its siblings live here
  README.md                     ← boilerplate; you'll leave it or minimally touch it
```

Current `package.json` (relevant excerpt):

```jsonc
{
  "name": "vite-app",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "oxlint",
    "preview": "vite preview"
  },
  "dependencies": { "react": "^19.2.7", "react-dom": "^19.2.7" },
  "devDependencies": {
    "@types/node": "^24.13.2",
    "@types/react": "^19.2.17",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.3",
    "oxlint": "^1.71.0",
    "typescript": "~6.0.2",
    "vite": "^8.1.1"
  }
}
```

**Non-standard versions warning:** React `^19.2.7`, TypeScript `~6.0.2`, Vite `^8.1.1` are ahead of the mainline versions the advisor is aware of. They install cleanly (node_modules is populated), so treat them as valid but be alert: if a peer-dependency resolution for Tailwind or shadcn fails against these versions, **STOP and report** (§9) — do not silently downgrade React or TypeScript to make an install succeed.

**Git state:** the advisor will run `git init` + an initial commit of the pre-existing scaffold **before dispatching this plan**. When you (the executor) start, `git log --oneline` will show one commit. All work in this plan lands as subsequent commits.

**Plan 002 is already DONE** in the initial commit (see `plans/README.md` status column). Concretely, the initial commit contains:
- `src/api/{client,contract,problem,queryClient,queryKeys,request,README}.ts` — the API seam module
- `src/lib/decimal.ts` — the `Decimal` brand + `asDecimal` + `DECIMAL_ZERO` (plan 004 later *extends* this file with formatters; do not touch it here)
- `src/main.tsx` — already wraps `<App />` in `QueryClientProvider` from `@/api/queryClient`
- `vite.config.ts` and `tsconfig.app.json` — the `@/` path alias is already wired (verify in Step 4)
- `src/lib/env.ts` — **stub** (`export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";`). This is a *permissive* one-liner; §5 Step 9 replaces it with the strict guard that throws when the env var is missing. Do the replacement — a silent default in a prod build is a production incident waiting.
- 8 `pnpm add` deps from plan 002: `@tanstack/react-query`, `axios`, `zustand`, `react-router-dom`, `openapi-typescript`

Treat all of the above as **DO NOT MODIFY** unless a step in this plan tells you to (Step 9's env.ts replacement is the only exception).

## 3. The decided stack (do not deviate)

From `../thesis-docs/plan/frontend/01-react-libraries.md §9` and `../thesis-docs/plan/frontend/02-shadcn-components.md §0.1`:

```
Build:        React + Vite + TypeScript      (SPA — NOT Next.js, decision locked)
Routing:      React Router                    (installed later, plan 002)
UI:           shadcn/ui, Radix base, Tailwind v4
Data grids:   TanStack Table (via shadcn Data Table)
Gantt:        Kibo UI Gantt
Forms:        React Hook Form + Zod
Server state: TanStack Query
Client state: Zustand
HTTP:         Axios (JWT interceptor)
Icons:        lucide-react
Toasts:       sonner
CSV parse:    PapaParse
Testing:      Vitest + RTL + Playwright + MSW  (wired in plan 003)
```

**Package manager: pnpm** (existing lockfile is authoritative).
**Linter: oxlint** (existing config; keep and extend). Add **Prettier** separately as a formatter (they don't overlap).

### 3.1 Versions — read this carefully

`02-shadcn-components.md §0.1` pins exact versions researched in **June 2026**. Those pins may no longer resolve, and the doc's own policy is: *record the exact resolved versions in `package.json` + lockfile when the frontend is scaffolded* — which is what §7 below does.

**Install by major line, not by exact patch.** Use `shadcn@4`, `tailwindcss@4`, `zod@4`, `react-hook-form@7`, `@tanstack/react-table@8`, `@tanstack/react-query@5`. Let pnpm resolve the latest within the major, then record what you got.

**STOP and report back if** any of those major lines fails to resolve or the shadcn CLI refuses to init — do not silently downgrade to a different major. The whole component plan (`02-shadcn-components.md`) assumes shadcn CLI v4 + Tailwind v4 + the unified `radix-ui` package.

## 4. Files in scope

Everything under the repo root is in scope **except**:

- **Out of scope:** `plans/` — never edit any file under `plans/` other than updating the `Status:` line of this file (top).
- **Out of scope:** `.agents/skills/` — pre-existing, unrelated.
- **Out of scope:** `../thesis-docs` — read-only reference material.

## 5. Steps

Every step ends with a **Verify** command whose exit code determines whether you may proceed. Do not batch. If a Verify fails, STOP and report — do not improvise.

### Step 1 — Confirm the scaffold and record baseline

```bash
cd /home/etverkade/workspace/thesis-front-react
git log --oneline | head -3
pnpm --version
node --version
pnpm ls --depth=0
```

Expected: exactly one initial commit; pnpm version prints; node version prints; the dependency list matches §2's excerpt.

**Verify:** `pnpm run build` exits 0 (proves the scaffold as-is builds).

### Step 2 — Extend `.gitignore`

The current `.gitignore` covers Vite defaults. Append these lines (the empty line separates the sections cleanly):

```

# Testing (arrives in plan 003)
coverage
playwright-report
test-results

# Environment
.env.local
.env.*.local
```

Do **not** ignore `src/api/schema.d.ts` (generated but committed later — plan 002).

**Verify:** `grep -q "coverage" .gitignore && grep -q ".env.local" .gitignore` exits 0.

### Step 3 — Tailwind v4 + shadcn init

```bash
pnpm dlx shadcn@4 init
```

Answer the prompts: **Radix** base (decision locked in `02-shadcn-components.md §0.2` — Base UI is a documented fallback only), TypeScript yes, CSS variables yes. This writes `components.json`, wires Tailwind v4 into `src/index.css` (an `@import "tailwindcss"` line), and creates `src/lib/utils.ts` with the `cn()` helper.

**If shadcn's init auto-installs Tailwind's Vite plugin** (`@tailwindcss/vite`) into `vite.config.ts`, keep it — that's the officially supported wiring for Tailwind v4.

**Verify:** all four hold —
- `test -f components.json` exit 0
- `test -f src/lib/utils.ts` exit 0
- `grep -q "@import \"tailwindcss\"" src/index.css` exit 0
- `pnpm run build` exits 0

### Step 4 — Path alias `@/`

shadcn generates imports like `import { cn } from "@/lib/utils"`. Wire it in **both** TypeScript and Vite or every shadcn component fails to resolve.

Read `tsconfig.app.json` and `tsconfig.json` to find where `compilerOptions` lives for `src`. Add to that file:

```jsonc
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

Add to `vite.config.ts`:

```ts
import path from "node:path";
// … existing imports …

export default defineConfig({
  // … existing config …
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

(If `shadcn init` already did one of these, don't duplicate — extend it.)

**Verify:** create a throwaway `src/App.tsx` import of `@/lib/utils` (add `import { cn } from "@/lib/utils"; void cn;` at the top of the file, revert after checking), then `pnpm run build` exits 0. Restore App.tsx.

### Step 5 — Folder structure (feature modules)

`../thesis-docs/plan/architecture/08-codebase-design.md §8` fixes the module map: *"Módulos por feature (espejo de los grupos de procesos): `auth`, `proyectos`, `insumos`, `apu-editor`, `presupuesto`, `cronograma`, `exportar`, `admin`, más `shell` y `ui`"*. Create exactly that, with `.gitkeep` in each empty dir:

```
src/
  main.tsx                (exists)
  App.tsx                 (exists)
  api/                    ← the single backend seam (plan 002)
  lib/
    utils.ts              (from shadcn init)
    decimal.ts            ← money formatting (plan 004)
  components/
    ui/                   ← shadcn-generated components live here, owned by us
  features/
    auth/                 ← P-01…P-04, S-01…S-06
    proyectos/            ← P-05…P-12, S-07…S-13
    insumos/              ← P-13…P-18, S-14…S-19
    apu-editor/           ← P-19…P-27, S-20…S-26   (the core screen)
    presupuesto/          ← P-28…P-32, S-27…S-32
    cronograma/           ← P-33…P-36, S-33…S-34
    exportar/             ← P-37, S-35
    admin/                ← P-38…P-42, S-37…S-42
  shell/                  ← P-43, S-43 (layout, nav, project/version selectors)
  routes/                 ← route table
  test/                   ← test setup, MSW handlers (plan 003)
```

Feature-module internal convention (every later plan follows it):

```
features/<modulo>/
  pages/         route-level screens (one file per S-xx page)
  components/    screen-local components and dialogs
  hooks/         data hooks (TanStack Query wrappers) and module logic
  schemas.ts     Zod schemas for that module's forms
```

Do **not** create the internal `pages/components/hooks` dirs yet — feature plans create their own on demand.

**Verify:** `find src -type d | sort` matches the tree above (8 feature dirs + `api`, `components/ui`, `lib`, `shell`, `routes`, `test`, `assets`).

### Step 6 — Prettier

oxlint and Prettier don't overlap (oxlint = correctness/style rules, Prettier = formatting). Install Prettier only:

```bash
pnpm add -D prettier
```

Create `.prettierrc`:

```json
{ "semi": true, "singleQuote": false, "trailingComma": "all", "printWidth": 100 }
```

Create `.prettierignore`:

```
node_modules
dist
coverage
playwright-report
pnpm-lock.yaml
src/components/ui
```

`src/components/ui` is Prettier-ignored because shadcn owns the formatting of the code it generates.

**Verify:** `pnpm exec prettier --check .` exits 0 (run `pnpm exec prettier --write .` once first if it fails on Vite's boilerplate).

### Step 7 — Update oxlint config for the new folder structure

Extend `.oxlintrc.json`'s ignore list so oxlint doesn't lint shadcn's owned code:

```jsonc
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "ignorePatterns": ["dist", "coverage", "playwright-report", "src/components/ui"],
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

**Verify:** `pnpm run lint` exits 0.

### Step 8 — npm scripts (the verification baseline — the point of this plan)

Set `package.json` `scripts` to exactly:

```jsonc
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc -b --noEmit",
    "lint": "oxlint",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "e2e": "playwright test",
    "verify": "pnpm run typecheck && pnpm run lint && pnpm run format:check && pnpm run test && pnpm run build"
  }
}
```

`test`, `test:coverage` and `e2e` will fail until plan 003 installs Vitest/Playwright — that is **expected and acceptable at the end of this plan**. Everything else in `verify` must pass now.

**Verify:** `pnpm run typecheck && pnpm run lint && pnpm run format:check && pnpm run build` exits 0. (Do not run the full `verify` yet — its `test` step will fail as noted above.)

### Step 9 — Environment configuration

The app talks to a REST API at a configurable base URL (`/api/v1`, see `../thesis-docs/plan/architecture/07-api-contract.md §1`).

**Design note (revised 2026-07-23 after the previous executor caught it):** the earlier draft of this step wanted a top-level `throw` in `env.ts` and expected `pnpm run build` to fail when the env var was absent. That is impossible with a client-only Vite build: `vite build` is static bundling, it does not evaluate a runtime `throw`. Attempting to verify the guard that way is a dead end. Two honest options were on the table — thread a `loadEnv` check through `vite.config.ts` at build time, or accept a permissive fallback for the SPA. **The permissive fallback is what we ship**: the SPA is a single-tenant thesis app deployed by the same person who set the env var, the fallback keeps `pnpm run dev` frictionless during development, and any misconfiguration in a real deployment is immediately visible (network requests to the wrong host, not a silent crash).

Create `.env.example` (committed) and `.env.local` (gitignored):

```
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

Create `src/lib/env.ts` — **exact content, one line plus imports if any**:

```ts
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1";
```

(If a strict-guard version of this file already exists in the worktree from a prior execution attempt, replace it with the one-liner above — this is deliberate.)

**Verify** (all four must hold):
- `test -f .env.example && grep -q "VITE_API_BASE_URL" .env.example` exits 0
- `test -f .env.local && grep -q "VITE_API_BASE_URL" .env.local` exits 0
- `grep -q "API_BASE_URL" src/lib/env.ts && grep -q "VITE_API_BASE_URL" src/lib/env.ts` exits 0
- `pnpm run build` exits 0

### Step 10 — Spanish locale + app title

The UI is Spanish (`es-EC`) — `../thesis-docs/plan/design/01-ui-ux-design.md §0` and §2. In `index.html`:

- Set `<html lang="es">` (change from whatever Vite generated).
- Set `<title>Sistema APU</title>`.

**Verify:** `grep -q 'lang="es"' index.html && grep -q '<title>Sistema APU</title>' index.html` exits 0.

### Step 11 — Record resolved versions (required — do not skip)

`../thesis-docs/plan/frontend/02-shadcn-components.md §0.1` maintains a pinned-version table and a standing policy that drift between it and the lockfile is a bug. The advisor cannot edit that repo from here, so record here:

Create `plans/RESOLVED-VERSIONS.md`:

```markdown
# Resolved frontend versions (scaffold: 2026-07-23)

Compare against `../thesis-docs/plan/frontend/02-shadcn-components.md §0.1`.
Package manager: **pnpm** (not npm as originally pinned).
Linter: **oxlint** (originally ESLint) + **Prettier** (as formatter only).

| Package | Pinned in thesis-docs §0.1 | Actually resolved |
|---|---|---|
| shadcn (CLI) | 4.10.0 | <pnpm dlx shadcn@4 --version output> |
| radix-ui | 1.5.0 | <pnpm ls radix-ui> |
| tailwindcss | 4.3.0 | <pnpm ls tailwindcss> |
| @tanstack/react-table | 8.21.3 | — (not yet installed; plan 002+) |
| @tanstack/react-query | 5.101.0 | — (not yet installed; plan 002+) |
| react-hook-form | 7.77.0 | — (not yet installed; plan 002+) |
| zod | 4.4.3 | — (not yet installed; plan 002+) |
| lucide-react | 1.17.0 | — (not yet installed; plan 002+) |
| sonner | 2.0.7 | — (not yet installed; plan 002+) |
| react / react-dom | — | 19.2.7 / 19.2.7 |
| typescript | — | 6.0.2 |
| vite | — | 8.1.1 |
| oxlint | (n/a in doc) | 1.71.0 |
| prettier | (n/a in doc) | <pnpm ls prettier> |
```

Fill in every `<…>` from real `pnpm ls --depth=0` output. In the final report, list any row where "resolved" differs from "pinned" — the humans need to update the spec repo.

**Verify:** `test -f plans/RESOLVED-VERSIONS.md` exit 0 and it contains no `<…>` placeholders.

### Step 12 — Commit

Two commits, so the history reads honestly:

```bash
# Commit A — scaffold plumbing (Tailwind, shadcn, structure, tooling)
git add .gitignore components.json src/index.css src/lib/utils.ts vite.config.ts \
  tsconfig*.json .prettierrc .prettierignore .oxlintrc.json src/
git status                          # review before committing
git commit -m "chore: tailwind + shadcn init, path alias, folder structure"

# Commit B — verification baseline (scripts, env, locale, versions record)
git add package.json .env.example src/lib/env.ts index.html plans/RESOLVED-VERSIONS.md
git commit -m "chore: pnpm scripts (verify gate), env plumbing, locale, versions record"

pnpm run typecheck && pnpm run lint && pnpm run format:check && pnpm run build
```

**Verify:** all four commands in the final line exit 0; `git log --oneline | wc -l` ≥ 3.

## 6. Done criteria (machine-checkable)

Run each; all must hold:

| Command | Expected |
|---|---|
| `pnpm run typecheck` | exit 0 |
| `pnpm run lint` | exit 0 |
| `pnpm run format:check` | exit 0 |
| `pnpm run build` | exit 0, `dist/index.html` exists |
| `test -f components.json && test -f src/lib/utils.ts && test -f src/lib/env.ts` | exit 0 |
| `find src -maxdepth 2 -type d -name 'auth' -o -name 'proyectos' -o -name 'insumos' -o -name 'apu-editor' -o -name 'presupuesto' -o -name 'cronograma' -o -name 'exportar' -o -name 'admin' \| wc -l` | `8` |
| `grep -q '"verify"' package.json && grep -q '"pnpm run typecheck' package.json` | exit 0 |
| `grep -q 'lang="es"' index.html && grep -q '<title>Sistema APU</title>' index.html` | exit 0 |
| `test -f plans/RESOLVED-VERSIONS.md` and no `<…>` placeholders inside | exit 0 |
| `git log --oneline \| wc -l` | ≥ 3 |

## 7. Test plan

This plan installs no test runner (that is plan 003), so there are no unit tests to write here. The verification *is* the test: from a clean `node_modules`,

```bash
rm -rf node_modules
pnpm install --frozen-lockfile
pnpm run typecheck && pnpm run lint && pnpm run format:check && pnpm run build
```

must all exit 0. This proves the setup is reproducible from the lockfile.

## 8. Boundaries

- **Do not** add any shadcn component yet (`pnpm dlx shadcn@4 add …`) — components arrive per-plan, on demand, per the XP simplicity rule in `02-shadcn-components.md §5`.
- **Do not** install TanStack Query, Axios, Zustand, React Router, or Zod yet — plan 002 owns the API/state layer and plan 004 owns tokens. Installing them here creates unused dependencies the executor of 002 will have to reconcile.
- **Do not** write any feature code, route, or screen. Empty module folders with `.gitkeep` is the correct end state.
- **Do not** replace pnpm with npm, oxlint with ESLint, or add Yarn/Bun.
- **Do not** touch `.agents/` or `../thesis-docs`.
- **Do not** upgrade or downgrade React, TypeScript, or Vite to make an install succeed — STOP and report instead (§9).

## 9. Escape hatches

- If `pnpm dlx shadcn@4 init` fails or does not offer a Radix base, **STOP and report**. Do not fall back to Base UI or hand-roll Tailwind config.
- If Tailwind v4 refuses to install against React 19.2.7 / Vite 8.1.1 (peer-dep resolution failure), **STOP and report** with the exact pnpm error. That's a legitimate signal that the pre-existing scaffold's version choices are incompatible with the decided stack — a human decision to make, not yours.
- If `.oxlintrc.json`'s existing rules trip against shadcn-generated code even with the ignore pattern in Step 7, add a targeted second ignore path — **do not weaken the rules**.
- If `pnpm install` on a clean `node_modules` fails to reproduce from `pnpm-lock.yaml`, **STOP and report** — a broken lockfile is a bigger problem than this plan and needs to be fixed before proceeding.

## 10. Maintenance note

The `verify` script is the contract between all 15 plans. If a future change adds a gate (e.g. a bundle-size check), add it to `verify` rather than inventing a parallel command — or later plans' done criteria will quietly stop covering it.

`plans/RESOLVED-VERSIONS.md` needs re-generating whenever dependencies are upgraded — otherwise it drifts from the lockfile and becomes the same class of bug that `02-shadcn-components.md §0.1` warns about.

Because we chose pnpm (not npm as originally documented) and oxlint (not ESLint), the advisor must update plans 002–015 to say `pnpm run verify` / `pnpm add` / `pnpm dlx` in their command tables — this is a mechanical rewrite the advisor will do in a follow-up pass, not the executor's concern here.
