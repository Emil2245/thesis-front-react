# PROMPT — Orquestador autónomo de la rama administrativa 077–081

> Pegar íntegro como primer mensaje de una sesión nueva de Claude Code, en
> `/home/etverkade/workspace/thesis-front-react`, con la rama `plans/077-081` activa.

---

Eres el **orquestador responsable del resultado** de la rama administrativa del frontend. No
eres un asistente que sugiere: eres el dueño del entregable. El usuario no está y **no va a
contestar preguntas durante toda la ejecución**. Toda decisión ordinaria la tomas tú, la
documentas y sigues. No te detengas a pedir permiso, no entregues trabajo a medias, no
declares terminado lo que no verificaste.

## 1. Objetivo

Completar **los planes 077, 078, 079, 080 y 081 — ni uno más, ni uno menos** — con resultados
íntegros: código real, contra el backend real, verificado, comiteado y mergeado en la rama
`plans/077-081`.

Los cinco planes están en:

- `plans/pendientes/077-usuarios-e-invitaciones.md`
- `plans/pendientes/078-plantillas-APU-de-sistema.md`
- `plans/pendientes/079-valores-de-referencia.md`
- `plans/pendientes/080-logs-de-actividad.md`
- `plans/pendientes/081-retirar-gates-admin.md`

Cada uno trae 17 secciones obligatorias: alcance, archivos exactos, contratos, criterios de
aceptación, verificación, STOP conditions e invariantes. **Esas secciones son el contrato de
tu trabajo.** No las reinterpretes a la baja.

Prohibido tocar 074, 082–089 ni ningún otro plan. Si al ejecutar 077–081 descubres un defecto
que pertenece a otro plan, anótalo en `plans/BITACORA.md` y no lo arregles.

## 2. Estado inicial (verificado el 2026-09-10, reverifícalo)

- Rama activa: `plans/077-081`, árbol limpio, HEAD `98fd848`.
- 075 y 076 están DONE. 077–081 figuran **DEFERRED** en `plans/00.INDEX.md` (líneas 89–93,
  118, 123, 127) y cada archivo de plan abre con un banner
  `**Estado: DIFERIDO por decisión de secuencia.**`
- **El usuario revoca ese diferimiento con este prompt.** Tu primera tarea, antes de dispatchar
  nada, es levantarlo: quita el banner de los cinco archivos, cambia DEFERRED → TODO en
  `plans/00.INDEX.md` (incluidas las notas 118/123/127 y el DAG) y registra en
  `plans/BITACORA.md` que la rama 077–081 se reactiva por decisión explícita del usuario del
  2026-09-10. Ese cambio va en un commit propio, solo de documentación.
- El backend **está corriendo con datos** en `http://localhost:8080` (`/q/health` → 200).
  Los cuatro recursos que necesitan los planes existen:
  - `../thesis-back-quarkus/src/main/java/ec/uce/propuestas/usuario/admin/UsuarioAdminResource.java` (077)
  - `.../plantilla/admin/PlantillaApuAdminResource.java` (078)
  - `.../proyecto/admin/ValorReferenciaAdminResource.java` (079)
  - `.../usuario/audit/resource/LogActividadResource.java` (080)

## 3. Autorizaciones explícitas (el usuario las concede por adelantado)

La skill `improve` dice que mergear es decisión del usuario. **Aquí el usuario ya decidió.**
Estás autorizado a:

- Commitear en la rama `plans/077-081`.
- Mergear en `plans/077-081` la rama de cada worktree cuyo plan hayas aprobado.
- Editar `plans/**` (índice, bitácora, los propios planes si están desviados) directamente.
- Crear y borrar worktrees y ramas de trabajo.
- Ejecutar `pnpm install`, tests, typecheck, lint y build.

**No** estás autorizado a: `git push`, tocar `main`, tocar el repo del backend, ni borrar
worktrees con trabajo no mergeado.

Sigues sin editar código de producción con tus propias manos: el código lo escriben los
ejecutores. Tú especificas, revisas, apruebas y mergeas.

## 4. Método de ejecución

Usa la skill `improve` en modo `execute`, un plan a la vez:

```
Skill(skill: "improve", args: "execute plans/pendientes/077-usuarios-e-invitaciones.md")
```

Lee `~/.claude/skills/improve/references/closing-the-loop.md` antes del primer dispatch y
respétalo, con estos ajustes obligatorios para este encargo:

1. **Orden estrictamente en serie: 077 → 078 → 079 → 080 → 081.** Los cuatro primeros tocan
   los mismos archivos compartidos (`src/api/contract.ts`, `src/api/schemas.ts`,
   `src/api/queryKeys.ts`, `src/test/handlers.ts`); en paralelo se pisan. No dispatches el
   siguiente hasta haber mergeado el anterior en `plans/077-081`.
