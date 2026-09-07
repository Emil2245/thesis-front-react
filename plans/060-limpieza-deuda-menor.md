# Plan 060 — Limpieza: shadcn sin usar, warnings de lint y deuda menor

**Status:** DONE (2026-09-06, rama `ola6-060`, sobre `8547daf`)
**Escrito contra:** frontend `8cc08b5`
**Esfuerzo:** S (2–3 h) · **Riesgo:** BAJO
**Depende de:** todo lo demás. Es la última ola: verifica que los otros planes cerraron limpio
**Evidencia:** [`INVENTARIO-COBERTURA.md`](INVENTARIO-COBERTURA.md) §5 y §7

Cinco cosas pequeñas que no justifican un plan cada una. Ninguna bloquea nada; todas son deuda que
crece si no se recoge. **Ejecutar al final**, cuando 053–055 hayan dejado de mover `contract.ts`.

## 1 — Los 8 componentes shadcn sin usar

35 instalados, 8 con cero importaciones. Pero no son todos el mismo caso, y **borrarlos todos de
golpe sería el error**.

### Borrar sin pensarlo (4)

`accordion` · `empty` · `radio-group` · `scroll-area` — instalados «por si acaso», sin equivalente
propio, sin pantalla que los pida.

### Investigar antes de tocar (4)

Aquí hay un componente propio haciendo el trabajo del primitivo:

| Sin usar | Componente propio | Pregunta |
|---|---|---|
| `popover` | `apu-editor/components/PopoverDesglose.tsx` | S-26 se especifica como Popover. ¿El componente propio reimplementa el posicionamiento y el foco, o usa otra cosa? |
| `combobox` + `command` | `insumos/ComboboxUnidad.tsx` · `apu-editor/SelectorInsumo.tsx` | S-23 se especifica como «combobox/panel». `cmdk` está en `dependencies`, así que algo lo usa. |
| `progress` | — | El cronograma muestra avances por período sin barra. ¿Lo pide S-33? |

**La deuda puede ser al revés.** Si `PopoverDesglose` reimplementa a mano lo que
`ui/popover` ya da —posicionamiento, cierre al hacer clic fuera, trampa de foco— entonces sobra el
componente propio, no el primitivo, y borrar el primitivo consolida el error.

Reimplementar accesibilidad a mano es exactamente el tipo de cosa que se hace mal en silencio.
Comprobar con `e2e/axe.ts` antes de decidir.

Regla: **un componente `ui/` solo se borra cuando se ha verificado que nada lo necesita, ni
directamente ni a través de un sustituto peor.**

## 2 — Los 3 warnings reales de lint

10 warnings, 0 errores. Siete son `react(incompatible-library)` de react-hook-form contra React
Compiler: ruido conocido, no se arreglan desde aquí.

Los tres que sí:

| Sitio | Regla | Nota |
|---|---|---|
| `shell/contexto.ts:50` | `react-hooks(exhaustive-deps)` falta `cambiar` | **El único que puede morder de verdad** |
| `apu-editor/components/DialogoNuevoApu.tsx:49` | `react(set-state-in-effect)` | derivar en render o inicializar el estado |
| `hooks/use-mobile.ts:14` | `react(set-state-in-effect)` | lo arregla el plan 056 si se ejecuta |

**`shell/contexto.ts:50` merece cuidado.** Es el contexto de versión activa: de ahí salen los
`presupuestoId` que los planes 053 y 055 re-tipan, y de ahí sale el `?v=` de la URL. Un efecto con
dependencias incompletas ahí significa que el contexto puede quedarse con una versión vieja tras
un cambio de proyecto. **Arreglarlo dentro del plan 053**, no aquí: el 053 ya toca ese archivo y
va a añadirle tests.

Si el 053 ya lo cerró, verificar y tachar.

## 3 — Los ids numéricos de la suite E2E

`e2e/screenshots.spec.ts` (556 líneas) arrastra **~26 ids numéricos**. Está fuera del gate de
vitest, así que `npm run verify` pasa con ellos dentro, y el plan 021 —que cerró como DONE— es su
dueño nominal.

