# Plan 072: Capítulo 04 del Manual del Usuario — El APU

> **Instrucciones para el ejecutor**: Invoca la skill `ponytail:ponytail` antes de escribir nada
> y mantenla activa toda la tarea. Sigue este plan paso a paso. Ejecuta cada comando de
> verificación y confirma el resultado esperado antes de pasar al siguiente. Si ocurre algo de la
> sección "Condiciones de parada", para y repórtalo — no improvises.
>
> **Las cuatro reglas de este encargo**, porque en documentación es donde más se sobre-construye:
>
> 1. **Reutiliza el patrón de `e2e/manual/02-proyectos.spec.ts`.** No hay helper de capturas, ni
>    page object, ni generador de manuales, ni script que convierta la especificación en Markdown.
>    Un spec por capítulo, con `page.route()`, como los que ya funcionan.
> 2. **No añadas dependencias.** Ni de capturas, ni de Markdown, ni de PDF. Playwright ya está.
> 3. **No escribas prosa que no documente un paso.** Nada de introducciones sobre la importancia
>    de los precios unitarios en la contratación pública: el manual dice qué pulsar.
> 4. **Si un proceso de la especificación no existe en la interfaz, PARA y repórtalo.** No lo
>    documentes "como debería ser". Es la condición de parada más importante del encargo.
>
> **`pnpm`, nunca `npm`.** El gate de tipos es `pnpm run typecheck`; `npx tsc --noEmit` aquí no
> comprueba nada. Y ojo: **`verify` no comprueba tipos en `e2e/`** — un error de tipos en un
> `.spec.ts` no aparece hasta que corre Playwright.
>
> **Comprobación de deriva (ejecútala primero)**: `git log --oneline -3` — este plan se escribió
> sobre `8505147`. Si `docs/manual/usuario/02-proyectos.md` o `e2e/manual/02-proyectos.spec.ts`
> ya no existen, para: el capítulo piloto es tu patrón y algo ha cambiado de raíz.

## Estado

- **Prioridad**: P1
- **Esfuerzo**: M
- **Riesgo**: LOW
- **Depende de**: el capítulo piloto 02, ya fusionado
- **Categoría**: docs
- **Planificado en**: commit `8505147`, 2026-09-07

## Por qué importa

El APU es el núcleo del sistema: todo lo demás —presupuesto, cronograma,
documentos— se deriva de él. Es el capítulo más largo y el que más capturas necesita, y el que un
usuario nuevo va a tener abierto al lado mientras trabaja.

Es también el que más riesgo tiene de mentir, por dos motivos: la especificación describe
funcionalidad que se retiró después (ver la sección siguiente, léela entera), y la pantalla de
edición tiene comportamientos que no son obvios —una fila que no se puede tocar, precios que se
heredan solos— y que el usuario va a descubrir a base de sustos si el manual no se los cuenta.

## La regla que gobierna este trabajo

**Cada afirmación del manual corresponde a algo que existe en el código de este repositorio, y
cada captura la produce la suite de Playwright de este repositorio.** Nada de prosa escrita desde
la especificación sin comprobar la pantalla.

Un manual de usuario tiene un modo de fallo peor que el de un bug: **un manual que describe una
pantalla que no existe no falla, miente**, y nadie lo detecta hasta que alguien sigue el paso 4 y
no encuentra el botón.

En concreto, y no es negociable:

- **Las tablas de campos salen del esquema Zod real del formulario**, no de la tabla de la
  especificación. Si la especificación dice que un campo es obligatorio y el Zod dice que no, manda
  el Zod, porque es lo que le pasa al usuario.
- **Los mensajes de error se citan literales**, copiados del código.
- **El nombre de cada control se escribe literal y en negrita**, tal y como se lee en pantalla.
- Si la especificación describe un paso, un campo o una pantalla **que no existe**, no lo
  documentas: lo anotas al final del capítulo, en una sección **"Lo que todavía no está
  disponible"**, y sigues. Si lo que falta es un proceso entero, PARA y repórtalo.


