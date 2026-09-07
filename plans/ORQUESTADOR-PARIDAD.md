# Orquestador — paridad con el backend

**Eres la cabeza de este proyecto.** El backend avanza por su cuenta y tú pones el frontend a la
altura: detectas qué llegó, compruebas si viene documentado, escribes los planes, los reparte a
ejecutores, revisas lo que vuelve y **fusionas tú**. Delegas la ejecución; el juicio no.

**Arranca sin preguntar.** Leer este archivo es la señal de empezar. La primera pregunta al humano
llega cuando la §9 diga que llega, no antes.

Este encargo es **recurrente**: se repite cada vez que el backend mueve `origin/main`. La ruta
anterior (planes 053–065, olas 0–8) está cerrada — ver [`BITACORA.md`](BITACORA.md) y
[`ORQUESTADOR.md`](ORQUESTADOR.md), que es su documento y ya no manda.

---

## 0. Arranque

Cuatro cosas, en orden, y nada más antes de empezar.

1. **El delta del backend, primero que nada.** No leas ningún documento de planificación antes de
   esto: tres análisis completos de este proyecto se hicieron contra el commit equivocado, y uno
   quemó ~1M de tokens sobre un `main` local 42 commits atrás.

   ```bash
   cd ../thesis-back-quarkus && git fetch --all
   git log --oneline c337950..origin/main          # c337950 = último commit ya analizado
   git diff --name-only c337950..origin/main | grep '\.java$'
   ```

   El working tree del backend está en `test/stuff`, **que no está mergeada**. Nunca hagas
   checkout: lee `main` con `git show origin/main:<path>` y `git ls-tree -r --name-only origin/main`.

2. **`plans/BITACORA.md`** — dice dónde te quedaste. Si la ruta que describe está cerrada, abres
   una sección nueva para esta ronda (§1). Compruébala contra `git worktree list` y `git log`
   antes de creerla.

3. **`plans/HANDOFF-ESTADO-Y-GAPS.md`** y **`plans/INVENTARIO-COBERTURA.md`** — qué hay medido en
   el front. Están escritos contra `c337950`; lo que el delta contradiga, caduca.

4. **`AGENTS.md`** de este repo — convenciones, y **`docs/bugs.md`** — los cuatro patrones que
   produjeron 40 defectos reales aquí. El más repetido: *el mock era la especificación*. Un
   handler MSW que acepta cualquier cuerpo es un test que no prueba nada, y la suite estuvo verde
   mientras seis funcionalidades no funcionaban en producción.

---

## 1. La bitácora

`plans/BITACORA.md` es **el estado que sobrevive a que te quedes sin tokens.** Tu contexto no
sobrevive; ese archivo sí.

Escribe en ella **en el momento en que algo cambia de estado**, no al final de la sesión: si te
cortan a mitad, lo que no escribiste no ocurrió. Abre una sección para esta ronda con el mismo
formato que las anteriores (tabla plan · estado · worktree · commit · nota) y **anota el SHA del
backend contra el que estás trabajando**. Sin ese SHA la ronda siguiente no sabe dónde empezar —
es el `c337950` de la §0.

Estados: `⏳ pendiente` · `🔄 en curso` · `🟡 vuelto, sin revisar` · `❌ rechazado, redespachado` ·
`✅ verde`.

---

## 2. El ciclo de paridad

Cinco fases. No te salgas de orden: la fase 4 escrita sin la 2 produce planes que inventan el
contrato.

### Fase 1 — Qué llegó, y de qué tipo

Parte el delta en dos montones, porque **solo uno es trabajo tuyo**:

- **Código** (`src/main/java/**`, recursos JAX-RS, DTOs, tests) → hay contraparte que implementar.
- **Solo planes y documentación** (`plans/**`, `docs/**`, colecciones Bruno de algo aún no
  escrito) → **no hay nada que implementar**. Anótalo en la bitácora como "planificado en el
  backend, sin código" y no escribas un plan de frontend contra él.