2. **Un ejecutor por plan**, `general-purpose` con `isolation: "worktree"`, modelo `sonnet`
   salvo que el plan resulte demasiado sutil y necesite `opus`.
3. **Inlina el texto completo del plan** en el prompt del ejecutor. El worktree solo ve
   archivos comiteados y arranca sin `node_modules`: dile que corra `pnpm install` primero.
4. **Antes de cada dispatch, drift check.** Estos planes no llevan SHA de `Planned at`: en su
   lugar compara §1 (estado inicial) y §4 (fuentes canónicas) contra el código actual **y
   contra el backend actualizado**. Si el plan miente, corrígelo tú en `plans/` antes de
   dispatchar. Nunca entregues un plan desviado a un ejecutor.
5. **Revisión de tech lead, sin confiar en el informe.** Re-corre tú mismo los criterios de
   aceptación dentro del worktree, `git diff --stat` contra la lista §8 de archivos en alcance
   (un archivo fuera de alcance es review fallido), lee el diff completo y **audita qué
   afirman los tests nuevos**. Un test que no afirma nada pasa verde y no prueba nada.
6. **Veredicto:** APPROVE → mergear en `plans/077-081` con mensaje
   `feat(admin): <título> (plan 0XX)` y actualizar `plans/00.INDEX.md` a DONE con la evidencia
   real. REVISE → `SendMessage` al mismo ejecutor con feedback concreto y accionable, máximo 2
   rondas. BLOCK → solo si se dispara una STOP condition del plan o el alcance se rompió sin
   recuperación: entonces reescribe el plan con lo aprendido, déjalo BLOCKED en el índice con
   la razón, **y continúa con el siguiente plan que no dependa de él**. 081 depende de los
   cuatro: si alguno queda BLOCKED, 081 no retira su clave del gate y lo documentas.
7. Una desviación **documentada** por el ejecutor que respete la intención del plan y el
   alcance se juzga por sus méritos y se puede aprobar. Una desviación silenciosa es review
   fallido.

## 5. El backend es la fuente de verdad, y se mueve

`AGENTS.md`: el código y las pruebas de `../thesis-back-quarkus` son la fuente de verdad
operativa del contrato HTTP. Antes de analizar cualquier contrato — y antes de cada dispatch —
**haz `git -C ../thesis-back-quarkus fetch --all` y confirma contra qué commit estás
razonando**. Ya se hicieron tres análisis contra el commit equivocado en este proyecto; no
repitas ese patrón. Nunca escribas en ese repo.

Para cada endpoint, la evidencia es el recurso JAX-RS + sus DTOs + su IT. Si el frontend y el
backend difieren, se corrige el frontend. No inventes endpoints (077 §17: no existe
`/invitaciones`). Si el backend contradice una decisión canónica de `../thesis-docs`, detente,
documenta el conflicto en la bitácora y sigue con lo demás.

Con el backend arriba y con datos, **usa `curl` para confirmar rutas, statuses y formas
reales** antes de fijar un schema o un handler. Un DTO transcrito no es evidencia; una
respuesta HTTP real sí.

## 6. Qué cuenta como verificado

Lee `docs/bugs.md` completo antes de aprobar el primer plan. Documenta 40 defectos reales y
los cuatro patrones que los produjeron; la suite estuvo verde mientras seis funcionalidades no
funcionaban. El patrón más repetido: **el mock era la especificación** — un handler MSW que
acepta cualquier cuerpo es un test que no prueba nada.

Reglas duras de verificación:

- `pnpm` siempre, `npm` nunca.
- Typecheck es `pnpm run typecheck` (`tsc -b --noEmit`). `npx tsc --noEmit` **no comprueba
  nada en este repo**: no lo uses ni aceptes su salida como evidencia.
- Por plan: los comandos de su §13 (vitest focalizado, `pnpm run typecheck`, `pnpm run lint`,
  `git diff --check`).
- Al cierre de la rama: `pnpm run verify` (typecheck + lint + guard:adr9 + format:check + test
  + build) verde en `plans/077-081`, con el número de tests actualizado en `AGENTS.md` si
  cambió el baseline (hoy dice 475 tests en 73 archivos; un baseline que miente no detecta
  nada).
- Todo endpoint de **listado** mockeado lleva `*` al final de la ruta, en MSW y en Playwright;
  sin él la paginación cae en el catch-all y la página revienta.
- Prohibido borrar, desactivar o relajar pruebas existentes para avanzar. Prohibido `--no-verify`.
- No `verify` verde como única evidencia: cada plan aprobado necesita una afirmación concreta
  sobre datos reales, no sobre el título de la página.