Con los planes 053 y 055 los ids pasan a UUID en toda la aplicación. Esas 26 referencias quedan
inconsistentes con el resto del repo aunque los tests sigan pasando (son capturas de pantalla
contra rutas mockeadas).

Sustituirlas por los mismos UUIDv7 estables que usen las fixtures de vitest. Compartir las
constantes en vez de duplicarlas: si las fixtures y los E2E usan ids distintos, el problema vuelve.

**Reabrir el plan 021** o anotar aquí que su alcance se extendió. No dejarlo huérfano: un plan
cerrado con trabajo pendiente dentro es cómo se pierde el rastro.

## 4 — Los 9 `as never`

| Archivo | Líneas | Causa |
|---|---|---|
| `cronograma/pages/CronogramaPage.tsx` | 144, 145, 147 | objeto-actividad ficticio con `id: 0` — lo borra el plan **055** |
| `cronograma/components/GanttChart.tsx` | 115, 144, 175 | números convertidos a `Decimal` a mano — plan **055** |
| `admin/pages/AdminParametrosPage.tsx` | 83, 84, 85 | `ref.current?.value` forzado a `Decimal` — plan **050** rebanada 5 |

`as never` es un casteo que silencia al compilador. Los nueve tienen la misma causa: **el tipo
branded `Decimal` (string) aplicado donde el dato real es un número.** La política que los retira
la fija el plan [`061`](061-politica-de-dinero.md) (ola 0).

**Este plan no los arregla: los verifica.** Si al terminar 050 y 055 quedan `as never`, la
partición del dinero se resolvió mal y hay que volver al §2 del handoff. Son el detector, no la
tarea.

Cero `@ts-ignore`, cero `@ts-expect-error`, cero `as unknown as`. Y solo 2 `TODO`, ambos
`TODO(047)` y ambos falsos — los borra el plan 053.

## 5 — Comentarios que mienten

Repartidos por el repo, escritos cuando eran ciertos:

- `src/lib/disponibilidad.ts` — «nueve recursos JAX-RS, sin paquetes
  presupuesto/cronograma/export/plantilla/admin». **Son 30 recursos** y existen presupuesto,
  cronograma, plantillas y admin de bases. Lo reescribe el plan 054.
- `useParametrosSistema.ts:16` — dice que las escrituras no existen. **`PUT /proyectos/parametros-sistema`
  existe.** Plan 050.
- `usePresupuesto.ts:44` — se traga un 404 diciendo que la ruta no existe. **Existe.** Plan 053.
- Los 5 comentarios de cabecera de las páginas de admin que dicen «quita "admin" de
  `MODULOS_SIN_BACKEND`». Con el gate por página deja de ser cierto. Plan 050.

Todos tienen dueño en otro plan. **La tarea aquí es verificar que ninguno sobrevivió**, con un
`grep` final:

```
grep -rn "nueve recursos\|TODO(047)\|no existe todavía\|no tiene ningún endpoint" src/
```

Si devuelve algo, el plan que lo debía borrar no terminó.

## Definición de hecho

- `npm run verify` en verde.
- Los 4 componentes shadcn muertos, borrados. Los otros 4, con una decisión escrita en este
  archivo.
- `npm run lint` sin `set-state-in-effect` ni `exhaustive-deps`.
- Cero ids numéricos en `e2e/screenshots.spec.ts`, compartiendo constantes con las fixtures.
- Cero `as never` en `src/`. Si queda alguno, la razón escrita aquí.
- El `grep` de comentarios mentirosos, vacío.

## `useVersiones` duplicado — añadido 2026-09-06 (ola 1)

`src/shell/contexto.ts:13` define un `useVersiones` copiado del de
`src/features/presupuesto/hooks/usePresupuesto.ts:36`. El plan `053` quitó de **ambos** el catch
que se tragaba los 404, que era lo urgente; queda la duplicación.

Unificarlos obliga a que `shell/` importe de `features/`, una dirección de dependencia nueva.
Decidir aquí: o se acepta esa importación, o `useVersiones` baja a un módulo compartido.

---

# Ejecución — 2026-09-06

