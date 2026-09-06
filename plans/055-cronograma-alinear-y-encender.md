# Plan 055 — Cronograma: alinear el contrato y encender el módulo

**Status:** TODO
**Escrito contra:** frontend `8cc08b5` · backend `origin/main` @ `c337950`
**Fuente de verdad:** paquete `ec.uce.propuestas.cronograma` en `origin/main` (planes backend
026–030), verificado leyendo recursos, DTOs, parsers y mapper — no inferido.
**No usar `thesis-docs/plan/architecture/07-api-contract.md` §7:** describe el contrato anterior.
Ver «Por qué el frontend está como está».
**Esfuerzo:** L (1.5–2 días) · **Riesgo:** MEDIO-ALTO — es el módulo con más deriva del repo
**Depende de:** `061` (tipado del dinero) → `053` (ids en `string`)
**Cubre:** S-33, S-34 · P-33…P-36 · F-08 (`thesis-docs/plan/design/02-pantallas-flujos.md`)

## Por qué

**El cronograma existe en `origin/main` desde el 2026-09-05.** Cuatro recursos JAX-RS, 18 DTOs,
migración `V009`, 11 clases de test. El handoff y el roadmap V2 decían lo contrario porque se
escribieron el día antes de que aterrizara.

Y **no es el cronograma de `test/stuff`**: es una implementación nueva sobre el contrato UUID +
dinero-como-string de main. Eso resuelve por sí solo la pregunta abierta #4 del handoff, y quita
del medio la mitad de la pregunta #1 (qué hacer con `test/stuff`).

El frontend ya tiene página, seis componentes y cinco hooks de cronograma. **Ninguno compila
contra el contrato real.** Está aproximadamente al 50 %: la forma general acierta, cada detalle
falla. Ese es el peor estado posible, porque parece terminado.

## Por qué el frontend está como está

No es descuido: **está fiel a `thesis-docs/plan/architecture/07-api-contract.md` §7**, que sigue
describiendo el cronograma anterior a los planes 026–030. El backend implementó otro contrato y
los docs no se actualizaron. Antes de culpar a un hook, mirar esta tabla:

| Punto | Docs §7 | `origin/main` `c337950` | Quién acierta |
|---|---|---|---|
| Configurar | `PUT /cronogramas/{id}` | `PUT /cronogramas/{id}/configuracion` | código |
| Programar | `ActividadAvanceRequest {avancePorPeriodo}` | unión de 4 operaciones | código (superset) |
| Vistas | «render cliente, **sin endpoint propio**» | `GET /cronogramas/{id}/vistas` | código |
| `CronogramaResponse.id` | `1` numérico | UUIDv7 | código |
| 409 de configuración | `reduccion-periodos-requiere-confirmacion` | `configuracion-cronograma-requiere-confirmacion` | código |
| `estadoDistribucion`, `avanceFinal`, `segmentos[]` | no existen | existen | código |
| `avancePorPeriodo` de cronograma | **array** | array | **los docs ya lo decían** |
| `pesoPonderado` y avances | porcentaje escala 4 | porcentaje escala 4 | **los docs ya lo decían** |

Las dos últimas filas son errores del frontend contra **ambas** fuentes; el resto son deriva.

**Parte del trabajo de este plan es sincronizar los docs**, no solo el código. Si se corrige el
frontend y se deja `07-api-contract.md` §7 como está, el siguiente que planifique leyendo los docs
repite el error exacto. Abrir un cambio en `thesis-docs` con la tabla de arriba.

> ## Alcance de este plan: rebanadas 1–4. La 5 no se ejecuta todavía.
>
> **El plan se da por cerrado con las rebanadas 1–4 en verde.** La 5 (vistas, Gantt jerárquico,
> valorizado y curva S) queda **pendiente de N05** y se ejecuta después, sin bloquear nada.
>
> Con 1–4 el módulo queda **correcto y encendido**: el cronograma se crea, se configura, se
> programan actividades con las cuatro operaciones, se marca revisado y los tres 409 se manejan
> bien. Lo que falta es visualización, no corrección.
>
> **Riesgo de calendario: N05 está sin responder.** `DOCUMENTOS/entrevistas/05/N05_entrevista-cronograma.md`
> (nuevo en `411242f`) hace siete preguntas de negocio sobre cronograma **con las siete decisiones
> en blanco** y fecha «Por definir». El backend ya respondió seis de hecho. La #2 —¿Gantt
> arrastrable?— es la más cara: el backend dice que sí (`MOVER_SEGMENTO`,
> `REDIMENSIONAR_SEGMENTO`), y `02-pantallas-flujos.md` §5.4 la sigue listando como abierta.
>
> **Las rebanadas 1–4 son seguras**: corrigen el seam y no dependen de ninguna respuesta.
> **La rebanada 5 espera a N05** — ver el recuadro de alcance arriba.

