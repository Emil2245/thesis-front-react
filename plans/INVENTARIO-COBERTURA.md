# Inventario y cobertura — barrido completo

**Fecha:** 2026-09-06
**Frontend:** `8cc08b5` · suite verde (45 archivos, 207 tests) · `npm run lint` 10 warnings
**Backend:** `origin/main` @ `c337950` · **92 endpoints REST**
**Docs:** `../thesis-docs` @ `411242f`

Complemento de [`HANDOFF-ESTADO-Y-GAPS.md`](HANDOFF-ESTADO-Y-GAPS.md). El handoff dice *qué está
roto y en qué orden arreglarlo*; este documento dice *qué hay*, medido, sin interpretación.
Todo lo de aquí sale de contar archivos y comparar listas, no de leer documentación.

---

## 1. El roadmap de `thesis-docs`, completo

24 semanas · 12 iteraciones XP de 2 semanas · 2 desarrolladores · velocidad asumida 4–6 historias
por iteración, recalibrada al cierre de I-02.

### 1.1 Las 12 iteraciones y dónde está cada repo

| Iter. | Semanas | Objetivo | Procesos | Historias | Backend | Frontend |
|---|---|---|---|---|---|---|
| I-01 | 1–2 | Fundaciones, CI/CD, shell, registro/login | P-01, P-02, P-43, P-44 | US-01…04 | ✅ | ✅ |
| I-02 | 3–4 | Motor de cálculo puro (TDD contra golden masters) + recuperación y perfil | P-03, P-04 | US-05…07 | ✅ | ✅ |
| I-03 | 5–6 | Proyectos: CRUD, asistente, firmantes, 12 parámetros | P-05…08, P-10, P-11 | US-08…11 | ✅ | ✅ |
| I-04 | 7–8 | Insumos: catálogo, CRUD, CSV, bases centrales, uso | P-13…18 | US-12…15 | ✅ | ✅ · `usos` es stub |
| I-05 | 9–10 | Editor de APU (S-22), herencia de precios, HM automática | P-19…22 | US-16…18 | ✅ | ✅ |
| I-06 | 11–12 | APU completo: %CI, descuento global, plantillas, desglose, ET, plantilla de proyecto | P-12, P-23, P-26, P-27, P-45, P-46 | US-19…23, US-ET, US-P46 | ⚠️ falta descuento global | ⚠️ ver §3 |
| I-07 | 13–14 | Presupuesto: capítulos, ítems, totales, resumen, alertas | P-28…30, P-32 | US-24…27 | ✅ | ⚠️ ids `number` |
| I-08 | 15–16 | Versiones + cronograma base | P-09, P-31, P-33, P-34 | US-28…31 | ⚠️ falta P-09 duplicar proyecto | ⚠️ |
| I-09 | 17–18 | Cronograma visual y sincronía | P-35, P-36 | US-32, US-33 | ✅ `c337950` | ❌ contrato viejo |
| I-10 | 19–20 | Export SERCOP: 4 entregables xlsx/pdf | P-37 | US-34 | ❌ solo ET DOCX | ❌ 4 URLs inventadas |
| I-11 | 21–22 | Panel Super-Admin + piloto SUS | P-38…42 | US-35…39 | ❌ solo bases centrales | ⚠️ 6 páginas degradadas |
| I-12 | 23–24 | Medición SUS n≥5, baseline RNF-06, evidencias | — | US-40 | — | — |

**Dónde está el proyecto:** el backend cerró **I-09** el 2026-09-05. Le siguen I-10 (export) e
I-11 (super-admin). El frontend tiene UI construida hasta I-11 pero **alineada con el contrato de
I-08**; el trabajo pendiente no es construir pantallas, es reconciliar el seam.

### 1.2 Gate de entrada de I-10

`suite GM completa verde en CI`. Si no lo está, I-10 empieza arreglando el motor, no exportando.
Estado actual del backend: GM-19/GM-20 en rojo aceptado (residual sub-céntimo documentado),
GM-24 `@Disabled` por fixture EMELNORTE upstream. **La excepción está documentada y aceptada por
el autor**, así que el gate se considera cumplido con salvedad.

### 1.3 Hitos de tesis

