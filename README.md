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
- `src/api/` is the only HTTP-aware layer
- Version selector uses `?v=` search param (not nested routes)

## Números y dinero

> **Se visualiza en string. Se maneja en número.** — decisión del autor, 2026-09-06

Son **dos ejes distintos**, y confundirlos en uno solo es lo que produjo los `as never` que el repo
arrastró durante meses:

| Eje                                       | Quién lo decide           | Regla                                                             |
| ----------------------------------------- | ------------------------- | ----------------------------------------------------------------- |
| **Transporte** — qué viaja por el cable   | El backend, no se negocia | `string` donde serializa string · `number` donde serializa number |
| **Manejo** — qué haces con el dato dentro | Esta decisión             | solo lectura → `string` · editable → `number` cuantizado          |

Presupuesto y cronograma (`totalGeneral`, `precioTotal`, `cantidad`, avances) viajan como
**string**; APU, insumo y parámetros (`costoDirecto`, `precioUnitario`, `iva`) como **number**. Los
requests aceptan las dos formas. **No lo adivines por el nombre**: `precioTotal` es string y
`precioUnitario` es number — lee el record de Java.

Tres reglas que se derivan:

1. **El frontend no hace aritmética de dinero.** Guarda automática: `pnpm run guard:adr9`, dentro
   de `verify`. `toFixed`/`parseFloat` solo en `src/lib/decimal.ts`.
2. **Se cuantiza una sola vez, al entrar** — `parsearEntradaNumerica(entrada, escala)`.
3. **Escalas fijas:** dinero 6 decimales, porcentajes y avances 4.

> La doctrina anterior —«money travels as decimal strings … never parse to `number` and send it
> back»— **era falsa** desde que existe el backend real. Si la encuentras en algún sitio, es
> documentación caducada.

Detalle completo en [`docs/bugs.md`](docs/bugs.md) §0 y en `plans/README.md` §2.

## Project structure

```
src/
├── api/          # API client, DTOs, query keys
├── components/   # Shared UI components
├── features/     # Feature modules (auth, proyectos, insumos, apu-editor, presupuesto, cronograma, exportar, admin)
├── hooks/        # Shared hooks
├── lib/          # Utilities (decimal, env, error handling, disponibilidad)
├── routes/       # Router config + guards
├── shell/        # App shell (sidebar, topbar, breadcrumbs)
└── test/         # Test setup (MSW handlers, fixtures, render utilities)
```

## Tests

- **461 unit tests** across 74 files (Vitest + RTL + MSW)
- **20 E2E tests** (Playwright): 11 capturas de escritorio en chromium + humo y
  accesibilidad con axe-core en chromium, firefox y mobile-chrome
- Commands: `pnpm test`, `pnpm run test:watch`, `pnpm run test:coverage`,
  `pnpm run e2e`, `pnpm run e2e:screenshots`

## CI

**No hay CI.** `.github/` está en `.gitignore` (commit `7635176`, «bypass workflow token
requirement») y el directorio no existe en el repositorio.

La puerta es local y hay que correrla a mano:

```bash
pnpm run verify   # typecheck → lint → guard:adr9 → format:check → test → build
pnpm run e2e      # Playwright
```

Cualquier guarda que quieras hacer cumplir tiene que ir **dentro de `verify`**, no en un workflow:
allí sería letra muerta.

## Spec repository

API contracts and design docs live in the companion [thesis-docs](https://github.com/anomalyco/thesis-docs) repo.
DTOs are hand-transcribed from Apéndice B; el backend Quarkus todavía no publica OpenAPI.

**El backend es la fuente de verdad del contrato.** Implementa **30 recursos JAX-RS**
(`origin/main` @ `c337950`, incluido el cronograma completo desde el 2026-09-05); el frontend tiene
pantallas para los 44 procesos del contrato. Cuando el código y los docs discrepan, **gana el
código** y los docs se corrigen.

Las páginas pendientes con contrato backend aprobado se degradan a un aviso explícito en vez de
romperse. El inventario vive en `src/lib/disponibilidad.ts` y **el gate es por página, no por
módulo**: hoy quedan fuera `admin-usuarios`, `admin-plantillas`, `admin-valores` y `admin-logs`.
Las operaciones sin contrato consolidado —duplicar proyecto, subir logo y descuento global— se
retiraron por completo del frontend.

> **Antes de tipar un DTO, lee el record de Java** (`git show origin/main:<path>` en
> `../thesis-back-quarkus`; no hagas checkout, el working tree está en otra rama). Ocho planes de
> la última ronda tenían premisas falsas sobre el backend, y todas cayeron en cinco minutos de
> lectura. El catálogo está en [`docs/bugs.md`](docs/bugs.md).

## Defectos conocidos y sus patrones

[`docs/bugs.md`](docs/bugs.md) documenta los **40 defectos** encontrados en el seam durante la
ronda de septiembre de 2026 y, más importante, **los cuatro patrones que los produjeron**. Ninguno
fue detectado por `pnpm run verify`: la suite estuvo verde mientras seis funcionalidades no
funcionaban en producción.

Léelo antes de dar por bueno un verde. El más repetido: **el mock era la especificación** — un
handler que acepta cualquier cuerpo es un test que no prueba nada.