Los números de arriba son del 2026-09-06 y nueve olas los habían movido. Lo primero
fue volver a medirlos. **Cinco de las seis cuentas del plan habían cambiado**, así que
esta sección registra lo medido, no lo que el plan suponía.

## Lo que se volvió a contar

| Afirmación del plan | Medido hoy | Veredicto |
|---|---|---|
| 8 componentes shadcn sin usar | **8** | correcta, pero *no* la misma lista |
| 10 warnings de lint, 3 reales | **10**, 3 reales, exactamente los tres descritos | correcta |
| ~26 ids numéricos en los E2E | **33** apariciones (26 `/proyectos/1`, 5 `/presupuestos/11`, 2 `/apus/1`) más ids numéricos en los payloads | se quedaba corta |
| 9 `as never` en `src/` | **0 en código de producción**, 59 en `src/test/` | invertida (ver §4) |
| Comentarios que mienten | grep vacío | ya cerrados por 050/053/054 |
| `useVersiones` duplicado | sigue duplicado | correcta (ver §6) |

## 1 — Componentes shadcn: 8 borrados, con una lista distinta

**`sheet` no estaba muerto.** Sale como «sin importaciones» si buscas usos fuera de
`src/components/ui/`, pero `ui/sidebar.tsx` lo importa y el sidebar lo usa toda la app.
El primer barrido lo dio por muerto; lo salvó el `typecheck`.

Borrados los ocho de verdad: `accordion`, `combobox`, `command`, `empty`, `popover`,
`progress`, `radio-group`, `scroll-area`. El árbitro es el compilador, no el `grep`:
`pnpm run typecheck` sigue limpio con los ocho fuera.

**Se cayeron dos dependencias enteras con ellos**, que era la deuda de verdad:

- `cmdk` — sólo la usaba `ui/command.tsx`.
- `@base-ui/react` — sólo la usaba `ui/combobox.tsx`.

### La pregunta de «¿la deuda es al revés?»: no

El plan sospechaba que los componentes propios reimplementaban a mano la accesibilidad
del primitivo, y que entonces sobraba el propio y no el primitivo. Se comprobó, y **no
es el caso**:

- `PopoverDesglose.tsx` no reimplementa nada: monta un `ui/dialog` (Radix). Posicionamiento,
  cierre al hacer clic fuera y trampa de foco los pone Radix. El nombre miente —es un
  diálogo, no un popover— pero el comportamiento es correcto.
- `ComboboxUnidad.tsx` tampoco es un combobox: son unos chips más un `<Input>` nativo.
  No hay lista flotante que posicionar ni foco que atrapar.
- `SelectorInsumo.tsx` es `ui/dialog` + `ui/input` + `ui/select`.

Ninguno reimplementa accesibilidad a mano, así que borrar el primitivo no consolida
ningún error. `progress`: ninguna pantalla lo pide hoy; si S-33 acaba pidiendo barra,
`shadcn add progress` lo devuelve en un comando. Un componente sin usar no es cobertura,
es código muerto.

> Nota para el siguiente: `.oxlintrc.json` tiene `src/components/ui` en `ignorePatterns`,
> así que un componente `ui/` muerto **no genera ni un warning**. No cuentes con el lint
> para encontrarlos.

## 2 — Warnings de lint: de 10 a 7

Los tres reales, cerrados. Quedan **7**, todos `react(incompatible-library)` de
react-hook-form contra el React Compiler: ruido conocido de una librería de terceros, no
se arregla desde aquí. **No se han silenciado**: un `oxlint-ignore` los volvería
invisibles el día que react-hook-form se arregle, y son warnings, no errores, así que no
rompen el gate.

- `shell/contexto.ts` (`exhaustive-deps`, faltaba `cambiar`) — el plan lo mandaba al 053,
  que no lo hizo. Arreglado aquí, y de raíz: `cambiar` capturaba `params`, así que además
  de faltar en las dependencias estaba **cerrando sobre un valor viejo**. Ahora usa la
  forma funcional de `setSearchParams` y no captura nada.
- `DialogoNuevoApu.tsx` (`set-state-in-effect`) — el efecto que copiaba la plantilla al
  formulario pasa a ajustarse en render (el patrón oficial de React para estado que
  depende de datos), sin render en cascada.
