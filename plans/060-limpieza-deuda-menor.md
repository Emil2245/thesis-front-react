# Plan 060 — Limpieza: shadcn sin usar, warnings de lint y deuda menor

**Status:** TODO
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
