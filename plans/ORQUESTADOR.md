# Orquestador — frontend del Sistema APU

> **Ruta cerrada 2026-09-06 · superseded por [`ORQUESTADOR-PARIDAD.md`](ORQUESTADOR-PARIDAD.md).**
> Los planes 053–065 (olas 0–8) están verdes y fusionados; ver [`BITACORA.md`](BITACORA.md). No
> vuelvas a despacharlos. Lo que sigue vigente de este documento —el método de la bitácora, el
> ciclo de revisión, la puerta de verificación y el reparto entre ejecutores— está recogido en
> `ORQUESTADOR-PARIDAD.md`, que es el encargo activo: poner el frontend a la altura de lo que el
> backend va mergeando. Este archivo se conserva como registro.

**Eres la cabeza de este proyecto.** Llevas el roadmap de principio a fin: repartes el trabajo,
revisas lo que vuelve y no cierras nada que no esté **verde**. Delegas la ejecución; el juicio no.

**Arranca sin preguntar.** Leer este archivo es la señal de empezar. La primera pregunta al humano
llega cuando la §7 diga que llega, no antes.

---

## 0. Arranque

Cuatro lecturas, en orden. Nada más antes de empezar.

1. **`plans/BITACORA.md`** — si existe, manda: dice dónde te quedaste. Si no existe, créala (§1)
   y sigue.
2. **`git fetch --all` en `../thesis-back-quarkus`**, y compara `origin/main` con el commit que
   cita el handoff. Si difiere, `git log <viejo>..origin/main` **antes de leer nada más**. El
   backend avanza planes enteros en dos días y tres análisis ya se hicieron contra el commit
   equivocado.
3. **`plans/HANDOFF-ESTADO-Y-GAPS.md`** — qué está roto y por qué. La §7 tiene la ruta.
4. **`plans/INVENTARIO-COBERTURA.md`** — qué hay, medido.

Después: abre la ola que diga la bitácora y despacha. Los planes individuales los leen los
ejecutores, no tú — tú lees el título, el alcance y la definición de hecho.

---

## 1. La bitácora

`plans/BITACORA.md` es **el estado que sobrevive a que te quedes sin tokens.** Tu contexto no
sobrevive; ese archivo sí.

Escribe en ella **en el momento en que algo cambia de estado**, no al final de la sesión: si te
cortan a mitad, lo que no escribiste no ocurrió.

```markdown
# Bitácora

**Ola actual:** 2 · **Actualizada:** <fecha ISO>

## Estado por plan
| Plan | Estado | Worktree | Commit | Nota |
|---|---|---|---|---|
| 061 | ✅ verde | — | abc1234 | fusionado a main |
| 053 | 🔄 en curso | .claude/worktrees/agent-xxx | — | rebanada 4 de 6 |
| 054 | ⏳ pendiente | — | — | |

## Decisiones tomadas en ruta
- <fecha> — <qué decidiste y por qué>

## Bloqueado esperando al humano
- <pregunta> — planteada <fecha>
```

Estados: `⏳ pendiente` · `🔄 en curso` · `🟡 vuelto, sin revisar` · `❌ rechazado, redespachado` ·
`✅ verde`.

**Al arrancar en frío**: lees la bitácora, compruebas con `git worktree list` y `git log` que dice
la verdad, y sigues. Un worktree con cambios sin commitear es trabajo a medias: revísalo antes de
redespachar, o repites lo hecho.

---

## 2. La ruta

**La ruta canónica es `plans/HANDOFF-ESTADO-Y-GAPS.md` §7.** No la copies aquí ni la reinventes:
si cambia, cambia allí.

Forma resumida, para que sepas de qué va:

```
061 ─► 053 ─► 054 ─► 059 ─► 057 ─► 028 ─┬─► 055(1–4) · 048 · 049 · 050 · 051 · 052 · 058 ─► 060
```

Siete olas. **Dentro de una ola, paralelo; entre olas, no.** Una ola se cierra cuando todos sus
planes están verdes y fusionados a `main`.

Fuera de las olas, y ambos correctos así:

- **`056` responsive** — ⏸ arranca solo si el humano lo pide. No lo metas en ninguna ola.
- **`055` rebanada 5** (vistas del cronograma) — ⏸ diferida hasta la entrevista N05. El 055
  **cierra sin ella**.

---

## 3. El ciclo de una ola

Se repite igual en las siete. Cada paso termina en una condición comprobable.

### 3.1 Despachar

Un plan, un ejecutor, un worktree. Usa el `Agent` tool con `isolation: "worktree"`: el trabajo
queda en disco aunque la sesión muera.

El prompt del ejecutor lleva **cuatro cosas y ninguna más**:

1. La ruta del plan. Que lo lea entero; no se lo resumas.
2. `Invoca la skill ponytail:ponytail antes de escribir código.`
3. `Invoca la skill test-driven-development: el test rojo primero.`
4. La puerta: `pnpm run verify` en verde antes de reportar.
5. `Los números de línea del plan son de 2026-09-06 y los planes anteriores los han movido.
   Localiza por símbolo (grep del nombre del campo, del hook o de la ruta), no por línea.`

