# Plan 094: Formato numérico consistente en todo el frontend

> **Instrucciones para quien ejecute**: sigue este plan paso a paso. Corre cada
> comando de verificación y confirma el resultado esperado antes de avanzar al
> siguiente paso. Si ocurre algo listado en "Condiciones STOP", detente y
> repórtalo — no improvises. Al terminar, actualiza la fila de este plan en
> [`../00.INDEX.md`](../00.INDEX.md) (tabla "Planes nuevos 075–093" → añade
> 094/095), salvo que quien te despache te diga que él mantiene el índice.
>
> **Comprobación de deriva (ejecutar primero)**:
> `git diff --stat 246cbf6..HEAD -- src/lib/decimal.ts src/components/comunes src/hooks/useDisplayConfig.ts src/features/apu-editor/components/PopoverDesglose.tsx src/features/apu-editor/components/PieTotales.tsx src/features/apu-editor/components/PanelEspecificacionTecnica.tsx src/features/presupuesto/components/ResumenComponentes.tsx src/features/proyectos/pages/ResumenProyectoPage.tsx`
> Si alguno de estos archivos cambió desde que se escribió este plan, compara
> los fragmentos de "Estado actual" contra el código real antes de continuar;
> si no coinciden, trátalo como condición STOP.

## Estado

- **Prioridad**: P2
- **Esfuerzo**: M
- **Riesgo**: MED — toca el único punto de formato compartido por todo el
  frontend (`src/lib/decimal.ts`); el cambio es mecánico pero de alcance ancho
  (afecta toda cifra visible en la aplicación).
- **Depende de**: ninguno
- **Categoría**: bug (consistencia de presentación)
- **Planificado en**: commit `246cbf6`, 2026-09-11

## Por qué importa

El frontend ya tiene una única fuente de formato numérico (`src/lib/decimal.ts`,
consumida por `Numero`/`Moneda`/`Porcentaje`), pero produce el separador
incorrecto y un valor por defecto que no coincide con la propia configuración
del sistema. Dos defectos concretos, verificados contra el código real:

1. **Separadores al revés de lo pedido.** El locale `es-EC` usado en
   `Intl.NumberFormat` da coma para decimales y punto para miles
   (`"$1.234.567,89"`). El requisito del negocio es punto para decimales y
   coma para miles (`"$1,234,567.89"`), verificado ejecutando
   `Intl.NumberFormat('es-EC').format(1234567.891234)` → `"1.234.567,8912"`
   contra `Intl.NumberFormat('en-US', …).format(1234567.891234)` →
   `"1,234,567.8912"`.
2. **`formatearPorcentaje` no respeta su propio default del sistema.** El
   default interno de esta función es `dp = 2` (`src/lib/decimal.ts:34`), pero
   la escala de porcentaje del backend es 4 (`ESCALA_PORCENTAJE = 4`,
   `src/lib/decimal.ts:71`) y la configuración de precisión de display por
   defecto también es 4 (`DISPLAY_DEFAULTS.precisionPorcentaje = 4`,
   `src/hooks/useDisplayConfig.ts:10`). El componente `<Porcentaje>` sí lee
   esa configuración y muestra 4 decimales; **cualquier llamada directa a
   `formatearPorcentaje(x)` que no pase por `<Porcentaje>` muestra 2
   decimales** — inconsistencia real, visible hoy entre pantallas (%HM/%CI del
   editor de APU muestran 2 decimales; el propio componente `<Porcentaje>`
   muestra 4 para el mismo tipo de dato en otra pantalla). Un sitio además
   fuerza 1 decimal a mano, sin relación con ninguna de las dos escalas.

Después de este plan: toda cifra del frontend usa punto decimal y coma de
miles, precios siempre a 2 decimales y porcentajes siempre a 4, sin excepción
salvo las etiquetas de eje de un gráfico (ver "Fuera de alcance").

## Estado actual

Archivos relevantes, cada uno con su rol:

- `src/lib/decimal.ts` — única fuente de formato del repo. `LOCALE` fija el
  locale de `Intl.NumberFormat` para las cuatro funciones de formateo.
  `formatearPorcentaje` trae su propio default de decimales, independiente de
  `ESCALA_PORCENTAJE`.
- `src/hooks/useDisplayConfig.ts` — expone `useDisplayPrecision()`, que
  resuelve a `DISPLAY_DEFAULTS` (`{ precisionDinero: 2, precisionPorcentaje: 4 }`)
  hasta que `GET /config/display` resuelva. **Ya tiene los valores correctos**;
  no se toca en este plan.