## Contrato real (leído de `origin/main`)

### Endpoints

| Verbo | Ruta | Body | Devuelve |
|---|---|---|---|
| `GET` | `/presupuestos/{presupuestoId}/cronograma` | — | `CronogramaResponse` · 404 si no existe |
| `POST` | `/presupuestos/{presupuestoId}/cronograma` | `{unidadTiempo, numeroPeriodos}` | `201` + `CronogramaResponse` |
| `PUT` | `/cronogramas/{cronogramaId}/configuracion` | `{unidadTiempo, numeroPeriodos, confirmarPerdida?}` | `CronogramaResponse` · **409** |
| `PATCH` | `/cronogramas/{cronogramaId}/actividades/{actividadId}` | unión de 4 operaciones | `CronogramaResponse` · **409** |
| `GET` | `/cronogramas/{id}/vistas` | — | `CronogramaVistasResponse` |
| `POST` | `/cronogramas/{id}/revisado` | — | `CronogramaResponse` |

Todos `@RolesAllowed({"USUARIO","SUPER_ADMIN"})`. Todos los ids son UUIDv7 string.

**Los tres primeros están mal en el frontend.** `useConfigurarCronograma` hace
`PUT /cronogramas/{id}` — le falta `/configuracion`, así que hoy es un 404. Y el PATCH acierta la
ruta pero manda un body que el parser rechaza.

### `CronogramaResponse`

```ts
{
  id: string                    // UUID   — front dice number
  presupuestoId: string         // UUID   — front dice number
  unidadTiempo: "SEMANA" | "MES"
  numeroPeriodos: number
  totalGeneral: string          // escala 6
  totalGeneralRevisado: string | null
  fechaRevision: string | null  // Instant ISO
  estadoDistribucion: "COMPLETO" | "BORRADOR"   // FALTA en el front
  desactualizado: boolean
  avanceFinal: string           // escala 4     // FALTA en el front
  actividades: ActividadCronogramaResponse[]
  avancePorPeriodo: string[]    // ARRAY denso, largo = numeroPeriodos
  avanceAcumulado: string[]     // ARRAY denso
}
```

> **`avancePorPeriodo` a nivel cronograma es un array denso, no un mapa.** El front lo declara
> `Record<string, Decimal>`. A nivel *actividad* sí es un mapa disperso. Los dos campos se llaman
> igual y tienen forma distinta — es la trampa principal de este módulo.

### `ActividadCronogramaResponse`

```ts
{
  id: string; rubroId: string           // UUID (front: number)
  item: string; codigo: string          // codigo FALTA en el front
  descripcion: string; unidad: string   // unidad FALTA
  cantidad: string                      // FALTA — escala 6
  precioUnitario: string                // FALTA — escala 6
  precioTotal: string                   // escala 6
  pesoPonderado: string                 // escala 4 — PORCENTAJE
  avancePorPeriodo: Record<string,string>  // disperso: solo períodos asignados
  segmentos: { inicio: number; fin: number }[]  // FALTA — runs consecutivos, derivado
  desviacion: string                    // escala 4 = pesoPonderado − Σ avancePorPeriodo
}
```

### Unidades: la fixture actual está mal por un factor de escala

`avancePorPeriodo` son **puntos de porcentaje con escala 4**, no dinero:

- `desviacion = pesoPonderado − Σ avancePorPeriodo` (`CronogramaMapper`)
- `estadoDistribucion` es `COMPLETO` sólo si toda desviación es `0.0000` **y**
  `avanceFinal == 100.0000`
