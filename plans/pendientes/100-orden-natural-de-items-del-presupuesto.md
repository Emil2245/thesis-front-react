# Plan 100: Los capítulos y rubros salen desordenados (1.12 antes de 1.2, 2.10 antes de 2.2)

> **Instrucciones para quien ejecute**: sigue este plan paso a paso. Corre cada
> comando de verificación y confirma el resultado esperado antes de avanzar al
> siguiente paso. Si ocurre algo listado en "Condiciones STOP", detente y
> repórtalo — no improvises. Al terminar, actualiza la fila de este plan en
> [`../00.INDEX.md`](../00.INDEX.md), salvo que quien te despache te diga que
> él mantiene el índice.
>
> **Comprobación de deriva (ejecutar primero)**:
> `git diff --stat d0094f3..HEAD -- src/features/presupuesto/hooks/usePresupuesto.ts src/lib/ src/api/contract.ts src/features/workspace/components/PresupuestoCompacto.tsx`
> Si alguno de estos archivos cambió desde que se escribió este plan, compara
> los fragmentos de "Estado actual" contra el código real antes de continuar;
> si no coinciden, trátalo como condición STOP.

## Estado

- **Prioridad**: P1
- **Esfuerzo**: S
- **Riesgo**: MEDIUM — **corregido el 2026-09-17**. La primera versión de este
  plan decía «LOW — no toca peticiones, DTOs, mutaciones ni dinero» y **era
  falso**: `PresupuestoCompacto` deriva el `orden` que manda a
  `PATCH /presupuestos/{id}/capitulos/{cid}/mover` del índice del array, así que
  reordenar el array cambia el cuerpo de esa mutación. Lo cambia **para bien**
  —ver la sección «Interacción con la mutación mover»—, pero es un cambio de
  comportamiento de una escritura y hay que tratarlo como tal. No toca dinero:
  ningún importe se mueve.
- **Depende de**: ninguno. Se complementa con el plan `033` del backend, que
  arregla la misma causa en el origen; los dos son idempotentes entre sí.
- **Categoría**: bug (correctness de presentación)
- **Planificado en**: commit `d0094f3`, 2026-09-16

## Por qué importa

Abre
`http://localhost:5173/proyectos/0192f6c4-7c8a-7abc-8000-000000001103/workspace`
(usuario `john.doe@uce.edu.ec`, clave `Clave1234`). El árbol del presupuesto
del proyecto "Cetro Médico Tulcán" sale así:

```
▸ 1.12 · OBRA CIVIL PARA SISTEMA ELÉCTRICO
▸ 1.2  · OBRA CIVIL
▸ 1.3  · MAMPOSTERIA
…
▾ 2    · SISTEMA ELECTRICO
    2.1   Punto de iluminación …
    2.10  Luminaria panel led de 60x60cm …
    2.11  Luminaria panel led de 30x30cm …
    2.12  Bandeja tipo escalerilla 200x100mm …
    2.13  …
```

`1.12` delante de `1.2`. `2.10`, `2.11`, `2.12` delante de `2.2`. El árbol
parece un revoltijo, y de ahí la impresión de que el capítulo 2 "no está
agrupado": sus rubros sí cuelgan de él, pero salen en un orden que no es el del
presupuesto.

**Dos cosas que conviene descartar antes de tocar nada, porque parecen la causa
y no lo son:**

1. **Los datos de ejemplo no están mal.** El artefacto de origen
   `../thesis-docs/plan/domain/_artifacts/presupuesto-apus-cetro-medico-tulcan.json`
   tiene 331 nodos: 7 capítulos, 26 subcapítulos y 298 rubros. El capítulo `2`
   (`SISTEMA ELECTRICO`) **no tiene ningún subcapítulo** en el original: sus 51
   rubros `2.1 … 2.51` cuelgan directamente de él. El seed
   `V004__seed_escenarios.sql` reproduce eso fielmente. Que el capítulo 2 no
   tenga desplegables intermedios es correcto.
2. **La jerarquía del frontend tampoco está mal.** `PresupuestoCompacto`
   (workspace) y `ArbolPresupuesto` (`/presupuesto`) recorren
   `capitulo.subcapitulos` y `capitulo.rubros` correctamente y ambos pintan el
   capítulo 2 como desplegable. Los dos consumen la **misma** query
   (`usePresupuesto`), así que los dos muestran el mismo desorden — el de
   `/presupuesto` sólo es menos evidente porque los capítulos arrancan
   colapsados.