Los planes son autocontenidos a propósito. Cada línea de contexto que añadas es una línea que
puede contradecirlos.

El punto 5 no es cosmético: los planes citan **unas 76 posiciones** (`contract.ts:194`,
`useApuEditor.ts:146`, `usePresupuesto.ts:69`…) y el `061` y el `053` reescriben justo esos
archivos. Un ejecutor que confíe en la línea edita otra cosa y su `verify` sigue verde.

**Los que van en paralelo, en un solo mensaje con varias llamadas al `Agent` tool.** Y en la ola 5
hay dos choques reales: `050` y `058` tocan los componentes de insumos, y `052` necesita el `059`
cerrado. Al mismo ejecutor o en serie.

### 3.2 Revisar lo que vuelve

**El informe del ejecutor no es evidencia.** Comprueba tú:

```bash
git -C <worktree> diff main --stat     # ¿el diámetro cuadra con el plan?
cd <worktree> && pnpm run verify       # ¿verde de verdad?
```

Y contra la **definición de hecho** del plan, punto por punto. Si el plan pedía un test de hook y
volvió un test de página, está incompleto aunque la suite esté verde — ese es exactamente el
agujero que el `057` existe para cerrar.

Para revisión de fondo: skill `code-review`, y `requesting-code-review` si quieres un segundo par
de ojos independiente.

Rechazar es barato y normal. Redespacha con **qué faltó**, no con «hazlo mejor».

### 3.3 Fusionar y cerrar

Fusiona a `main`, corre `pnpm run verify` en `main`, actualiza la bitácora, borra el worktree.
Conflictos: skill `resolving-merge-conflicts`.

**Verde en el worktree no es verde en `main`.** Dos planes que pasan por separado pueden romperse
juntos; por eso la ola cierra con un `verify` sobre `main`, no con la suma de los informes.

### 3.4 Seguir

Ola siguiente. Sin pedir permiso: la ruta ya está aprobada.

---

## 4. A quién le das cada tarea

Tienes tres ejecutores y cuestan distinto. El criterio es **cuánto contexto del repo necesita la
tarea**, no cuánto código sale.

| Ejecutor | Cómo | Para qué |
|---|---|---|
| **Subagente Claude** (por defecto) | `Agent` tool, `isolation: "worktree"` | Ejecutar un plan. Necesita el repo, las skills y juicio. |
| **opencode / big-pickle** | `opencode run --model opencode/big-pickle "<prompt>"` | Tarea mecánica y autocontenida que cabe en el prompt. **Gratis en tokens tuyos.** Primera opción cuando encaja. |
| **Subagente Haiku** | `Agent` tool con `model: "haiku"` | Mecánico **pero necesita explorar el repo** con herramientas. opencode no ve tu contexto; Haiku sí. |

Encaja en **opencode**: generar fixtures desde un esquema que le pegas, renombrar un campo en una
lista de archivos que le das, redactar un bloque de markdown, convertir un record de Java a una
interfaz TypeScript. Le pasas el material en el prompt y devuelve texto.

Encaja en **Haiku**: «busca los 26 ids numéricos de `e2e/screenshots.spec.ts` y sustitúyelos por
las constantes de `src/test/fixtures/ids.ts`» — mecánico, pero hay que abrir archivos.

Encaja en **Claude**: cualquier plan de la ruta.

**Lo que decides tú y no delegas:** qué se despacha, si lo que vuelve está bien, y cuándo se
pregunta al humano.

---

## 5. Salud: darte cuenta de que algo no trabaja

Un ejecutor que falla en silencio te cuesta más que uno que revienta. Comprueba, no supongas.

**opencode.** Antes de la primera tarea de cada sesión:

```bash
timeout 60 opencode run --model opencode/big-pickle "Responde exactamente OK y nada mas."
```

Sano: sale `OK` con código 0 en unos segundos. Enfermo: se cuelga hasta el `timeout`, sale sin
código 0, o devuelve prosa en vez de `OK`. **Envuelve toda llamada a opencode en `timeout`** — sin
él, un cuelgue se lleva la sesión por delante.

Enfermo dos veces seguidas: anótalo en la bitácora, pasa esas tareas a Haiku y sigue. No lo
reintentes una tercera.

**Subagente.** Sospecha cuando: vuelve sin diff, el diff no toca los archivos que el plan nombra,
dice «verde» y tu `verify` falla, o pide aclaraciones que el plan responde en su primera página.
Las cuatro son «no leyó el plan». Redespacha citando la sección.

**Tú.** Si la misma ola no cierra en tres intentos, para. El problema es el plan, no el ejecutor:
reescríbelo con la skill `improve` —que es de solo lectura y te da un plan nuevo— antes de gastar
un cuarto intento.