- `src/components/comunes/Numero.tsx`, `Moneda.tsx`, `Porcentaje.tsx` — ya
  leen `useDisplayPrecision()` y la usan como default. **Son el patrón
  correcto**; no se tocan, sirven de ejemplo para lo que hace falta en las
  llamadas directas de abajo.

Fragmento de `src/lib/decimal.ts` (líneas 1–43) tal como está hoy:

```ts
export type Decimal = string & { readonly __brand: "Decimal" };

export const asDecimal = (v: string): Decimal => v as Decimal;

export const DECIMAL_ZERO = asDecimal("0.000000");

const LOCALE = "es-EC";

export function formatearMoneda(valor: Decimal | number | null | undefined, dp = 2): string {
  if (valor == null || valor === "") return "—";
  const n = Number(valor);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  }).format(n);
}

export function formatearNumero(
  valor: Decimal | number | null | undefined,
  { min = 2, max = 4 }: { min?: number; max?: number } = {},
): string {
  if (valor == null || valor === "") return "—";
  const n = Number(valor);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  }).format(n);
}

export function formatearPorcentaje(valor: Decimal | number | null | undefined, dp = 2): string {
  if (valor == null || valor === "") return "—";
  const n = Number(valor);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(LOCALE, {
    style: "percent",
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  }).format(n);
}
```

Llamadas directas a `formatearPorcentaje` que **no** pasan por `<Porcentaje>`
(hoy caen en el default equivocado de 2, deben quedar en 4 tras el fix del
default — no hace falta tocar estos call sites, solo el default):

- `src/features/apu-editor/components/PopoverDesglose.tsx:51,54` (`%HM`, `%CI aplicado`)
- `src/features/apu-editor/components/PieTotales.tsx:99,114` (`porcentajeIndirectoEfectivo`, dos veces)
- `src/features/presupuesto/components/ResumenComponentes.tsx:56` (`item.pct`)

Una llamada fuerza un override explícito de 1 decimal, sin relación con
`ESCALA_PORCENTAJE` (4) ni con el viejo default (2) — **este override sí hay
que borrarlo**:

```tsx
// src/features/proyectos/pages/ResumenProyectoPage.tsx:296-300
componentes.map((c) => (
  <div key={c.etiqueta} className="flex flex-col gap-1 bg-card p-4">
    <span className="text-xs text-muted-foreground">
      {c.etiqueta} · {formatearPorcentaje(c.porcentaje, 1)}
    </span>
```

Dos usos de `Number.prototype.toLocaleString("es-EC")` que formatean cifras
por fuera de `src/lib/decimal.ts`, es decir, por fuera del único punto que
este plan corrige — uno debe migrarse, el otro está fuera de alcance:

```tsx
// src/features/apu-editor/components/PanelEspecificacionTecnica.tsx:60
{bytes.toLocaleString("es-EC")} / {LIMITE_BYTES.toLocaleString("es-EC")} bytes
```

Esto es un contador de bytes (entero, sin relación con precios ni
porcentajes) pero usa el mismo locale hardcodeado que se está corrigiendo;
debe migrarse a `formatearNumero` para que el separador de miles quede
gobernado desde un único sitio.

```tsx
// src/features/admin/pages/AdminLogsPageActiva.tsx:193 — FUERA DE ALCANCE
<TableCell>{new Date(log.fecha).toLocaleString("es-EC")}</TableCell>
```

Esto formatea una **fecha**, no un número — el pedido del usuario es sobre
formato numérico (separador decimal/miles, decimales de precios y
porcentajes). No lo toques.

## Comandos que necesitarás

| Propósito         | Comando                                                                                                   | Resultado esperado        |
| ------------------ | ----------------------------------------------------------------------------------------------------------- | -------------------------- |
| Typecheck          | `pnpm run typecheck`                                                                                       | exit 0, sin errores        |
| Lint               | `pnpm run lint`                                                                                             | exit 0                     |
| Guarda ADR 9       | `pnpm run guard:adr9`                                                                                       | exit 0 (no toca `toFixed`/`parseFloat`) |
| Formato            | `pnpm run format:check`                                                                                     | exit 0                     |
| Tests focalizados  | `pnpm exec vitest run src/test/lib/decimal.test.ts src/test/components/comunes src/test/features/cronograma src/test/features/proyectos/pages/ResumenProyectoPage.test.tsx src/test/features/apu-editor/components/PanelEspecificacionTecnica.test.tsx` | todos en verde             |
| Suite completa     | `pnpm run test`                                                                                             | todos en verde             |
| Verify completo    | `pnpm run verify`                                                                                           | exit 0                     |