## El ejemplo que debes seguir

**Lee `docs/manual/usuario/02-proyectos.md` entero antes de escribir una línea.** Es el capítulo
piloto, ya revisado y fusionado, y fija el tono, la estructura y el nivel de detalle. Su spec de
capturas, `e2e/manual/02-proyectos.spec.ts`, es el patrón técnico que copias.

Cada proceso se escribe con esta forma exacta:

```markdown
## 2.3 Crear un proyecto  <!-- P-06 · S-08 -->

**Quién puede hacerlo:** cualquier usuario con sesión iniciada.

**Antes de empezar**

- Tener la sesión iniciada (ver §1.2).
- Saber si vas a partir de una base de insumos existente o de cero.

**Pasos**

1. En la pantalla **Proyectos**, pulsa **Nuevo proyecto**.

   ![Botón Nuevo proyecto](../img/02-proyectos/02-boton-nuevo.png)

2. **Paso 1 de 2 — Datos generales.** Completa el formulario.

   ![Asistente, paso 1](../img/02-proyectos/03-asistente-datos.png)

   | Campo | ¿Obligatorio? | Formato o valores | Si lo dejas vacío |
   |---|---|---|---|
   | Nombre | Sí | Texto, hasta 200 caracteres | *"El nombre es obligatorio"* y no avanza |
   | Código | No | Texto, hasta 50 caracteres | El sistema genera uno |

3. …

**Si algo sale mal**

- *"El nombre es obligatorio"* → el campo quedó vacío en el paso 1.

**Al terminar:** el proyecto queda creado con la **versión 1** del presupuesto marcada como
vigente. Se abre su pantalla de resumen.
```

Reglas de redacción, cortas y obligatorias:

- **Tuteo, voz activa, presente.** "Pulsa Guardar", no "se deberá proceder a guardar".
- Los sustantivos del dominio se quedan en español: *insumo, rubro, APU, capítulo, presupuesto,
  cronograma, rendimiento*.
- **Cero jerga de implementación.** Quien lee esto no sabe qué es un DTO, un endpoint, `es_vigente`
  ni un UUID, y no le hace falta. Traduce la tabla de la especificación a lo que se ve en pantalla.
- **Una captura por cada paso que cambia lo que se ve.** Ni capturas decorativas, ni pasos a ciegas.


## El encargo concreto

**Archivo de salida:** `docs/manual/usuario/04-apu.md`
**Carpeta de capturas:** `docs/manual/img/04-apu/`
**Spec de capturas:** `e2e/manual/04-apu.spec.ts`

**Procesos a documentar:** **P-19** (listar APUs), **P-20** (crear desde cero o desde plantilla), **P-21** (editar el APU — la pantalla núcleo), **P-22** (precio propio de una fila y vuelta a la herencia), **P-23** (%CI del rubro), **P-26** (plantillas personales), **P-27** (desglose de un cálculo) y **P-45** (especificaciones técnicas del APU).

La especificación de cada uno está en
`/home/etverkade/workspace/thesis-docs/plan/design/03-procesos-detalle.md`, sección **D. APU**, líneas **481-792**, más **P-45** en las líneas **1090-1151**.
**Ese repositorio es de solo lectura**: no escribas nada en él.

Úsalo como fuente de *qué procesos existen y qué datos entran*, nunca de *cómo se ven hoy*. Se
escribió en julio con estado "planificado" y la implementación se movió después.

### Dónde vive cada proceso en la interfaz

