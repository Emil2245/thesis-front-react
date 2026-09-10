# Plan 067: Arreglar los tres defectos de interfaz que harían mentir al manual de usuario

> **Nota de sustitución del Plan 075:** Este plan es histórico y no autoriza restaurar operaciones retiradas. No se deben reintroducir la duplicación de proyectos, la subida de logos ni la UI, hooks, DTOs o mocks del descuento global; solo se conservan contratos soportados por el backend.

> **Instrucciones para el ejecutor**: Invoca la skill `ponytail:ponytail` antes de escribir nada
> y mantenla activa toda la tarea. Sigue este plan paso a paso. Ejecuta cada comando de
> verificación y confirma el resultado esperado antes de pasar al siguiente. Si ocurre algo de la
> sección "Condiciones de parada", para y repórtalo — no improvises. Al terminar, actualiza la
> fila de este plan en `plans/README.md`.
>
> **Reglas duras de este encargo**: no añadas dependencias. No crees helpers, abstracciones,
> page objects ni utilidades "para después". Reutiliza los patrones que ya existen en el repo.
> El diff más corto que funcione. **`pnpm`, nunca `npm`.** El gate de tipos es
> `pnpm run typecheck` — `npx tsc --noEmit` aquí no comprueba nada.
>
> **Comprobación de deriva (ejecútala primero)**:
> `git diff --stat a3cbfe1..HEAD -- src/features/proyectos/pages/ResumenProyectoPage.tsx src/features/insumos/components/AsistenteImportCsv.tsx public/`
> Si algún archivo en alcance cambió desde que se escribió este plan, compara los extractos de
> "Estado actual" contra el código vivo antes de seguir. Si no coinciden, es condición de parada.

## Estado

- **Prioridad**: P1
- **Esfuerzo**: S
- **Riesgo**: LOW
- **Depende de**: ninguno
- **Categoría**: bug
- **Planificado en**: commit `a3cbfe1`, 2026-09-07

## Por qué importa

Este plan es requisito previo del encargo de manuales de usuario
(`plans/PROMPT-ORQUESTADOR-MANUALES.md`). Un manual de usuario tiene un modo de fallo peor que
el de un bug: **un manual que describe una pantalla que no existe no falla, miente**, y nadie lo
detecta hasta que alguien sigue el paso 4 y no encuentra el botón.

El recon del encargo encontró tres sitios donde la interfaz de hoy le diría al redactor del
manual algo que no es cierto: un botón visible y habilitado que no hace absolutamente nada, un
enlace de descarga que entrega el HTML de la aplicación en vez de un archivo, y un texto en
pantalla que describe mal el formato de un CSV de forma que quien lo siga no logra importar
nada. Los tres se documentarían como pasos del manual. Se arreglan antes de escribirlo.

Cuando este plan cierre: el botón **Editar** del proyecto abre el diálogo de edición que ya
existe y guarda de verdad; **Descargar plantilla** entrega un CSV real; y el texto de la
pantalla de importación describe las columnas que el backend acepta de verdad.

## Estado actual

Tres archivos, cada uno con un defecto independiente. No se pisan entre sí.

### Defecto 1 — El botón "Editar" del proyecto no hace nada

`src/features/proyectos/pages/ResumenProyectoPage.tsx:95-101` — botón habilitado, sin gate,
que navega a un parámetro de consulta que **nadie lee**:

```tsx
            <Button
              variant="outline"
              onClick={() => navigate(`/proyectos/${proyectoId}?editar=true`)}
            >
              <PencilIcon data-icon="inline-start" /> Editar
            </Button>
```

Ningún componente lee ese parámetro. Compruébalo tú mismo:
`grep -rn 'searchParams' src/features/proyectos/` no devuelve nada.

`src/features/proyectos/components/DialogoEditarProyecto.tsx` **existe, está completo y no lo
importa nadie**: tiene su schema Zod (líneas 28-38), su formulario poblado desde `useProyecto`,
y su `handleSubmit` que llama a `useEditarProyecto`. Su firma es exactamente la que necesitas:

```tsx
export function DialogoEditarProyecto({
  abierto,
  onClose,
}: {
  abierto: boolean;
  onClose: () => void;
}) {
  const { id } = useParams();
  const proyectoId = id ?? "";
```

Toma el id de `useParams()`, y la ruta `/proyectos/:id` lo provee (`src/routes/index.tsx:84`),
así que **no le pases `proyectoId` por props**. Al guardar ya hace
`navigate(/proyectos/${proyectoId})`, que limpia el parámetro por sí solo.