- El parser cuantiza a 4 decimales `HALF_UP`, rechaza negativos, rechaza escala > 4 y rechaza
  valores ≥ 1 000 000

`src/test/fixtures/cronograma.ts` usa valores monetarios (`"500.000000"`, `"3750.000000"`) donde
van porcentajes. Los pesos suman ~0.89 en vez de 100. **Toda la fixture hay que rehacerla**, y esa
es la rebanada 1.

Escalas: dinero 6 decimales · porcentaje y avance 4 decimales.

### Programación de actividad — unión discriminada de 4 operaciones

El front manda `{avancePorPeriodo}`. El parser exige un discriminante `operacion` y **rechaza
cualquier propiedad fuera de la lista de su operación**:

```ts
| { operacion: "REEMPLAZAR_AVANCES";     avancePorPeriodo: Record<string,string> }
| { operacion: "DISTRIBUIR_UNIFORME";    periodos: number[] }
| { operacion: "MOVER_SEGMENTO";         inicio: number; fin: number; delta: number }
| { operacion: "REDIMENSIONAR_SEGMENTO"; inicio: number; fin: number; nuevoInicio: number; nuevoFin: number }
```

Reglas que el parser impone y que la UI debería respetar antes de enviar:

- claves de período: enteros `1..numeroPeriodos`, sin espacios, sin duplicados tras normalizar
- valores: **string decimal**, nunca número JSON (`"Valor de avance debe ser un decimal string"`)
- `periodos`: no vacío, sin duplicados, dentro de rango; se ordena en el servidor
- `delta ≠ 0`, y `inicio+delta … fin+delta` debe caber en `1..numeroPeriodos`
- `fin ≥ inicio`, `nuevoFin ≥ nuevoInicio`

`MOVER_SEGMENTO` y `REDIMENSIONAR_SEGMENTO` no tienen ninguna UI hoy. Son las que permiten el
Gantt arrastrable (decisión abierta «Gantt read-only vs drag-to-reschedule», `02-pantallas-flujos`
§5.4) — el backend ya eligió: soporta arrastrar.

### Tres 409 distintos, y solo uno es Problem+JSON

Es la trampa de manejo de errores del módulo. Un `catch` genérico por `status === 409` los mezcla.

**409 al crear sobre uno existente** — `ProblemaException.conflicto("cronograma-ya-existe")`.
Relación 1:1 presupuesto↔cronograma. Este **sí** pasa por `GlobalExceptionMapper`, así que es
Problem+JSON normal. La UI debe tratarlo como «ya existe, recarga» y no como fallo.

Los otros dos **no** pasan por `GlobalExceptionMapper` y por tanto **no traen
`type`/`title`/`status`**; `ApiError.problem` contiene otra cosa.

**409 de configuración** — `CronogramaConflictoMapper`:
```json
{ "codigo": "configuracion-cronograma-requiere-confirmacion",
  "mensaje": "…",
  "perdidas": [ { "actividadId": "0198…", "periodo": 7, "valor": "12.5000" } ] }
```

**409 de programación** — `AvanceSegmentoException`:
```json
{ "codigo": "segmento-solapado", "mensaje": "…" }
```

`useConfigurarCronograma` lee hoy `problem.periodosAfectados`, un campo que no existe: siempre
`undefined` → `[]` → `DialogoConfirmarReduccion` se abre vacío y el usuario confirma a ciegas una
pérdida de datos que no puede ver.

### Semántica que la UI debe respetar

- **Crear vs configurar.** El cronograma **no** se crea solo. `GET` da 404 hasta el `POST`. El
  estado vacío actual de la página es correcto; hay que distinguir 404-legítimo de error real.
- **Límites de períodos:** `SEMANA` ≤ 520, `MES` ≤ 120, mínimo 1. Validar en el diálogo, no
  esperar al 400.
- **Cuerpos con lista blanca estricta.** `POST` acepta exactamente `{unidadTiempo, numeroPeriodos}`;
  `PUT` acepta esos dos más `confirmarPerdida`. Una propiedad extra → 400. Los dos campos son
  **obligatorios también en el PUT** — el front los declara opcionales.
