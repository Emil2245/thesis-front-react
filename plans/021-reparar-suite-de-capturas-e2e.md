# Plan 021: Reparar la suite de capturas E2E (rutas con query string, proyectos y navegadores)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat ab31892..HEAD -- e2e/ playwright.config.ts package.json`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: `plans/020-plantillas-lista-sin-snapshot.md` (arregla la captura 06; sin él, el paso 4 de este plan no puede pasar)
- **Category**: dx
- **Planned at**: commit `ab31892`, 2026-08-24

## Why this matters

Las capturas de `screenshots/` son el artefacto visual de la tesis y hoy tres
cosas las degradan:

1. **`05-insumos` captura una pantalla de error.** El mock de Playwright no
   coincide con la URL real porque la página envía `?page=0`, así que la
   petición cae en el catch-all que devuelve `{}` y la página revienta con
   `TypeError: Cannot read properties of undefined (reading 'length')`.
2. **Las capturas de escritorio se sobrescriben con las de móvil.** Los tres
   proyectos de Playwright (`chromium`, `firefox`, `mobile-chrome`) ejecutan el
   mismo spec y escriben en las **mismas** rutas de `screenshots/`. Gana el
   último: `pnpm run e2e` deja los PNG renderizados a 412 px de ancho, con el
   rail colapsado, aunque el proyecto sea de escritorio.
3. **Firefox no está instalado**, así que `pnpm run e2e` siempre sale con
   exit ≠ 0 y 14 tests fallidos, lo que hace inútil el gate.

Al aterrizar esto, `pnpm run e2e` pasa en verde y `screenshots/` contiene 11
capturas de escritorio que muestran la aplicación funcionando.

## Current state

### (1) Rutas que no matchean por el query string

`e2e/screenshots.spec.ts:400-416`, `baseAutenticado()` instala un catch-all:

```ts
await page.route(`${API}/**`, (route) => route.fulfill(json({})));
```

y el test 05 registra una ruta **sin comodín**:

```ts
// e2e/screenshots.spec.ts:456-460
await page.route(`${API}/proyectos/1/insumos`, (route) =>
  route.fulfill(
    json({ contenido: insumos, page: 0, size: 25, totalElementos: 4, totalPaginas: 1 }),
  ),
);
```

Pero `TablaInsumos` **siempre** manda `page`:

```ts
// src/features/insumos/components/TablaInsumos.tsx:96-102
const filtros = useMemo(() => {
  const f: Record<string, unknown> = {};
  if (tipo) f.tipo = tipo;
  if (q) f.q = q;
  if (soloDesactualizados) f.desactualizados = true;
  f.page = page;           // ← siempre presente
  return f;
}, [tipo, q, soloDesactualizados, page]);
```

La petición real es `GET …/proyectos/1/insumos?page=0`, que el patrón literal no
matchea. Cae al catch-all → `{}` → `data.contenido` es `undefined`.

Reproducción:

```
$ pnpm exec playwright test --project=chromium e2e/screenshots.spec.ts -g "05-insumos"
PAGE ERROR: LimiteDeError atrapó: TypeError: Cannot read properties of undefined (reading 'length')
```

Los tests que **sí** funcionan (`02-proyectos`, `07-apu-editor`) son los que
consultan endpoints sin parámetros de query. `08-presupuesto` usa
`${API}/presupuestos/*/apus` con comodín y por eso no sufre el problema.

### (2) Los tres proyectos escriben en el mismo sitio

`e2e/screenshots.spec.ts:10` y `:374`:

```ts
const OUT = join(__dirname, "..", "screenshots");
// ...
const buf = await page.screenshot({ fullPage: true });
```

`playwright.config.ts:14-18`:

```ts
projects: [
  { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
],
```

`capturar()` no distingue el proyecto, así que las tres ejecuciones compiten por
`screenshots/NN-nombre.png`.

### (3) Firefox ausente

```
$ pnpm run e2e
14 failed  ([firefox] › …)   28 passed
╔══ Looks like Playwright Test or Playwright was just installed or updated. ══╗
║ pnpm exec playwright install                                               ║
```

### Convenciones del repo

- Gate de verificación: `pnpm run verify` (typecheck · lint · format:check ·
  test · build). `pnpm run e2e` es un comando aparte.
- Los tests E2E viven en `e2e/`; `e2e/axe.ts` centraliza la comprobación de
  accesibilidad y `e2e/smoke.spec.ts` es el spec de humo.
- Gestor de paquetes: **pnpm** (hay `pnpm-lock.yaml` y `pnpm-workspace.yaml`).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Instalar navegadores | `pnpm exec playwright install --with-deps` | exit 0 |
| Solo capturas (escritorio) | `pnpm exec playwright test --project=chromium e2e/screenshots.spec.ts` | 11 passed |
| Un caso | `pnpm exec playwright test --project=chromium e2e/screenshots.spec.ts -g "05-insumos"` | 1 passed |
| Suite completa | `pnpm run e2e` | exit 0 |
| Buscar errores de página | `pnpm exec playwright test --project=chromium e2e/screenshots.spec.ts 2>&1 \| grep -c "PAGE ERROR"` | `0` |

## Scope

**In scope**:
- `e2e/screenshots.spec.ts`
- `playwright.config.ts`
- `package.json` (solo el bloque `scripts`)
- `README.md` (solo la sección de comandos, si documenta `e2e`)

**Out of scope** (NO tocar):
- Cualquier archivo bajo `src/` — si una captura sigue rota **después** de
  arreglar los mocks, es un bug de producto y va en su propio plan, no aquí.
  (`06-apus` es justo eso: lo arregla el plan 020.)
- `e2e/smoke.spec.ts` y `e2e/axe.ts` — los tests de humo y accesibilidad pasan;
  no los toques salvo el cambio de proyectos del paso 3, que los afecta solo por
  configuración.
- Los PNG de `screenshots/` no se editan a mano: se regeneran.

## Git workflow

- Rama: `advisor/021-e2e-capturas`
- Estilo de commit: conventional commits, p. ej. `test: match e2e routes with query strings`
- No hagas push ni abras PR salvo instrucción explícita.

## Steps

### Step 1: Instalar los navegadores

```
pnpm exec playwright install --with-deps
```

Si el entorno no permite instalar dependencias del sistema, prueba
`pnpm exec playwright install` (sin `--with-deps`) y anota la limitación.

**Verify**: `pnpm exec playwright install --dry-run` no lista navegadores
faltantes; o `pnpm run e2e` deja de imprimir el banner "Looks like Playwright
Test or Playwright was just installed".

### Step 2: Que todas las rutas mockeadas toleren query string

En `e2e/screenshots.spec.ts`, **toda** `page.route()` que apunte a un endpoint
de listado debe terminar en un comodín. Revisa cada `page.route` del archivo y
añade `*` donde falte:

```ts
// ANTES
await page.route(`${API}/proyectos/1/insumos`, …)
// DESPUÉS
await page.route(`${API}/proyectos/1/insumos*`, …)
```

Un solo `*` basta: en los globs de Playwright `*` no cruza `/`, así que
`…/insumos*` matchea `…/insumos` y `…/insumos?page=0`, pero **no**
`…/insumos/3/uso` (que tiene su propia ruta). Aplícalo como mínimo a
`/proyectos/1/insumos`, `/bases-centrales`, `/proyectos/1/presupuestos` y
`/proyectos` (en `baseAutenticado`). Registra una ruta por endpoint; no
conviertas todo en un comodín gigante, porque perderías la especificidad.

Deja el catch-all `${API}/**` como está: es la red de seguridad.

**Verify**:
`pnpm exec playwright test --project=chromium e2e/screenshots.spec.ts -g "05-insumos" 2>&1 | grep -c "PAGE ERROR"`
→ `0`, y `screenshots/05-insumos.png` muestra la tabla de insumos.

### Step 3: Separar las capturas por proyecto y no correrlas tres veces

Dos cambios que deben ir juntos:

**3a.** En `playwright.config.ts`, excluye el spec de capturas de los proyectos
que no son de escritorio. Usa `testIgnore` en los proyectos `firefox` y
`mobile-chrome`:

```ts
{ name: "firefox", testIgnore: /screenshots\.spec\.ts/, use: { ...devices["Desktop Firefox"] } },
{ name: "mobile-chrome", testIgnore: /screenshots\.spec\.ts/, use: { ...devices["Pixel 7"] } },
```

Así `chromium` sigue generando las 11 capturas de escritorio, y firefox y móvil
siguen ejecutando el humo y la accesibilidad —que es su valor real.

**3b.** Como defensa en profundidad, haz que `capturar()` no pueda pisar el
archivo de otro proyecto. En `e2e/screenshots.spec.ts`, `capturar()` recibe la
página; dale también el nombre del proyecto vía `testInfo` y escribe en
`screenshots/` solo cuando sea `chromium`:

```ts
async function capturar(page: Page, nombre: string, testInfo: TestInfo) {
  const buf = await page.screenshot({ fullPage: true });
  if (testInfo.project.name !== "chromium") return;   // solo escritorio manda
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, `${nombre}.png`), buf);
}
```

y en cada test pasa el `testInfo`: `test("05-insumos", async ({ page }, testInfo) => { … await capturar(page, "05-insumos", testInfo); })`.

Conserva la firma y el comportamiento actual de `capturar()` en lo demás
(`fullPage: true`, `mkdirSync`).

**Verify**: `pnpm run e2e` → exit 0. Después:
`pnpm exec playwright test e2e/screenshots.spec.ts --list | grep -c chromium`
debe igualar el número total de tests listados (ningún otro proyecto los corre).

### Step 4: Regenerar las capturas y revisarlas

```
pnpm exec playwright test --project=chromium e2e/screenshots.spec.ts
```

Abre **cada** PNG de `screenshots/` y confirma que ninguno muestra
"Algo salió mal en esta sección" ni un estado vacío inesperado. Si alguno sigue
roto, ejecútalo aislado con `-g` y lee la línea `PAGE ERROR`: si el fallo viene
de `src/`, es un bug de producto → STOP y repórtalo, no lo tapes con un mock.

**Verify**:
`pnpm exec playwright test --project=chromium e2e/screenshots.spec.ts 2>&1 | grep -c "PAGE ERROR"`
→ `0`, y `ls screenshots/*.png | wc -l` → `11`.

### Step 5: Un script explícito para las capturas

En `package.json`, añade junto a `"e2e"`:

```json
"e2e:screenshots": "playwright test --project=chromium e2e/screenshots.spec.ts"
```

Documenta el comando en `README.md`, en la sección donde ya aparece
`pnpm run e2e`.

**Verify**: `pnpm run e2e:screenshots` → 11 passed

## Test plan

Este plan no añade tests unitarios: su producto *son* los tests E2E existentes
pasando. Los criterios de aceptación sustituyen al plan de pruebas.

Una comprobación de regresión que sí conviene dejar por escrito: tras el paso 2,
`grep -n "page.route" e2e/screenshots.spec.ts` no debe mostrar ninguna ruta de
listado sin `*` ni `**` al final. Es la clase de error que volverá a colarse.

## Done criteria

- [ ] `pnpm run e2e` sale con exit 0
- [ ] `pnpm exec playwright test --project=chromium e2e/screenshots.spec.ts` → 11 passed
- [ ] `pnpm exec playwright test --project=chromium e2e/screenshots.spec.ts 2>&1 | grep -c "PAGE ERROR"` → `0`
- [ ] `ls screenshots/*.png | wc -l` → `11`, y ninguna muestra el límite de error
- [ ] Las capturas son de escritorio: el rail lateral de 256 px es visible en `screenshots/02-proyectos.png`
- [ ] `pnpm run e2e:screenshots` existe y funciona
- [ ] `git status` no muestra archivos modificados bajo `src/`
- [ ] Fila de estado actualizada en `plans/README.md`

## STOP conditions

Para y reporta si:

- Tras arreglar los mocks, una captura sigue mostrando el límite de error: el
  fallo está en `src/` y arreglarlo queda fuera de este plan.
- No puedes instalar los navegadores de Playwright en este entorno. Termina los
  pasos 2, 3 y 5 (que no dependen de firefox), y reporta el paso 1 como
  bloqueado en vez de borrar el proyecto `firefox` de la configuración.
- `testIgnore` no se comporta como esperas en la versión de Playwright instalada
  (`pnpm list @playwright/test`): reporta la versión y el comportamiento
  observado antes de buscar un apaño.

## Maintenance notes

- La regla que hay que sostener: **toda ruta mockeada de un endpoint de listado
  lleva `*` al final**, porque la paginación puede aparecer en cualquier
  momento. `TablaInsumos` manda `page` siempre; otras tablas podrían empezar a
  hacerlo.
- El catch-all `${API}/**` que devuelve `{}` es, sin querer, un test de fuzzing:
  cada vez que una ruta deja de matchear, la página recibe un objeto vacío y
  revienta. Que reviente en lugar de degradar es el problema de fondo — la capa
  `src/api/request.ts` no valida nada en runtime. Ver la nota de dirección en
  `plans/README.md`.
- Si en el futuro se quieren capturas móviles *además* de las de escritorio, la
  vía correcta es que `capturar()` escriba en `screenshots/<proyecto>/`, no
  quitar el `testIgnore`.