El endpoint que usa, `PUT /proyectos/{proyectoId}`, **existe** en el backend en `origin/main`
(`ProyectoResource.java:108-110`), así que esto queda funcional de verdad, no apagado.

**El patrón de montaje ya está en esa misma página**, `ResumenProyectoPage.tsx:250-261`. Cópialo:

```tsx
      <DialogoDescuentoGlobal
        abierto={descuentoAbierto}
        onClose={() => setDescuentoAbierto(false)}
        presupuestoId={presupuestoId}
      />

      <DialogoGuardarComoPlantilla
        abierto={guardarPlantillaAbierto}
        onClose={() => setGuardarPlantillaAbierto(false)}
        proyectoId={proyectoId}
      />
```

La diferencia: los dos de arriba abren con `useState`; el de edición abre con el parámetro de
consulta `?editar=true`, porque el botón ya navega ahí y hay un segundo punto de entrada
potencial. Usa `useSearchParams` de `react-router-dom`.

### Defecto 2 — "Descargar plantilla" entrega el HTML de la aplicación

`src/features/insumos/components/AsistenteImportCsv.tsx:105-109`:

```tsx
            <Button variant="outline" size="sm" asChild>
              <a href="/plantillas/insumos-template.csv" download>
                <DownloadIcon /> Descargar plantilla
              </a>
            </Button>
```

`public/` contiene **solo** `favicon.svg` e `icons.svg` — ese archivo no existe. Y `/plantillas`
es además una ruta de React Router (`src/routes/index.tsx:70`, la página "Mis plantillas"), así
que el fallback del SPA devuelve una página HTML con el atributo `download`: el usuario se
descarga la aplicación en vez de una plantilla.

La cabecera correcta la declara el parser del backend, que es la única fuente de verdad —
`CsvInsumoParser.java:24-29` en `../thesis-back-quarkus` @ `origin/main`:

```java
    private static final CSVFormat FORMAT = CSVFormat.DEFAULT
            .builder()
            .setHeader("codigo", "descripcion", "unidad", "precio")
            .setSkipHeaderRecord(true)
```

Cuatro columnas: `codigo`, `descripcion`, `unidad`, `precio`. Ni una más.

### Defecto 3 — El texto de la pantalla describe mal ese mismo CSV

`src/features/insumos/components/AsistenteImportCsv.tsx:89-92`:

```tsx
            <p className="text-sm text-muted-foreground">
              Selecciona un archivo CSV con columnas: codigo, descripcion, tipo, unidad,
              precioUnitario.
            </p>
```

Falso en dos columnas, contra el `setHeader` de arriba: **`tipo` no existe** en el CSV y
**`precioUnitario` se llama `precio`**. Un archivo construido siguiendo este texto revienta
entero con *"Archivo ilegible o columnas incorrectas"* (`CsvInsumoParser.java:57`).

Hay además una limitación de fondo que el usuario merece ver en pantalla:
`ImportacionInsumoService.java:32` y `:44` **fijan `TipoInsumo.MATERIAL`**:

```java
        List<FilaInsumo> filas = CsvInsumoParser.parse(contenido, TipoInsumo.MATERIAL);
```

Todo lo que entra por CSV se crea como material, venga del tab que venga. El `@FormParam("tipo")`
de `InsumoImportForm.java` se declara pero `InsumoResource.importar` (líneas 140-145) nunca lo
pasa al servicio. **No intentes arreglar esto**: el backend es solo lectura en este encargo, y
mandar `tipo` en el `FormData` no serviría de nada porque el endpoint lo ignora. Lo que toca es
que la pantalla lo diga.

### Convenciones del repo que aplican

- **Idioma de la UI:** español (es-EC). Los sustantivos del dominio se quedan en español en el
  código: `insumo`, `rubro`, `apu`, `capitulo`, `presupuesto`, `cronograma` (`AGENTS.md` §Key
  Conventions).
- **Tests:** Vitest + RTL + MSW. MSW intercepta todo el HTTP con `onUnhandledRequest: "error"`.
  El wrapper compartido de render es `src/test/render.tsx` (`renderConProviders`), las fixtures
  están en `src/test/fixtures/` y los handlers en `src/test/handlers.ts`.
- **Los tests viven en `src/test/`, en espejo de `src/`** — no junto al componente. Para esta
  página: `src/test/features/proyectos/pages/ResumenProyectoPage.test.tsx` (ya existe).
- **Comentarios:** este repo comenta el *porqué*, no el *qué*, y cita el plan que originó el
  cambio. Sigue esa costumbre donde añadas algo no obvio.

