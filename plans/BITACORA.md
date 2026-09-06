# Bitácora

**Ola actual:** 2 · **Actualizada:** 2026-09-06

> La lleva el orquestador ([`ORQUESTADOR.md`](ORQUESTADOR.md)). Se escribe **en el momento** en que
> algo cambia de estado, no al final de la sesión: si la sesión se corta, lo que no está escrito
> aquí no ocurrió.
>
> Estados: `⏳ pendiente` · `🔄 en curso` · `🟡 vuelto, sin revisar` · `❌ rechazado` · `✅ verde`

## Estado por plan

| Ola | Plan | Estado | Worktree | Commit | Nota |
| --- | ---- | ------ | -------- | ------ | ---- |
| 0 | 061 política de dinero | ✅ verde | — | 5b1e8fb | fusionado a main · 2º intento |
| 1 | 053 ids UUID | ✅ verde | — | 9564e39 | fusionado a main |
| 2 | 054 descuento global + bugs SILENT | ✅ verde | — | 82edeae | fusionado a main |
| 2 | 059 formas de DTO | 🔄 en curso | .claude/worktrees/ola2-059 | — | despachado tras cerrar el 054 |
| 3 | 057 tests de hook | ⏳ pendiente | — | — | rebanable por módulo |
| 4 | 028 Zod en el seam | ⏳ pendiente | — | — | esquemas salen del 057 |
| 5 | 055 cronograma (reb. 1–4) | ⏳ pendiente | — | — | cierra sin la rebanada 5 |
| 5 | 048 plantillas APU | ⏳ pendiente | — | — | |
| 5 | 049 plantillas de proyecto | ⏳ pendiente | — | — | |
| 5 | 050 admin + S-39 | ⏳ pendiente | — | — | choca con 058 en insumos |
| 5 | 051 export ET DOCX | ⏳ pendiente | — | — | |
| 5 | 052 acciones deshabilitadas | ⏳ pendiente | — | — | necesita 059 cerrado |
| 5 | 058 bases personales | ⏳ pendiente | — | — | choca con 050 en insumos |
| 6 | 060 limpieza | ⏳ pendiente | — | — | último |

### Fuera de las olas

| Plan | Estado | Condición de arranque |
| ---- | ------ | --------------------- |
| 056 responsive | ⏸ en espera | El humano lo pide |
| 055 rebanada 5 (vistas del cronograma) | ⏸ diferida | Entrevista N05 respondida |

## Verificación al arrancar

Baseline **actualizado tras la ola 0**: 46 archivos, 220 tests, verde · `verify` ahora encadena `guard:adr9`.
Baseline original del handoff: **45 archivos, 207 tests, verde** · backend `origin/main` @ `c337950` ·
docs `411242f`. Si no coincide, averígualo antes de despachar.

## Decisiones tomadas en ruta

- 2026-09-06 — **054 aceptado, y el plan estaba mal en un detalle peligroso.** Su ejemplo de body
  para `PATCH /apus/{id}/porcentaje-indirecto` decía `12.5`, sugiriendo porcentaje. Es **fracción**:
  `ApuResourceIT` manda `"0.2200"` y espera `0.22`. El ejecutor lo dedujo bien por su cuenta y lo
  verifiqué contra el backend; el plan queda corregido para quien lo lea después.
- 2026-09-06 — Causa raíz cerrada de paso: los handlers MSW aceptaban cualquier body, que es lo que
  dejó pasar los tres bugs SILENT. Ahora hay una lista blanca `soloCampos` que devuelve 400 ante
  propiedad desconocida, marcada con `ponytail:` porque el arreglo de fondo es el plan 028.

- 2026-09-06 — **Decisión #6 del handoff resuelta por el orquestador: se degrada `descuento-global`.**
  El plan 054 rebanada 1 pedía preguntar por si el backend estuviera «a días». No lo está:
  `origin/main @ c337950` tiene **cero** endpoints `descuento-global`, y los únicos 4 archivos que
  dicen «descuento» son el retiro del descuento de APU más tres tests que afirman que el endpoint
  no existe. La implementación solo vive en `test/stuff` (2026-08-30), rama descartada. Anotado en
  el plan para que el ejecutor no se pare.
- 2026-09-06 — El 1er ejecutor del 054 murió por límite de sesión antes de escribir nada; worktree
  limpio, redespachado sin pérdida.