Esa distinción no es burocracia: es la regla que evita repetir el error del `ROADMAP-V2`, que
declaró «cronograma no existe» el día después de que `main` lo mergeara entero. Y su inversa —
construir la UI de un endpoint que solo existe en un documento — es cómo nació la mitad de la
deriva que los planes 048–052 tuvieron que degradar.

Inventario de recursos, cuando necesites la foto completa:

```bash
cd ../thesis-back-quarkus
git ls-tree -r --name-only origin/main | grep 'Resource\.java$'   # eran 31 en 5673615
```

### Fase 2 — Si viene documentado, ese es tu contrato

Cuatro fuentes, en este orden de autoridad:

| Fuente | Qué te da |
|---|---|
| El código de `origin/main` | **La verdad.** Cuando cualquier documento discrepe, gana el código. |
| `../thesis-back-quarkus/api/bruno/**` | El contrato **ejecutable**: rutas, cuerpos, códigos de estado y cabeceras esperadas, caso por caso. Es la fuente más barata de leer y la que menos miente. |
| `../thesis-back-quarkus/plans/NNN-*.md` y `docs/modulos/**` | La intención: por qué está hecho así, qué queda fuera a propósito. |
| `../thesis-docs/plan/architecture/07-api-contract.md` | El contrato **acordado** — qué pantallas deben existir. No es el implementado. |

Lee el recurso JAX-RS entero antes de tipar un DTO. **Las formas se transcriben del `record` de
Java, no se adivinan**: el plan 059 existió para arreglar DTOs adivinados, y el 063 para un
`ErrorPayload` que se creyó RFC 7807 sin comprobarlo.

Mira en particular cómo serializa cada número. La política está en `AGENTS.md` y en
`plans/README.md` §2, y **no se negocia porque la fija el backend**: presupuesto y cronograma
serializan `string` (el tipo marcado `Decimal`), APU e insumos serializan `number`.

### Fase 3 — Auditar el front contra ese delta

Aquí usas la skill **`improve`**, que es de **solo lectura sobre el código fuente** y solo escribe
en `plans/`. La variante que te sirve es `improve plan <descripción>` cuando ya sabes qué hay que
hacer, y la auditoría completa cuando el delta es grande y no sabes qué toca.

Lo que buscas, por cada cosa nueva del backend:

- ¿Existe ya pantalla, hook y DTO en el front? → alinear.
- ¿Existe pantalla degradada con `ModuloNoDisponible`? → encenderla: quitar la clave de
  `src/lib/disponibilidad.ts`, borrar el wrapper y renombrar `<Nombre>PageActiva`. **Nunca borres
  una pantalla degradada.**
- ¿No existe nada? → pantalla nueva, y entonces la skill `shadcn` es obligatoria.
- ¿El front llama ya a una ruta que el delta cambió? → eso es un bug vivo, va primero.

### Fase 4 — Escribir los planes

**Tú escribes los planes; no los ejecutas.** Método `improve`, plantilla en
`~/.claude/skills/improve/references/plan-template.md`. Un plan está bien escrito cuando **un
modelo más barato y sin nada de tu contexto** puede ejecutarlo: contexto inlineado, extractos del
código como está hoy, comandos de verificación con su salida esperada, alcance cerrado (en y
fuera), definición de hecho comprobable por máquina, y condiciones de parada específicas de ese
plan.

Reglas de este repositorio:

- Nombre `plans/NNN-slug.md`, numeración **monotónica: el siguiente libre es el `066`**.
- Cada plan estampa el commit del front contra el que se escribió (`git rev-parse --short HEAD`) y
  **el commit del backend** cuyo contrato transcribe.
- Los extractos los abres tú. Un extracto copiado del informe de un subagente es un extracto sin
  verificar, y un plan con el extracto equivocado falla su propio drift check.
- Agrupa en **olas**: dentro de una ola, paralelo; entre olas, no. Lo que comparte archivo va en
  serie o al mismo ejecutor. `src/test/handlers.ts` y `src/api/contract.ts` los toca casi todo:
  esa es la matriz de solapes que tienes que mirar antes de paralelizar.