## Alcance

**En alcance (únicos archivos que debes modificar):**

- `src/lib/decimal.ts` — cambiar `LOCALE` y el default de `formatearPorcentaje`
- `src/features/proyectos/pages/ResumenProyectoPage.tsx` — quitar el override `, 1`
- `src/features/apu-editor/components/PanelEspecificacionTecnica.tsx` — migrar el contador de bytes a `formatearNumero`
- Cualquier archivo de test cuyo `pnpm run test` falle **solo** porque el string
  esperado usa el separador o la cantidad de decimales antiguos (lista de
  partida abajo en "Plan de pruebas"; puede haber alguno más que esa lista no
  cubra — el criterio es la suite en rojo, no esta lista)

**Fuera de alcance (no toques, aunque se parezcan):**

- `src/hooks/useDisplayConfig.ts` y `DISPLAY_DEFAULTS` — ya tienen los valores
  correctos (2 y 4); no cambian.
- `src/components/comunes/Numero.tsx`, `Moneda.tsx`, `Porcentaje.tsx` — ya
  hacen lo correcto (leen `useDisplayPrecision()`); no cambian.
- `formatearPuntosPorcentaje` (`src/lib/decimal.ts:51-57`) — su default ya es
  `ESCALA_PORCENTAJE` (4); el espacio antes de `%` que agrega a mano
  (`` `${n} %` ``) es una convención existente e independiente del locale, no
  la toques.
- Las etiquetas de eje de `CurvaSChart.tsx:217`
  (`formatearPuntosPorcentaje(valor, 0)`, para pintar 0/25/50/75/100 en la
  cuadrícula) — son ticks redondos de un eje, no una cifra de dato; forzarles
  4 decimales (`0,0000 %`, `25,0000 %`…) degradaría la lectura del gráfico sin
  aportar nada. Déjalas como están.
- `src/features/admin/pages/AdminLogsPageActiva.tsx:193` — formatea una fecha,
  no un número.
- `src/components/ui/calendar.tsx:43` (`date.toLocaleString(locale?.code, …)`)
  — nombres de mes, no es una cifra.
- Cualquier aritmética de dinero: este plan es solo presentación. No cambies
  `cuantizar`, `porcentajeAFraccion`, `fraccionAPorcentaje`, ni ningún cálculo.
- `plans/README.md`, `plans/BITACORA.md` — no forman parte del alcance de
  código; el índice a actualizar es `plans/00.INDEX.md`.

## Flujo de git

- Rama: `fix/094-formato-numerico-consistente` (o la convención vigente del repo)
- Un commit por paso lógico; estilo de mensaje: convencional, en español, como
  el resto del historial (`fix(decimal): …`, `test(decimal): …`)
- No hagas push ni abras PR salvo que se te indique explícitamente.

## Pasos

### Paso 1: cambiar el locale de formato a punto-decimal/coma-miles

En `src/lib/decimal.ts:7`, cambia:

```ts
const LOCALE = "es-EC";
```

por:

```ts
// Requisito de negocio 2026-09-11: punto para decimales, coma para miles,
// en todo el frontend — es la convención opuesta a la de es-EC
// (`Intl.NumberFormat('es-EC')` da coma decimal / punto de miles).
// en-US produce exactamente la convención pedida sin tocar cada función.
const LOCALE = "en-US";
```

No cambies nada más de las cuatro funciones (`formatearMoneda`,
`formatearNumero`, `formatearPorcentaje`, `formatearPuntosPorcentaje`) en este
paso.

**Verificar**: `node -e "console.log(new Intl.NumberFormat('en-US', {style:'currency', currency:'USD', minimumFractionDigits:2, maximumFractionDigits:2}).format(1234567.89))"` → `$1,234,567.89`

### Paso 2: corregir el default de `formatearPorcentaje`

En `src/lib/decimal.ts:34`, cambia:

```ts
export function formatearPorcentaje(valor: Decimal | number | null | undefined, dp = 2): string {
```

por:

```ts
export function formatearPorcentaje(
  valor: Decimal | number | null | undefined,
  dp = ESCALA_PORCENTAJE,
): string {
```

`ESCALA_PORCENTAJE` se declara más abajo en el mismo archivo (línea 71) con
valor `4`; TypeScript con `tsc -b` no exige que las declaraciones de nivel de
módulo estén en orden textual, así que no hace falta mover nada. Confírmalo
con el paso de typecheck.

