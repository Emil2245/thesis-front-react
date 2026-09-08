# Plan 074: Que se pueda armar un APU — cablear el selector de insumos

> **Instrucciones para el ejecutor**: Invoca la skill `ponytail:ponytail` antes de escribir nada
> y mantenla activa toda la tarea. Sigue este plan paso a paso. Ejecuta cada comando de
> verificación y confirma el resultado esperado antes de pasar al siguiente. Si ocurre algo de la
> sección "Condiciones de parada", para y repórtalo — no improvises.
>
> **`pnpm`, nunca `npm`.** El gate de tipos es `pnpm run typecheck`. Y ojo: **`verify` no
> comprueba tipos en `e2e/`**.
>
> **Comprobación de deriva (ejecútala primero)**:
> `git diff --stat 0a44a5e..HEAD -- src/features/apu-editor`
> Si algo cambió ahí, compara los extractos de "Estado actual" contra el código vivo antes de
> seguir. Si no coinciden, es condición de parada.

## Estado

- **Prioridad**: P1
- **Esfuerzo**: M
- **Riesgo**: MED — toca la pantalla núcleo del sistema
- **Depende de**: ninguno
- **Categoría**: bug
- **Planificado en**: commit `0a44a5e`, 2026-09-07

## Por qué importa

**Hoy no se puede añadir un insumo a un APU desde la interfaz.** El APU es el núcleo del sistema
—todo lo demás, presupuesto y cronograma, se deriva de él— y un APU creado desde cero nace vacío
y sin ninguna forma de llenarlo.

Lo destapó el intento de escribir el capítulo 04 del manual: su ejecutor paró antes de escribir
una línea, porque documentar "Agregar fila" habría descrito una pantalla que no existe.

La buena noticia es que **está todo construido y solo falta unirlo**. `SelectorInsumo` es un
componente completo, tipado y con su propio test; `agregarFila` está implementada en el hook; y
sus firmas encajan exactamente. Nadie las conectó.

Cuando esto cierre, el capítulo 04 del manual se podrá escribir entero (plan 072).

## Estado actual

### Lo que existe y no está conectado

`src/features/apu-editor/components/SelectorInsumo.tsx` — 130 líneas, completo, con test propio en
`src/test/features/apu-editor/components/SelectorInsumo.test.tsx`. Su firma:

```tsx
  abierto: boolean;
  onClose: () => void;
  proyectoId: string;
  tipo: SeccionTipo;
  onSeleccionar: (sel: { seccionTipo: SeccionTipo; insumoId: string }) => void;
```

`src/features/apu-editor/hooks/useApuEditor.ts:275-287` — implementada, y su comentario demuestra
que quien la escribió pensó el flujo entero:

```ts
  const agregarFila = useCallback(
    async (sel: { seccionTipo: SeccionTipo; insumoId: string }) => {
      try {
        // `cantidad` es @NotNull con mínimo 0.000001: el selector no la pide,
        // así que la fila nace en 1 y el usuario la corrige en su celda.
        // `rendimiento` se omite; mandarlo a 0 sería otro 400.
        await agregarMutation.mutateAsync({ ...sel, cantidad: asDecimal("1") });
```

**`onSeleccionar` recibe exactamente lo que `agregarFila` espera.** Están hechas la una para la
otra.

**Pruebas de que no están unidas** — compruébalas tú antes de tocar nada:

- `grep -rn 'SelectorInsumo' src/ | grep -v SelectorInsumo.tsx` → solo su propio test.
- `grep -rn 'agregarFila' src/ | grep -v '\.test\.'` → solo el hook que la define.
- `grep -rniE 'agregar|añadir|PlusIcon' src/features/apu-editor/pages/EditorApuPage.tsx src/features/apu-editor/components/GridSeccion.tsx` → nada.
- `src/features/apu-editor/pages/EditorApuPage.tsx:22-34` destructura once cosas del hook, y
  `agregarFila` no está entre ellas.

### El obstáculo que hay que quitar primero

`src/features/apu-editor/components/GridSeccion.tsx:25`:

```tsx
export function GridSeccion({ … }: GridSeccionProps) {
  if (!seccion.filas.length) return null;
```

**Una sección sin filas no se dibuja.** Así que en un APU recién creado desde cero no hay ni
bloques en pantalla: no hay dónde poner el botón. Este `return null` hay que quitarlo, o el
arreglo no sirve para el caso que más importa.

Ese early-return además hace que **el parámetro del proyecto «Mostrar secciones vacías» no haga
nada en el editor**: `grep -rn 'mostrarSeccionesVacias' src/` lo encuentra en el contrato, en el
formulario de parámetros y en su esquema — **en ninguna parte del editor del APU**. Se guarda y no
se lee.

**Decisión para este plan, y no la cambies:** el editor **siempre muestra los cuatro bloques**,
tengan filas o no. Es lo mínimo que permite añadir la primera fila, y es coherente: el editor es
donde trabajas, y necesitas ver los cuatro sitios donde puedes poner algo. El parámetro «Mostrar
secciones vacías» gobierna **los documentos exportados**, que los genera el backend. No intentes
cablear el parámetro al editor en este plan.

### El tercer defecto: los mensajes de error no llegan a pantalla

`src/features/apu-editor/hooks/useApuEditor.ts:191-208`:

```ts
      const result = schema.safeParse(valor);
      if (!result.success) {
        actualizarEstado(detalleId, "error");
        return;
      }
```

Marca la fila y **vuelve sin lanzar**. Y `src/features/apu-editor/components/CeldaEditable.tsx:31-43`:

```tsx
    try {
      await onCommit(editVal);
    } catch {
      setError(true);
    }
```

Su `catch` **nunca se ejecuta**, porque `onCommit` no lanza nunca. Resultado: escribes un valor
inválido, la fila entera se pone rosa (`FilaDetalle.tsx:98`, `bg-destructive/10`) y **no aparece
ningún mensaje**. Los textos de `src/features/apu-editor/schemas.ts` —*"Debe ser mayor que 0"*,
*"Debe ser mayor que 0 o vacío para heredar"*— están escritos y no se ven nunca.

Importa para el manual: el capítulo 04 tiene que citar los mensajes que el usuario ve, y hoy no ve
ninguno.

### Convenciones del repo

- **Idioma de la UI:** español (es-EC). Sustantivos del dominio en español: `insumo`, `rubro`,
  `apu`, `capitulo`, `presupuesto`.
- **Tests:** Vitest + RTL + MSW, `onUnhandledRequest: "error"`. Viven en `src/test/`, en espejo de
  `src/`. Wrapper: `renderConProviders` (`src/test/render.tsx`). Fixtures en `src/test/fixtures/`,
  handlers en `src/test/handlers.ts`.
- **Comentarios:** el *porqué*, no el *qué*, citando el plan.
- El test existente de la pantalla es `src/test/features/apu-editor/pages/EditorApuPage.test.tsx`.
  Úsalo como patrón estructural.

## Comandos que vas a necesitar

| Propósito | Comando | Esperado |
|---|---|---|
| Instalar | `pnpm install` | exit 0 |
| Tipos | `pnpm run typecheck` | exit 0 |
| Tests | `pnpm run test` | exit 0 |
| Gate completo | `pnpm run verify` | exit 0 |
| Suite E2E | `pnpm run e2e` | exit 0 |

**Baseline que no puedes bajar:** 484 tests unitarios en 74 archivos, 55 e2e.

## Alcance

**En alcance:**

- `src/features/apu-editor/components/GridSeccion.tsx`
- `src/features/apu-editor/pages/EditorApuPage.tsx`
- `src/features/apu-editor/hooks/useApuEditor.ts`
- `src/features/apu-editor/components/CeldaEditable.tsx`
- `src/features/apu-editor/components/FilaDetalle.tsx` — **solo si** hace falta para mostrar el
  mensaje de error; si puedes hacerlo sin tocarlo, mejor
- Tests nuevos bajo `src/test/features/apu-editor/`

**Fuera de alcance** (NO los toques):