### Fase 5 — Despachar, revisar, fusionar

Es la §3. Una ola cierra cuando todos sus planes están verdes **y fusionados a `main`**.

---

## 3. El ciclo de una ola

### 3.1 Despachar — un plan, un ejecutor, un worktree

**Todo ejecutor trabaja en un worktree de su feature. Ninguno commitea en `main`: eso lo haces
tú.** El worktree es lo que te permite lanzar la ola en paralelo y lo que deja el trabajo en disco
aunque la sesión muera.

Con el `Agent` tool, `isolation: "worktree"` lo crea y lo limpia por ti. A mano, la convención del
repo es `.claude/worktrees/<rama>` con la rama del mismo nombre (ya está en `.gitignore`):

```bash
git worktree add .claude/worktrees/ola1-066 -b ola1-066
cd .claude/worktrees/ola1-066 && pnpm install     # el worktree no hereda node_modules
```

El prompt del ejecutor lleva **estas cosas y ninguna más**:

1. La ruta del plan. Que lo lea entero; no se lo resumas.
2. `Invoca la skill ponytail:ponytail antes de escribir código.` La solución más corta que
   funciona, sin abstracciones especulativas — los ejecutores baratos sobre-construyen.
3. `Invoca la skill test-driven-development: el test rojo primero.`
4. La puerta: `pnpm run verify` en verde antes de reportar.
5. `Localiza por símbolo (grep del nombre del campo, del hook o de la ruta), no por número de
   línea: los planes anteriores han movido esos archivos.`
6. `Commitea en tu worktree en estilo conventional. No fusiones, no hagas push, no toques main, no
   actualices la bitácora: el índice lo mantengo yo.`

Los planes son autocontenidos a propósito. Cada línea de contexto que añadas es una línea que
puede contradecirlos — **salvo las reglas transversales de la §8**, que no viven en el plan y que
sí pegas cuando el ejecutor no es un subagente de Claude Code.

**Los que van en paralelo, en un solo mensaje con varias llamadas al `Agent` tool.**

### 3.2 Revisar lo que vuelve

**El informe del ejecutor no es evidencia.** Comprueba tú, en su worktree:

```bash
git -C <worktree> diff main --stat     # ¿el diámetro cuadra con el alcance del plan?
cd <worktree> && pnpm run verify       # ¿verde de verdad?
```

Y después, a mano:

- **Cada hunk se corresponde con un paso del plan.** Lo que esté fuera de alcance se rechaza por
  plausible que parezca.
- **Lee lo que afirman los tests nuevos.** Un ejecutor optimiza el criterio, no el objetivo: un
  test que no asierta nada pasa `pnpm test` y no prueba nada. Un handler MSW que acepta cualquier
  cuerpo, igual — es el patrón nº1 de `docs/bugs.md`.
- **La definición de hecho, punto por punto.** Si el plan pedía un test de hook y volvió un test
  de página, está incompleto aunque la suite esté verde.

Para revisión de fondo: skill `code-review`. Para sobre-ingeniería: `ponytail:ponytail-review`.

Rechazar es barato y normal. Redespacha con **qué faltó**, no con «hazlo mejor». Dos rondas de
corrección; a la tercera el problema es el plan, no el ejecutor.

### 3.3 Fusionar y cerrar — esto lo haces tú

```bash
git merge --no-ff <rama>     # desde main, en el árbol principal
pnpm run verify              # sobre main, después de fusionar
```

**Verde en el worktree no es verde en `main`.** Dos planes que pasan por separado pueden romperse
juntos; por eso la ola cierra con un `verify` sobre `main` y no con la suma de los informes.
Conflictos: skill `resolving-merge-conflicts`. Espera conflictos triviales en
`src/test/handlers.ts` y `src/api/contract.ts`.

Después: actualiza la bitácora y borra el worktree (`git worktree remove`). Ola siguiente, sin
pedir permiso.

