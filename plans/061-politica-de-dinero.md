# Plan 061 — Política de dinero: editable `number`, lectura `string`

**Status:** DONE
**Escrito contra:** frontend `8cc08b5` · backend `origin/main` @ `c337950`
**Decisión tomada por:** el humano, 2026-09-06 — cierra la pregunta abierta #2 del handoff
**Esfuerzo:** M (4–6 h) · **Riesgo:** MEDIO — es política transversal
**Desbloquea:** [`028`](028-validar-respuestas-con-zod.md) · condiciona `053`, `050`, `055`, `059`

## La decisión

> **Si el campo es editable, `number`** — con manejo cuidadoso de decimales, porque los float
> arrastran decimales de más. **Si es solo de lectura, `string`.**

## Cómo se cruza con lo que el backend manda

La decisión se aplica limpio, pero hay que separar **dos ejes que hasta ahora se confundían en
uno**:

| Eje | Quién lo fija | Regla |
|---|---|---|
| **Transporte** — qué viaja por el cable | el backend, no se negocia | `string` donde manda string, `number` donde manda number |
| **Edición** — cómo se maneja en el formulario | **esta decisión** | editable → `number` cuantizado · lectura → `string` |

Casi siempre coinciden. Dos casos no, y son los que hay que resolver a mano:

| Campo | Backend | ¿Editable? | Resolución |
|---|---|---|---|
| Totales de presupuesto/cronograma (`totalGeneral`, `precioTotal`, `total`…) | string | no | `Decimal` (string) — **coincide** |
| `insumo.precioUnitario` | number | sí | `number` — **coincide** |
| Parámetros (`iva`, `%HM`, los 8 rangos) | number | sí | `number` — **coincide** |
| `ApuResponse.costoDirecto` / `costoIndirecto` / `costoTotal` | **number** | **no** | **`number`.** El transporte manda: no convertir a string para fingir un `Decimal`. Formatear directo desde `number`. |
| `avancePorPeriodo` de actividad de cronograma | **string** | **sí** | **`number` en el estado del formulario, `string` al enviar.** El parser del backend rechaza números: *«Valor de avance debe ser un decimal string»*. |

La regla del transporte gana en el tipo del DTO; la regla de edición gana en el estado del
formulario. **Son sitios distintos y no hay conflicto real** — el conflicto de hoy viene de aplicar
`Decimal` a todo, incluidos los 6 sitios donde el dato llega como número.

Ahí están **6 de los 9 `as never`** del repo: `GanttChart.tsx:115,144,175` y
`AdminParametrosPage.tsx:83-85`. Con esta política desaparecen sin castear nada.

## Lo de «bien manejado»: qué significa exactamente

El riesgo del `number` no es guardar, es **calcular**.

### Guardar es seguro, y se puede demostrar

`Number.MAX_SAFE_INTEGER / 1e6 = 9 007 199 254,74`. Cualquier importe a escala 6 por debajo de
nueve mil millones cabe **exacto** en un float64 tratado como entero escalado. El total del
proyecto IESS de referencia es 395 115,32. Sobra margen de cuatro órdenes de magnitud.

### Calcular no lo es — y ya hay un bug vivo

Con los números reales de este proyecto:

```
395115.320000 − 355603.788000
  → JS:       39511.53200000001
  → correcto: 39511.532000
```

Ese cálculo está en el código hoy: **`ComparadorVersiones.tsx:21`**

```ts
const difTotal = Number(vB.totalGeneral) - Number(vA.totalGeneral);
```

Compara los totales de dos versiones de presupuesto (P-31 / US-28) y muestra al usuario una cifra
con un decimal fantasma. Es exactamente el problema que la decisión quiere evitar.

Segundo sitio, menos grave porque el resultado se redondea al mostrar:
`DialogoDescuentoGlobal.tsx:41` — `Number(sistema.rangoDescuentoMax) * 100`.

### Las tres reglas

1. **El frontend no hace aritmética de dinero. Nunca.** Es la ADR 9 (`08-codebase-design.md §8`:
   *«ninguna fórmula de §16 existe en TypeScript»*), y la variable de tesis `exactitud_calculo`
   depende de que se cumpla. Una diferencia entre dos totales **se le pide al backend** o se
   muestra como dos cifras, no como una resta hecha en el cliente.
2. **Cuantizar una sola vez, en la frontera de entrada.** Cuando el usuario teclea, se convierte a
   número con la escala del campo y no se vuelve a tocar. El patrón ya existe en el repo
   (`features/proyectos/schemas.ts:60`): `Number((v / 100).toFixed(6))`. Hay que sacarlo a un
   helper compartido, no copiarlo.
3. **Escalas fijas por tipo de dato:** dinero **6** decimales · porcentajes y avances **4**. El
   backend cuantiza a esas escalas y rechaza más (`AvancePatchParser`: *«Avance con escala mayor
   que 4»*).

## Rebanadas

### 1 — el helper y la escala

`src/lib/decimal.ts` gana el otro lado del par. Hoy solo tiene el camino `string → display`:

```
ESCALA_DINERO = 6 · ESCALA_PORCENTAJE = 4
cuantizar(valor: number, escala: number): number
parsearEntradaNumerica(entrada: string, escala: number): number | null
porcentajeAFraccion(entrada: number): number   // 12.5 → 0.125
```

`parsearEntradaDecimal` (que devuelve `Decimal`) se queda para los campos cuyo endpoint exige
string — el avance de cronograma es hoy el único.