- 2026-09-06 — **053 aceptado.** Verifiqué la sensibilidad de los tests de guard yo mismo: revertí
  `enabled: !!presupuestoId` a `Number(presupuestoId) > 0` en `usePresupuesto.ts:16` y el test
  correspondiente se puso rojo. El bug era real y grave: con ids UUID, `presupuestoId > 0` era
  falso siempre, o sea que `usePresupuesto`, `useResumen`, `useValidacion`, `useValidacionExport`,
  `useCronograma` y `useApus` **nunca disparaban en producción**.
- 2026-09-06 — Diferidos del 053, todos con dueño: `RubroRefResponse.rubroId` → `059` §4 · ids
  numéricos de los E2E → `021` · **`useVersiones` duplicado en `shell/contexto.ts` → añadido al
  `060`** (unificarlo exige que `shell/` importe de `features/`, decisión de arquitectura).

- 2026-09-06 — **061 aceptado con una desviación**: la guarda ADR 9 vive en `package.json` como
  `pnpm run guard:adr9` dentro de `verify`, no como paso de CI. Verificado: `.gitignore:32` ignora
  `.github/` (commit `7635176`, «bypass workflow token requirement») y el directorio no existe, así
  que un workflow sería letra muerta. Si algún día se despliega CI de verdad, mover la guarda allí.
- 2026-09-06 — Queda **una división en `src/features/**`**: `ResumenProyectoPage.tsx:301`,
  `Number(valor) / totalNum`. Es una proporción de gráfico, no una cifra de dinero — fuera de la
  DoD del 061 a propósito.

- 2026-09-06 — ⚠️ **`isolation: "worktree"` del `Agent` tool NO sirve en este repo.** Ramifica desde
  `origin/HEAD`/`origin/main`, que está en `f823fc6` (2026-08-29); el `main` local va **9 commits
  por delante y nunca se ha empujado**. El primer intento del 061 salió sobre una base sin
  `2ebf40d` (UUIDv7→string), sin el arreglo de formato y **sin el propio archivo del plan**. Su
  `verify` salió verde contra el contrato viejo, o sea que no probaba nada. Rebase sobre `main`:
  5 conflictos en los archivos centrales → descartado, no reconciliado.
  **Protocolo desde ahora:** el orquestador crea el worktree a mano
  (`git worktree add -b <rama> .claude/worktrees/<n> main`) y despacha un `Agent` **sin**
  `isolation`, diciéndole la ruta absoluta. Alternativa que necesita al humano: empujar `main` a
  `origin`.
- 2026-09-06 — **Plan 061 corregido contra `origin/main @ c337950`** (§7 caso 1): la rebanada 2
  afirmaba que `GET /presupuestos/{id}/comparar` devuelve la comparación calculada. Falso —
  `ComparacionVersionesResponse(List<ComparacionItem>)` devuelve dos totales string y **ninguna
  diferencia**. Se aplica el fallback. De paso: el DTO del frontend (`versionA`/`versionB`/
  `capitulos[].diferencia`) es deriva; le toca a `053`/`059`.

- 2026-09-06 — **Baseline no estaba verde**: `format:check` rojo en 16 archivos ya commiteados
  (`e44c608`/`2ebf40d` escribieron a 80 columnas con `printWidth: 100`). Arreglado en `eef0b7d`,
  solo espacios. Typecheck, lint y 45/207 tests sí coincidían. Segunda puerta que se dio por verde
  sin correrla, después del `npx tsc --noEmit`.
- 2026-09-06 — Los planes 053–061 estaban **sin trackear**: un worktree de ejecutor no los habría
  visto. Commiteados en `68088a6` antes de despachar nada.
- 2026-09-06 — 9 worktrees huérfanos de la sesión anterior, todos vacíos y sin commits. El borrado
  lo bloqueó el clasificador de permisos; se dejan, no estorban.
- 2026-09-06 — Dinero: editable `number` cuantizado, solo lectura `string`. Plan 061.
- 2026-09-06 — Responsive: escritorio y móvil, tres fases, prioridad baja, arranque a petición.
- 2026-09-06 — `test/stuff` no se mergea: esperar a main.

## Bloqueado esperando al humano

- Entrevista **N05** (cronograma): 7 preguntas sin responder. Bloquea **solo** la rebanada 5 del
  plan 055. Ninguna ola la espera.
