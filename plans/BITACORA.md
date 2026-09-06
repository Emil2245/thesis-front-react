# Bitácora

**Ola actual:** 0 — sin arrancar · **Actualizada:** 2026-09-06

> La lleva el orquestador ([`ORQUESTADOR.md`](ORQUESTADOR.md)). Se escribe **en el momento** en que
> algo cambia de estado, no al final de la sesión: si la sesión se corta, lo que no está escrito
> aquí no ocurrió.
>
> Estados: `⏳ pendiente` · `🔄 en curso` · `🟡 vuelto, sin revisar` · `❌ rechazado` · `✅ verde`

## Estado por plan

| Ola | Plan | Estado | Worktree | Commit | Nota |
| --- | ---- | ------ | -------- | ------ | ---- |
| 0 | 061 política de dinero | ⏳ pendiente | — | — | |
| 1 | 053 ids UUID | ⏳ pendiente | — | — | |
| 2 | 054 descuento global + bugs SILENT | ⏳ pendiente | — | — | va antes del 059 |
| 2 | 059 formas de DTO | ⏳ pendiente | — | — | después del 054, mismo `ApuResponse` |
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

Baseline esperado: **45 archivos, 207 tests, verde** · backend `origin/main` @ `c337950` ·
docs `411242f`. Si no coincide, averígualo antes de despachar.

## Decisiones tomadas en ruta

- 2026-09-06 — Dinero: editable `number` cuantizado, solo lectura `string`. Plan 061.
- 2026-09-06 — Responsive: escritorio y móvil, tres fases, prioridad baja, arranque a petición.
- 2026-09-06 — `test/stuff` no se mergea: esperar a main.

## Bloqueado esperando al humano

- Entrevista **N05** (cronograma): 7 preguntas sin responder. Bloquea **solo** la rebanada 5 del
  plan 055. Ninguna ola la espera.