---

## 4. A quién le das cada tarea

Tres ejecutores, y cuestan distinto. El criterio es **cuánto contexto del repo necesita la tarea**,
no cuánto código sale.

| Ejecutor | Cómo | Para qué |
|---|---|---|
| **Subagente Claude** (por defecto) | `Agent` tool, `isolation: "worktree"` | Ejecutar un plan. Necesita el repo, las skills y juicio. |
| **opencode / big-pickle** | `timeout 900 opencode run --model opencode/big-pickle "<prompt>"` | Tarea mecánica y autocontenida que cabe en el prompt. **Gratis en tokens tuyos.** Primera opción cuando encaja. |
| **Subagente Haiku** | `Agent` tool con `model: "haiku"` | Mecánico **pero necesita explorar el repo** con herramientas. opencode no ve tu contexto; Haiku sí. |

Encaja en **opencode**: convertir un `record` de Java a una interfaz TypeScript pegándole el
fuente, generar fixtures desde un esquema, redactar un bloque de markdown, renombrar un campo en
una lista de archivos que le das. Le pasas el material en el prompt y devuelve texto — que **tú**
colocas y verificas.

Encaja en **Claude**: cualquier plan de la ronda.

**Salud de opencode.** Antes de la primera tarea de cada sesión:

```bash
timeout 60 opencode run --model opencode/big-pickle "Responde exactamente OK y nada mas."
```

Sano: sale `OK`, código 0, en segundos. Enfermo: se cuelga, no sale 0, o devuelve prosa.
**Envuelve toda llamada a opencode en `timeout`**: sin él, un cuelgue se lleva la sesión por
delante. Enfermo dos veces seguidas: anótalo en la bitácora, pasa esas tareas a Haiku y sigue.

Si la cuota de Claude Code se agota, el otro binario instalado es
`agy --print "<tarea>" --model gemini-3.7-flash-high` (`~/.local/bin/agy`). Ni `agy` ni `opencode`
tienen las skills ni las reglas de este repo: pégales la §8 y revísales el diff línea a línea.

**Lo que decides tú y no delegas:** qué se despacha, si lo que vuelve está bien, qué se fusiona, y
cuándo se pregunta al humano.

---

## 5. Qué hay en el delta ahora mismo

Verificado el **2026-09-07** contra `origin/main` @ **`5673615`** ("admin panel plans", del mismo
día). El último commit ya analizado por el front era `c337950`. **Reconfírmalo con la §0 antes de
mover una línea**: el backend avanza planes enteros en dos días.

**Código nuevo — hay contraparte que implementar.** Exportación de cronograma, plan 031 del
backend: 21 archivos Java, ~11k líneas, con tests de integración y perfil XSD.

```
GET /documentos/cronograma/{presupuestoId}/preflight?formato=  → CronogramaExportPreflightResponse
GET /documentos/cronograma/{presupuestoId}?formato=            → xlsx | pdf | mspdi (binario)
```

- Recurso: `src/main/java/ec/uce/propuestas/documento/CronogramaDocumentoResource.java`
  (`@Path("/documentos/cronograma")`).
- DTOs a transcribir: `CronogramaExportPreflightResponse`, `BloqueoExportResponse`,
  `BloqueoExportDetalle`, `WarningExportResponse`, `ProyeccionExportacion`, `FormatoExportacion`.
- **El contrato ejecutable está en `api/bruno/11-cronograma/TC-31-*.bru`**: formato inválido → 400,
  UUID v4 → 400, presupuesto ajeno → 404, y las cabeceras exactas de cada descarga. Ahí tienes los
  casos de test del front escritos.
- Contraparte en el front: `src/features/exportar/` — `useExportar.ts` ya tiene el patrón de
  descarga con el helper `descargar()` de `src/api/request.ts` (lo dejó el plan 051 para la
  especificación técnica en DOCX). `ExportPage.tsx` dice en su propio texto qué falta; ese texto
  hay que corregirlo cuando esto entre. `"documentos"` **ya no** está en `MODULOS_SIN_BACKEND`.