Estos helpers son **el único sitio del repo autorizado a usar `toFixed` o `parseFloat`**.

Tests primero, y con los números del proyecto: la resta de arriba, `0.1 + 0.2`, un porcentaje
tecleado como `12,5` con coma decimal, y un valor con 8 decimales que debe cuantizarse a 6.

### 2 — arreglar los dos sitios de aritmética

**`ComparadorVersiones.tsx:21`.** ⚠️ **Corregido 2026-09-06 contra `origin/main @ c337950`.**
La redacción anterior decía que el endpoint «ya devuelve la comparación calculada por el servidor».
**Es falso.** Verificado leyendo el código:

```java
// ComparacionVersionesResponse.java
public record ComparacionVersionesResponse(List<ComparacionItem> versiones) {}
// ComparacionItem.java
public record ComparacionItem(
        UUID presupuestoId, Short version, String totalGeneral,
        List<CapituloRaizComparacion> porCapituloRaiz) {}
```

`GET /presupuestos/{id}/comparar?con=` devuelve **dos ítems con sus totales, y ninguna diferencia**
— ni general ni por capítulo. Todo el dinero es string a escala 6. El orden es estable: el primer
ítem es el del path, el segundo el de `con`.

Por tanto **no hay diferencia del backend que usar**: aplica directamente el fallback, mostrar los
dos totales sin restarlos. Si el diseño exige mostrar la diferencia, es trabajo de backend y hay
que pedirlo; no se calcula en el cliente.

**El DTO del frontend sí coincide** (`ComparacionVersionesResponse.versiones:
PresupuestoComparacionItem[]`, `contract.ts`) — `e44c608` ya lo alineó. Su único defecto es
`presupuestoId: number`, que re-tipa el plan [`053`](053-retipar-ids-presupuesto-uuid.md).

Test de regresión con `395115.320000` y `355603.788000`: hoy falla.

**`DialogoDescuentoGlobal.tsx:41`.** Multiplica un rango por 100 para mostrar un porcentaje.
No es dinero y el resultado se redondea, pero pasa por el helper igual: la regla vale más siendo
absoluta que teniendo excepciones que alguien copia.

### 3 — retipar por campo

Recorrer `contract.ts` aplicando el eje de transporte. Está entrelazado con otros planes, así que
la coordinación importa:

| Plan | Qué re-tipa | Nota |
|---|---|---|
| `053` | presupuesto · capítulo · rubro | dinero **string** — ya lo hace bien |
| `050` §5 | parámetros de sistema | **number** — quita 3 `as never` |
| `055` | cronograma | dinero string, avances string en el cable / number en el form — quita 3 `as never` |
| `059` | APU · insumo | **number** en `ApuCalculoResponse`, `ApuResponse`, `InsumoResponse` |

Este plan **no** hace ese trabajo: fija la regla y provee el helper. Los otros la aplican.

Si al terminar los cuatro queda algún `as never`, la política se aplicó mal (plan `060` §4 lo
verifica).

### 4 — la guarda de CI que el plan 015 prometió y nunca llegó

`plans/README.md` dice que el plan 015 mecaniza la ADR 9 con *«un grep de CI de
`toFixed`/`parseFloat` fuera de `src/lib/decimal.ts`»*. **No existe**: `.github/workflows/ci.yml`
tiene typecheck, lint, format, test, build y e2e — ningún grep.

Y hoy hay 5 `toFixed` fuera de `decimal.ts` (`proyectos/schemas.ts` ×3,
`DialogoDescuentoGlobal.tsx`, `PieTotales.tsx`). No son incorrectos, pero son la señal exacta que
la guarda buscaba: aritmética decimal esparcida.

Añadir el paso a `ci.yml`, después de `Lint`:

```yaml
- name: Guarda ADR 9 — aritmética decimal solo en lib/decimal.ts
  run: |
    if grep -rnE '\btoFixed\(|\bparseFloat\(' src --include='*.ts' --include='*.tsx' \
         | grep -v '^src/lib/decimal.ts'; then
      echo "::error::toFixed/parseFloat fuera de src/lib/decimal.ts (ADR 9)"; exit 1
    fi
```

Migrar los 5 sitios al helper antes de activarlo, o el primer push queda en rojo.

### 5 — corregir la doctrina escrita

`plans/README.md` §«The three decisions», punto 2, dice: *«Money travels as decimal strings»* y
*«Never parse to number and send it back»*.

**Es falso desde que existe el backend real.** APU, insumo y parámetros viajan como **número**, y
los requests aceptan las dos formas. Un ejecutor que lea esa frase y tipe `ApuResponse.costoDirecto`
como `Decimal` reproduce el error que este plan cierra.

Reescribir el punto 2 con los dos ejes. Es una frase que han leído todos los planes anteriores; si
se queda, la política nueva dura hasta el próximo agente que abra el README.

## Definición de hecho

- `npm run verify` en verde y el nuevo paso de CI también.
- `ESCALA_DINERO`, `ESCALA_PORCENTAJE`, `cuantizar`, `parsearEntradaNumerica` en `src/lib/decimal.ts`,
  con test que incluye el caso `395115.32 − 355603.788`.
- Cero `toFixed` y cero `parseFloat` fuera de `src/lib/decimal.ts`.
- Cero restas, sumas o multiplicaciones de dinero en `src/features/**`.
- El punto 2 de `plans/README.md` reescrito.