- `use-mobile.ts` (`set-state-in-effect`) — el plan lo mandaba al 056, que está en
  espera indefinida, así que se arregla aquí. Reescrito con `useSyncExternalStore`.

**`use-mobile` tenía un defecto real, no sólo un warning:** escuchaba la media query
`(max-width: 767px)` pero leía `window.innerWidth`. Son dos fuentes que discrepan en el
propio umbral —`innerWidth` cuenta la barra de scroll y la media query no— y además
arrancaba en `false` durante el primer render. El test nuevo lo pilla: falla contra la
versión vieja.

## 3 — Ids numéricos de los E2E

Ver la nota al final de esta sección. El punto que importa para el futuro es **por qué
sobrevivieron**: `e2e/` no está en el `include` de ningún `tsconfig`, así que
`pnpm run typecheck` nunca lo ha mirado. La app entera migró a UUID y la suite E2E se
quedó en ids numéricos sin que nada se pusiera rojo. Anotado en `AGENTS.md`.

Cerrar ese punto ciego de verdad —meter `e2e/` en el typecheck y anotar sus stubs con
los DTO de `contract.ts`— es un plan aparte, no deuda menor: los stubs son objetos
parciales a propósito y anotarlos obliga a rellenarlos o a envolverlos en `Partial<>`.

## 4 — Los `as never`: la cuenta estaba invertida

**En código de producción quedan cero.** Los planes 050, 053 y 055 hicieron su trabajo:
los 9 de `CronogramaPage`, `GanttChart` y `AdminParametrosPage` no existen. El detector
del plan no se disparó.

Pero había **59 en `src/test/`**, que el plan no contaba, y son dos poblaciones distintas:

- **47 eran dinero**: `"18500.000000" as never` para colar un literal en el tipo marcado
  `Decimal`. Sustituidos por `asDecimal("18500.000000")`, que es el helper que ya existía
  en `src/lib/decimal.ts`. No es cosmético: `as never` traga cualquier cosa —un número, un
  objeto—, y `asDecimal` sólo acepta `string`.
- **12 eran cuerpos de petición inválidos a propósito.** Se quitaron uno a uno y se dejó
  hablar al compilador: los doce eran tests negativos legítimos («el seam rechaza un campo
  de más»), que por definición tienen que mandar algo que el DTO no admite. Ninguno
  escondía drift real.

Que los doce fueran intencionados **sólo se supo quitándolos**, y ése es justo el problema
de `as never`: uno intencionado y uno olvidado son idénticos a la vista y al `grep`. Ahora
se escriben con `cuerpoInvalido(...)` (en `src/test/espia.ts`, una línea), que dice en su
nombre para qué está. Queda también cero `as unknown as`, cero `@ts-ignore` y cero
`@ts-expect-error`.

## 5 — Comentarios que mienten: ya estaban cerrados

El `grep` del plan devuelve vacío. `src/lib/disponibilidad.ts` ya dice «30 recursos» y ya
describe el gate por página; `useParametrosSistema.ts` y `usePresupuesto.ts` ya no niegan
endpoints que existen; no quedan `TODO(047)`. Los planes 050, 053 y 054 los borraron.

## 6 — `useVersiones` duplicado: unificado

**La premisa de la nota era falsa a día de hoy.** Decía que unificarlos «obliga a que
`shell/` importe de `features/`, que es una dirección de dependencia nueva». No es nueva:
`shell/` ya importaba de `features/` en tres archivos antes de tocar nada —
`Breadcrumbs.tsx`, `SelectorProyecto.tsx` y `Sidebar.tsx` (de `features/proyectos` y
`features/auth`). La dirección está establecida.

Así que se acepta la importación y se borra la copia: `shell/contexto.ts` importa
`useVersiones` de `features/presupuesto/hooks/usePresupuesto`. Las dos copias compartían
`queryKey` (`qk.versiones`) y URL, que es lo que lo hacía peligroso: dos hooks sobre la
misma entrada de caché con `enabled` distinto, y nada que impidiera que divergieran.