---

## 6. La puerta

```bash
pnpm run verify   # typecheck · lint · format:check · test · build
```

Tres cosas que el entorno no te va a confesar:

- **`npx tsc --noEmit` no comprueba nada.** `tsconfig.json` es `"files": []` con project
  references, así que siempre sale 0. El real es `pnpm run typecheck` (`tsc -b --noEmit`). Un
  commit ya se dio por limpio con el comando falso llevando 8 errores dentro.
- **pnpm, no npm.** Los scripts de `verify` encadenan `pnpm run`.
- **Reinicia el dev server** si tocas un componente y Playwright sigue viendo lo viejo:
  `playwright.config.ts` usa `reuseExistingServer` y un `vite` de antes sirve el bundle obsoleto.

Baseline al escribir esto: **45 archivos, 207 tests, verde**. Si al arrancar no coincide,
averigua por qué antes de despachar nada.

---

## 7. Cuándo paras y preguntas

Tres casos. En todo lo demás, decides tú y lo anotas en la bitácora.

1. **Un plan resulta estar equivocado sobre el backend.** No lo improvises: verifica contra
   `origin/main` leyendo el código, reescribe el plan, y **avisa** — significa que algo se movió.
2. **Aparece trabajo que ningún plan cubre.** Escribe el plan (skill `writing-plans`), colócalo en
   la ola que le toque, y avisa. Nunca ejecutes trabajo sin plan: es lo que produjo la deriva que
   estos planes están arreglando.
3. **La ruta entera está verde.** Reportas: qué cerró, qué queda ⏸ (`056` y la rebanada 5 del
   `055`), y las preguntas abiertas del handoff §9 que sigan sin respuesta.

Preguntas que ya tienen respuesta y **no** vuelves a plantear: la representación del dinero
(resuelta, plan `061`), el alcance responsive (resuelto, `056` en espera), y el descuento de APU
(retirado por diseño, no se re-añade).

---

## Referencia — skills

Invócalas por nombre con el `Skill` tool. Las de ejecución van en el prompt del subagente.

**En los ejecutores, siempre:**

| Skill | Para qué |
|---|---|
| `ponytail:ponytail` | La solución más corta que funciona. Sin abstracciones especulativas. |
| `test-driven-development` *(o `tdd`)* | Rojo primero. Es el método que los planes 053–061 asumen. |
| `verification-before-completion` | Evidencia antes de afirmar. Corta el «está listo» sin haber corrido nada. |

**Tuyas, según el momento:**

| Skill | Cuándo |
|---|---|
| `improve` | Un plan resulta equivocado y hay que reescribirlo. Solo lectura: nunca toca código. |
| `writing-plans` | Aparece trabajo sin plan. |
| `code-review` · `requesting-code-review` | Revisar lo que vuelve (§3.2). |
| `dispatching-parallel-agents` | Antes de lanzar la ola 5. |
| `executing-plans` · `subagent-driven-development` | Los dos modos de despacho: sesión aparte con checkpoints, o en la tuya. |
| `using-git-worktrees` | Si necesitas un worktree fuera del `Agent` tool. |
| `resolving-merge-conflicts` | Al fusionar. |
| `systematic-debugging` | Algo falla y no sabes por qué. Antes de proponer el arreglo. |
| `finishing-a-development-branch` | Cerrar un plan. |
| `loop` | Ritmo autónomo si quieres que la sesión se despierte sola. |

**De dominio, para el ejecutor cuyo plan las toque:**

`vitest` y `playwright-best-practices` (plan `057`) · `zod` (`028`) ·
`react-best-practices` y `react-hook-form` (`050`, `059`) ·
`tailwind-v4-shadcn`, `shadcn` y `composition-patterns` (`056`, `060`) ·
`typescript-advanced-types` (`061`, el tipo del dinero) · `oxlint` (`060`) ·
`accessibility` (`056` fase 2).

---

## Referencia — el terreno

| Repo | Rol |
|---|---|
| `~/workspace/thesis-front-react` | El frontend. Aquí trabajas. React 19 · TS · Vite · shadcn (`radix-nova`) · Tailwind 4 · TanStack Query 5 · Zustand · Zod. |
| `~/workspace/thesis-back-quarkus` | Backend Quarkus. **Solo lectura.** El working tree está en `test/stuff`, que no está mergeada: lee main con `git show origin/main:<path>`, sin checkout. |
| `~/workspace/thesis-docs` | La especificación. Fuente de verdad de **qué pantallas deben existir**; el código de `origin/main` es la fuente de verdad **del contrato**. Cuando discrepan, gana el código y los docs se corrigen. |

`AGENTS.md` de este repo tiene tres afirmaciones caducas —el baseline de tests (dice 197/43),
la doctrina del dinero (dice «never parse to number», corregida por el plan `061`) y la lista de
rutas de admin—. **Actualízalo al cerrar la ola 6**, no antes: hasta entonces sigue cambiando.
