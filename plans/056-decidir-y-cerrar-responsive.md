# Plan 056 — Decidir el alcance responsive y cerrarlo

**Status:** ⏸ **EN ESPERA — se ejecuta cuando el humano lo pida.** No entra en ninguna ola.
**Escrito contra:** frontend `8cc08b5`
**Esfuerzo:** L, repartido en 3 fases independientes
**Riesgo:** BAJO técnico, ALTO de alcance — es el plan que más puede crecer sin querer
**Decisión:** **opción C — escritorio y móvil**, por fases, sin urgencia
**Evidencia:** [`INVENTARIO-COBERTURA.md`](INVENTARIO-COBERTURA.md) §6

## El dato

| Medida | Valor |
|---|---|
| Archivos `.tsx` de producción (sin `components/ui/`) | 95 |
| **Sin ningún breakpoint** | **76 (80 %)** |
| Usos totales | 61 — `sm:` 34 · `md:` 14 · `xl:` 10 · **`lg:` 3** |
| `useIsMobile` | definido, **usado solo por `ui/sidebar.tsx`** |
| Contenedores con scroll horizontal | 5 |

Sin breakpoints: todo el shell (`AppShell`, `Sidebar`, `Topbar`, `Breadcrumbs`, los dos
selectores), las 6 páginas de auth, `ListaProyectosPage`, `ParametrosPage`, los 14 componentes
comunes y las 3 páginas de error.

Las tres pantallas núcleo con tabla ancha —S-22 editor de APU, S-27 presupuesto, S-33
cronograma— tienen `overflow-x-auto`. **No se rompen: hacen scroll horizontal.** Es
supervivencia, no diseño.

## Por qué esto empieza como pregunta y no como tarea

**`thesis-docs` no fija ningún requisito responsive.** `plan/design/01-ui-ux-design.md` no
declara breakpoints, ni tamaño mínimo, ni un objetivo móvil. No hay RNF que lo cubra. No hay
ninguna historia US-nn que lo pida. El SUS de I-12 se mide sobre tareas guiadas cuyo dispositivo
tampoco está especificado.

Así que el 80 % no es necesariamente deuda. Puede ser una decisión que nadie escribió.

Y el producto empuja en una dirección concreta: es una herramienta de presupuestos de obra cuya
pantalla núcleo (S-22) es una rejilla de bloques M/N/O/P con edición inline, y cuya siguiente
(S-27) es un árbol de 33 capítulos y 298 rubros. Eso no se opera con el pulgar. La respuesta
honesta probablemente sea **escritorio y tablet horizontal**.

Hacer responsive las 76 pantallas «porque sí» sería el trabajo más caro del backlog y el que menos
mueve las cuatro variables de la tesis.

## La decisión — tomada

**Escritorio y móvil, ambos.** Alcance decidido; **arranque no.**

> **Este plan no se ejecuta hasta que el humano lo pida explícitamente.** No bloquea a nadie y
> nadie lo bloquea: puede entrar entre dos olas cualquiera, o después de todas. Está aquí para que
> la deuda quede contada y con solución escrita, no para competir con 061–060.

Es la opción C de las tres que se plantearon. Descarta acotar el producto a escritorio, así que el
80 % sin breakpoints **sí es deuda** — pero deuda que no bloquea a nadie y que no debe competir
con los planes 053–061.

Lo que eso implica sin rodeos: **S-22 (editor de APU), S-27 (presupuesto) y S-33 (cronograma) no
se arreglan con clases de Tailwind.** Una rejilla de bloques M/N/O/P con edición inline y un árbol
de 33 capítulos y 298 rubros necesitan otra disposición en 375 px, no la misma encogida. Eso es
rediseño, y por eso va en la fase 3 y con wireframe previo.

Las otras 41 unidades de UI sí son trabajo de clases.

## Fases

Independientes y committeables por separado. Cada una entrega valor sola; parar entre fases es
legítimo.

### Fase 1 — la base (S)

Lo que hace que el resto sea posible y arregla lo que hoy directamente no se puede usar.