## Comandos que vas a necesitar

| Propósito | Comando | Esperado |
|---|---|---|
| Instalar | `pnpm install` | exit 0 |
| Tipos | `pnpm run typecheck` | exit 0, sin errores |
| Tests | `pnpm run test` | exit 0 — **477 tests en 74 archivos** como baseline mínimo |
| Un test | `pnpm run test -- ResumenProyectoPage` | pasa |
| Lint | `pnpm run lint` | exit 0 |
| Gate completo | `pnpm run verify` | exit 0 (typecheck · lint · guard:adr9 · format:check · test · build) |
| Capturas | `pnpm run e2e:screenshots` | exit 0, 11 capturas |

## Alcance

**En alcance** (los únicos archivos que puedes modificar o crear):

- `src/features/proyectos/pages/ResumenProyectoPage.tsx` — montar el diálogo de edición
- `src/features/insumos/components/AsistenteImportCsv.tsx` — corregir el texto
- `public/plantillas/insumos-template.csv` — crear
- `src/test/features/proyectos/pages/ResumenProyectoPage.test.tsx` — añadir un test
- `src/test/features/insumos/components/AsistenteImportCsv.test.tsx` — añadir tests (créalo si
  no existe; comprueba antes con `ls src/test/features/insumos/components/`)
- `plans/README.md` — la fila de estado de este plan

**Fuera de alcance** (NO los toques, aunque parezcan relacionados):

- `src/features/proyectos/components/DialogoEditarProyecto.tsx` — ya está completo y correcto.
  Lo montas, no lo reescribes. Si crees que necesita cambios, es condición de parada.
- **Todo lo relacionado con "Duplicar proyecto"**: `DialogoDuplicar.tsx`, `useDuplicarProyecto`
  en `useProyectos.ts:59-68`, y los `DropdownMenuItem` de Duplicar en
  `ResumenProyectoPage.tsx:112-121` y `ListaProyectosPage.tsx:243-255`. **Ya están
  correctamente apagados**: ambos ítems tienen `disabled` y un `Tooltip` con
  `MOTIVO_SIN_BACKEND`, porque `POST /proyectos/{id}/duplicar` no existe en `origin/main`. Son
  código muerto inalcanzable, no un defecto visible. Se anotan como deuda al final de este plan;
  no se limpian aquí.
- `src/features/proyectos/hooks/useProyecto.ts` — contiene `useSubirLogo`, un hook muerto que
  llama a `PUT /proyectos/{id}/logo`, endpoint que tampoco existe. Deuda anotada, no se toca.
- **Cualquier archivo de `../thesis-back-quarkus`** — el backend es solo lectura.
- `src/lib/disponibilidad.ts` — ningún módulo nuevo se apaga en este plan.
- Cualquier limpieza, refactor o mejora que se te ocurra de camino. Este plan no es una ronda de
  limpieza.

## Flujo de git

- Rama: `fix/067-defectos-que-bloquean-el-manual` (parte de `main`, que está limpia en `a3cbfe1`).
- Un commit por paso o por unidad lógica, estilo conventional commits en español — así están los
  del repo: `fix: dos nits de la revision del 066`, `test(e2e): la captura 11-documentos mockea
  el preflight y asierta la tarjeta (plan 066)`.
- **No hagas push ni abras PR.** El humano lo pide si lo quiere.

## Pasos

### Paso 1: Montar el diálogo de edición en la página de resumen

En `src/features/proyectos/pages/ResumenProyectoPage.tsx`:

1. Importa `useSearchParams` de `react-router-dom` (el archivo ya importa `useNavigate` de ahí)
   y `DialogoEditarProyecto` de `../components/DialogoEditarProyecto`.
2. Dentro del componente, lee el parámetro: `const [searchParams, setSearchParams] = useSearchParams();`
3. Monta el diálogo junto a los otros dos, al final del JSX (donde hoy están
   `DialogoDescuentoGlobal` y `DialogoGuardarComoPlantilla`, líneas 250-261), abierto cuando el
   parámetro esté presente y cerrándose limpiándolo:

```tsx
      <DialogoEditarProyecto
        abierto={searchParams.get("editar") === "true"}
        onClose={() => setSearchParams({}, { replace: true })}
      />
```

`{ replace: true }` evita que cerrar el diálogo deje una entrada basura en el historial del
navegador — el botón "atrás" volvería a abrirlo.

No cambies el botón de la línea 95-101: ya navega al parámetro correcto.

