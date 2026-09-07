# AGENTS.md — Sistema APU Frontend

## Project

React SPA for Ecuadorian public-works bidding. Implements full APU/presupuesto/cronograma workflow.

> **Lee [`docs/bugs.md`](docs/bugs.md) antes de dar por bueno un `verify` en verde.** Documenta 40
> defectos reales de este código y los **cuatro patrones** que los produjeron. Ninguno lo detectó
> la suite: estuvo verde mientras seis funcionalidades no funcionaban en producción. El más
> repetido — **el mock era la especificación**: un handler que acepta cualquier cuerpo es un test
> que no prueba nada.

## Build & Test

```bash
pnpm install
pnpm run verify   # typecheck + lint + guard:adr9 + format:check + test + build
pnpm run e2e      # Playwright E2E (20 tests: 11 capturas + 3 smoke × 3 navegadores)
pnpm run e2e:screenshots   # solo las 11 capturas de escritorio (chromium)
pnpm run dev      # http://localhost:5173
```

Baseline actual: **461 tests unitarios en 74 archivos**, `pnpm run e2e` en verde.
Si cambias el baseline, actualiza este número: el plan 060 se encontró con el de
197/43, cinco olas caducado, y un baseline que miente no detecta nada.

> **Punto ciego del gate:** `verify` **no comprueba tipos en `e2e/`**.
> `tsconfig.app.json` incluye sólo `src`, así que un error de tipos en un
> `.spec.ts` de Playwright no aparece hasta que corre `pnpm run e2e` — y como
> sus datos de prueba son literales sin anotar, un id con la forma equivocada no
> lo ve nadie. `oxlint` sí recorre `e2e/`. Por eso los ids numéricos de
> `screenshots.spec.ts` sobrevivieron a la migración a UUID de toda la app.

> Si tocas un componente y el navegador o Playwright siguen mostrando el
> comportamiento viejo, reinicia el dev server: `playwright.config.ts` usa
> `reuseExistingServer`, así que un `vite` levantado de antes sirve el bundle
> obsoleto y produce diagnósticos falsos.

## Key Conventions

- **UI language:** Spanish (es-EC). Domain nouns stay Spanish in code: `insumo`, `rubro`, `apu`, `capitulo`, `presupuesto`, `cronograma`
- **Package manager:** pnpm only — never npm
- **State:** TanStack Query for server state, Zustand for cross-cutting client state, local React state for UI
- **API layer:** `src/api/` is the only place that knows HTTP exists. No feature module imports axios directly
- **Dinero — «se visualiza en string, se maneja en número»** (decisión del autor,
  2026-09-06). Son **dos ejes**, y confundirlos en uno solo produjo los `as never`
  que el plan 060 retiró. Versión larga en [`docs/bugs.md`](docs/bugs.md) §0 y
  `plans/README.md` §2. **Transporte**, lo fija el backend y
  no se negocia: presupuesto y cronograma (`totalGeneral`, `precioTotal`,
  `cantidad`, avances) serializan **string** —el tipo marcado `Decimal` de
  `src/lib/decimal.ts`—; APU, insumo y parámetros (`costoDirecto`,
  `precioUnitario`, `iva`) serializan **number**. Los requests aceptan las dos
  formas. **Edición**: campo editable → `number` cuantizado; campo de solo
  lectura → `string`. La regla que estaba escrita aquí antes —«never parse to
  number and send it back»— **era falsa** desde que existe el backend real, y
  fue la que produjo los `as never` que el plan 060 retiró: si un DTO te obliga
  a castear para que compile, el que está mal es el DTO, no el dato.
- **No aritmética de dinero en el cliente:** todo cálculo viene del servidor
  (ADR 9). `toFixed`/`parseFloat` sólo dentro de `src/lib/decimal.ts`, con la
  guarda `pnpm run guard:adr9` encadenada dentro de `verify`. Los porcentajes
  viajan como fracción (`0.1800` = 18 %); dinero a escala 6, porcentajes y
  avances a escala 4
- **Módulos sin backend:** el inventario está en `src/lib/disponibilidad.ts`. Las
  pantallas cuyo servidor no existe se degradan con `ModuloNoDisponible` y
  conservan su implementación real exportada como `<Nombre>PageActiva`: para
  reactivarlas, quita el módulo del set, borra el wrapper y renombra. **Nunca
  las borres.** Los controles sueltos sin endpoint van `disabled` + tooltip con
  `MOTIVO_SIN_BACKEND`. **El gate es por página, no por módulo** (plan 050):
  dentro de «admin» convivían una pantalla con backend completo y cuatro sin
  ninguno, así que la clave gruesa apagaba justo la que funcionaba. Hoy las
  claves son `admin-usuarios`, `admin-plantillas`, `admin-valores`,
  `admin-logs` y `descuento-global`; Bases y Parámetros no aparecen porque su
  backend existe
- **Colores:** tema neutro (blanco y negro). `--primary`, `--ring` y `--chart-1`
  no tienen croma. Solo conservan color los tokens de estado (`--exito`,
  `--advertencia`, `--peligro`, `--destructive`). Nunca uses colores crudos de
  Tailwind (`bg-blue-500`)

## Feature Modules

| Module      | Routes                                                                                                                           | Key files                                                                           |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| auth        | `/login`, `/registro`, `/recuperar`, `/restablecer/:token`, `/verificar-email`, `/perfil`                                        | `sesion.ts`, `useAuthMutaciones.ts`                                                 |
| proyectos   | `/proyectos`, `/proyectos/:id`, `/proyectos/:id/parametros`                                                                      | `AsistenteCrearProyecto.tsx`, `TabFirmantes.tsx`                                    |
| insumos     | `/proyectos/:id/insumos`                                                                                                         | `TablaInsumos.tsx`, `DialogoInsumo.tsx`, `AsistenteImportCsv.tsx`                   |
| apu-editor  | `/proyectos/:id/apus`, `/proyectos/:id/apus/:apuId`                                                                              | `useApuEditor.ts`, `GridSeccion.tsx`, `PieTotales.tsx`                              |
| presupuesto | `/proyectos/:id/presupuesto`, `/proyectos/:id/versiones`                                                                         | `ArbolPresupuesto.tsx`, `ComparadorVersiones.tsx`                                   |
| cronograma  | `/proyectos/:id/cronograma`                                                                                                      | `TablaActividades.tsx`, `GanttChart.tsx`                                            |
| exportar    | `/proyectos/:id/documentos`                                                                                                      | `ExportPage.tsx`                                                                    |
| admin       | `/admin/usuarios`, `/admin/bases`, `/admin/bases/:id`, `/admin/plantillas`, `/admin/parametros`, `/admin/valores`, `/admin/logs` | One page per route. `/admin/bases/:id` es el detalle de una base central (plan 050) |

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