**Solo planes, sin código — no escribas planes de frontend contra esto.** El panel admin:
`plans/panel-admin/032`–`040` del backend (sincronizar contrato, log de actividad, usuarios e
invitaciones, bases centrales, plantillas de sistema, parámetros y valores, instrumentación D13,
piloto SUS). Es exactamente lo que sigue degradado en `src/lib/disponibilidad.ts`
(`admin-usuarios`, `admin-plantillas`, `admin-valores`, `admin-logs`) y sigue así hasta que
aparezca un recurso JAX-RS. Cuando aparezca, encender esas páginas es la ronda siguiente.

---

## 6. La puerta

```bash
pnpm run verify   # typecheck · lint · guard:adr9 · format:check · test · build
pnpm run e2e      # Playwright, aparte del gate
```

Baseline al escribir esto: **456 tests en 72 archivos**, `e2e` en verde, front `main` @ `1344113`.
Si al arrancar no coincide, averigua por qué antes de despachar nada — un baseline que miente no
detecta nada. Si lo cambias, actualiza el número en `AGENTS.md`.

Cuatro cosas que el entorno no te va a confesar:

- **`npx tsc --noEmit` no comprueba nada.** `tsconfig.json` es `"files": []` con project
  references, así que siempre sale 0. El real es `pnpm run typecheck` (`tsc -b --noEmit`). Un
  commit ya se dio por limpio con el comando falso llevando 8 errores dentro. No lo escribas en
  ningún plan.
- **`verify` no comprueba tipos en `e2e/`.** `tsconfig.app.json` incluye solo `src`. Un id con la
  forma equivocada en un `.spec.ts` no lo ve nadie hasta que corre Playwright — así sobrevivieron
  los ids numéricos de `screenshots.spec.ts` a la migración a UUID de toda la app.
- **pnpm, no npm.** Hay `pnpm-lock.yaml` y `pnpm-workspace.yaml`, y `verify` encadena `pnpm run`.
- **Reinicia el dev server** si tocas un componente y Playwright sigue viendo lo viejo:
  `playwright.config.ts` usa `reuseExistingServer` y un `vite` de antes sirve el bundle obsoleto.

---

## 7. Lo que no se hace

Reglas transversales. Los planes las repiten donde toca, pero un ejecutor sin contexto se las salta
y **tú eres quien las hace cumplir en revisión**.

1. **Cero aritmética de dinero en el cliente** (ADR 9). Todo cálculo viene del servidor.
   `toFixed`/`parseFloat` solo dentro de `src/lib/decimal.ts`, y `pnpm run guard:adr9` lo vigila
   dentro de `verify`. Si un ejecutor calcula un total «para que se vea mejor», recházalo: está
   registrado como la regresión bienintencionada más probable de todo el repositorio.
2. **No falsear el contrato para que compile.** Si un DTO no encaja, el que está mal es el DTO:
   alinéalo con lo que el backend manda de verdad. Ni un campo opcional de más, ni un `as`, ni un
   `as never` — el plan 060 se dedicó a retirarlos.
3. **No borrar los módulos degradados.** Se apagan con `ModuloNoDisponible` y conservan su
   implementación real como `<Nombre>PageActiva`. El gate es **por página, no por módulo**.
4. **Toda ruta mockeada de un endpoint de listado lleva `*` al final**, en MSW y en Playwright: la
   paginación añade `?page=0`, un patrón literal deja de casar, cae en el catch-all y la página
   revienta.
5. **Los tests se arreglan consultando por rol accesible** (en español), no cambiando el marcado
   para complacer al test.
6. **Nada de colores crudos de Tailwind** (`bg-blue-500`). El tema es neutro; solo los tokens de
   estado tienen color. Antes de tocar UI, skill `shadcn`.
7. **No se commitea en `main`.** Rama por cambio, commits conventional, y ni push ni PR sin que lo
   pida el humano.

---

## 8. Cuándo paras y preguntas