- `src/features/apu-editor/components/SelectorInsumo.tsx` — está terminado. Se monta, no se
  reescribe. Si crees que necesita cambios, es condición de parada.
- **El precio por fila en los bloques de Equipo y Mano de obra.** Hoy esos bloques muestran
  *Costo/hora* calculado y no dejan editar la tarifa, mientras que Materiales y Transporte sí
  tienen precio editable con su distintivo de herencia (`FilaDetalle.tsx:113-148`). La
  especificación dice que todos deberían admitirlo. **Es una divergencia conocida y deliberada de
  este plan**: añadirlo es rediseñar la tabla de esos bloques, no cablear lo que ya existe.
- `src/lib/disponibilidad.ts` — aquí no se apaga ni se enciende ningún módulo.
- `src/features/proyectos/pages/ParametrosPage.tsx` y todo lo relativo a «Mostrar secciones
  vacías» — ver la decisión de arriba.
- `docs/manual/` entero — el capítulo 04 lo escribe el plan 072 después de este, y los demás
  capítulos los mantiene el revisor.
- `../thesis-back-quarkus` y `../thesis-docs`, de solo lectura.

## Flujo de git

- Rama: `fix/074-armar-apu`, desde `main`.
- Commits en estilo conventional en español: `fix: …`, uno por defecto.
- **No hagas push ni abras PR.**

## Pasos

### Paso 1: Que las secciones vacías se dibujen

En `GridSeccion.tsx`, quita el `if (!seccion.filas.length) return null;`. Comprueba que la tabla
se ve razonable sin filas: si la cabecera sola queda rara, muestra una línea discreta del tipo
*"Sin filas todavía"* en el cuerpo. Nada más: ni ilustración, ni tarjeta especial, ni componente
nuevo.

Deja un comentario citando el plan y explicando por qué ya no se oculta.

**Verifica**: `pnpm run typecheck` → exit 0

### Paso 2: Un botón para agregar en cada sección

En `GridSeccion.tsx`, añade un botón **Agregar insumo** en la cabecera de la tarjeta, junto al
subtotal (el `prop` `accion` de `TarjetaTabla` ya está ahí; mira cómo lo usa hoy). Recibe por
props un `onAgregar: () => void` y lo llama.

Sigue el estilo de botón que ya usa el repo para esto: mira **Agregar** en
`src/features/proyectos/components/TabFirmantes.tsx:116-118`.

**Verifica**: `pnpm run typecheck` → exit 0

### Paso 3: Conectar el selector

En `EditorApuPage.tsx`:

1. Destructura `agregarFila` del hook, junto a las otras once.
2. Añade un estado local para saber **qué sección** está pidiendo insumo (basta con el
   `SeccionTipo` o `null`), igual que la página ya lleva
   `guardarPlantillaDialogAbierto` con `useState`.
3. Pasa a cada `GridSeccion` un `onAgregar` que ponga ese estado a la sección correspondiente.
4. Monta **un solo** `SelectorInsumo` al final del JSX —no uno por sección—, con:
   - `abierto` = hay una sección pidiendo,
   - `tipo` = esa sección,
   - `proyectoId` = el que la página ya tiene,
   - `onSeleccionar` = `agregarFila`,
   - `onClose` = limpiar el estado.

Sigue el patrón de montaje de diálogos que la propia página ya usa para
`DialogoGuardarPlantilla`.

**Verifica**: `pnpm run typecheck` → exit 0 y `pnpm run lint` → exit 0

### Paso 4: Que el error de celda se vea

Haz que un valor que no pasa la validación **muestre su mensaje** al usuario, en vez de solo teñir
la fila.

La causa está en `useApuEditor.ts:191-208`: `editarCelda` traga el fallo y vuelve. La forma más
corta es que propague el error —lanzar— para que el `catch` que **ya existe** en
`CeldaEditable.tsx:38-40` se active, y que el componente muestre el mensaje junto al valor.
`CeldaEditable` ya tiene el estado `error`; hoy solo pinta un icono. Que enseñe el texto.