**La causa real es una comparación de cadenas donde hacía falta una numérica**,
y está en el backend: `../thesis-back-quarkus`,
`src/main/java/ec/uce/propuestas/presupuesto/mapper/PresupuestoMapper.java`:

```java
        rubrosPorCapitulo.values().forEach(list -> list.sort(Comparator.comparing(r -> r.item)));
        …
        raices.sort(Comparator.comparing(c -> c.item));
        hijosPorPadre.values().forEach(list -> list.sort(Comparator.comparing(c -> c.item)));
```

con este comentario en la cabecera de la clase:

```java
 *   <li>Árbol recursivo sin tope; hijos ordenados por {@code item}
 *       ascendente (lexicográfico coincide con orden natural "1", "1.1",
```

**Ese comentario es falso** y es justamente lo que dejó pasar el defecto. El
orden lexicográfico coincide con el natural sólo mientras todos los segmentos
tienen una cifra. En cuanto aparece `1.10`, deja de coincidir: `"1.12" < "1.2"`
porque `'1' < '2'` en la segunda posición.

Ese lado se arregla en el plan `033` del repositorio `../thesis-back-quarkus`.
**Este plan hace lo otro**: que el cliente ordene lo que pinta, en vez de
depender de que el servidor se lo dé ordenado. Es orden de presentación, no
lógica de negocio, y deja la pantalla correcta contra cualquier versión del
backend.

## Estado actual

### `src/api/contract.ts` — los tipos que vas a ordenar

```ts
export interface CapituloResponse {
  id: string;
  item: string;
  descripcion: string;
  orden: number;
  total: Decimal;
  subcapitulos: CapituloResponse[];
  rubros: RubroResponse[];
}

export interface RubroResponse {
  id: string;
  item: string;
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: Decimal;
  precioUnitario: Decimal;
  precioTotal: Decimal;
  apuId: string;
}
```

Los capítulos traen `orden`, los rubros **no**. Por eso la clave de orden única
que sirve para los dos es `item`, comparado de forma natural.

### `src/features/presupuesto/hooks/usePresupuesto.ts` (líneas 13–19)

```ts
export function usePresupuesto(presupuestoId: string) {
  return useQuery({
    queryKey: qk.presupuesto(presupuestoId),
    queryFn: () => getValidado(`/presupuestos/${presupuestoId}`, presupuestoSchema),
    enabled: !!presupuestoId,
  });
}
```

Este hook es el único origen del árbol para las tres pantallas afectadas:
`WorkspacePage` → `PresupuestoCompacto`, `PresupuestoPage` → `ArbolPresupuesto`,
y `ResumenProyectoPage` (tabla "Capítulos"). Arreglarlo aquí las arregla las
tres de una vez.

## Interacción con la mutación `mover` del workspace

**Léelo entero antes del paso 2.** Esta sección se añadió el 2026-09-17, después
de que un ejecutor parase el plan con una condición STOP correcta.

`src/features/workspace/components/PresupuestoCompacto.tsx` (en el árbol del
workspace, sobre `origin/main`) deriva la posición de destino **del índice del
array** y la manda al servidor:

```tsx
  const moverCapituloRelativo = (chapterId: string, desplazamiento: -1 | 1) => {
    const position = findChapterPosition(presupuesto.capitulos, chapterId);
    if (!position) return;
    const nuevoIndice = position.index + desplazamiento;
    if (nuevoIndice < 0 || nuevoIndice >= position.siblings.length) return;
    mover.mutate({
      capituloId: chapterId,
      body: { parentId: position.parentId, orden: nuevoIndice + 1 },
    });
  };
```

y lo mismo `moverCapituloArrastrado` (`orden: targetIndex + (after ? 2 : 1)`).
Un tercer sitio, `renderChapters`, saca `esPrimero`/`esUltimo` del mismo índice
para habilitar los botones «Mover arriba/abajo».

O sea: **ordenar el array cambia lo que esa mutación envía.** Eso es lo que la
versión anterior del plan negaba.

**Y lo cambia para bien.** En el backend, `CapituloService.asignarNivel`
(`../thesis-back-quarkus`) asigna las dos cosas a la vez:

```java
            posicion++;
            c.orden = posicion;
            String item = itemPadre == null ? String.valueOf(posicion) : itemPadre + "." + posicion;
```

El último segmento de `item` **es** `orden`. Y `mover` valida la posición contra
`listarHermanosEnPresupuesto`, que hace `order by orden`. Por tanto:

> orden natural de `item` ≡ orden por la columna `orden`

Hoy el array llega en orden lexicográfico, así que en cualquier nivel con diez o
más hermanos `index + 1 ≠ orden` y **«Mover arriba» ya manda hoy una posición
equivocada** — el capítulo 1 del proyecto "Cetro Médico Tulcán" tiene doce
subcapítulos, así que el defecto está vivo. Con `ordenarCapitulos` aplicado,
`position.index + 1 === capitulo.orden` exactamente.

La suite **no cubre** ese caso: `src/test/fixtures/presupuesto.ts` está ya en
orden natural y ningún nivel llega a diez hermanos, así que hoy el test
`PresupuestoCompacto.test.tsx` «manda el atajo de mover arriba al endpoint de
capítulos» pasa igual con el bug puesto. Ese agujero lo tapa el paso 4.

**Qué NO tienes que hacer:** no toques los tres sitios de
`PresupuestoCompacto.tsx`. Su lógica es correcta *a condición de que el array
esté en orden natural*, que es justo lo que este plan le da. Sólo hay que
fijarlo con un test.

## Qué hay que hacer

### Paso 1 — Un comparador natural de `item`

Crea `src/lib/ordenItem.ts`:

```ts
/**
 * Compara dos `item` de presupuesto ("1", "1.2", "1.12", "2.10") en orden
 * natural: segmento a segmento, numéricamente.
 *
 * El orden lexicográfico NO sirve aquí, aunque lo parezca con datos pequeños:
 * `"1.12" < "1.2"` como cadenas, porque compara `'1'` contra `'2'` en la
 * segunda posición. Con un presupuesto de más de nueve subcapítulos el árbol
 * sale barajado.
 *
 * Un segmento no numérico se compara como texto contra el otro segmento, para
 * que un item con letras no rompa el orden ni tire una excepción.
 */
export function compararItem(a: string, b: string): number {
  const sa = a.split(".");
  const sb = b.split(".");
  const n = Math.max(sa.length, sb.length);
  for (let i = 0; i < n; i++) {
    const pa = sa[i];
    const pb = sb[i];
    // El más corto va primero: "1" antes que "1.1".
    if (pa === undefined) return -1;
    if (pb === undefined) return 1;
    const na = Number(pa);
    const nb = Number(pb);
    if (Number.isInteger(na) && Number.isInteger(nb)) {
      if (na !== nb) return na - nb;
    } else {
      const c = pa.localeCompare(pb, "es");
      if (c !== 0) return c;
    }
  }
  return 0;
}
```

`Number("")` es `0` y `Number.isInteger(0)` es `true`, así que un item con
segmentos vacíos (`"1..2"`) no revienta: se compara como cero. `Number("1a")` es
`NaN`, `Number.isInteger(NaN)` es `false`, y se cae a `localeCompare`. Esos dos
casos están cubiertos por el test del paso 3.

### Paso 2 — Ordenar el árbol en el `select` de la query

En el mismo `src/lib/ordenItem.ts`, añade la función que recorre el árbol.
Devuelve objetos nuevos; **no muta** los que vienen de la caché de TanStack
Query (mutarlos rompería las comparaciones por referencia y los re-renders):

```ts
import type { CapituloResponse } from "@/api/contract";

/** Ordena capítulos, subcapítulos y rubros por `item` natural, sin mutar la entrada. */
export function ordenarCapitulos(capitulos: CapituloResponse[]): CapituloResponse[] {
  return [...capitulos]
    .sort((a, b) => compararItem(a.item, b.item))
    .map((c) => ({
      ...c,
      subcapitulos: ordenarCapitulos(c.subcapitulos),
      rubros: [...c.rubros].sort((a, b) => compararItem(a.item, b.item)),
    }));
}
```

Y en `src/features/presupuesto/hooks/usePresupuesto.ts`:

```ts
export function usePresupuesto(presupuestoId: string) {
  return useQuery({
    queryKey: qk.presupuesto(presupuestoId),
    queryFn: () => getValidado(`/presupuestos/${presupuestoId}`, presupuestoSchema),
    enabled: !!presupuestoId,
    // El backend ordena por `item` como cadena (PresupuestoMapper), así que
    // "1.12" le sale antes que "1.2". El plan 033 del backend lo corrige en el
    // origen; esto deja la pantalla correcta contra cualquier versión del
    // servidor y es idempotente cuando ya viene ordenado.
    select: (p) => ({ ...p, capitulos: ordenarCapitulos(p.capitulos) }),
  });
}
```

`select` en TanStack Query se memoiza mientras la referencia de la función sea
estable; como aquí es una flecha definida en el render del hook, se re-ejecuta
en cada render del componente. Para árboles de ~330 nodos es irrelevante. **No
lo optimices con `useCallback` ni `useMemo` en este plan**: añadiría ruido sin
medición que lo justifique.

Verificación:

```bash
pnpm run typecheck && pnpm run lint
```

### Paso 3 — Un test unitario del comparador

Crea `src/test/lib/ordenItem.test.ts` (mira cualquier test de `src/test/lib/`
para el estilo; `decimal.test.ts` sirve de patrón).

Casos mínimos, todos sobre `compararItem` usado con `Array.prototype.sort`:

```ts
it("ordena naturalmente los segmentos numéricos", () => {
  expect(["1.12", "1.2", "1.1", "1.10"].sort(compararItem)).toEqual([
    "1.1", "1.2", "1.10", "1.12",
  ]);
});

it("pone el padre antes que sus hijos", () => {
  expect(["2.1", "2", "2.10"].sort(compararItem)).toEqual(["2", "2.1", "2.10"]);
});

it("no revienta con segmentos no numéricos", () => {
  expect(() => ["1.a", "1.2"].sort(compararItem)).not.toThrow();
});
```

Y **un** test de `ordenarCapitulos` que compruebe que ordena en profundidad
(subcapítulos y rubros) y que no muta la entrada:

```ts
it("ordena en profundidad sin mutar la entrada", () => {
  // construye dos niveles desordenados, llama a ordenarCapitulos,
  // comprueba el orden del resultado y que el array original sigue igual
});
```

Esto sí lleva test: es una función pura con una regla que es fácil volver a
romper, y el defecto que arregla llevaba meses en pantalla. No añadas tests de
render por este cambio — [`AGENTS.md`](../../AGENTS.md) es explícito en que un
cambio de presentación no exige batería nueva.

Verificación:

```bash
pnpm exec vitest run src/test/lib/ordenItem.test.ts
```

### Paso 4 — Fijar con un test que `orden === index + 1` con diez o más hermanos

Éste es el paso que justifica el riesgo MEDIUM, y el agujero de cobertura real.

En `src/test/features/workspace/components/PresupuestoCompacto.test.tsx` ya hay
un test llamado algo como «manda el atajo de mover arriba al endpoint de
capítulos», que espera `{ parentId: null, orden: 1 }`. **Léelo entero y
reutiliza su patrón**; no lo modifiques.

Añade **uno** nuevo:

> Un capítulo raíz con **doce** subcapítulos que el servidor devuelve en orden
> lexicográfico (`1.1, 1.10, 1.11, 1.12, 1.2, …, 1.9`) se pinta en orden natural
> (`1.1, 1.2, …, 1.9, 1.10, 1.11, 1.12`), y pulsar «Mover abajo» sobre `1.2`
> manda `orden: 3` — su posición natural más uno —, no la que tendría en el
> array lexicográfico.

Doce, no tres: con menos de diez el bug no aparece y el test pasaría igual
estando roto. Ése es exactamente el motivo de que esto sobreviviera.

Para montarlo necesitas un `server.use(...)` que devuelva un `GET
/presupuestos/:id` con esos doce subcapítulos **en orden lexicográfico**, que es
como los manda el backend hoy. Construye esa respuesta a partir de la fixture
que ya exista en `src/test/fixtures/presupuesto.ts`, respetando su forma: una
fixture es una afirmación sobre el backend ([`docs/bugs.md`](../../docs/bugs.md)
§6). Da a cada subcapítulo un `orden` coherente con el último segmento de su
`item` (`1.2` → `orden: 2`, `1.12` → `orden: 12`), porque ésa es la equivalencia
que garantiza el backend y sobre la que descansa la aserción.