| Semana | Hito | Estado |
|---|---|---|
| 2 | CI activo con build nativo | ✅ |
| 4 | Motor puro: GM unit verdes | ✅ |
| 10 | Motor integrado: GM api verdes | ✅ |
| 14 | Consolidación exacta (GM-19/20/21) | ✅ con excepción documentada 2026-08-28 |
| 18 | Integridad intermodular 100 % (RNF-02) | ✅ backend I-09 cerrada |
| 19 | **Gate export**: GM completa verde | ⚠️ con salvedad |
| 20 | Tasa de conformidad CHK-01…31 | ❌ pendiente I-10 |
| 22 | Piloto SUS | ❌ pendiente I-11 |
| 24 | 4 variables cerradas | ❌ pendiente I-12 |

Las cuatro variables dependientes: `exactitud_calculo` (cerrada con excepción),
`integridad_referencial` (cerrada), `conformidad_formato` (pendiente I-10),
usabilidad SUS (pendiente I-11/I-12).

### 1.4 Riesgos de calendario que siguen vivos

- **Entrevista A02**: las cinco asunciones tienen dueño; la cara es A9 (snapshot al usar bases
  centrales), con fecha límite semana 7 — **ya resuelta** el 2026-08-18 en N04.
- **N05 (cronograma): sin responder.** Riesgo nuevo, no está en la lista del roadmap. Siete
  preguntas en blanco y el backend ya implementó seis de hecho. Ver handoff §10.4.
- **Export más caro de lo previsto**: I-10 tiene una sola historia (US-34) a propósito. Si
  desborda, I-11 es recortable «a lo que la demo necesita».
- **Buffer:** I-12 no tiene procesos nuevos.

### 1.5 Historias retiradas o superseded

| US | Estado |
|---|---|
| US-20 (descuento por rubro + global) | **Reemplazada** rollout 2026-08-31: solo FORMA 1 global + FORMA 2 atómica |
| US-21 (rubros auxiliares) | **Superseded** N04 §2 / v1.3 §2.5.6 — TC-P25-01…06 no ejecutables |
| US-P46 (plantilla de proyecto) | **Nueva** en I-06 |
| US-ET (especificaciones técnicas) | **Nueva** en I-06 |

---

## 2. Cobertura de pantallas S-01…S-44

**43 de 44 unidades de UI existen en el código.** El inventario canónico está en
`thesis-docs/plan/design/02-pantallas-flujos.md`.

| Estado | Cuenta | Detalle |
|---|---|---|
| ✅ Existe y funciona contra main | 24 | auth, proyectos, insumos, APU, presupuesto |
| ⚠️ Existe pero con contrato desalineado | 8 | presupuesto (ids `number`), cronograma (6 unidades) |
| 🔒 Existe pero degradada | 10 | plantillas ×2, documentos, admin ×6, descuento global |
| ❌ No existe | 1 | **S-39** detalle de base central (`/admin/bases/:id`) — ruta no declarada |
| ⛔ Retirada | 1 | **S-24** descuento del rubro — WITHDRAWN 2026-08-31 |

### 2.1 Rutas: código vs mapa de los docs

| Diferencia | Ruta |
|---|---|
| En el código, no en el mapa | `/plantillas-proyecto` (P-46, posterior al mapa) · `/admin/valores` (S-41 se partió en dos páginas) · `/403` · `/404` |
| En el mapa, no en el código | `/admin/bases/:id` — **S-39** |

`/admin/bases` debería ser `/admin/bases-centrales` para acompañar el cambio de endpoint
(plan 050).

### 2.2 Las 10 pantallas degradadas y por qué

| Pantalla | Backend en main | Veredicto |
|---|---|---|
| S-13 descuento global | ❌ (spec cerrada 2026-08-31) | degradar — plan 054 |
| S-35 exportar | ⚠️ solo ET DOCX | encender parcialmente — plan 051 |
| S-36 mis plantillas APU | ✅ | **encender** — plan 048 |
| plantillas de proyecto | ✅ | **encender** — plan 049 |
| S-37 usuarios | ❌ | mantener |
| S-38 bases centrales | ✅ | **encender** — plan 050 |
| S-39 detalle de base | ✅ backend, ❌ pantalla | **construir** — plan 050 |
| S-40 plantillas sistema | ❌ | mantener |
| S-41 parámetros sistema | ✅ `/proyectos/parametros-sistema` | **encender** — el gate es obsoleto |
| S-41 valores de referencia | ❌ | mantener |
| S-42 logs | ❌ | mantener |

