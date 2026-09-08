# Plan 069: Capítulo 03 del Manual del Usuario — Insumos

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
> sobre `c6d46a5`. Si `docs/manual/usuario/02-proyectos.md` o `e2e/manual/02-proyectos.spec.ts`
> ya no existen, para: el capítulo piloto es tu patrón y algo ha cambiado de raíz.

## Estado

- **Prioridad**: P1
- **Esfuerzo**: M
- **Riesgo**: LOW
- **Depende de**: el capítulo piloto 02, ya fusionado
- **Categoría**: docs
- **Planificado en**: commit `c6d46a5`, 2026-09-07

## Por qué importa

Los insumos son la base de todo: un APU no es más que insumos con cantidades y
rendimientos. Si el usuario no sabe llenar su catálogo, no pasa de aquí.

Es también el capítulo con más trampas por metro cuadrado. Tres, y las tres las tiene que decir el
manual porque el usuario se las va a encontrar:

1. **La unidad no siempre se puede elegir.** Para mano de obra y equipo está fijada en horas.
2. **La importación por CSV crea siempre insumos de tipo Material**, importes desde el tab que
   importes. El backend lo fija así.
3. **Un insumo en uso no se puede eliminar.** Hay una pantalla entera (P-18) dedicada a explicar
   dónde se está usando.

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

**Archivo de salida:** `docs/manual/usuario/03-insumos.md`
**Carpeta de capturas:** `docs/manual/img/03-insumos/`
**Spec de capturas:** `e2e/manual/03-insumos.spec.ts`

**Procesos a documentar:** **P-13** (ver y filtrar), **P-14** (crear, editar y eliminar), **P-15** (importar por CSV), **P-16** (explorar bases centrales), **P-17** (copiar una base al proyecto) y **P-18** (ver dónde se usa un insumo).

La especificación de cada uno está en
`/home/etverkade/workspace/thesis-docs/plan/design/03-procesos-detalle.md`, sección **C. Insumos**, líneas **377-480**.
**Ese repositorio es de solo lectura**: no escribas nada en él.

Úsalo como fuente de *qué procesos existen y qué datos entran*, nunca de *cómo se ven hoy*. Se
escribió en julio con estado "planificado" y la implementación se movió después.

### Dónde vive cada proceso en la interfaz

| Proceso | Dónde vive | Archivo |
|---|---|---|
| P-13 Ver y filtrar | `/proyectos/:id/insumos` | `src/features/insumos/pages/InsumosPage.tsx`, `src/features/insumos/components/TablaInsumos.tsx` |
| P-14 Crear / editar / eliminar | Diálogo desde la tabla | `src/features/insumos/components/DialogoInsumo.tsx` |
| P-15 Importar CSV | Asistente desde la tabla | `src/features/insumos/components/AsistenteImportCsv.tsx` |
| P-16 Explorar bases centrales | Vista dentro de Insumos | `src/features/insumos/components/VistaBasesCentrales.tsx` |
| P-17 Copiar una base | Diálogo desde la tabla | `src/features/insumos/components/DialogoCopiarBase.tsx` |
| P-18 Ver uso de un insumo | Diálogo desde la fila | `src/features/insumos/components/DialogoUsoInsumo.tsx` |

**La fuente de verdad de las validaciones es `src/features/insumos/schemas.ts`.** Ojo, porque no
es un esquema plano: es una unión discriminada por **tipo de insumo**, y cada tipo valida distinto.
En concreto, **mano de obra y equipo tienen la unidad fijada en horas y no se puede cambiar**,
mientras que material y transporte la eligen. Eso va en la tabla de campos, con esa distinción
clara, no como una nota al pie.

Mira también `src/features/insumos/components/ComboboxUnidad.tsx` (cómo se eligen las unidades) y
`src/features/insumos/components/BadgeDesactualizado.tsx` (el aviso de precio viejo, que el
usuario va a ver y va a querer entender).

## Las capturas

Van a `docs/manual/img/03-insumos/NN-slug.png`, y las genera **un solo archivo nuevo**:
`e2e/manual/03-insumos.spec.ts`.

| Archivo | Qué muestra |
|---|---|
| `01-lista.png` | La pantalla de Insumos del proyecto |
| `02-nuevo-insumo.png` | El diálogo de alta, vacío |
| `03-insumo-material.png` | El diálogo relleno para un material |
| `04-desactualizado.png` | Una fila con el aviso de precio desactualizado |
| `05-import-paso1.png` | El primer paso del asistente de importación |
| `06-import-errores.png` | El resultado con errores fila por fila |
| `07-bases-centrales.png` | La vista de bases centrales |
| `08-copiar-base.png` | El diálogo para copiar una base al proyecto |
| `09-uso-insumo.png` | El diálogo que lista dónde se usa un insumo |

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

