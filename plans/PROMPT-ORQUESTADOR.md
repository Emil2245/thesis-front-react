# Prompt de arranque — agente orquestador (Opus)

> Pega todo lo que sigue como primer mensaje en una sesión de Claude Code con
> Opus, abierta en `/home/etverkade/workspace/thesis-front-react`.

---

> ## ⚠️ Este encargo ya se completó (2026-08-25)
>
> **Los nueve planes 019–027 están integrados en `main`.** No vuelvas a
> despacharlos. Lo que sigue se conserva como registro de cómo se organizó el
> trabajo, no como instrucciones vigentes.
>
> Estado al cerrar: **197 tests en 43 archivos** y `pnpm run e2e` en verde
> (20 passed), desde los 172/42 del arranque. El rediseño de UI que estaba sin
> commitear se consolidó en `067f116`. Los dos bugs vivos que describe la §2
> están cerrados: el crash del editor de APU (plan 026) y las pantallas que
> devolvían APUs de otro presupuesto (plan 019).
>
> Cambió además lo que la §2 daba por hecho: el tema **ya no tiene azul de
> marca** (es neutro, blanco y negro; solo los tokens de estado conservan
> color), el rail lateral **se minimiza a iconos** en vez de esconderse, y las
> pantallas sin backend **se degradan** con `ModuloNoDisponible` según el
> inventario de `src/lib/disponibilidad.ts`.
>
> Sigue vigente de este documento: el terreno (§1), la puerta de verificación,
> las reglas de "lo que no se hace" (§6) y el método de revisión (§7.5). Para
> saber qué queda por hacer, lee `plans/README.md` — sus "direcciones abiertas"
> son el backlog real.

Eres el orquestador de un trabajo de varias sesiones sobre el frontend del
**Sistema APU**. Tu valor no está en escribir el código: está en mantener el
contexto completo, repartir el trabajo con criterio, y **revisar lo que vuelve**.
Delegas la ejecución; no delegas el juicio.

## 1. El terreno

Dos repositorios, ambos en el disco:

- **`/home/etverkade/workspace/thesis-front-react`** — el frontend. React 19 ·
  TypeScript · Vite · **shadcn/ui (estilo `radix-nova`)** · Tailwind 4 ·
  TanStack Query 5 · React Router 7 · Zustand · Zod. Gestor: **pnpm**.
- **`/home/etverkade/workspace/thesis-back-quarkus`** — el backend Quarkus.
  **Solo lectura para ti.** No implementas backend.
- **`/home/etverkade/workspace/thesis-docs`** — la especificación (contrato de
  API en `plan/architecture/07-api-contract.md`). Fuente de verdad del contrato
  *acordado*, que no es lo mismo que el contrato *implementado*.

Puerta de verificación única, y no es negociable:

```bash
pnpm run verify     # typecheck · lint · format:check · test · build
pnpm run e2e        # Playwright (aparte del gate)
```

Al escribir esto eran **172 tests en 42 archivos**; hoy son **197 en 43**. Si un
cambio los baja de ahí, ese cambio no está terminado.

## 2. Lo que tienes que saber antes de mover una línea

### El frontend va POR DELANTE del backend, no por detrás

Es el hecho central y contradice lo que parece a simple vista. El backend
implementa **nueve** recursos JAX-RS; el frontend tiene pantallas para los 44
procesos del contrato.

```bash
# Reconfírmalo tú mismo antes de empezar. Si devuelve más de 9, todo lo de
# abajo caducó y hay que rehacer el análisis.
grep -rn '^@Path(' /home/etverkade/workspace/thesis-back-quarkus/src/main/java \
  --include=*.java | sed 's/.*@Path(//' | sort -u
```

Lo que existe: `/auth`, `/perfil`, `/proyectos` (CRUD + `?q&estado&page&size`),
`/proyectos/{id}/firmantes`, `/proyectos/{id}/parametros`,
`/proyectos/{id}/insumos` (+ `/selector` `/importar` `/copiar`),
`/bases-centrales`, `/presupuestos/{id}/apus`, `/apus/{id}` (+ `/detalles`).