**No inventes un sistema de notificaciones ni un contexto de errores.** El mensaje sale del
esquema de `src/features/apu-editor/schemas.ts`; hazlo llegar hasta la celda por el camino más
corto que funcione.

**Verifica**: `pnpm run verify` → exit 0

### Paso 5: Gate

**Verifica**: `pnpm run verify` → exit 0 · `pnpm run e2e` → exit 0

## Plan de pruebas

En `src/test/features/apu-editor/`, siguiendo la estructura de
`src/test/features/apu-editor/pages/EditorApuPage.test.tsx`:

| Test | Cubre |
|---|---|
| Un APU **sin filas** muestra los cuatro bloques, cada uno con su botón **Agregar insumo** | Pasos 1 y 2 — el caso que hoy está roto del todo |
| Pulsar **Agregar insumo** en un bloque abre el selector **con el tipo de ese bloque** | Paso 3 — que no abra siempre el mismo |
| Elegir un insumo en el selector llama a la mutación de agregar y la fila aparece | Paso 3 — el flujo entero, no solo que el diálogo abra |
| Escribir un valor inválido en una celda **muestra el mensaje** del esquema | Paso 4 |

El tercero es el importante: **verifica el flujo completo**, no que un componente se monte. Un
test que solo compruebe que el diálogo abre no habría detectado este bug, porque el diálogo nunca
llegó a existir en la página.

**Verificación**: `pnpm run test` → exit 0, con **488 tests o más**.

## Criterios de terminado

- [ ] `pnpm run verify` sale 0, con ≥ 488 tests unitarios
- [ ] `pnpm run e2e` sale 0, con ≥ 55 tests
- [ ] `grep -rn 'SelectorInsumo' src/features/apu-editor/pages/EditorApuPage.tsx` devuelve al
      menos dos líneas (import y montaje)
- [ ] `grep -rn 'agregarFila' src/features/apu-editor/pages/EditorApuPage.tsx` devuelve al menos
      una línea
- [ ] `grep -n 'return null' src/features/apu-editor/components/GridSeccion.tsx` no devuelve el
      early-return de secciones vacías
- [ ] `git status` no muestra archivos fuera de la lista "En alcance"

## Condiciones de parada

Para y reporta con evidencia `archivo:línea` — no improvises — si:

- El endpoint de agregar detalle no existe en `../thesis-back-quarkus` @ `origin/main`.
  Compruébalo antes del paso 3:
  `git -C ../thesis-back-quarkus grep -n 'detalles' origin/main -- '*ApuResource.java'`
  Debe existir un `POST` a `/apus/{apuId}/detalles`. Si no está, este plan no tiene sentido.
- `SelectorInsumo` necesita cambios para poder montarse. Está declarado fuera de alcance
  precisamente porque debería bastar con montarlo; si no basta, quiero saber por qué antes de que
  lo edites.
- Al agregar una fila, la petición sale pero la pantalla no la refleja, o el APU no recalcula.
- Quitar el early-return de `GridSeccion` rompe tests existentes de una forma que no sea trivial
  de ajustar.
- `pnpm run test` baja de 484, o `pnpm run e2e` de 55.

## Notas de mantenimiento

- **Qué mirar en la revisión**: que el selector se monte **una sola vez** y reciba el tipo de la
  sección que lo abrió (montar uno por sección funciona pero multiplica el estado sin motivo); y
  que el test del flujo completo afirme que la fila **aparece**, no solo que el diálogo se abre.
- **Qué interactuará con esto**: el capítulo 04 del manual (plan 072) se escribe justo después y
  documentará este flujo, incluidas las capturas del selector abierto.
- **Deuda que este plan deja anotada a propósito**:
  1. El precio por fila no es editable en Equipo ni Mano de obra, aunque la especificación dice
     que debería. Es rediseño de esa tabla, no cableado.
  2. El parámetro «Mostrar secciones vacías» sigue sin afectar al editor. Tras este plan, el
     editor los muestra siempre; si alguien quiere que el parámetro mande también aquí, es otro
     plan y una decisión de producto.