| Proceso | Dónde vive | Archivo |
|---|---|---|
| P-19 Listar APUs | `/proyectos/:id/apus` | `src/features/apu-editor/pages/ListaApusPage.tsx` |
| P-20 Crear APU | Diálogo desde la lista | `src/features/apu-editor/components/DialogoNuevoApu.tsx` |
| P-21 Editar APU | `/proyectos/:id/apus/:apuId` | `src/features/apu-editor/pages/EditorApuPage.tsx`, `GridSeccion.tsx`, `FilaDetalle.tsx`, `CeldaEditable.tsx`, `SelectorInsumo.tsx`, `EncabezadoApu.tsx` |
| P-22 Precio propio / heredado | En cada fila del editor | `src/features/apu-editor/components/BadgeHerencia.tsx`, `FilaDetalle.tsx` |
| P-23 %CI del rubro | Pie del editor | `src/features/apu-editor/components/PieTotales.tsx` |
| P-26 Plantillas personales | Diálogo + `/plantillas` | `src/features/apu-editor/components/DialogoGuardarPlantilla.tsx`, `src/features/plantillas/pages/MisPlantillasPage.tsx` |
| P-27 Desglose de cálculo | Popover en el editor | `src/features/apu-editor/components/PopoverDesglose.tsx` |
| P-45 Especificaciones técnicas | Panel en el editor | `src/features/apu-editor/components/PanelEspecificacionTecnica.tsx` |

**Las validaciones viven en `src/features/apu-editor/schemas.ts`.** Son de celda, no de
formulario: cantidad, rendimiento y precio propio, cada una con su mensaje. Léelo: el mensaje de
*"Debe ser mayor que 0 o vacío para heredar"* es exactamente el que explica el mecanismo de
herencia, y merece salir en el manual tal cual.

Dos comportamientos que **el manual tiene que explicar** porque el usuario se los encontrará:

1. **La fila de Herramienta Menor no se edita ni se borra.** El propio código lo dice en
   `FilaDetalle.tsx:76`: *"Se calcula automáticamente como %HM × Subtotal Mano de obra"*. Explica
   de dónde sale y cómo se cambia (desde los parámetros del proyecto, §2.4).
2. **Los precios se heredan del insumo.** Una fila muestra el precio del insumo hasta que
   escribes otro; entonces pasa a ser propio de esa fila y deja de seguir al insumo. Borrar lo
   que escribiste devuelve la herencia. `BadgeHerencia.tsx` es lo que el usuario ve.

## Las capturas

Van a `docs/manual/img/04-apu/NN-slug.png`, y las genera **un solo archivo nuevo**:
`e2e/manual/04-apu.spec.ts`.

| Archivo | Qué muestra |
|---|---|
| `01-lista.png` | La lista de APUs de la versión |
| `02-nuevo-apu.png` | El diálogo de creación, desde cero |
| `03-nuevo-desde-plantilla.png` | El mismo diálogo, eligiendo plantilla |
| `04-editor.png` | El editor completo, con sus cuatro bloques y el pie |
| `05-fila-editando.png` | Una celda en edición, con su validación |
| `06-selector-insumo.png` | El buscador de insumos para añadir una fila |
| `07-herencia.png` | Una fila con precio heredado y otra con precio propio |
| `08-herramienta-menor.png` | La fila de Herramienta Menor y su explicación |
| `09-pie-totales.png` | El pie con CD, %CI y CT |
| `10-desglose.png` | El popover que explica un cálculo |
| `11-especificacion-tecnica.png` | El panel de especificaciones técnicas |
| `12-guardar-plantilla.png` | El diálogo de guardar como plantilla |
| `13-mis-plantillas.png` | La pantalla de plantillas personales |

**Cómo se escribe ese spec** — copia `e2e/manual/02-proyectos.spec.ts`, que ya hace todo esto:

- Importa los fixtures compartidos de `src/test/fixtures/`. **El mundo de datos es el mismo en
  todo el manual**: proyecto *Puente Ambato* (`AMB-001`), usuaria *Ana Torres*. Un manual donde el
  proyecto cambia de nombre entre el paso 3 y el paso 4 es un manual roto.