Todas estas pantallas necesitan sesión y proyecto: copia `baseAutenticado` de
`e2e/manual/02-proyectos.spec.ts` y añade las rutas de insumos. Los fixtures ya existen en
`src/test/fixtures/insumos.ts` — úsalos, no inventes datos nuevos.

Para `04-desactualizado`, la fixture ya trae un insumo con el precio viejo: búscalo antes de
inventar uno.

Para `06-import-errores` tendrás que devolver desde `page.route()` una respuesta de importación
con errores. Mira la forma exacta del resultado en `src/api/contract.ts` y en los handlers de
`src/test/handlers.ts`; no te la inventes.

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

- `docs/manual/usuario/03-insumos.md` — crear
- `e2e/manual/03-insumos.spec.ts` — crear
- `docs/manual/img/03-insumos/*.png` — generadas por el spec, nunca a mano


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

- Rama: `docs/069-manual-03-insumos`, desde `main`.
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

Crea `e2e/manual/03-insumos.spec.ts` siguiendo el patrón del paso 1, con las capturas de la tabla de
arriba, cada una con su aserción previa.

**Verifica**: `pnpm run e2e:manual` → exit 0, todos los tests pasan y los PNG aparecen en
`docs/manual/img/03-insumos/`.

### Paso 4: Mirar las capturas

Abre las imágenes generadas, una a una, y comprueba que **cada una muestra lo que su pie va a
decir que muestra**. Una captura en verde puede estar fotografiando la pantalla equivocada.

**Verifica**: ninguna imagen está vacía, en blanco, ni muestra "Algo salió mal en esta sección."

### Paso 5: Escribir el capítulo

Crea `docs/manual/usuario/03-insumos.md` con una sección por proceso, en la forma del paso 1, citando el identificador
`P-xx` en el comentario HTML de cada encabezado.

Termina el capítulo con una sección **"Lo que todavía no está disponible"** si encontraste
diferencias entre la especificación y la pantalla. Míralo en `02-proyectos.md`, que tiene una.

**Verifica**: cada `![...](../img/03-insumos/NN-slug.png)` apunta a un archivo que existe.

### Paso 6: Gate

**Verifica**: `pnpm run verify` → exit 0 · `pnpm run e2e` → exit 0.

## Criterios de terminado

- [ ] `pnpm run verify` sale 0
- [ ] `pnpm run e2e` sale 0, con más tests que los 29 del baseline
- [ ] `pnpm run e2e:manual` regenera todas las capturas del capítulo en limpio
- [ ] `docs/manual/usuario/03-insumos.md` existe, con una sección por proceso documentado
- [ ] Cada enlace de imagen del capítulo apunta a un archivo que existe en
      `docs/manual/img/03-insumos/`
- [ ] Ninguna tabla de campos contradice el esquema Zod del formulario
- [ ] `git status` no muestra cambios en `src/`, `docs/manual/README.md`, `package.json` ni
      `playwright.config.ts`
- [ ] El capítulo entero se lee sin saber qué es un endpoint

## Condiciones de parada

Para y reporta con evidencia `archivo:línea` — no improvises — si:

- La unidad **sí** se puede editar para mano de obra o equipo, al contrario de lo que dice
  `src/features/insumos/schemas.ts`. Sería un bug.
- El botón **Descargar plantilla** del asistente de importación no descarga un CSV. Se arregló en
  el plan 067 y debe funcionar; si no, algo se ha revertido.
- El texto del asistente de importación vuelve a nombrar columnas que el backend no acepta. Las
  correctas son cuatro: `codigo`, `descripcion`, `unidad`, `precio`. **No lo arregles tú**: es
  `src/`, está fuera de alcance. Repórtalo.
- Eliminar un insumo en uso **no** queda bloqueado.
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

## Contexto extra que te ahorra tiempo

- **La importación por CSV crea siempre insumos de tipo Material.** Está fijado en el backend, el
  tab desde el que importes no cambia nada, y la pantalla ya lo avisa. Dilo también en el manual:
  quien quiera cargar mano de obra o equipo en bloque no puede, y más vale que lo sepa antes de
  preparar el archivo.
- **Las columnas del CSV son exactamente cuatro**: `codigo`, `descripcion`, `unidad`, `precio`. Hay
  una plantilla descargable en la propia pantalla; el manual debe decir que se use.
- **Copiar una base no sobrescribe lo que ya tienes**: si un código coincide, se conserva el
  insumo del proyecto y el de la base se omite. El resultado te dice cuáles se omitieron.
- **La copia es independiente**: si el administrador cambia después el precio en la base central,
  tu proyecto no se entera. Es deliberado y conviene decirlo, porque es contraintuitivo.
- Cambiar el precio de un insumo **sí** se propaga a todos los APUs que lo heredan. Ese es el
  mecanismo con el que se ajustan costos.