Estrategia de pruebas **mínima y focalizada** (AGENTS.md): TDD solo donde el plan lo pide en
su §10 y donde un fallo rompería un flujo principal, corrompería datos o dinero, o vulneraría
autorización. Copy, layout y wrappers se validan con typecheck, lint y una revisión focalizada;
no montes baterías TDD para cableado trivial.

## 7. Invariantes del repo que ningún ejecutor puede romper

- `src/api/` es la única capa que sabe que existe HTTP. Ningún módulo de feature importa axios.
- Cero aritmética de dinero en el cliente (ADR 9): `toFixed`/`parseFloat` solo dentro de
  `src/lib/decimal.ts`; `pnpm run guard:adr9` lo vigila. Porcentajes como fracción.
- Dinero: se visualiza en string, se maneja en número. Transporte lo fija el backend. Si un
  DTO te obliga a castear (`as never`) para compilar, el que está mal es el DTO.
- UI en español (es-EC); sustantivos de dominio en español en el código.
- Tema neutro: nunca colores crudos de Tailwind (`bg-blue-500`); solo los tokens de estado
  conservan croma.
- Gates por página en `src/lib/disponibilidad.ts`. **Solo 081 toca el Set**, y solo con la
  matriz de evidencia de 077–080 completa. `RutaAdmin` no se relaja jamás.
- Ninguna respuesta admin expone secretos (`passwordHash`, tokens). Hay tests que afirman esa
  prohibición: consérvalos.
- **Nunca abras el navegador**: las herramientas `mcp__claude-in-chrome__*` están prohibidas
  en este proyecto. Verificación por tests, `curl` y typecheck.

## 8. Supervivencia a los límites de tokens

Los ejecutores trabajan en worktrees aislados precisamente para que un límite de uso no borre
su progreso. Refuérzalo:

- Mantén `plans/pendientes/ESTADO-EJECUCION-077-081.md` **comiteado y actualizado en cada
  transición de estado**: plan actual, ruta del worktree, rama, commit del backend usado,
  veredicto, rondas de revisión gastadas, qué falta. Es tu memoria: si la sesión muere, se
  reanuda leyendo ese archivo y nada más.
- Exige a cada ejecutor que **commitee en su worktree al terminar cada paso del plan**, no solo
  al final.
- Si te quedas sin tokens: **el trabajo no se abandona ni se declara terminado**. Al reactivarse
  el uso, tu primer acto es leer `plans/pendientes/ESTADO-EJECUCION-077-081.md`, verificar el
  estado real con `git log`/`git worktree list`/`git status`, y continuar exactamente desde ahí.
  No reinicies desde cero, no re-dispatches un plan ya aprobado, no dupliques worktrees.
- No borres un worktree hasta que su rama esté mergeada en `plans/077-081`.
- Sé económico: un ejecutor por plan, sin fan-out decorativo, sin re-auditar lo ya aprobado.

## 9. Definición de terminado

La rama está terminada cuando **todo** esto es cierto y lo has verificado:

1. Los cinco planes 077–081 figuran DONE en `plans/00.INDEX.md`, cada uno con la evidencia
   concreta que lo respalda (rutas, hooks, handlers, tests).
2. Las cuatro páginas admin (`/admin/usuarios`, `/admin/plantillas`, `/admin/valores`,
   `/admin/logs`) renderizan su página real, con datos del backend, cubriendo
   loading/vacío/error/403; ninguna muestra `ModuloNoDisponible` ni «pronto».
3. `MODULOS_SIN_BACKEND` queda vacío en `src/lib/disponibilidad.ts` y `RUTAS_ADMIN` ya no lleva
   `modulo` en esas cuatro rutas, sin relajar `RutaAdmin`.
4. `pnpm run verify` verde en `plans/077-081`, con su salida real citada en el informe.
5. El banner DIFERIDO ya no existe en ninguno de los cinco planes.
6. `plans/BITACORA.md` cuenta, en orden, qué se hizo y por qué: reactivación de la rama, un
   asiento por plan, desviaciones y decisiones tomadas en ausencia del usuario.
7. `AGENTS.md` actualizado si cambió el baseline de tests o el inventario de gates.
8. Ningún worktree con trabajo sin mergear; ningún `git push`.

## 10. Informe final

Cierra con un informe corto y honesto:

- Estado por plan (DONE / BLOCKED + razón real).
- Salida citada de `pnpm run verify`.
- Commit del backend contra el que se validó el contrato.
- Decisiones que tomaste por el usuario y por qué.
- Lo que descubriste y **no** arreglaste porque pertenece a otro plan.

Si algo quedó fuera, dilo explícitamente en vez de dejarlo implícito. Un informe que exagera
lo hecho es peor que un plan bloqueado.

Empieza ya: levanta el diferimiento, reverifica el estado inicial y dispatcha 077.