1. **Fijar los breakpoints** en `thesis-docs/plan/design/01-ui-ux-design.md`: qué es móvil, qué
   tablet, qué escritorio. Ahora mismo no hay ninguno documentado y por eso conviven `sm:` 34
   veces con `lg:` 3. Sin esta línea, cada pantalla elige el suyo.
2. **El shell.** `AppShell`, `Sidebar`, `Topbar`, `Breadcrumbs`, `SelectorProyecto`,
   `SelectorVersion` — ninguno tiene un breakpoint y son lo primero que ve cualquiera en móvil.
   `ui/sidebar` de shadcn ya soporta colapsar y por eso importa `useIsMobile`: la pieza está, hay
   que usarla. `ui/sheet` (1 solo uso hoy) es el patrón para el sidebar en móvil.
3. **`useIsMobile` deja de estar muerto.** Hoy está definido y solo lo usa `ui/sidebar`. Al entrar
   en el camino real hay que mockear `matchMedia` en `src/test/setup.ts` — jsdom no lo trae — y
   arreglar su `react(set-state-in-effect)` (`use-mobile.ts:14`), uno de los 10 warnings de lint.
4. **Regla dura: el scroll horizontal vive dentro del contenedor de tabla, nunca en `body`.**
   Hay 5 contenedores con `overflow-x-auto`; auditarlos. Un `body` que se desplaza en horizontal
   rompe el shell entero y es el fallo responsive más común.

### Fase 2 — las pantallas de una columna (M)

Las que son formularios o listas y solo necesitan clases: las 6 de auth, las 3 de error,
`PerfilPage`, `ListaProyectosPage`, `ResumenProyectoPage`, `ParametrosPage`, `VersionesPage`,
`MisPlantillasPage`, `PlantillasProyectoPage`, `ExportPage` y los 14 componentes comunes.

Patrón: una columna en móvil, rejilla desde `md:`. `TarjetaTabla` ya existe en `comunes/` — es el
componente pensado para mostrar filas como tarjetas, y es la respuesta a «tabla en móvil» sin
rediseñar nada. Comprobar antes de escribir alternativas.

### Fase 3 — las tres pantallas de tabla ancha (L, con wireframe antes)

S-22, S-27, S-33. **No empezar sin un wireframe móvil aprobado.** Las preguntas que hay que
responder antes de tocar código:

- **S-22**: ¿la rejilla M/N/O/P se convierte en tarjetas apiladas por sección? ¿Se puede editar una
  celda con el teclado en pantalla sin perder el contexto de la fila?
- **S-27**: el árbol de capítulos ya es jerárquico; en móvil puede ser navegación por niveles en
  vez de árbol expandido. ¿Se pierde la visión de totales?
- **S-33**: un Gantt de hasta 520 períodos no cabe en 375 px de ninguna manera. ¿Vista de lista por
  actividad con sus segmentos, y el Gantt solo en escritorio?

Mientras tanto **el scroll horizontal de la fase 1 las mantiene usables**. No están rotas: son
incómodas. Esa es exactamente la razón para dejarlas en la última fase.

## Fuera de alcance

- Accesibilidad. La cubre `e2e/axe.ts` (plan 015) y es un eje distinto: una pantalla puede ser
  perfectamente accesible y nada responsive.
- Gestos táctiles, PWA, offline. Nada de eso está en `thesis-docs`.

## Definición de hecho

Por fase, no de golpe.

**Fase 1:** breakpoints documentados en `thesis-docs` con fecha y autor · el shell usable en
375 px · `matchMedia` mockeado en `src/test/setup.ts` · el warning de `use-mobile.ts:14` resuelto ·
`body` sin scroll horizontal en ninguna ruta.

**Fase 2:** las 15 pantallas de una columna y los 14 comunes, con al menos un test de layout por
grupo.

**Fase 3:** wireframe aprobado antes del código; S-22, S-27 y S-33 utilizables en móvil.

`npm run verify` en verde al cerrar cada fase.