**Verificar**: `pnpm run typecheck` → exit 0

### Paso 3: quitar el override incorrecto de 1 decimal

En `src/features/proyectos/pages/ResumenProyectoPage.tsx:299`, cambia:

```tsx
{c.etiqueta} · {formatearPorcentaje(c.porcentaje, 1)}
```

por:

```tsx
{c.etiqueta} · {formatearPorcentaje(c.porcentaje)}
```

(deja que use el nuevo default de 4 decimales del Paso 2).

**Verificar**: `pnpm run lint` → exit 0

### Paso 4: migrar el contador de bytes al formateador compartido

En `src/features/apu-editor/components/PanelEspecificacionTecnica.tsx`,
importa `formatearNumero` desde `@/lib/decimal` y cambia la línea 60:

```tsx
{bytes.toLocaleString("es-EC")} / {LIMITE_BYTES.toLocaleString("es-EC")} bytes
```

por:

```tsx
{formatearNumero(bytes, { min: 0, max: 0 })} / {formatearNumero(LIMITE_BYTES, { min: 0, max: 0 })} bytes
```

`formatearNumero` acepta `Decimal | number | null | undefined`; `bytes` y
`LIMITE_BYTES` son `number` en este archivo, así que no hace falta castear.

**Verificar**: `pnpm run typecheck` → exit 0

### Paso 5: correr la suite y actualizar los strings de prueba obsoletos

Ejecuta `pnpm run test`. Cualquier test que falle **solo** porque el texto
esperado trae el separador viejo (coma decimal / punto de miles) o la
cantidad de decimales vieja (2 en vez de 4 para porcentaje) debe actualizarse
al nuevo formato — nunca relajar el assert (no cambies `toBe` por `toMatch`
para esquivar el fallo; corrige el string esperado).

Lista de partida conocida (verificada durante la redacción de este plan; la
suite puede revelar alguna más — en ese caso corrígela con el mismo criterio):

- `src/test/lib/decimal.test.ts:20` — `toContain("61,39")` → `toContain("61.39")`
- `src/test/lib/decimal.test.ts:29` — `toMatch(/18,00\s?%/)` → `toMatch(/18\.00%/)` (ver nota de Paso 2: con default 4, `formatearPorcentaje(asDecimal("0.1800"))` da `18.0000%`; ajusta la expectativa a 4 decimales, no a 2)
- `src/test/lib/decimal.test.ts:33` — `toBe("0,10")` → `toBe("0.10")`
- `src/test/components/comunes/Numero.test.tsx:11` — `getByText("1.234,50")` → `getByText("1,234.50")`
- `src/test/components/comunes/Numero.test.tsx:16` — `getByText("0,1234")` → `getByText("0.1234")`
- `src/test/features/cronograma/pages/CronogramaPage.test.tsx:178-179` — `"25,2253 %"`/`"5,4054 %"` → `"25.2253 %"`/`"5.4054 %"`
- `src/test/features/cronograma/components/DialogosCronograma.test.tsx:32,146,187,195` — `"25,2253 %"`/`"75,6757 %"` → `"25.2253 %"`/`"75.6757 %"`
- `src/test/features/cronograma/components/DialogosCronograma.test.tsx:196` — `"$14.000,00"` → `"$14,000.00"`

Nota: `src/test/components/comunes/Porcentaje.test.tsx` ya espera 4 decimales
(`/^15,0000\s?%$/`, `/^15,00\s?%$/` para el caso `dp={2}` explícito) — solo
necesita el cambio de separador (`,` → `.`), no de cantidad de decimales; no
lo confundas con los call sites del Paso 2/3, que si cambian de cantidad.

Revisa también, sin asumir que están limpios, cualquier test de
`PieTotales`, `PopoverDesglose` y `ResumenComponentes` que la ejecución marque
en rojo por el nuevo default de 4 decimales en porcentaje.

**Verificar**: `pnpm run test` → todos en verde

### Paso 6: verificación completa

**Verificar**: `pnpm run verify` → exit 0 (typecheck, lint, guard:adr9,
format:check, test, build)

## Plan de pruebas

- No se agregan pruebas nuevas: este plan corrige el *valor* de assertions
  existentes que fijan el formato de presentación, no agrega comportamiento
  nuevo. Coincide con la política de pruebas de `AGENTS.md`: "no exijas tests
  unitarios nuevos para copy, layout, estilos... compruébalos mediante
  typecheck, lint y verificación manual focalizada".