De 10 degradaciones, **5 se pueden levantar hoy**.

---

## 3. Endpoints: reconciliación completa

Medido comparando las 93 llamadas HTTP de `src/` (excluyendo handlers MSW) contra los 92
endpoints extraídos de las anotaciones JAX-RS de `origin/main`.

```
70  coinciden
23  el frontend llama y el backend NO tiene
22  el backend tiene y el frontend NO llama
```

### 3.1 Las 23 rotas (404/405 garantizado)

| Grupo | Llamadas | Causa |
|---|---|---|
| **Admin sin backend** (12) | `GET/POST/DELETE/PATCH /admin/usuarios*` · `GET /admin/logs` · `GET/POST/DELETE /admin/plantillas` · `GET/PUT /admin/valores-referencia` | el módulo no existe en main |
| **Admin con path equivocado** (4) | `GET/POST/PUT/DELETE /admin/bases`, `POST /admin/bases/{}/archivar` | el path es `/admin/bases-centrales` |
| **Descuento** (3) | `POST /apus/{}/descuento` · `GET /presupuestos/{}/descuento-global/preview` · `POST /presupuestos/{}/descuento-global` | el de APU está retirado; el global no está implementado |
| **Cronograma** (1) | `PUT /cronogramas/{}` | falta `/configuracion` |
| **Typo de plural** (1) | `GET /proyectos/{}/insumos/{}/uso` | el path es `/usos` |
| **Plantilla de proyecto** (1) | `POST /plantillas-proyecto` | el path es `POST /proyectos/{id}/guardar-plantilla` |
| **Sin backend** (2) | `POST /proyectos/{}/duplicar` · `PUT /proyectos/{}/logo` | no existen |

Nota: las 4 URLs de export (`/exportar/pdf`, `/exportar/excel`, `/apus/exportar`,
`/cronograma/exportar`) no aparecen en esta lista porque el módulo `documentos` ya está degradado
y las llamadas están tras el gate. Siguen siendo código muerto que hay que borrar (plan 051).

### 3.2 Los 22 endpoints sin explotar

| Grupo | Endpoints | Qué desbloquean |
|---|---|---|
| **Admin de bases centrales** (8) | CRUD de bases + CRUD de insumos + import | S-38 y S-39 completas |
| **Bases personales** (4) | `GET/POST /bases-personales`, `DELETE /{id}` | **feature entera sin UI** — N04 §A9 |
| **Cronograma** (2) | `GET /cronogramas/{}/vistas` · `PUT /cronogramas/{}/configuracion` | Gantt jerárquico, valorizado, curva S |
| **APU** (2) | `GET /apus/{}/especificacion-tecnica` · `PATCH /apus/{}/porcentaje-indirecto` | leer la ET (hoy solo se escribe); arreglar el bug silencioso del %CI |
| **Plantillas** (2) | `GET /plantillas-proyecto/{}` · `POST /proyectos/{}/guardar-plantilla` | plan 049 |
| **Documentos** (1) | `GET /documentos/especificaciones-tecnicas/{}` | el único export real |
| **Insumos** (1) | `GET /proyectos/{}/insumos/{}/usos` | S-19 (el handler devuelve `[]` de momento) |
| **Auth** (1) | `POST /auth/aceptar-invitacion` | sin UI; depende de admin de usuarios |
| **Perfil** (1) | `GET /perfil` | la página lee del contexto de auth, nunca refresca del servidor |

**Hallazgo que no estaba en ningún plan: `bases-personales`.** Cuatro endpoints, cero UI, cero
tipos en `contract.ts`, cero menciones en los planes 001–055. Es la base PERSONAL de N04 §A9.

---

## 4. Tests: dónde está la cobertura y dónde el riesgo

**45 archivos · 207 tests · verdes.** Pero mal distribuidos respecto a dónde viven los bugs.

| Capa | Archivos | Con test | Sin test |
|---|---|---|---|
| Páginas | 27 | 16 | **11** |
| Componentes de feature | 46 | 21 | **25** |
| **Hooks de feature** | **27** | **1** | **26** |

### 4.1 El hueco que explica todo

**26 de 27 hooks no tienen un solo test.** El único con test es `useApuEditor`.