Escríbelo **antes** de aplicar el paso 2 si puedes: debe fallar con el `orden`
lexicográfico. Eso es haber reproducido el defecto de la mutación.

Verificación:

```bash
pnpm exec vitest run src/test/features/workspace
```

## Condiciones STOP

- Si `CapituloResponse` o `RubroResponse` ya no tienen `item` como `string`,
  para y reporta.
- Si al ordenar en el cliente algún test existente de presupuesto o workspace se
  pone rojo porque **esperaba el orden lexicográfico**, ese test estaba
  codificando el bug. Arréglalo para que espere el orden natural y **dilo
  explícitamente en tu reporte** — no lo cambies en silencio.
- **Los tres sitios de `PresupuestoCompacto.tsx` que derivan posición del índice
  ya están identificados y analizados** en la sección «Interacción con la
  mutación mover»: no son una condición STOP, son el motivo del paso 4. Pero si
  encuentras **otro** consumidor —distinto de esos tres— que derive del orden
  del array un índice, una posición o cualquier valor que acabe en una
  escritura al servidor, **para y repórtalo**.
- Si al ordenar naturalmente descubres que `capitulo.orden` **no** coincide con
  el último segmento de `capitulo.item` en los datos reales o en las fixtures,
  **para**: la equivalencia sobre la que se apoya el paso 4 no se sostiene y hay
  que rehacer el análisis.

## Fuera de alcance

- El backend. La corrección en el origen es el plan `033` de
  `../thesis-back-quarkus`, que se ejecuta en su propio worktree.
- `src/api/schemas.ts` y `src/api/contract.ts`: ordenar no es validar.
- Las vistas del cronograma (`useVistasCronograma` / `GET /cronogramas/{id}/vistas`).
  El backend también las ordena por `item` como cadena
  (`CapituloRepository.listarPorPresupuestoOrdenado`), así que arrastran el mismo
  defecto, pero corregirlo allí toca otra query y otras pantallas. Queda
  registrado aquí y lo cubre el plan `033` del backend.
- **El código de `PresupuestoCompacto.tsx`, `DialogoMoverCapitulo` y
  `useCapituloMutaciones`.** Escriben `orden` en el servidor y su lógica es
  correcta una vez el array llega ordenado; este plan les añade **un test**, no
  les cambia una línea. Si crees que hay que tocarlos, para y repórtalo.

## Criterios de terminado (comprobables por máquina)

```bash
pnpm run typecheck
pnpm run lint
pnpm run format:check
pnpm exec vitest run src/test/lib/ordenItem.test.ts
pnpm exec vitest run src/test/features/presupuesto src/test/features/workspace
pnpm run verify
```

## Verificación manual

Backend en `localhost:8080`, `pnpm run dev`, sesión
`john.doe@uce.edu.ec` / `Clave1234`.

1. `/proyectos/0192f6c4-7c8a-7abc-8000-000000001103/workspace`: los
   subcapítulos del capítulo 1 deben salir `1.1, 1.2, 1.3, … 1.9, 1.10, 1.11,
   1.12` — con `1.12` **al final**.
2. Despliega el capítulo `2`: sus rubros deben ir `2.1, 2.2, 2.3, … 2.9, 2.10,
   2.11, …` en orden.
3. `/proyectos/{mismo uuid}/presupuesto`: el mismo orden en el árbol completo.
4. `/proyectos/{mismo uuid}` (Resumen): la tabla "Capítulos" lista `1, 2, 3, 4…`
   en orden.

Si el navegador sigue mostrando el orden viejo, reinicia el dev server:
`playwright.config.ts` usa `reuseExistingServer` y un `vite` de antes sirve el
bundle obsoleto.

## Nota de mantenimiento

La regla que deja este plan: **un identificador jerárquico con puntos no se
ordena como texto.** Y el corolario, que es el que costó meses: *un comentario
que afirma que dos órdenes coinciden no es una prueba de que coincidan*. El
comentario del `PresupuestoMapper` del backend lo afirmaba y era falso; nadie lo
comprobó porque con `1.1 … 1.9` sí coincide.

Cuando aparezca cualquier otra lista ordenada por `item` —cronograma, export,
comparación de versiones— usa `compararItem` de `src/lib/ordenItem.ts` en vez de
`localeCompare` o `<`.