**Verifica**: `pnpm run typecheck` → exit 0, sin errores.

### Paso 2: Escribir el test del diálogo de edición

En `src/test/features/proyectos/pages/ResumenProyectoPage.test.tsx`, añade un caso al `describe`
existente. Sigue **exactamente** la forma de los que ya están en ese archivo: `renderConProviders`
con `<Routes><Route path="/proyectos/:id" element={<ResumenProyectoPage />} /></Routes>` y la
opción `{ ruta: ... }`, que es la que fija la URL inicial.

El caso: al renderizar con la ruta `/proyectos/${PROYECTO_1}?editar=true`, el diálogo de edición
está visible. Ánclalo por su título accesible — `DialogoEditarProyecto` renderiza un
`<DialogTitle>`; abre el archivo y usa el texto literal que tiene. Usa `await waitFor(...)` o
`findBy*`, porque el formulario se puebla desde `useProyecto`, que es asíncrono.

Añade el caso negativo en el mismo test o en uno contiguo: sin el parámetro, ese título **no**
está en el documento. Es el que falla si alguien desmonta el diálogo en el futuro.

**Verifica**: `pnpm run test -- ResumenProyectoPage` → todos pasan, incluidos los nuevos.

### Paso 3: Crear la plantilla CSV real

Crea `public/plantillas/insumos-template.csv`. Cabecera **exactamente** la del parser del
backend, y dos filas de ejemplo coherentes con el mundo de fixtures del repo — los insumos de
`src/test/fixtures/insumos.ts` son del proyecto *Puente Ambato* y empiezan por `M-001 / Cemento
Portland Tipo I / kg / 12.5`:

```csv
codigo,descripcion,unidad,precio
M-001,Cemento Portland Tipo I,kg,12.50
M-002,Arena fina,m3,18.00
```

Sin BOM, saltos de línea LF, codificación UTF-8 (el parser hace
`new String(csv, StandardCharsets.UTF_8)`).

Nada de columnas inventadas: cuatro, en ese orden.

**Verifica**:
`head -1 public/plantillas/insumos-template.csv` → `codigo,descripcion,unidad,precio`
`file public/plantillas/insumos-template.csv` → sin mención de "BOM" ni "CRLF"

### Paso 4: Corregir el texto de la pantalla de importación

En `src/features/insumos/components/AsistenteImportCsv.tsx`, sustituye el párrafo de las líneas
89-92 por uno que diga la verdad: las cuatro columnas reales (`codigo`, `descripcion`, `unidad`,
`precio`) y, en una frase corta y en lenguaje de usuario, que la importación crea insumos de
tipo **Material**.

Escríbelo como se le habla a un usuario, no como se documenta una API: nada de "endpoint",
"DTO" ni "FormParam". Dos frases bastan. Mantén el `className="text-sm text-muted-foreground"`
y la estructura que ya tiene; si el aviso del tipo Material queda mejor en su propio `<p>`,
adelante, pero no metas un componente `Alert` nuevo para esto.

**Verifica**:
`grep -n 'precioUnitario' src/features/insumos/components/AsistenteImportCsv.tsx` → sin
coincidencias en el texto visible.

### Paso 5: Escribir los tests de la pantalla de importación

Comprueba primero si el archivo existe: `ls src/test/features/insumos/components/`. Si hay un
test de `AsistenteImportCsv`, añade los casos ahí; si no, créalo siguiendo la estructura de
`src/test/features/proyectos/pages/ResumenProyectoPage.test.tsx` (imports de `vitest`,
`renderConProviders`, `screen`/`waitFor`).

Dos casos:

1. **El texto nombra las cuatro columnas reales.** Afirma que el texto visible contiene
   `precio` y no contiene `precioUnitario`. Este es el test que falla si alguien vuelve a
   desincronizar la pantalla del parser.
2. **La plantilla CSV existe y tiene la cabecera correcta.** No necesita render: lee el archivo
   con `readFileSync` de `node:fs` y afirma que su primera línea es
   `codigo,descripcion,unidad,precio`. Es la comprobación que impide que el enlace de descarga
   vuelva a apuntar al vacío.

**Verifica**: `pnpm run test` → exit 0, **479 tests o más** en 74 archivos o más.

### Paso 6: Gate completo

**Verifica**:
`pnpm run verify` → exit 0
`pnpm run e2e:screenshots` → exit 0, las 11 capturas regeneradas

Si `format:check` falla, corre `pnpm run format` y vuelve a pasar el gate — es Prettier, no un
error tuyo.

## Plan de pruebas