Los hooks son exactamente donde vive **cada uno** de los defectos del handoff: la URL equivocada,
el verbo equivocado, el campo descartado en silencio, el guard `> 0` sobre un UUID, el 409 leído
del campo que no existe. Los 207 tests verdes prueban páginas y componentes, es decir **la capa
que consume el hook mockeado**, no la que habla con la red.

Por eso tres análisis contra la rama equivocada produjeron código que typechequea y pasa la suite
entera estando mal sobre el formato de red. No es mala suerte: **la suite no mira ahí**.

Consecuencia para el orden de trabajo: el plan **028 (Zod en el seam)** no es «endurecimiento
opcional», es la prueba que falta. Y cada plan 053–055 debe dejar tests de hook, no solo de
página.

### 4.2 Páginas sin test

`ErrorPage` · `NoEncontradaPage` · `SinPermisoPage` · `PerfilPage` · `RestablecerPage` ·
`VersionesPage` · las 5 páginas de admin excepto `AdminBasesPage`.

`VersionesPage` es la que más preocupa: es P-31 (US-28), pantalla núcleo de I-08, y toca ids que
el plan 053 va a re-tipar.

### 4.3 E2E

`e2e/smoke.spec.ts` (52 líneas) · `e2e/screenshots.spec.ts` (556) · `e2e/axe.ts` (11, axe-core).
`screenshots.spec.ts` arrastra ~26 ids numéricos; está fuera del gate de vitest y el plan 021 es
su dueño.

---

## 5. Componentes visuales (shadcn)

35 componentes instalados · registro `radix-nova` · baseColor `neutral` · iconos lucide ·
CSS variables activas.

### 5.1 Uso real

| Rango | Componentes |
|---|---|
| Muy usados (≥ 20 archivos) | `button` 57 · `input` 39 · `label` 30 · `dialog` 26 |
| Usados (5–19) | `field` 17 · `table` 16 · `tooltip` 15 · `badge` 14 · `select` 14 · `skeleton` 13 · `card` 12 · `dropdown-menu` 6 |
| Poco usados (1–4) | `sidebar` 4 · `alert` 4 · `tabs` 3 · `spinner` 3 · `separator` 3 · `input-group` 3 · `switch` 2 · `checkbox` 2 · `textarea` 2 · `alert-dialog` 1 · `avatar` 1 · `breadcrumb` 1 · `pagination` 1 · `sheet` 1 · `sonner` 1 |
| **Cero usos** | `accordion` · `combobox` · `command` · `empty` · `popover` · `progress` · `radio-group` · `scroll-area` |

### 5.2 Los 8 sin usar no son todos iguales

Cuatro son bloat instalado «por si acaso» — `accordion`, `empty`, `radio-group`, `scroll-area`.
Borrar.

Los otros cuatro son más interesantes, porque **hay componentes propios que hacen su trabajo**:

| Sin usar | Existe en su lugar | Nota |
|---|---|---|
| `popover` | `apu-editor/components/PopoverDesglose.tsx` | S-26 se especifica como Popover pero el componente no importa el primitivo |
| `combobox` + `command` | `insumos/components/ComboboxUnidad.tsx` · `apu-editor/components/SelectorInsumo.tsx` | S-23 se especifica como «combobox/panel»; `cmdk` está en dependencias |
| `progress` | — | el cronograma muestra avances sin barra de progreso |

Antes de borrar `popover`/`combobox`/`command`, comprobar si los componentes propios reimplementan
lo que el primitivo ya da. Si es así, la deuda es al revés: sobra el componente propio, no el de
shadcn.

### 5.3 Componentes comunes propios

14 en `src/components/comunes/`: `CargandoTabla` · `ChipEstado` · `ConfirmarDestructivo` ·
`EncabezadoPagina` · `EstadoVacio` · `LimiteDeError` · `ModuloNoDisponible` · `Moneda` ·
`Numero` · `PantallaCargando` · `Placeholder` · `Porcentaje` · `TarjetaTabla`. Solo uno tiene test.

`Moneda` / `Numero` / `Porcentaje` son la frontera de formato de dinero — y es donde va a doler la
partición `Decimal` string vs number (handoff §2). Merecen test antes que ningún otro componente.

---

## 6. Responsive

**El punto más flojo del repo, y no tiene ningún plan asignado.**