- Verificación manual: levanta `pnpm run dev`, abre una pantalla con dinero y
  porcentaje visibles a la vez (por ejemplo `/proyectos/{uuid}/apus/{apuId}`,
  el editor de APU con `PopoverDesglose` y `PieTotales`) y confirma a simple
  vista: los precios muestran punto decimal y 2 decimales, coma de miles
  cuando aplique; los porcentajes muestran punto decimal y 4 decimales.
- Patrón estructural a seguir para cualquier assertion nueva que tengas que
  tocar: los tests existentes en `src/test/lib/decimal.test.ts` (formato) y
  `src/test/components/comunes/Porcentaje.test.tsx` (default de precisión).

## Criterios de cierre

Deben cumplirse TODOS:

- [ ] `pnpm run typecheck` sale con exit 0
- [ ] `pnpm run lint` sale con exit 0
- [ ] `pnpm run guard:adr9` sale con exit 0
- [ ] `pnpm run format:check` sale con exit 0
- [ ] `pnpm run test` sale con exit 0, sin tests desactivados ni relajados
- [ ] `pnpm run build` sale con exit 0
- [ ] `grep -rn 'toLocaleString("es-EC")' src --include='*.tsx' --include='*.ts'` solo devuelve `src/features/admin/pages/AdminLogsPageActiva.tsx:193` (la fecha, fuera de alcance) y `src/components/ui/calendar.tsx` (nombre de mes, fuera de alcance) — cero coincidencias de números
- [ ] `grep -n 'dp = 2' src/lib/decimal.ts` solo devuelve la línea de `formatearMoneda` (que sí debe seguir en 2), no la de `formatearPorcentaje`
- [ ] No hay archivos modificados fuera de la lista de "Alcance" (`git status`)
- [ ] Fila de este plan actualizada en `plans/00.INDEX.md`

## Condiciones STOP

Detente y reporta (no improvises) si:

- El código en las ubicaciones de "Estado actual" no coincide con los
  fragmentos citados (el repo cambió desde que se escribió este plan).
- Después de los pasos 1–2, `pnpm run test` muestra fallos en archivos que no
  tienen relación con formato de números/porcentajes/dinero (indicaría un
  efecto colateral no previsto del cambio de locale).
- Encuentras una tercera función o componente que formatee dinero o
  porcentaje sin pasar por `src/lib/decimal.ts` (no listada en "Estado
  actual") — repórtalo en vez de decidir tú si corregirlo aquí o en un plan
  aparte.
- `ESCALA_PORCENTAJE` no vale `4` en el código real (contradiría la premisa
  de este plan sobre cuál es "el" valor correcto).

## Notas de mantenimiento

- Si en el futuro se agrega una nueva función de formateo numérico en
  cualquier parte del código, debe vivir en `src/lib/decimal.ts` y usar la
  constante `LOCALE` del mismo archivo — es el único sitio autorizado a
  decidir separadores, por el mismo argumento de "una sola fuente de verdad"
  que ya aplica a `toFixed`/`parseFloat` (ADR 9, `pnpm run guard:adr9`).
  Vale la pena, en un plan aparte, considerar extender esa guarda para que
  además falle si aparece un `toLocaleString(` con un locale hardcodeado
  fuera de `src/lib/decimal.ts` — no se hace aquí para no ampliar el alcance
  de este plan.
- Cuando el backend publique `GET /config/display` con valores reales (hoy
  `useDisplayConfig` usa `DISPLAY_DEFAULTS` como `placeholderData`), los
  componentes `Numero`/`Moneda`/`Porcentaje` ya están listos para reflejar la
  precisión configurada; los call sites directos corregidos en este plan
  (Paso 2) seguirán en el default fijo de `ESCALA_PORCENTAJE`/2, porque no
  pasan por `useDisplayPrecision()`. Si esa divergencia importa, es un plan
  aparte: migrar esos call sites a usar `<Porcentaje>`/`<Moneda>` en vez de
  llamar a `formatearPorcentaje`/`formatearMoneda` directamente.
- Revisor: comprobar que el commit no toca ningún archivo de
  `src/lib/decimal.ts` más allá de las dos líneas señaladas, y que ningún test
  quedó con un assert genérico (`toBeTruthy()`, `toMatch(/\d/)`) puesto para
  esquivar el string exacto — eso sería el Patrón D de `docs/bugs.md` ("el
  test que no mira").