| Test | Archivo | Cubre |
|---|---|---|
| `?editar=true` abre el diálogo de edición | `src/test/features/proyectos/pages/ResumenProyectoPage.test.tsx` | Defecto 1 — el botón hace algo |
| sin el parámetro, el diálogo no está | idem | que nadie lo desmonte sin enterarse |
| el texto nombra `precio`, no `precioUnitario` | `src/test/features/insumos/components/AsistenteImportCsv.test.tsx` | Defecto 3 |
| la plantilla CSV existe con su cabecera | idem | Defecto 2 |

Patrón estructural a seguir: `src/test/features/proyectos/pages/ResumenProyectoPage.test.tsx`,
que ya usa `renderConProviders`, `Routes`/`Route` y `server.use(...)` de MSW para variar la
respuesta de un endpoint.

## Criterios de terminado

Comprobables por comando. Todos deben cumplirse:

- [ ] `pnpm run verify` sale 0
- [ ] `pnpm run test` sale 0 con **≥ 479 tests** (baseline 477 + los nuevos)
- [ ] `pnpm run e2e:screenshots` sale 0
- [ ] `head -1 public/plantillas/insumos-template.csv` imprime `codigo,descripcion,unidad,precio`
- [ ] `grep -rn 'DialogoEditarProyecto' src/features/proyectos/pages/ResumenProyectoPage.tsx`
      devuelve al menos dos líneas (el import y el montaje)
- [ ] `grep -n 'precioUnitario' src/features/insumos/components/AsistenteImportCsv.tsx` no
      devuelve coincidencias en texto visible
- [ ] `git status` no muestra archivos modificados fuera de la lista "En alcance"
- [ ] La fila de este plan en `plans/README.md` está actualizada

## Condiciones de parada

Para y reporta con evidencia `archivo:línea` — no improvises — si:

- Los extractos de "Estado actual" no coinciden con el código vivo (el repo derivó desde
  `a3cbfe1`).
- **`POST /proyectos/{id}/duplicar` existe ahora** en `../thesis-back-quarkus` @ `origin/main`
  (compruébalo con `git -C ../thesis-back-quarkus grep -n 'duplicar' origin/main -- 'src/main/java/*Resource.java'`).
  Significaría que el botón Duplicar ya puede encenderse, y eso es una decisión del orquestador,
  no tuya.
- `DialogoEditarProyecto` resulta necesitar cambios para funcionar montado — está declarado
  fuera de alcance precisamente porque debería bastar con montarlo. Si no basta, quiero saber
  por qué antes de que lo edites.
- Un paso falla su verificación dos veces después de un intento razonable de arreglo.
- El arreglo parece exigir tocar un archivo fuera de alcance.
- `pnpm run test` baja de 477 tests: algo se rompió, no se arregló.

## Notas de mantenimiento

Para quien revise el PR o herede esto:

- **Qué mirar en la revisión**: que el diálogo de edición se cierre limpiando el parámetro con
  `replace: true` (sin eso, el botón "atrás" del navegador lo reabre), y que el texto nuevo del
  CSV se lea como se le habla a un usuario, no como documentación de API.
- **Qué interactuará con esto**: si el backend implementa `POST /proyectos/{id}/duplicar`, el
  ítem Duplicar de las dos páginas puede encenderse quitando el `disabled` y el `Tooltip`, y
  montando `DialogoDuplicar` igual que se monta aquí el de edición. Todo el código está escrito
  ya. Igualmente, si `ImportacionInsumoService` deja de fijar `TipoInsumo.MATERIAL`, el aviso
  del paso 4 sobra y hay que quitarlo del texto.
- **Deuda observada, deliberadamente fuera de este plan**:
  1. `src/features/proyectos/components/DialogoDuplicar.tsx`, `useDuplicarProyecto`
     (`useProyectos.ts:59-68`) y los dos `onClick` con `?duplicar=true` son código muerto
     inalcanzable mientras el ítem siga `disabled`. Se conserva a propósito, como el plan 054
     conservó `DialogoDescuentoGlobalActivo`.
  2. `useSubirLogo` (`src/features/proyectos/hooks/useProyecto.ts:7-20`) es un hook muerto: no
     lo llama nadie y `PUT /proyectos/{id}/logo` no existe en `origin/main`. El campo **Logo**
     de la especificación (P-06) no tiene ningún control en pantalla.
  3. La importación por CSV solo crea materiales. Es limitación del backend
     (`ImportacionInsumoService.java:32,44`), no del frontend, y merece su propio plan **en el
     repositorio del backend**.
