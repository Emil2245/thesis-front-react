# AGENTS.md — Sistema APU Frontend

## Project

React SPA for Ecuadorian public-works bidding. Implements full APU/presupuesto/cronograma workflow.

### Fuente de verdad para la integración

El **código y las pruebas actuales de `../thesis-back-quarkus` son la fuente de verdad operativa del contrato HTTP**: rutas, métodos, DTO request/response, autorización, códigos de estado y error, paginación y representación decimal. El objetivo de este repositorio es **hacer que el frontend actual funcione contra ese backend real**, no adaptar el backend a mocks, DTOs transcritos o planes antiguos del frontend.

- Contrasta cada petición con el recurso JAX-RS, sus DTOs y sus pruebas actuales antes de modificar el frontend.
- Deriva MSW y las pruebas de contrato del backend real; un handler permisivo nunca demuestra compatibilidad.
- Si el frontend y el backend difieren, corrige primero el frontend. No inventes endpoints ni mantengas llamadas que el backend no expone.
- `../thesis-docs` conserva la autoridad funcional y de dominio. Si el backend contradice una decisión canónica vigente, detente y documenta el conflicto; no cambies el backend silenciosamente ni por comodidad del frontend.

> **Lee [`docs/bugs.md`](docs/bugs.md) antes de dar por bueno un `verify` en verde.** Documenta 48
> defectos reales de este código y los **cuatro patrones** que los produjeron. Ninguno lo detectó
> la suite: estuvo verde mientras seis funcionalidades no funcionaban en producción. El más
> repetido — **el mock era la especificación**: un handler que acepta cualquier cuerpo es un test
> que no prueba nada.

## Política de implementación y pruebas de los planes

- **No uses SDD/OpenSpec salvo que el usuario lo solicite explícitamente.** Los planes Markdown existentes son suficiente guía para la implementación ordinaria.
- Mantén una estrategia de pruebas **mínima y focalizada**. No pruebes todos los contratos HTTP. Añade pruebas nuevas únicamente cuando una incompatibilidad pueda bloquear un flujo principal, corromper datos o dinero, vulnerar autenticación/autorización, afectar una mutación destructiva o repetir un defecto real.
- Usa TDD solo para esos casos críticos: primero una única prueba que reproduzca el riesgo y después la implementación mínima. Para el resto, implementa directamente y valida de forma focalizada; no conviertas cada endpoint, cambio visual o composición en una batería TDD.
- No exijas tests unitarios nuevos para copy, layout, estilos, wrappers simples, componentes presentacionales o cableado trivial. Compruébalos mediante typecheck, lint y una verificación manual focalizada en navegador cuando corresponda.
- Consumir un endpoint real debe comprobar al menos método, ruta y forma principal del request/response cuando un error pudiera romper producción. No basta un handler MSW permisivo, pero tampoco se necesita duplicar todos los casos del backend en el frontend.
- No borres, desactives ni relajes pruebas existentes para avanzar. Ejecuta pruebas focalizadas durante cada plan; reserva `pnpm run verify` y los E2E críticos para límites de integración o cierre.

## Build & Test

```bash
pnpm install
pnpm run verify   # typecheck + lint + guard:adr9 + format:check + test + build
pnpm run e2e      # Playwright E2E (67 tests: 13 capturas + 3 smoke × 3 navegadores + 45 del manual)
pnpm run e2e:screenshots   # solo las 13 capturas de escritorio (chromium)
pnpm run e2e:manual        # capturas de docs/manual/ (chromium)
pnpm run dev      # http://localhost:5173
```

Baseline actual: **607 tests unitarios en 88 archivos, todos en verde**, y `pnpm run verify` pasa
entero —typecheck, lint, guard:adr9, format:check, test y build—. Medido el 2026-09-10 después de
corregir la respuesta nullable de proyectos y de integrar el selector de vistas del Plan 090 sobre los Planes 077–087. Antes de esa rama eran 459 ✅ / **20 ❌** en 75 archivos, con `typecheck` y
`format:check` rojos y `vite build` bloqueado; los 20 fallos eran fixtures y `server.use(...)` que
no se actualizaron cuando el plan 076 metió validación runtime en el seam. Están en
[`docs/bugs.md`](docs/bugs.md) §6, con la regla que faltaba: **una fixture es una afirmación sobre
el backend y se verifica como tal**. Los 67 lanzamientos E2E aún no tienen una
medición completa; Chromium está instalado y las tres capturas del cronograma pasan,
pero faltan ejecutar los demás journeys y los otros navegadores. Si cambias el baseline, actualiza este número: el plan 060 se encontró
con el de 197/43, cinco olas caducado, y un baseline que miente no detecta nada.

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
  páginas pendientes que tienen contrato backend aprobado se degradan con
  `ModuloNoDisponible` y conservan su implementación real exportada como
  `<Nombre>PageActiva`; no se borran mientras su plan siga vigente. En cambio,
  una operación que no existe en el backend consolidado y exigiría ampliarlo se
  retira por completo del frontend: sin control, hook, DTO ni mock ficticio. **El
  gate es por página, no por módulo** (plan 050). **Desde el plan 081 el `Set`
  está vacío**: las cuatro claves que quedaban —`admin-usuarios`,
  `admin-plantillas`, `admin-valores` y `admin-logs`— se retiraron cuando
  077–080 cablearon sus pantallas contra el backend real. El archivo, el tipo
  `ModuloSinBackend` y `MOTIVO_SIN_BACKEND` se conservan porque el patrón
  volverá a hacer falta; hoy no los consume nadie. Ojo al vaciarlo: con el `Set`
  vacío `ModuloSinBackend` es `never`, así que cualquier `.has("…")` o
  `modulo: "…"` deja de compilar — es a propósito, obliga a terminar el trabajo.
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
- Toda ruta de un **endpoint de listado** interceptada en **Playwright** lleva
  `*` al final (`page.route(\`${API}/proyectos*\`)`): la paginación añade
  `?page=0`, un patrón literal deja de casar, cae en el catch-all y la página
  revienta. **En MSW no**, y esta línea decía lo contrario hasta el plan 077:
  `http.get()` casa por *pathname* e ignora el query string, así que ninguno de
  los handlers de `src/test/handlers.ts` lo lleva —se comprobó: **0 de 51**— y
  añadirlo sería contraproducente, porque `\`${API}/admin/usuarios*\``capturaría
también`/admin/usuarios/:id` y las rutas de acción
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