- **`revisado` es idempotente.** Segunda llamada con el mismo total+fingerprint no muta
  `fechaRevision`. Es el único comando que escribe los marcadores de revisión.
- **`desactualizado` no bloquea exportar.** Son ejes ortogonales (Plan 026 §4 del backend). No
  inventar un gate que el backend no tiene.
- **Sincronización.** Las actividades se derivan 1:1 de los rubros del presupuesto vía
  `CronogramaSincronizacionService`; el front nunca crea ni borra actividades.

## Rebanadas

Cada una es committeable por separado. El orden importa: la 1 genera la lista de trabajo de todas
las demás.

### 1 — fixture y handlers en rojo

Rehacer `src/test/fixtures/cronograma.ts` contra el contrato de arriba: UUIDs estables, arrays
densos, porcentajes escala 4 que sumen 100, `segmentos` coherentes con las claves de
`avancePorPeriodo`, `estadoDistribucion`, `avanceFinal`, y los campos nuevos de actividad.

Construir **al menos tres estados**, porque la página tiene tres comportamientos distintos y hoy
solo se prueba uno:

| Fixture | Para qué |
|---|---|
| `COMPLETO`, `desactualizado: false` | camino feliz |
| `BORRADOR` con desviación ≠ 0 | el badge y el estado parcial |
| `desactualizado: true` con `totalGeneralRevisado` viejo | F-08, la alerta al abrir |

Handlers MSW: corregir `PUT /cronogramas/:id` → `/cronogramas/:id/configuracion`, añadir
`GET /cronogramas/:id/vistas`, y hacer que **todos rechacen con 400 las propiedades desconocidas**
y con 409 los dos conflictos, replicando los payloads exactos. Un handler permisivo aquí es lo que
dejó pasar esta deriva durante un mes.

`npm run typecheck` debe explotar. Esa lista es el resto del plan.

### 2 — tipos en `contract.ts`

Reescribir el bloque «Cronograma (§11)» (líneas ~532–575): `CronogramaResponse`,
`ActividadCronogramaResponse` (renombrar desde `ActividadResponse`, que no dice de qué),
`SegmentoResponse`, la unión `ActividadProgramarRequest`, `CronogramaConfigurarRequest` con ambos
campos obligatorios, y los dos payloads de 409.

Borrar `ActividadAvanceRequest`.

**Decisión de dinero.** Cronograma es 100 % strings, así que el `Decimal` branded encaja tal cual
aquí. Pero conviven dos representaciones en el repo — presupuesto/cronograma en string, APU e
insumos en number — y hoy `Decimal` se aplica indiscriminadamente. Este plan **no** resuelve esa
partición; la hereda el plan 028. Aquí basta con no empeorarla: usar `Decimal` donde el backend
manda string, y anotar en el tipo la escala (6 dinero / 4 porcentaje).

### 3 — hooks

Los tres 409 se distinguen por `codigo`, no por `status`.

`src/features/cronograma/hooks/useCronograma.ts`, entero:

- ids `string`; `enabled: !!presupuestoId` en vez de `> 0`
- `PUT /cronogramas/{id}/configuracion`
- `PATCH` con la unión de 4 operaciones
- 409 de creación: `cronograma-ya-existe` → invalidar la query y recargar, no mostrar error
- 409 de configuración: leer `perdidas[]`, no `periodosAfectados`
- 409 de programación: `codigo === "segmento-solapado"` → toast propio, no el genérico
- 404 en el `GET` = «no hay cronograma», no error. Distinguirlo explícitamente.
- hook nuevo `useVistasCronograma(cronogramaId)`
- `qk.cronograma(id: string)` y `qk.cronogramaVistas(id: string)`

### 4 — página y diálogos

- `CronogramaPage.tsx`: fuera `?? 0` (×3). El objeto-actividad ficticio con `id: 0` y
  `"0" as never` que se pasa a `DialogoEditarActividad` cuando no hay selección es un parche
  del tipado viejo: renderizar el diálogo sólo cuando hay actividad.
- `DialogoConfigurarCronograma`: validar 1..520 / 1..120 según unidad.
- `DialogoConfirmarReduccion`: mostrar la tabla de `perdidas` — actividad, período, valor — en vez
  de una lista de strings vacía. Es el único punto donde el usuario ve qué va a perder.