Lo que **no existe** —ni recurso, ni servicio, ni entidad—: todo presupuesto y
versiones, todo cronograma, toda exportación, todas las plantillas APU, todo el
módulo admin. Más tres casos sueltos: `/proyectos/{id}/duplicar`,
`/proyectos/{id}/logo`, `/proyectos/{id}/insumos/{iid}/uso`. Y cuatro del módulo
APU: `/apus/{id}/duplicar`, `/descuento`, `/calculo`, `/guardar-plantilla`.

### Dos bugs vivos, no hipotéticos

**A. El editor de APU revienta contra el backend real.** `JacksonConfig` solo
registra `JsonNullableModule`; no hay `WRITE_BIGDECIMAL_AS_PLAIN`. Por tanto
Quarkus serializa `BigDecimal` como **número JSON**. El front tipa los importes
del APU como strings `Decimal` y `esCero()` hace `valor.trim()` →
`TypeError: valor.trim is not a function`. Los planes 016–018 ya arreglaron esto
para proyectos/insumos/parámetros; el 017 excluyó el APU por escrito y esa
exclusión dejó el crash. **Lo arregla el plan 026.**

**B. Dos pantallas devuelven datos ajenos con aspecto de correctos.**
`ListaApusPage` y `EditorApuPage` pasan el id del **proyecto** a
`/presupuestos/{id}/apus` — endpoint que sí existe y responde. Con el proyecto 1
devuelven los APUs del presupuesto 1. No es una pantalla vacía: es información
equivocada sin ninguna señal. **Lo arregla el plan 019.**

### El desbloqueo de mayor apalancamiento (para cuando alguien pregunte)

`GET /proyectos/{id}/presupuestos`. Sin esa lista no hay `presupuestoId`, y sin
`presupuestoId` el módulo APU del backend —que **sí** está implementado, con su
motor de cálculo— es inalcanzable desde la interfaz. `Apu.presupuestoId` es una
columna `Long` que apunta a una tabla sin entidad propietaria. Un solo endpoint
bien hecho vale más que varios planes de frontend. **No es tu trabajo
implementarlo**, pero si te preguntan por prioridades, es la respuesta.

### Trabajo sin commitear en el árbol

Hay un rediseño de UI completo **sin commitear**: 19 archivos modificados y 2
nuevos (`src/components/comunes/EncabezadoPagina.tsx` y `TarjetaTabla.tsx`), más
las capturas regeneradas. Arregla el rail lateral (a `AppSidebar` le faltaba el
wrapper `<Sidebar>`), carga la fuente Geist (estaba en `package.json` y en el
preset de shadcn pero nadie la importaba) y corrige `ChipEstado` (usaba
`--exito-foreground`, un color pensado para relleno sólido, como texto sobre
tinte al 15 %: el texto desaparecía).

**Tu paso 0 es consolidarlo.** Los planes 019–027 llevan `Drift check` que
compara contra extractos de ese estado, y cualquier worktree que crees partirá
de un árbol sin él. Rama primero: `main` es la rama por defecto y no se commitea
directamente ahí.

## 3. El trabajo: nueve planes en `plans/`

`plans/README.md` es el índice: léelo entero antes de repartir nada. Los planes
019–027 se escribieron con la skill `improve` y están hechos para que los ejecute
**un modelo más barato y sin contexto de esta conversación**: cada uno inlinea
sus extractos de código, comandos de verificación, alcance cerrado y condiciones
de parada.

| Plan | Qué hace | Pri | Esf |
|---|---|---|---|
| 019 | Unificar de dónde sale la versión activa (`presupuestoId`) | P1 | M |
| 020 | Crash de "Nuevo APU": la lista de plantillas no trae `snapshot` | P1 | S |
| 021 | Reparar la suite de capturas E2E | P2 | M |
| 022 | Buscador, filtro y paginación en la lista de proyectos | P2 | M |
| 023 | Sustituir `window.confirm` por el diálogo del sistema | P2 | S |
| 024 | Extender el encabezado a las 13 páginas restantes | P2 | L |
| 025 | Colores crudos de Tailwind → tokens del tema | P3 | S |
| 026 | Alinear el módulo APU con el backend real | P1 | M |
| 027 | Degradar honestamente los módulos sin backend | P1 | M |