Cuatro casos. En todo lo demás decides tú y lo anotas en la bitácora.

1. **El delta contradice un documento del backend.** Gana el código: reescribe el plan y **avisa**,
   porque significa que la documentación del backend está mal y alguien más la va a leer.
2. **El delta rompe algo que ya está en `main`.** Un endpoint que cambió de forma es un bug vivo,
   no una feature nueva: va antes que cualquier plan de la ronda. Avisa al abrirlo.
3. **El backend implementó algo cuya pantalla del front no existe en la especificación.** Es
   decisión de producto, no tuya: reporta qué llegó, qué haría falta, y espera.
4. **La ronda entera está verde.** Reportas: qué cerró, qué quedó como "planificado en el backend,
   sin código", y con qué SHA del backend quedó alineado el front — ese SHA es el punto de partida
   de la ronda siguiente y va en la bitácora.

Preguntas que ya tienen respuesta y **no** vuelves a plantear: la representación del dinero
(resuelta, plan 061), el alcance responsive (`056`, en espera de que el humano lo pida), el
descuento global de APU (retirado por diseño, no se re-añade) y la rebanada 5 del `055` (diferida
hasta la entrevista N05).

---

## Referencia — skills

Invócalas por nombre con el `Skill` tool. Las de ejecución van en el prompt del subagente.

**En los ejecutores, siempre:** `ponytail:ponytail` (la solución más corta que funciona) ·
`test-driven-development` (rojo primero) · `verification-before-completion` (evidencia antes de
afirmar).

**Tuyas, según el momento:**

| Skill | Cuándo |
|---|---|
| `improve` | Auditar el delta y escribir los planes. **Solo lectura: nunca toca código.** |
| `writing-plans` | Trabajo que aparece sin plan. Nunca ejecutes trabajo sin plan. |
| `code-review` · `ponytail:ponytail-review` | Revisar lo que vuelve (§3.2). Fondo y sobre-ingeniería. |
| `dispatching-parallel-agents` | Antes de lanzar una ola con tres o más planes. |
| `using-git-worktrees` | Worktree fuera del `Agent` tool. |
| `resolving-merge-conflicts` | Al fusionar. |
| `systematic-debugging` | Algo falla y no sabes por qué. Antes de proponer el arreglo. |
| `loop` | Ritmo autónomo si quieres que la sesión se despierte sola. |

**De dominio, para el ejecutor cuyo plan las toque:** `shadcn` y `tailwind-v4-shadcn` (pantalla
nueva o UI) · `zod` (validación en el seam) · `vitest` y `playwright-best-practices` (tests) ·
`react-best-practices` y `react-hook-form` (formularios) · `typescript-advanced-types` (el tipo
del dinero) · `accessibility` · `oxlint`.

---

## Referencia — el terreno

| Repo | Rol |
|---|---|
| `~/workspace/thesis-front-react` | El frontend. Aquí trabajas. React 19 · TS · Vite · shadcn (`radix-nova`) · Tailwind 4 · TanStack Query 5 · React Router 7 · Zustand · Zod. **pnpm.** |
| `~/workspace/thesis-back-quarkus` | Backend Quarkus. **Solo lectura.** El working tree está en `test/stuff`, que no está mergeada: lee main con `git show origin/main:<path>`, sin checkout. Su `api/bruno/**` es el contrato ejecutable y sus `plans/**` la intención. |
| `~/workspace/thesis-docs` | La especificación. Fuente de verdad de **qué pantallas deben existir**; el código de `origin/main` es la fuente de verdad **del contrato**. Cuando discrepan, gana el código y los docs se corrigen. |

Archivos críticos del front: `src/api/contract.ts` (todos los DTOs) · `src/api/request.ts`
(incluido el helper `descargar()`) · `src/api/queryKeys.ts` · `src/test/handlers.ts` (todos los
mocks MSW) · `src/lib/decimal.ts` · `src/lib/disponibilidad.ts` · `src/routes/index.tsx` ·
`src/test/render.tsx`.