- Intercepta la API con `page.route()` sobre `**/api/v1`. Registra primero el catch-all y después
  las rutas específicas: en Playwright gana la última que casa.
- Para diálogos y formularios, **captura del elemento** (`locator.screenshot()`), no de la página
  entera: una captura de 1280×2000 donde el botón que importa mide 80 px no documenta nada. Para
  pantallas completas, `{ fullPage: true }`.
- Escribe el PNG solo en chromium (`if (testInfo.project.name !== "chromium") return;`).

**Lección del plan 064, y es la que más caro sale**: una captura puede estar en verde y estar
fotografiando la pantalla equivocada, o una vacía. **Cada test afirma antes de disparar la foto**:

```ts
await expect(page.getByRole("heading", { name: "Proyectos" })).toBeVisible();
await expect(page.getByText("Puente Ambato")).toBeVisible();
await capturar(page, "01-lista", testInfo, true);
```

Si la pantalla no muestra lo que debe, el test falla en vez de guardar una foto de una pantalla
vacía. **No relajes las aserciones para que pase el test**: si falla, es que faltan mocks o que la
pantalla no es la que creías, y ambas cosas hay que resolverlas, no esconderlas.

Todo necesita sesión, proyecto y versión: copia `baseAutenticado` de
`e2e/manual/02-proyectos.spec.ts`, que ya monta *Puente Ambato* con sus versiones, y añade las
rutas de APU. Los fixtures están en `src/test/fixtures/apu.ts` — úsalos, no inventes datos.

Este capítulo tiene **más capturas de elemento que de página**: el editor entero solo merece una
foto completa (`04-editor`); el resto son bloques, filas, el pie y los diálogos. Una captura de
página entera donde lo que importa es una celda no documenta nada.

Para `05-fila-editando` y `07-herencia` tendrás que interactuar antes de fotografiar: entrar en
una celda, escribir un valor. **Afirma el estado que quieres retratar** antes de disparar —por
ejemplo, que el mensaje de validación es visible, o que el distintivo de precio propio aparece—
o acabarás fotografiando la fila en reposo.

## Comandos que vas a necesitar

| Propósito | Comando | Esperado |
|---|---|---|
| Instalar | `pnpm install` | exit 0 |
| Tipos | `pnpm run typecheck` | exit 0 |
| Gate completo | `pnpm run verify` | exit 0 |
| Capturas del manual | `pnpm run e2e:manual` | exit 0, todas pasan |
| Suite E2E entera | `pnpm run e2e` | exit 0 |

**Baseline que no puedes bajar:** 480 tests unitarios en 74 archivos, `pnpm run e2e` en verde con
29 tests. Tus capturas nuevas **suben** ese número de e2e; si algo baja, el trabajo no está
terminado.

Si `format:check` falla, corre `pnpm run format`. Es Prettier, no un error tuyo.


## Alcance

**En alcance** (los únicos archivos que puedes crear o modificar):

- `docs/manual/usuario/04-apu.md` — crear
- `e2e/manual/04-apu.spec.ts` — crear
- `docs/manual/img/04-apu/*.png` — generadas por el spec, nunca a mano


**Fuera de alcance** (NO los toques):

- **`src/` entero.** Este encargo es documentación. Si redactando encuentras un bug —un texto
  equivocado, un campo que no valida, un botón que no hace nada— **no lo arregles**: anótalo en tu
  informe final con `archivo:línea` y sigue. Mezclar arreglos de interfaz dentro de un capítulo
  convierte una revisión de prosa en una revisión de código.
- **`docs/manual/README.md`** — el índice lo mantiene el orquestador. Los capítulos se escriben en
  paralelo y ese archivo es el único que compartís; si lo tocas, chocas con otro ejecutor.
- `package.json` — el script `e2e:manual` ya existe y ya recoge `e2e/manual/` entero.
- `playwright.config.ts` — ya está configurado para que las capturas del manual solo corran en
  chromium.
