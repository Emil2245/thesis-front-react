# Sistema APU — Frontend

React SPA for Ecuadorian public-works bidding (APU · presupuesto · cronograma).
Part of a cloud-native platform automating SERCOP _propuestas técnico-económicas_.

## Stack

- **React 19** + **TypeScript 6** + **Vite 8**
- **shadcn/ui 4** (Radix UI) + **Tailwind CSS 4**
- **TanStack Query 5** + **React Router 7**
- **Zustand** (client state) + **Zod** (validation)
- **Vitest** + **Testing Library** + **MSW** (unit tests)
- **Playwright** + **axe-core** (E2E + a11y)
- **oxlint** + **Prettier** (lint/format)

## Quick start

```bash
pnpm install
pnpm run dev        # http://localhost:5173
pnpm run verify     # typecheck + lint + format + test + build
pnpm run e2e        # Playwright E2E tests
pnpm run e2e:screenshots  # solo las capturas de escritorio (chromium)
```

## Architecture

Single-page application with route-based code splitting:

- **Public routes:** login, registro, verificar-email, recuperar, restablecer
- **Private routes** (behind `RutaPrivada`): proyectos, insumos, APUs, presupuesto, cronograma, documentos, plantillas
- **Admin routes** (behind `RutaAdmin`): usuarios, bases, plantillas, parámetros, valores ref., logs

Key architectural decisions (see `plans/README.md` for full ADR log):

- No calc engine in the client — all cost/pricing math is server-side (ADR 9)
- Money/percentages travel as `Decimal` branded strings (`"61.390000"`)
- `src/api/` is the only HTTP-aware layer
- Version selector uses `?v=` search param (not nested routes)

## Project structure

```
src/
├── api/          # API client, DTOs, query keys
├── components/   # Shared UI components
├── features/     # Feature modules (auth, proyectos, insumos, apu-editor, presupuesto, cronograma, exportar, admin)
├── hooks/        # Shared hooks
├── lib/          # Utilities (decimal, env, error handling)
├── routes/       # Router config + guards
├── shell/        # App shell (sidebar, topbar, breadcrumbs)
└── test/         # Test setup (MSW handlers, fixtures, render utilities)
```

## Tests

- **165 unit tests** across 42 files (Vitest + RTL + MSW)
- **2 E2E tests** (Playwright + axe-core for a11y)
- Commands: `pnpm test`, `pnpm run test:watch`, `pnpm run test:coverage`, `pnpm run e2e`

## CI

GitHub Actions workflow (`.github/workflows/ci.yml`):
typecheck → lint → format check → test → build → install Playwright → E2E

## Spec repository

API contracts and design docs live in the companion [thesis-docs](https://github.com/anomalyco/thesis-docs) repo.
DTOs for 40+ endpoints are hand-transcribed from Apéndice B (backend does not exist yet).
