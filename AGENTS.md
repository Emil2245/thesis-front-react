# AGENTS.md — Sistema APU Frontend

## Project

React SPA for Ecuadorian public-works bidding. Implements full APU/presupuesto/cronograma workflow.

## Build & Test

```bash
pnpm install
pnpm run verify   # typecheck + lint + format:check + test + build
pnpm run e2e      # Playwright E2E (20 tests)
pnpm run e2e:screenshots   # solo las 11 capturas de escritorio (chromium)
pnpm run dev      # http://localhost:5173
```

Baseline actual: **197 tests unitarios en 43 archivos**, `pnpm run e2e` en verde.

> Si tocas un componente y el navegador o Playwright siguen mostrando el
> comportamiento viejo, reinicia el dev server: `playwright.config.ts` usa
> `reuseExistingServer`, así que un `vite` levantado de antes sirve el bundle
> obsoleto y produce diagnósticos falsos.

## Key Conventions

- **UI language:** Spanish (es-EC). Domain nouns stay Spanish in code: `insumo`, `rubro`, `apu`, `capitulo`, `presupuesto`, `cronograma`
- **Package manager:** pnpm only — never npm
- **State:** TanStack Query for server state, Zustand for cross-cutting client state, local React state for UI
- **API layer:** `src/api/` is the only place that knows HTTP exists. No feature module imports axios directly
- **Money:** `Decimal` branded strings (defined in `src/lib/decimal.ts`). Never parse to number and send back
- **No client-side calc:** All cost/pricing math comes from the server (ADR 9)
- **Módulos sin backend:** el inventario está en `src/lib/disponibilidad.ts`. Las
  pantallas cuyo servidor no existe se degradan con `ModuloNoDisponible` y
  conservan su implementación real exportada como `<Nombre>PageActiva`: para
  reactivarlas, quita el módulo del set, borra el wrapper y renombra. **Nunca
  las borres.** Los controles sueltos sin endpoint van `disabled` + tooltip con
  `MOTIVO_SIN_BACKEND`
- **Colores:** tema neutro (blanco y negro). `--primary`, `--ring` y `--chart-1`
  no tienen croma. Solo conservan color los tokens de estado (`--exito`,
  `--advertencia`, `--peligro`, `--destructive`). Nunca uses colores crudos de
  Tailwind (`bg-blue-500`)

## Feature Modules

| Module      | Routes                                                                                                       | Key files                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| auth        | `/login`, `/registro`, `/recuperar`, `/restablecer/:token`, `/verificar-email`, `/perfil`                    | `sesion.ts`, `useAuthMutaciones.ts`                               |
| proyectos   | `/proyectos`, `/proyectos/:id`, `/proyectos/:id/parametros`                                                  | `AsistenteCrearProyecto.tsx`, `TabFirmantes.tsx`                  |
| insumos     | `/proyectos/:id/insumos`                                                                                     | `TablaInsumos.tsx`, `DialogoInsumo.tsx`, `AsistenteImportCsv.tsx` |
| apu-editor  | `/proyectos/:id/apus`, `/proyectos/:id/apus/:apuId`                                                          | `useApuEditor.ts`, `GridSeccion.tsx`, `PieTotales.tsx`            |
| presupuesto | `/proyectos/:id/presupuesto`, `/proyectos/:id/versiones`                                                     | `ArbolPresupuesto.tsx`, `ComparadorVersiones.tsx`                 |
| cronograma  | `/proyectos/:id/cronograma`                                                                                  | `TablaActividades.tsx`, `GanttChart.tsx`                          |
| exportar    | `/proyectos/:id/documentos`                                                                                  | `ExportPage.tsx`                                                  |
| admin       | `/admin/usuarios`, `/admin/bases`, `/admin/plantillas`, `/admin/parametros`, `/admin/valores`, `/admin/logs` | One page per route                                                |

## Testing

- **Vitest + RTL + MSW** for unit tests. MSW intercepts all HTTP with `onUnhandledRequest: "error"`
- Toda ruta mockeada de un **endpoint de listado** lleva `*` al final, en MSW y
  en Playwright: la paginación añade `?page=0` y un patrón literal deja de
  casar, cae en el catch-all y la página revienta
- Query by accessible role/label in Spanish
- Shared test render wrapper in `src/test/render.tsx` (providers: QueryClient, Router, TooltipProvider)
- Fixtures in `src/test/fixtures/`, handlers in `src/test/handlers.ts` (40+ endpoints)
- Playwright for E2E with `@axe-core/playwright` for a11y checks

## DTOs & API

- All DTOs hand-transcribed from thesis-docs Apéndice B in `src/api/contract.ts`
- Query key factory in `src/api/queryKeys.ts`
- Version selector: `?v=` search param throughout
- Handlers distinguish paginated vs plain array via presence of query params

## Critical Files

- `src/test/handlers.ts` — all MSW endpoint mocks
- `src/api/contract.ts` — all TypeScript DTOs
- `src/lib/decimal.ts` — `Decimal` branded type and formatters
- `src/routes/index.tsx` — all 28 routes
- `src/lib/disponibilidad.ts` — qué módulos aún no tienen backend
- `src/components/comunes/EncabezadoPagina.tsx` / `TarjetaTabla.tsx` — encabezado
  y contenedor de tabla que usan todas las páginas; el padding y el espaciado los
  pone el shell (`main` con `flex flex-col gap-5 p-6`), no la página
- `src/features/apu-editor/hooks/useApuEditor.ts` — deep module (4 methods, cell commit cycle, HM protection)