**Tandas** (la matriz de solapes de archivos está en el índice):

- **A**, cuatro en paralelo: 019 · 020 · 022 · 023
  Solo comparten `src/test/handlers.ts`, en tres regiones separadas.
- **B**, tres en paralelo: 021 · 025 · 026
  021 y 025 dependen de que 020 esté mergeado.
- **C**, en serie: 027 → 024
  Comparten las seis páginas de admin, `VersionesPage`, `CronogramaPage` y
  `ExportPage`.

**Si hay que recortar: 026 y 019 son los únicos dos que hacen que la aplicación
funcione contra el backend real.** El resto es mejora.

## 4. Cómo repartes el trabajo

Tres vías. Elige por coste y por si necesitas aislamiento.

### 4.1 Subagentes nativos de Claude Code

La vía por defecto mientras haya cuota. Un plan por agente:

```
Agent(subagent_type: "general-purpose", isolation: "worktree",
      description: "Ejecutar plan 019",
      prompt: "Lee /home/etverkade/workspace/thesis-front-react/plans/019-….md
               y ejecútalo íntegro. Corre cada comando de verificación y confirma
               el resultado esperado antes de avanzar. Respeta sus STOP conditions.
               NO actualices plans/README.md: el índice lo mantengo yo.
               Al terminar, reporta: pasos completados, salida de `pnpm run verify`,
               y cualquier condición de parada que se haya disparado.")
```

`isolation: "worktree"` es lo que permite lanzar varios de la misma tanda sin
que se pisen. Lanza los de una tanda **en un solo mensaje, con varias llamadas
Agent**, para que corran de verdad en paralelo.

### 4.2 CLIs externas cuando se agote la cuota de Claude Code

Dos binarios instalados en la máquina, orquestables por Bash:

```bash
# agy (antigravity-cli v1.1.19) — /home/etverkade/.local/bin/agy
agy --print "tarea" --model gemini-3.7-flash-high
agy --dangerously-skip-permissions --print "tarea" --model gemini-3.7-flash-high
#   otros modelos: claude-sonnet-4-6, claude-opus-4-6-thinking, gpt-oss-120b-medium

# opencode (v1.18.21) — /home/etverkade/.opencode/bin/opencode
opencode run "prompt"
```

Para paralelizar: varias llamadas Bash independientes en el mismo response.
El patrón es el mismo — tú mantienes el contexto del repo y repartes:

```
Orquestador (contexto + planes)
  ├─ Bash → agy --print "ejecuta el plan 020" (paralelo)
  ├─ Bash → opencode run "ejecuta el plan 023" (paralelo)
  └─ integra y revisa
```

**Advertencia**: estas CLIs no tienen las skills ni las reglas de este
repositorio. Cuando delegues en ellas, pega en el prompt las secciones que
importen (§6 "Lo que no se hace" como mínimo) y **revisa el diff tú mismo, línea
a línea**. Un plan está escrito para ser autosuficiente, pero las reglas
transversales no viven en el plan.

### 4.3 Tú mismo

Para lo que requiere juicio: revisar diffs, decidir entre alternativas, resolver
una condición de parada, hablar con el humano.

## 5. Skills que debes usar

Invócalas con la herramienta `Skill`. Tres importan aquí:

- **`shadcn`** — **obligatoria** antes de tocar cualquier componente de UI. No
  improvises la anatomía de un componente: la skill inyecta el contexto del
  proyecto (estilo `radix-nova`, base `radix`, preset con fuente Geist) y da
  `npx shadcn@latest docs <componente>` para traer la documentación real. Las
  reglas duras que impone y que debes hacer cumplir en revisión: `className` es
  para layout, no para recolorear; **nada de `space-y-*`/`space-x-*`** (usa
  `flex` + `gap-*`); `size-*` cuando ancho y alto coinciden; **colores
  semánticos, nunca `bg-blue-500`**; iconos en botones con `data-icon`, sin
  clases de tamaño; formularios con `FieldGroup` + `Field`; los items siempre
  dentro de su Group (`SelectItem` → `SelectGroup`); todo `Dialog`/`Sheet`
  necesita título.

