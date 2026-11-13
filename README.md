# Sistema APU — Frontend

React SPA for Ecuadorian public-works bidding (APU · presupuesto · cronograma).
Part of a cloud-native platform automating SERCOP _propuestas técnico-económicas_.

## Stack

- **React 19** + **TypeScript 7** + **Vite 8**
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

Key architectural decisions (see [`AGENTS.md`](AGENTS.md) and [`docs/bugs.md`](docs/bugs.md)):

- No calc engine in the client — all cost/pricing math is server-side (ADR 9)
- `src/api/` is the only HTTP-aware layer
- Version selector uses `?v=` search param (not nested routes)

## Private document exports

The budget, APU, technical-specification and cronograma buttons send an authenticated JSON
`POST /documentos/{type}/{budgetId}/exportaciones` to Core. The client generates
an `Idempotency-Key` UUIDv7 for the selected version and options; Core returns
a validated, short-lived **relative Core download path**. Only an explicit
button click opens that path; the browser does not receive an S3 URL or store
the ticket in the page before the click. The existing preflight display is
informative: the POST rechecks access and exportability.

Retry a failed request with the same key so Core can reissue a one-use ticket
without rendering again. If Core responds `idempotencia-conflicto` (changed
revision/options) or `exportacion-expirada`, the next explicit click starts a
new operation with a new key. Cronograma accepts XLSX, PDF (`papel` only for
PDF), and MSPDI XML; its captured stale warning remains visible. Since stage 05
Core's legacy byte-serving GETs (`GET /documentos/{documento}/{id}`) are retired and
answer 404: the only download path is `POST /documentos/{documento}/{id}/exportaciones`
followed by the one-use `GET /documentos/descargas/{ticket}`. The read-only
preflight GETs remain. Configure `VITE_API_BASE_URL` to the Core
`/api/v1` origin, and allow `Idempotency-Key` in the Core CORS preflight for
cross-origin deployments. Local component tests do not prove browser download,
Ingress log suppression or deployed S3 permissions.

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

Detalle completo en [`docs/bugs.md`](docs/bugs.md) §0.

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

El baseline vigente de `pnpm run verify` (typecheck, lint, guard:adr9, format:check, test y
build) y de los E2E se mantiene en un solo lugar: [`AGENTS.md`](AGENTS.md). No se repiten
aquí cifras que caducan.

- Unit/component: Vitest + RTL + MSW. E2E: Playwright (Chromium, humo, capturas y
  accesibilidad con axe-core).
- Commands: `pnpm test`, `pnpm run test:watch`, `pnpm run test:coverage`,
  `pnpm run e2e`, `pnpm run e2e:screenshots`

## Spec repository

API contracts and design docs live in the companion [thesis-docs](https://github.com/anomalyco/thesis-docs) repo.
DTOs are hand-transcribed from Apéndice B; el backend Quarkus expone OpenAPI en `/q/openapi`,
pero el frontend mantiene su costura tipada explícita hasta sustituirla por generación automática.

**El backend es la fuente de verdad del contrato.** Cuando el código y los docs
discrepan, **gana el código** y los docs se corrigen.

Las páginas pendientes con contrato backend aprobado se degradan a un aviso explícito en vez
de romperse. El inventario vive en `src/lib/disponibilidad.ts` y **el gate es por página, no
por módulo**: `MODULOS_SIN_BACKEND` queda **vacío desde el plan 081**, así que las cuatro
páginas `/admin/*` (`/admin/usuarios`, `/admin/plantillas`, `/admin/valores`, `/admin/logs`)
están **activas** y consumen el backend real. La búsqueda de plantillas y el alta manual
completa de APU están integradas en el workspace. Las operaciones sin contrato consolidado —duplicar proyecto, subir
logo y descuento global— **siguen retiradas del frontend por decisión de producto**; el uso
de insumo (`GET /proyectos/{id}/insumos/{id}/usos`) existe como endpoint pero el backend
devuelve `[]` (stub documentado en `docs/bugs.md`). Las pendientes de producto
conocidas están en [`plans/pendientes2/bugs-pendientes.md`](plans/pendientes2/bugs-pendientes.md).

> **Antes de tipar un DTO, lee el record de Java** (`git show origin/main:<path>` en
> `../thesis-back-quarkus`; no hagas checkout, el working tree está en otra rama). Ocho planes de
> la última ronda tenían premisas falsas sobre el backend, y todas cayeron en cinco minutos de
> lectura. El catálogo está en [`docs/bugs.md`](docs/bugs.md).

## Defectos conocidos y sus patrones

[`docs/bugs.md`](docs/bugs.md) documenta los **48 defectos** encontrados en el seam durante la
ronda de septiembre de 2026 y, más importante, **los cuatro patrones que los produjeron**. Ninguno
fue detectado por `pnpm run verify`: la suite estuvo verde mientras seis funcionalidades no
funcionaban en producción.

Léelo antes de dar por bueno un verde. El más repetido: **el mock era la especificación** — un
handler que acepta cualquier cuerpo es un test que no prueba nada.

## Contenedor y CI

[![CI](https://github.com/emil2245/thesis-front-react/actions/workflows/ci.yml/badge.svg)](https://github.com/emil2245/thesis-front-react/actions/workflows/ci.yml)

Imagen OCI con nginx no-root (uid 101) que sirve el SPA con fallback a `index.html`.

```bash
podman build -t propuestas-web:dev .
podman run -d --rm -p 8089:8080 --read-only --tmpfs /tmp --tmpfs /var/cache/nginx --tmpfs /var/run propuestas-web:dev
```

- Puerto `8080`; salud en `GET /healthz` (responde `ok`); log de acceso JSON a stdout.
- El bundle se compila con la base de API relativa `/api/v1` (mismo origen: el Ingress enruta `/api` al backend), así que no hace falta recompilar por entorno ni hay CORS.
- Para despliegues sin Ingress común: `podman build --build-arg VITE_API_BASE_URL=https://api.ejemplo/api/v1 -t propuestas-web:dev .`
- CI (`.github/workflows/ci.yml`, en cada push y pull request), tres jobs: `verify` (`pnpm run verify`), `e2e` (Playwright, solo proyecto `chromium`; todos los specs mockean la API con `page.route`, no requieren backend; sube `playwright-report` si falla) y `image` (build de la imagen y escaneo trivy `CRITICAL`, solo reporte, `exit-code: 0`).