- `DialogoEditarActividad`: emitir `REEMPLAZAR_AVANCES`, valores como string decimal de 4
  decimales, y mostrar `desviacion` en vivo contra `pesoPonderado` (F-08: «Σ ≈ peso»).
- `TablaActividades`: columnas `codigo` y `unidad`, que ya vienen y no se muestran.
- Botón «Distribuir uniforme» sobre una selección de períodos → `DISTRIBUIR_UNIFORME`. Es una
  operación que el backend ya soporta y que la UI no ofrece; sin ella el usuario teclea a mano
  una distribución que el servidor sabe calcular.

### 5 — vistas: Gantt, valorizado, curva S · **DIFERIDA hasta N05**

> No ejecutar con el resto del plan. Se documenta aquí para no perder el contrato, pero
> **el 055 cierra sin esta rebanada**. Reabrir cuando N05 esté respondida, especialmente su
> pregunta 2 (¿Gantt arrastrable?), que decide si esta UI usa dos de las cuatro operaciones del
> PATCH o ninguna.


`GET /cronogramas/{id}/vistas` devuelve las tres de golpe:

```ts
CronogramaVistasResponse {
  cronogramaId: string
  gantt:      { cronograma: CronogramaResponse; capitulos: CapituloCronogramaResponse[] }
  valorizado: { periodos: PeriodoValorizadoResponse[]; capitulos: …[]; totales: TotalesCronogramaResponse }
  curvaS:     { puntos: PuntoCurvaSResponse[] }
}
```

`CapituloCronogramaResponse` es **recursivo** (`subcapitulos[]` + `rubros[]`), igual que el árbol
del presupuesto. `PuntoCurvaSResponse` y `PeriodoValorizadoResponse` tienen la misma forma:
`{periodo, porcentajeParcial, porcentajeAcumulado, montoParcial, montoAcumulado}`.

`GanttChart.tsx` hoy se alimenta de `CronogramaResponse` plano. Con `vistas` puede dibujar la
jerarquía real y usar `segmentos[]` en vez de derivar barras de las claves del mapa.

Valorizado y curva S **no tienen UI**. Son P-35 en el inventario de pantallas y quedan como tabs
de S-33. Si hay que recortar por tiempo, recortar aquí y no en las rebanadas 1–4: esto es
visualización, aquello es corrección.

### 6 — quitar el módulo de la degradación

Cuando 1–4 estén en verde (**la 5 no hace falta para esto**): cronograma **no** entra en `MODULOS_SIN_BACKEND` (nunca estuvo, y
ahora por fin es correcto). Actualizar el comentario de `disponibilidad.ts` para que lo diga
explícitamente, con la referencia al commit `c337950`, para que el próximo agente no lo vuelva a
degradar por inercia leyendo un handoff viejo.

## Fuera de alcance

- **Exportar cronograma a XLSX.** No existe en `origin/main` (sólo en `test/stuff`, sin mergear).
  `useExportar.ts:57` apunta a `/cronograma/exportar`, que es 404. Lo borra el plan 051.
- Drag-to-reschedule en el Gantt. El backend lo soporta (`MOVER_SEGMENTO`,
  `REDIMENSIONAR_SEGMENTO`); la UI puede llegar después. Anotar la decisión como cerrada a favor
  de «editable» en `thesis-docs/plan/design/02-pantallas-flujos.md` §5.4.

## Definición de hecho

- `npm run verify` en verde.
- Los 6 endpoints reales tienen handler MSW con el payload exacto, incluidos los dos 409.
- Un test por cada operación de `ActividadProgramarRequest`.
- Un test que verifique que `DialogoConfirmarReduccion` lista las `perdidas` recibidas del 409.
- Un test del estado 404 = «sin cronograma» que no lo confunda con un error.
- Un test por cada uno de los tres 409, comprobando que se distinguen por `codigo`.
- Cambio abierto en `thesis-docs` sincronizando `07-api-contract.md` §7.
- Cero `number` como id de cronograma o actividad en `src/`.
- Rebanada 5 **no incluida**: el plan cierra sin ella y queda anotada como pendiente de N05.