## Tests: el seam de las versiones estaba sin cubrir

`useVersionActiva` decide qué versión ve el usuario y escribe el `?v=` de la URL — de ahí
salen los `presupuestoId` de media aplicación — y **no tenía ni un test**. Al tocarlo hacía
falta red: `src/test/shell/contexto.test.tsx`, 4 tests.

Como caracterizan comportamiento existente, pasaban a la primera, así que se comprobaron
por mutación antes de refactorizar: romper la preferencia por la versión vigente tumba 2
tests, y borrar la corrección del `?v=` inválido tumba 1. Matan lo que dicen matar.

`src/test/hooks/use-mobile.test.ts` (4 tests) sí arrancó en rojo de verdad.

## Definición de hecho

- [x] `pnpm run verify` en verde.
- [x] `pnpm run e2e` en verde.
- [x] Los 8 componentes muertos borrados — y dos dependencias con ellos. Los «4 a
      investigar» investigados y la decisión escrita arriba: se borran, la deuda no era al revés.
- [x] `lint` sin `set-state-in-effect` ni `exhaustive-deps`. Quedan 7 warnings de
      `react(incompatible-library)`, de terceros, sin silenciar.
- [x] Cero ids numéricos en `e2e/screenshots.spec.ts`, con las constantes compartidas
      con las fixtures de vitest.
- [x] Cero `as never` en `src/`: los de producción ya no estaban; los de la suite,
      retirados. Razón escrita en §4.
- [x] El `grep` de comentarios mentirosos, vacío.
- [x] `AGENTS.md` actualizado: baseline de tests, doctrina del dinero y rutas de admin.

## Hallazgo que no es de este plan: la captura 08 lleva meses fotografiando una pantalla rota

`screenshots/08-presupuesto.png`, **commiteada en el repo**, muestra «Algo salió mal en esta
sección». No lo provoca este plan: la imagen de `HEAD` (`8547daf`) ya sale así.

- **Pantalla:** `/proyectos/:id/presupuesto`.
- **Qué revienta:** `ResumenComponentes.tsx:23` hace `Object.entries(data.porComponente)`.
  El stub de la captura no trae `porComponente`, así que es `undefined` y salta
  `TypeError: Cannot convert undefined or null to object`. Lo atrapa `LimiteDeError`.
- **De quién es la culpa: del stub, no de la aplicación.** `ResumenComponentesResponse`
  declara `porComponente: Record<string, Decimal>` y `resumenComponentesFixture` (vitest)
  tiene esa forma. El stub del E2E inventa otra —`{equipo:{total,porcentaje}, manoObra:…}`—
  que no ha existido nunca en el contrato. Contra el backend real la pantalla funciona.
- **Desde cuándo:** el stub se escribió con esa forma en `db5f1ed` (2026-07-24) y el
  contrato pasó a `porComponente` en `e44c608` (2026-09-05, «align presupuesto/versiones
  with real backend API»). Desde ese commit la captura fotografía el error boundary.

**Lo que de verdad falla es el test, no la pantalla.** `test("08-presupuesto")` navega y
dispara la captura, sin afirmar nada sobre el contenido: una pantalla que revienta entera
la da por buena. Por eso pasó desapercibido cinco olas, y por eso `pnpm run e2e` sigue en
verde 20/20 con la imagen rota dentro. Es el mismo agujero del §3 visto por otro lado: nada
comprueba la forma de los stubs del E2E.

Arreglarlo es cambiar tres claves del stub, pero **es alcance del plan 059** (formas de
DTO), no de éste, y merece además una aserción mínima en la captura —que el boundary no
esté— para que no pueda repetirse. No se toca aquí.

## Lo que este plan deja abierto

1. **`e2e/` fuera del typecheck** (§3). Es el agujero por el que se coló todo lo del §3.
2. **Dos nombres que mienten**: `PopoverDesglose` es un diálogo y `ComboboxUnidad` son
   chips con un input. Renombrarlos es un `sed` y no se hizo por no mezclarlo con esto.
3. **7 warnings de react-hook-form**, a la espera de que la librería sea compatible con
   el React Compiler.