- Los demás capítulos del manual y sus specs.
- `/home/etverkade/workspace/thesis-docs` y `/home/etverkade/workspace/thesis-back-quarkus`, ambos
  de solo lectura.

## Flujo de git

- Rama: `docs/072-manual-04-apu`, desde `main`.
- Commits en estilo conventional en español: `docs(manual): …`.
- **No hagas push ni abras PR.**

## Pasos

### Paso 1: Leer el patrón

Lee entero `docs/manual/usuario/02-proyectos.md` y entero `e2e/manual/02-proyectos.spec.ts`. Son
tu plantilla de prosa y tu plantilla técnica.

**Verifica**: puedes decir de memoria qué cinco bloques tiene cada sección de proceso
(*Quién puede hacerlo* · *Antes de empezar* · *Pasos* · *Si algo sale mal* · *Al terminar*).

### Paso 2: Leer las pantallas reales, una por una

Para cada proceso de la lista, abre los archivos que se citan arriba y anota:

- El texto **literal** de cada título, etiqueta, botón y opción de menú.
- El **esquema Zod** del formulario: qué es obligatorio, qué rangos, qué longitudes máximas y, muy
  importante, **el mensaje de error literal de cada regla**.
- Qué pasa al guardar: a dónde navega, qué aviso sale.

Esto es el trabajo real del capítulo. No lo saltes escribiendo desde la especificación.

**Verifica**: tienes una lista de campos por formulario con su mensaje de error copiado del código.

### Paso 3: Escribir el spec de capturas

Crea `e2e/manual/04-apu.spec.ts` siguiendo el patrón del paso 1, con las capturas de la tabla de
arriba, cada una con su aserción previa.

**Verifica**: `pnpm run e2e:manual` → exit 0, todos los tests pasan y los PNG aparecen en
`docs/manual/img/04-apu/`.

### Paso 4: Mirar las capturas

Abre las imágenes generadas, una a una, y comprueba que **cada una muestra lo que su pie va a
decir que muestra**. Una captura en verde puede estar fotografiando la pantalla equivocada.

**Verifica**: ninguna imagen está vacía, en blanco, ni muestra "Algo salió mal en esta sección."

### Paso 5: Escribir el capítulo

Crea `docs/manual/usuario/04-apu.md` con una sección por proceso, en la forma del paso 1, citando el identificador
`P-xx` en el comentario HTML de cada encabezado.

Termina el capítulo con una sección **"Lo que todavía no está disponible"** si encontraste
diferencias entre la especificación y la pantalla. Míralo en `02-proyectos.md`, que tiene una.

**Verifica**: cada `![...](../img/04-apu/NN-slug.png)` apunta a un archivo que existe.

### Paso 6: Gate

**Verifica**: `pnpm run verify` → exit 0 · `pnpm run e2e` → exit 0.

## Criterios de terminado

- [ ] `pnpm run verify` sale 0
- [ ] `pnpm run e2e` sale 0, con más tests que los 29 del baseline
- [ ] `pnpm run e2e:manual` regenera todas las capturas del capítulo en limpio
- [ ] `docs/manual/usuario/04-apu.md` existe, con una sección por proceso documentado
- [ ] Cada enlace de imagen del capítulo apunta a un archivo que existe en
      `docs/manual/img/04-apu/`
- [ ] Ninguna tabla de campos contradice el esquema Zod del formulario
- [ ] `git status` no muestra cambios en `src/`, `docs/manual/README.md`, `package.json` ni
      `playwright.config.ts`
- [ ] El capítulo entero se lee sin saber qué es un endpoint

## Condiciones de parada

Para y reporta con evidencia `archivo:línea` — no improvises — si:

- Aparece en la interfaz cualquier rastro de «rubro auxiliar» o de un porcentaje de descuento
  por APU. Ambos están retirados; si existen, el código y la especificación se han desincronizado
  y quiero saberlo antes de que lo documentes.
