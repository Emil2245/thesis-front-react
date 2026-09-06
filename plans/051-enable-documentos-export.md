# Plan 051 — Export: encender solo la ET en DOCX y borrar el resto

**Status:** TODO — **reescrito 2026-09-06**
**Escrito contra:** frontend `8cc08b5` · backend `origin/main` @ `c337950`
**Fuente de verdad:** `documento/DocumentoResource.java` en `origin/main` — **una sola clase, un solo endpoint**
**Esfuerzo:** S (2–3 h) · **Riesgo:** BAJO — es sobre todo borrar
**Depende de:** `053` · `059` (por `RubroRefResponse.id` en el banner de validación)
**Cubre:** parte de S-35 / P-37

> ## Aviso de reescritura
>
> La versión anterior se escribió contra `test/stuff` y prometía **5 endpoints de export XLSX**.
> No existen en `origin/main`: `grep -c exportar` → 0, y los dos `.xlsx` del repo son plantillas de
> contenido, no código. Aquella versión también mencionaba «dos clases `DocumentoResource`
> registradas en el mismo `@Path`» — eso es un artefacto de `test/stuff`; **en main hay una sola**.

## Lo que existe de verdad

```
GET /documentos/especificaciones-tecnicas/{presupuestoId}?formato=docx&titulo1=&titulo2=
    @RolesAllowed({"USUARIO","SUPER_ADMIN"})
    → 200 con el binario + Content-Disposition: attachment; filename="…"
    → 400 si formato != docx  ("Formato no soportado: … (solo DOCX en esta iteración)")
    → 404 si el presupuesto no es del usuario
```

Eso es todo. `formato` es **opcional**: si no se manda, o se manda `docx`, genera; cualquier otro
valor es 400. `titulo1` y `titulo2` son opcionales y van a la portada del documento.

## Lo que el frontend cree que existe

`useExportar.ts` ofrece cuatro opciones, y **las cuatro URLs están inventadas**:

| Opción de la UI | URL que llama | En main |
|---|---|---|
| Presupuesto PDF | `GET /presupuestos/{id}/exportar/pdf` | no existe |
| Presupuesto Excel | `GET /presupuestos/{id}/exportar/excel` | no existe |
| Todos los APUs | `GET /presupuestos/{id}/apus/exportar` | no existe |
| Cronograma | `GET /presupuestos/{id}/cronograma/exportar` | no existe |

Ninguna apunta al único endpoint que sí existe. El módulo está degradado, así que hoy nadie las
dispara — pero son 4 de las llamadas muertas del inventario §3.1 y hay que borrarlas, no
redirigirlas.

**No cablear PDF a otro endpoint.** El backend no genera PDF en ninguna ruta. Ofrecer un botón
«PDF» que descargue un DOCX es peor que no ofrecerlo.

## Qué hace este plan

### 1 — borrar las 4 opciones inventadas

`useExportar.ts`: fuera las cuatro URLs y el selector de formato PDF/XLSX. Queda **una** opción:
especificaciones técnicas en DOCX.

También sale el `enabled: presupuestoId > 0` de `useExportar.ts:12` y el
`Number(searchParams.get("v")) || 0` de `ExportPage.tsx:56` — los arregla el plan 053, pero si
este plan se ejecuta antes, arreglarlos aquí y avisar al 053.

### 2 — cablear la ET

```ts
GET /documentos/especificaciones-tecnicas/{presupuestoId}
```

Tres cosas que no son obvias:

- **Es una descarga binaria, no JSON.** `src/api/request.ts` hace `get<T>` y devuelve `.data`
  parseado. Para esto hace falta `responseType: "blob"`. Si no existe un helper de descarga en el
  seam, este plan lo añade — es la primera descarga real del repo.
- **El nombre del archivo viene en `Content-Disposition`**, no se inventa en el cliente. Leer la
  cabecera; si falta, caer a un nombre por defecto.
- **`titulo1` y `titulo2` son opcionales** y alimentan la portada. `ExportPage` puede exponerlos
  como dos campos de texto, o no exponerlos. Si no se exponen, no mandarlos: mandar cadenas vacías
  no es lo mismo que omitirlos.

### 3 — validaciones bloqueantes: mantenerlas, con matiz

S-35 y F-09 especifican un checklist bloqueante antes de exportar (ítems con PU = 0, rubros sin
actividad). `GET /presupuestos/{id}/validacion` existe en main y devuelve
`{exportable, itemsPuCero[], itemsCantidadCero[], itemsSinActividad[]}`. Mantener el banner.

Pero **`RubroRefResponse` tiene el campo `id`, no `rubroId`** (§5.4 del handoff), así que el banner
lee hoy un campo `undefined`. Lo arregla el plan 059; si este se ejecuta antes, arreglarlo aquí.

Y un matiz del backend que la UI no debe inventar: **`cronograma.desactualizado` no bloquea la
exportación.** Son ejes ortogonales (Plan 026 §4 del backend). No añadir un gate que el backend no
tiene.

### 4 — quitar `documentos` de `MODULOS_SIN_BACKEND`

Con una sola opción real, la página deja de estar degradada. Cambiar el texto de S-35 para que
diga qué se puede exportar hoy en vez de prometer cuatro entregables.

## Lo que queda pendiente y por qué

P-37 pide **4 entregables** (APU individual, todos los APUs, presupuesto, cronograma) en
`.xlsx`/`.pdf`, y es la historia **US-34** de la iteración **I-10** del roadmap. Este plan cubre
un quinto entregable que no estaba en la lista original (la ET, P-45, añadida en I-06).

Es decir: **P-37 sigue sin empezar, y depende del backend.** El hito de tesis de la semana 20
—tasa de conformidad CHK-01…CHK-31 medida con parse-back POI/PDFBox— no se puede alcanzar desde
el frontend. Cuando el backend entregue I-10, este plan se amplía; hasta entonces no hay nada más
que hacer aquí.

Dejar constancia en `ExportPage` con un aviso honesto («por ahora solo especificaciones
técnicas») en vez de botones deshabilitados con tooltip: un botón apagado promete que llegará
pronto; un aviso dice la verdad.

## Definición de hecho

- `npm run verify` en verde.
- Cero referencias a `/exportar/pdf`, `/exportar/excel`, `/apus/exportar`, `/cronograma/exportar`.
- La descarga de ET funciona con un handler MSW que devuelve un blob con `Content-Disposition`,
  y hay un test que comprueba que el nombre de archivo sale de la cabecera.
- Un test del 400 con `formato=pdf`.
- `documentos` fuera de `MODULOS_SIN_BACKEND`.