- **`improve`** — la que produjo los planes 019–027. Úsala para **auditar y
  planificar, nunca para implementar**: es estrictamente de solo lectura sobre
  el código fuente y solo escribe en `plans/`. Variantes útiles: `improve branch`
  (audita solo lo que cambió en la rama), `improve review-plan <archivo>` (afila
  un plan antes de despacharlo), `improve reconcile` (procesa qué pasó desde la
  última sesión: verifica los DONE, investiga los BLOCKED). Si el humano pide
  "audita esto" o "qué más falta", esta es la herramienta.

- **`ponytail`** — el contrapeso. Úsala cuando algo empiece a crecer de más:
  fuerza la solución más simple que funcione, cuestiona si la tarea necesita
  existir (YAGNI), prefiere biblioteca estándar antes que código propio y
  plataforma nativa antes que dependencia. Aplícala especialmente al revisar lo
  que vuelve de un subagente barato: tienden a sobre-construir. `ponytail-review`
  revisa un diff solo buscando sobre-ingeniería.

Otras que pueden aparecer: `test-driven-development`, `systematic-debugging`,
`verification-before-completion`, `using-git-worktrees`.

## 6. Lo que no se hace

Reglas transversales. Los planes las repiten donde toca, pero un ejecutor sin
contexto puede saltárselas y tú eres quien las hace cumplir en revisión.

1. **Cero aritmética de costes en el cliente.** ADR 9: todo el cálculo de
   costes y precios es del servidor. Está registrado en `plans/README.md` como
   *"la regresión bienintencionada más probable de todo el repositorio"*. Si un
   subagente calcula un `cdAjustado` o un total "para que se vea mejor",
   recházalo.
2. **No borrar los módulos sin backend.** El plan 027 los degrada; no los
   amputa. Ese código vuelve a servir en cuanto el backend crezca.
3. **No falsear el contrato para que compile.** Si un DTO no encaja, el arreglo
   es alinear el tipo con lo que el backend manda de verdad — no añadir un
   campo opcional ni un `as`. El bug del plan 020 nació exactamente así.
4. **Los tests se arreglan consultando por rol accesible**, no cambiando el
   marcado para complacer al test.
5. **No commitear en `main`.** Rama por cambio. Commits en estilo conventional
   (`fix:`, `feat:`, `style:`, `test:`). No hacer push ni abrir PR sin que el
   humano lo pida.
6. **`pnpm`, no `npm`.** El repo tiene `pnpm-lock.yaml` y `pnpm-workspace.yaml`.

## 7. Cómo trabajas

1. **Paso 0**: rama nueva y consolida el rediseño sin commitear. Verifica antes
   (`pnpm run verify` en verde) y confirma que sigue en verde después.
2. Reconfirma el inventario del backend (§2). Si creció, para y replantea.
3. Lee `plans/README.md` entero.
4. Despacha la tanda A. Un agente por plan, todos en el mismo mensaje.
5. **Revisa cada diff que vuelva como un tech lead**: que cada hunk se
   corresponda con un paso del plan, que no haya nada fuera de alcance por
   plausible que parezca, y vuelve a correr los criterios de aceptación tú
   mismo. Un `verify` en verde no significa que el cambio sea correcto.
6. Mergea de uno en uno. Espera un conflicto trivial en `src/test/handlers.ts`.
7. Actualiza tú la fila de estado en `plans/README.md` — por eso les dices a los
   ejecutores que no lo toquen.
8. Repite con B y C.
9. Al cerrar, `improve reconcile` para dejar el índice honesto.

## 8. Cuándo paras y preguntas

- El inventario del backend devuelve más de nueve rutas.
- Un plan dispara una condición de parada que no puedes resolver leyendo el
  código.
- Dos planes entran en conflicto de un modo que la matriz no previó.
- Descubres que un endpoint que los planes dan por inexistente sí existe (o al
  revés).
- El humano tiene que decidir entre alternativas con criterios que no están en
  el repositorio.

No improvises en ninguno de esos casos. Reporta lo que encontraste, con
evidencia (`archivo:línea`), y espera.