| Medida | Valor |
|---|---|
| Archivos `.tsx` de producción (sin `ui/`) | 95 |
| **Sin ningún breakpoint** | **76 (80 %)** |
| Usos totales de breakpoints | 61 — `sm:` 34 · `md:` 14 · `xl:` 10 · `lg:` 3 |
| `useIsMobile` | definido en `src/hooks/use-mobile.ts`, **usado solo por `ui/sidebar.tsx`** |
| Contenedores con scroll horizontal | 5 — `ui/table`, `ui/sidebar`, `GridSeccion`, `TablaActividades`, `GanttChart` |

Sin breakpoints: **todo el shell** (`AppShell`, `Sidebar`, `Topbar`, `Breadcrumbs`,
`SelectorProyecto`, `SelectorVersion`), **las 6 páginas de auth**, `ListaProyectosPage`,
`ParametrosPage`, los 14 componentes comunes y las 3 páginas de error.

`lg:` con 3 usos es la señal más clara: es el breakpoint donde normalmente se decide el layout de
escritorio, y prácticamente no se usa.

Las pantallas núcleo con tabla ancha —S-22 editor de APU, S-27 presupuesto, S-33 cronograma— sí
tienen `overflow-x-auto`, así que no se rompen: **hacen scroll horizontal en móvil**. Es
supervivencia, no diseño responsive.

No hay ningún requisito de responsive en `thesis-docs` (`01-ui-ux-design.md` no fija breakpoints
ni tamaño mínimo). **Antes de invertir aquí hay que decidir si el producto se usa en móvil.** Para
una herramienta de presupuestos de obra sobre tablas de 20 columnas, la respuesta honesta puede ser
«escritorio y tablet horizontal», y entonces el 80 % deja de ser deuda y pasa a ser una decisión.
Ver plan 056.

---

## 7. Deuda de tipos y lint

### 7.1 `as never` — 9 ocurrencias, todas del mismo síntoma

| Archivo | Líneas | Qué tapa |
|---|---|---|
| `cronograma/pages/CronogramaPage.tsx` | 144, 145, 147 | el objeto-actividad ficticio con `id: 0` que se pasa al diálogo cuando no hay selección |
| `cronograma/components/GanttChart.tsx` | 115, 144, 175 | convertir números a `Decimal` a mano para formatear |
| `admin/pages/AdminParametrosPage.tsx` | 83, 84, 85 | valores de `ref.current?.value` (string) forzados a `Decimal` |

Los tres grupos son la misma causa: **el tipo branded `Decimal` no encaja donde el dato es número**,
que es exactamente la decisión abierta #2 del handoff. Cuando se resuelva la partición del dinero,
los 9 `as never` deberían desaparecer solos. Si no desaparecen, la partición estaba mal.

Cero `@ts-ignore`, cero `@ts-expect-error`, cero `as unknown as`. Solo 2 `TODO`, ambos `TODO(047)`
y ambos falsos (el plan 053 los borra).

### 7.2 Lint: 10 warnings, 0 errores

| Regla | Nº | Comentario |
|---|---|---|
| `react(incompatible-library)` | 7 | React Compiler no puede memoizar; salen de react-hook-form. Ruido esperado. |
| `react(set-state-in-effect)` | 2 | `DialogoNuevoApu:49` y `use-mobile:14` — reales, arreglables |
| `react-hooks(exhaustive-deps)` | 1 | `shell/contexto.ts:50` falta `cambiar` — **este puede morder**, es el contexto de versión activa |

---

## 8. Resumen: los seis hallazgos que no estaban en ningún plan

1. **26 de 27 hooks sin test** (§4.1) — la causa raíz de que tres análisis equivocados pasaran el
   gate. Refuerza el plan 028 y obliga a que 053–055 dejen tests de hook.
2. **`bases-personales`: 4 endpoints, cero UI** (§3.2) — feature completa del backend que el
   frontend ignora por completo.
3. **80 % de los archivos sin breakpoints** (§6) — sin requisito documentado que lo respalde ni
   plan que lo cubra. Necesita una decisión de producto antes que código.
4. **S-39 no existe** (§2.1) — única pantalla del inventario sin construir, y su backend está listo.
5. **8 componentes shadcn sin usar, 4 de ellos duplicados por componentes propios** (§5.2).
6. **`exhaustive-deps` en `shell/contexto.ts:50`** (§7.2) — en el contexto de versión activa, que es
   de donde salen los ids que el plan 053 va a re-tipar.