- La fila de Herramienta Menor **se puede** editar o eliminar.
- El editor no recalcula al cambiar una cantidad o un rendimiento.
- El panel de especificaciones técnicas (P-45) no guarda.
- Un paso falla su verificación dos veces tras un intento razonable de arreglo.
- El trabajo parece exigir tocar `src/` o cualquier archivo fuera de alcance.
- `pnpm run verify` baja de 480 tests unitarios, o `pnpm run e2e` de 29.

## Notas de mantenimiento

- **Qué mirar en la revisión**: que las tablas de campos coincidan con el Zod y no con la
  especificación; que los mensajes de error estén citados literales; y que ninguna captura muestre
  una pantalla distinta de la que anuncia su pie.
- **Qué interactuará con esto**: si la interfaz de estas pantallas cambia, las capturas se
  regeneran con `pnpm run e2e:manual` y las aserciones del spec fallarán primero, que es
  exactamente lo que se busca.
- En tu informe final, lista aparte **cualquier diferencia entre la especificación y la pantalla**
  que hayas encontrado, y **cualquier bug de interfaz** que hayas visto y no tocado.


### Lo que NO existe y la especificación sí menciona — léelo antes de escribir

Este capítulo es donde más fácil es documentar algo que ya no está. La especificación se escribió
antes de varias decisiones que retiraron funcionalidad, y **si la mencionas, el manual miente**.
Lo comprobé en el código: no queda ni rastro de ninguna de estas cosas en
`src/features/apu-editor/` ni en `src/features/presupuesto/`.

- **No existen los «rubros auxiliares».** Un APU nunca referencia a otro APU. P-25 está retirado
  (`SUPERSEDED`), no hay flag «es auxiliar» en el encabezado, y el selector de insumos del bloque
  de materiales **no lista APUs**. Si ves la palabra «auxiliar» en la especificación, ignórala.
- **No existe el descuento por rubro.** P-24 está retirado (`WITHDRAWN`). No hay campo de
  porcentaje de descuento en el APU, y la cadena de cálculo es **CD → CI → CT**, sin ningún paso
  intermedio de descuento.
- **El descuento global no forma parte de la interfaz** porque el backend consolidado no expone
  ese contrato. Para bajar costos se editan los precios de los insumos.

### El dinero, y por qué importa aquí

Este repositorio tiene una política de dinero (ADR 9, en `plans/README.md` punto 2) y una regla de
redondeo que el manual **no debe explicar mal**. Dos cosas concretas:

- **No inventes cifras.** Si escribes un ejemplo numérico, que salga de la captura que acompaña al
  paso, no de tu cabeza.
- **No expliques el algoritmo de redondeo.** Al usuario le importa qué ve y qué pasa si lo cambia,
  no con cuántos decimales se guarda internamente. Si necesitas mencionar la precisión, describe
  lo que muestra la pantalla.

## Contexto extra que te ahorra tiempo

- **Un APU es una ficha de costo de un rubro**: cuánto cuesta ejecutar una unidad de obra
  (un metro cúbico de hormigón, un metro cuadrado de encofrado). Se compone de cuatro bloques
  —equipo, mano de obra, materiales y transporte— y de ahí sale el costo directo, al que se suma
  un porcentaje de costos indirectos para llegar al costo total.
- **El rendimiento lo ingresa el usuario**, el sistema no lo calcula. Es cuántas horas de esa
  cuadrilla o ese equipo hacen falta por unidad de obra.
- **Las plantillas son la vía principal de trabajo**: el ingeniero arma sus APUs desde plantillas
  mucho más que desde cero. Dale a P-20-desde-plantilla y a P-26 el peso que merecen; no los
  trates como una nota al margen.
- Al cargar una plantilla, los insumos que no existan en tu proyecto **se copian o se quedan
  pendientes con precio cero y un aviso**. No es un fallo: es que ese insumo no estaba en tu base
  y te toca ponerle precio. Dilo así.
