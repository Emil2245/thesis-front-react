# Plan 066: Exportar el cronograma valorizado en XLSX, PDF y MSPDI

> **Instrucciones para el ejecutor**: sigue el plan paso a paso. Ejecuta cada
> comando de verificación y confirma su resultado antes de pasar al siguiente.
> Si ocurre algo de la sección «Condiciones de parada», **para y reporta** — no
> improvises. **No fusiones, no hagas push, no toques `main`, no actualices
> `plans/BITACORA.md` ni `plans/README.md`**: el índice lo mantiene el
> orquestador que te despachó.
>
> **Invoca la skill `ponytail:ponytail` antes de escribir código** (la solución
> más corta que funciona, sin abstracciones especulativas) y la skill
> `test-driven-development` (el test rojo primero). La puerta es
> `pnpm run verify` en verde antes de reportar.
>
> **Localiza por símbolo** (grep del nombre del campo, del hook o de la ruta),
> **no por número de línea**: los planes 053–065 han movido estos archivos y los
> números de este documento son orientativos.
>
> **Drift check (ejecútalo primero)**:
> ```bash
> git diff --stat eb004d1..HEAD -- src/api src/features/exportar src/test e2e AGENTS.md
> ```
> Si algún archivo en alcance cambió desde `eb004d1`, compara los extractos de
> «Estado actual» contra el código vivo antes de seguir. Si no coinciden, es una
> condición de parada.

## Estado

- **Prioridad**: P1
- **Esfuerzo**: L
- **Riesgo**: MED
- **Depende de**: ninguno
- **Categoría**: feature + bug
- **Escrito contra**: frontend `main` @ `eb004d1` (los extractos son de `1344113`,
  cuyo único cambio posterior es el número del baseline en `AGENTS.md`), backend
  `origin/main` @
  **`5673615`** (`../thesis-back-quarkus`), 2026-09-07

## Por qué importa

El backend mergeó su plan 031 y ya sirve la exportación documental del
cronograma valorizado en tres formatos. El frontend no la llama por ninguna
ruta, y `ExportPage.tsx` **afirma por escrito lo contrario de lo que ahora es
cierto**: «La exportación del presupuesto, de los APUs y del cronograma todavía
no existe en el servidor». La del cronograma sí existe. Un texto que miente en
la pantalla es peor que un botón ausente, porque el usuario deja de buscar.

Por el camino hay un defecto vivo en `main` que este plan tiene que arreglar
primero: **con `responseType: "blob"` el cuerpo de error de una descarga llega
como `Blob`, no como objeto**, así que el interceptor de `src/api/client.ts` no
puede validarlo y **cualquier** fallo de descarga se degrada al código
sintético `sin-respuesta`. Eso hoy solo afea el mensaje del DOCX; en cuanto
entre el cronograma, se traga el cuerpo del `409 export-bloqueado`, que es el
que lleva la lista de bloqueos que el usuario necesita para arreglar su
presupuesto.

## Estado actual

### Backend — el contrato que hay que transcribir (no lo adivines, está aquí)

Dos rutas, en
`src/main/java/ec/uce/propuestas/documento/CronogramaDocumentoResource.java`
(`@Path("/documentos/cronograma")`, `@RolesAllowed({"USUARIO","SUPER_ADMIN"})`):

```
GET /documentos/cronograma/{presupuestoId}/preflight?formato=xlsx|pdf|mspdi
    → 200 CronogramaExportPreflightResponse (JSON)
GET /documentos/cronograma/{presupuestoId}?formato=xlsx|pdf|mspdi
    → 200 binario + cabeceras, ó 409 BloqueoExportDetalle (JSON)
```

Códigos de estado, del propio javadoc del recurso y verificados en el cuerpo del
método:

| Situación | Estado | Cuerpo |
|---|---|---|
| UUID mal formado o **no-v7** | `400` | `{codigo:"validacion", mensaje}` |
| `formato` ausente, vacío o desconocido | `400` | `{codigo:"validacion", mensaje}` |
| Presupuesto ajeno o inexistente | `404` | `{codigo:"no-encontrado", mensaje}` |
| Preflight OK | `200` | `CronogramaExportPreflightResponse` |
| Descarga bloqueada | `409` | `BloqueoExportDetalle` |
| Descarga OK | `200` | bytes |

Las dos respuestas de descarga (200 y 409) llevan además la cabecera
`X-Cronograma-Desactualizado: true|false`.

Los `record` de Java, **tal cual** (`ec.uce.propuestas.cronograma.dto`). Los
cuatro llevan `@JsonInclude(JsonInclude.Include.ALWAYS)`:

```java
// CronogramaExportPreflightResponse.java
@JsonInclude(JsonInclude.Include.ALWAYS)
public record CronogramaExportPreflightResponse(
        boolean exportable,
        String formato,
        List<BloqueoExportResponse> bloqueos,
        List<WarningExportResponse> warnings) {}

// BloqueoExportResponse.java
@JsonInclude(JsonInclude.Include.ALWAYS)
public record BloqueoExportResponse(String codigo, UUID actividadId, String detalle) {}

// WarningExportResponse.java
@JsonInclude(JsonInclude.Include.ALWAYS)
public record WarningExportResponse(String codigo, String detalle) {}

// BloqueoExportDetalle.java — cuerpo del 409
@JsonInclude(JsonInclude.Include.ALWAYS)
public record BloqueoExportDetalle(
        UUID presupuestoId,
        String formato,
        String codigo,      // siempre "export-bloqueado"
        String mensaje,     // "Exportación bloqueada: N bloqueo(s)"
        List<BloqueoExportResponse> bloqueos,
        List<WarningExportResponse> warnings) {}
```

> **`ALWAYS`, no `NON_NULL`.** Es lo contrario del patrón C de
> [`docs/bugs.md`](../docs/bugs.md): aquí ninguna clave se omite, así que
> `actividadId` **llega como `null`** cuando el bloqueo no viene de una
> actividad concreta. En TypeScript es `actividadId: string | null`, clave
> obligatoria — **no** `actividadId?: string`.

**Los códigos de bloqueo que el backend emite de verdad**, sacados de
`CronogramaExportPreflightService.BloqueosCalculador.evaluar(...)` — no del
javadoc:

| `codigo` | Cuándo | Trae `actividadId` |
|---|---|---|
| `presupuesto-pu-cero` | algún rubro con PU = 0 (P-32) | no (`null`) |
| `presupuesto-cantidad-cero` | algún rubro con cantidad = 0 (P-32) | no (`null`) |
| `presupuesto-sin-actividad` | algún rubro sin actividad (P-32) | no (`null`) |
| `cronograma-total-cero` | `totalGeneral` nulo o ≤ 0 | no (`null`) |
| `cronograma-desviacion` | una actividad con desviación ≠ 0.0000 (**uno por actividad**) | **sí** |
| `cronograma-borrador` | desviación ≠ 0 o avance final ≠ 100.0000 | no (`null`) |
| `mspdi-fecha-inicio-requerida` | `formato=mspdi` y `Proyecto.fechaInicio` nula | no (`null`) |

Único warning emitido: `cronograma-desactualizado`
(`WarningExportResponse.stale(...)`), no bloqueante.

> ⚠️ El javadoc de `BloqueoExportResponse` documenta un octavo código,
> `cronograma-avance-final`, que **ningún camino del backend emite** (cero
> apariciones fuera de ese javadoc en todo `origin/main`). No lo pongas en
> ningún sitio. Por eso la UI de este plan **muestra el campo `detalle`**, que
> el backend ya redacta en español, y no una tabla de traducción de códigos:
> una tabla se queda corta en cuanto el backend añade un código.

**Media types y extensiones** (`ArchivoGenerado` + el `switch` de
`CronogramaDescargaService.generar`):

| `formato` | `Content-Type` | extensión del archivo |
|---|---|---|
| `xlsx` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | `.xlsx` |
| `pdf` | `application/pdf` | `.pdf` |
| `mspdi` | `application/xml` | **`.xml`** (no `.mspdi`, no `.mpp`) |

El **nombre del archivo lo pone el backend** en
`Content-Disposition: attachment; filename="..."`, con la forma
`<CODIGO>-<Nombre_Proyecto>-v<N>.<ext>` (p. ej.
`PROY-A-Edificio_Principal-v3.xlsx`), ya saneado contra Windows y sin ids
internos. El cliente **no lo inventa**: lo usa tal cual y solo tiene un
fallback si la cabecera falta.

El contrato ejecutable con los casos de test está en
`../thesis-back-quarkus/api/bruno/11-cronograma/TC-31-01..07-*.bru`: preflight
exportable (200, cuatro campos, `formato:"xlsx"`), `formato=bogus` → 400
`validacion`, UUID v4 → 400 `validacion`, presupuesto ajeno → 404
`no-encontrado`, y las cabeceras exactas de las tres descargas.

### Frontend — lo que hay hoy

- `src/api/client.ts` — el interceptor de error valida el cuerpo con Zod. **Es
  el defecto de la rebanada 1** (líneas ~63–71):

  ```ts
      // El cuerpo de error también es frontera de confianza: se valida en vez de
      // castearse. Si no trae `{codigo, mensaje}` no se hace pasar por un error
      // del contrato —`is()` daría false contra un código inventado— y cae a uno
      // sintético del cliente.
      const cuerpo = errorPayloadSchema.safeParse(error.response?.data);
      throw new ApiError(
        cuerpo.success ? cuerpo.data : problemDesconocido(status, error.message),
        status,
      );
  ```

  El interceptor de error ya es `async`, así que puedes usar `await` dentro.

- `src/api/problem.ts` — `PROBLEM_TYPES`. Su comentario dice hoy:

  ```
   * Se cayeron del catálogo `insumo-en-uso`, `export-bloqueado` y `csv-invalido`:
   * cero apariciones en todo el backend. Ver el plan 063 para qué manda en su
   * lugar cada uno.
  ```

  Era cierto en `origin/main @ c337950`. **Ya no**: `export-bloqueado` vive en
  `CronogramaDocumentoResource.descargar` desde `5673615`.

- `src/api/request.ts` — helper `descargar(url, params)`, que ya devuelve
  `{ blob, nombreArchivo }` leyendo `Content-Disposition` (lo dejó el plan 051).
  **Reúsalo, no escribas otro.**

- `src/api/contract.ts` — todos los DTO, por secciones
  (`// ————— Cronograma (§11) —————`, `// ————— Super-Admin (§11) —————`, …).
  `ValidacionPresupuestoResponse` está justo antes de la sección de cronograma.

- `src/api/schemas.ts` — esquemas Zod de las respuestas que se validan en
  runtime con `getValidado`. Contramedida del patrón A de `docs/bugs.md`.

- `src/api/queryKeys.ts` — factoría `qk`. Hoy tiene
  `cronograma: (presupuestoId) => ["presupuesto", presupuestoId, "cronograma"]`.

- `src/features/exportar/hooks/useExportar.ts` — 47 líneas.
  `useValidacionExport(presupuestoId)` y `useExportar()` con
  `descargarEspecificacionesTecnicas`. **Este es el patrón a imitar**:

  ```ts
  export function useExportar() {
    const descargarEspecificacionesTecnicas = useCallback(async (presupuestoId: string) => {
      try {
        const { blob, nombreArchivo } = await descargar(
          `/documentos/especificaciones-tecnicas/${presupuestoId}`,
        );
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = nombreArchivo ?? "especificaciones-tecnicas.docx";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        toast.success("Descarga iniciada");
      } catch {
        toast.error("Error al descargar");
      }
    }, []);

    return { descargarEspecificacionesTecnicas };
  }
  ```

- `src/features/exportar/pages/ExportPage.tsx` — una `Card` «Documentos
  disponibles» con la fila del DOCX, la alerta de `useValidacionExport`, y al
  final el párrafo que hay que corregir:

  ```tsx
            <p className="text-sm text-muted-foreground border-t pt-4">
              Por ahora solo se genera este documento. La exportación del presupuesto, de los APUs y
              del cronograma todavía no existe en el servidor.
            </p>
  ```

- `src/test/handlers.ts` (900 líneas) — todos los mocks MSW.
  `onUnhandledRequest: "error"`. El bloque `// ———— Exportar (Plan 051) ————`
  tiene el único handler de documentos; imítalo. Hay helpers ya escritos en el
  archivo: `problema(status, codigo, mensaje)` y `soloCampos(request, ...campos)`
  (devuelve 400 ante una propiedad desconocida).

- `src/test/fixtures/cronograma.ts` — fixtures del cronograma. **Las nuevas van
  aquí**, no en un archivo nuevo.

- `src/test/espia.ts` — `espiar()` captura las **peticiones salientes** y
  `ultima(peticiones, metodo, ruta)` busca la última que casa. Es la
  contramedida del patrón D: un test de hook mira la petición que sale, no que
  «cargó».

- Tests existentes que **tendrás que actualizar** en
  `src/test/features/exportar/pages/ExportPage.test.tsx`: la aserción
  `expect(screen.getAllByRole("button", { name: /descargar/i })).toHaveLength(1)`
  y `expect(screen.queryByText(/^Cronograma$/)).not.toBeInTheDocument()` afirman
  que el cronograma **no** se ofrece. Eso deja de ser cierto con este plan: son
  aserciones caducadas por el backend, no tests que haya que complacer.

- `e2e/screenshots.spec.ts` — la captura `11-documentos` (al final del archivo)
  entra en `/proyectos/:id/documentos` y **no mockea ninguna ruta de export**.

### Convenciones de este repositorio que este plan tiene que respetar

Están en [`AGENTS.md`](../AGENTS.md) y [`docs/bugs.md`](../docs/bugs.md). Las
que aplican aquí, inlineadas:

1. **Cero aritmética de dinero en el cliente** (ADR 9). Este plan no calcula ni
   formatea ninguna cifra: la lista de bloqueos es texto que manda el servidor.
   La guarda `pnpm run guard:adr9` corre dentro de `verify`.
2. **No falsear el contrato para que compile.** Ni un campo opcional de más, ni
   un `as`, ni un `as never`. Si un DTO no encaja, el que está mal es el DTO.
   Para cuerpos deliberadamente inválidos en tests existe
   `cuerpoInvalido<T>(...)` en `src/test/espia.ts`.
3. **Patrón B** (`docs/bugs.md` §1): guardas de id con `!!id`, **nunca**
   `Number(id) > 0`. Los ids son UUIDv7 en string.
4. **Toda ruta mockeada de un endpoint de listado lleva `*` al final.** Los dos
   endpoints de este plan llevan query param `?formato=`, así que en Playwright
   el patrón necesita `*`; en MSW el path se casa sin la query.
5. **Los tests se arreglan consultando por rol accesible en español**, no
   cambiando el marcado para complacer al test.
6. **Nada de colores crudos de Tailwind** (`bg-blue-500`). El tema es neutro;
   solo los tokens de estado tienen color (`--exito`, `--advertencia`,
   `--peligro`, `--destructive`). Antes de tocar UI, invoca la skill `shadcn`.
7. **`npx tsc --noEmit` no comprueba nada aquí** (`tsconfig.json` es
   `"files": []` con project references, siempre sale 0). El real es
   `pnpm run typecheck`. No lo escribas en ningún sitio.
8. **`verify` no comprueba tipos en `e2e/`** (`tsconfig.app.json` incluye solo
   `src`). Un error de tipos en un `.spec.ts` no sale hasta `pnpm run e2e`.

## Comandos que vas a necesitar

| Para | Comando | Esperado |
|---|---|---|
| Instalar | `pnpm install` | exit 0 |
| Tipos | `pnpm run typecheck` | exit 0, sin errores |
| Lint | `pnpm run lint` | exit 0 |
| Guarda ADR 9 | `pnpm run guard:adr9` | exit 0 |
| Formato | `pnpm run format:check` | exit 0 |
| Un test | `pnpm test -- <filtro>` | pasan |
| La puerta | `pnpm run verify` | exit 0 |
| E2E | `pnpm run e2e` | 20 tests en verde |

**pnpm, nunca npm** (hay `pnpm-lock.yaml` y `pnpm-workspace.yaml`).

Baseline al escribir este plan: **461 tests unitarios en 74 archivos**, `verify`
exit 0, `e2e` 20 passed. Si no coincide al arrancar, es condición de parada.

## Skills que te conviene invocar

- `ponytail:ponytail` — **obligatoria antes de escribir código.**
- `test-driven-development` — **obligatoria**, el test rojo primero.
- `verification-before-completion` — evidencia antes de afirmar.
- `shadcn` y `tailwind-v4-shadcn` — antes de tocar `ExportPage.tsx` (rebanada 6).
- `zod` — rebanada 3 (esquema del seam).
- `vitest` — rebanadas 1, 5, 7, 8.
- `playwright-best-practices` — rebanada 9.

## Alcance

**En alcance** (los únicos archivos que debes modificar o crear):

- `src/api/client.ts` (modificar)
- `src/api/problem.ts` (modificar)
- `src/api/contract.ts` (modificar — añadir sección)
- `src/api/schemas.ts` (modificar — añadir un esquema)
- `src/api/queryKeys.ts` (modificar — añadir una clave)
- `src/features/exportar/hooks/useExportar.ts` (modificar)
- `src/features/exportar/pages/ExportPage.tsx` (modificar)
- `src/test/handlers.ts` (modificar)
- `src/test/fixtures/cronograma.ts` (modificar)
- `src/test/api/client.test.ts` (modificar)
- `src/test/api/problem.test.ts` (modificar) — **la rebanada 2 lo obliga**: dos
  de sus aserciones (el catálogo exacto y `not.toContain("export-bloqueado")`)
  están clavadas a `c337950` y se ponen rojas por construcción. Actualiza solo
  esas dos; `insumo-en-uso` y `csv-invalido` siguen fuera del catálogo.
- `src/test/features/exportar/hooks/useExportar.contrato.test.tsx` (modificar)
- `src/test/features/exportar/pages/ExportPage.test.tsx` (modificar)
- `e2e/screenshots.spec.ts` (modificar)
- `AGENTS.md` (modificar — solo el número del baseline, rebanada 10)

**Fuera de alcance** (no los toques aunque parezcan relacionados):

- `src/api/request.ts` — el helper `descargar()` ya hace lo que hace falta.
  Si crees que necesita cambiar, es condición de parada.
- `src/lib/disponibilidad.ts` — `"documentos"` **ya no** está en
  `MODULOS_SIN_BACKEND` (salió con el plan 051). No hay nada que encender.
- Las cuatro claves `admin-*` de `disponibilidad.ts` — el panel admin sigue
  siendo **solo planes** en el backend (`plans/panel-admin/032–040`), sin ni un
  recurso JAX-RS. No las toques.
- La exportación de **presupuesto** y de **APUs**: siguen sin existir en el
  backend. No añadas botones para ellas.
- `src/lib/decimal.ts` y cualquier cálculo: este plan no muestra ni una cifra
  calculada.
- La cabecera `X-Cronograma-Desactualizado`: **deliberadamente ignorada.** El
  mismo dato llega ya en `warnings[]` del preflight con el código
  `cronograma-desactualizado`, así que leer la cabecera sería una segunda
  fuente para el mismo hecho. No la leas.
- `plans/BITACORA.md` y `plans/README.md` — los mantiene el orquestador.

## Git

- Rama: la que te haya dicho el orquestador. **Ya estás en su worktree**; no
  crees otro.
- Commits en estilo conventional, uno por rebanada o por unidad lógica.
  Ejemplo del repo: `fix: insignia %CI mentirosa y color de Equipo invisible (plan 065)`.
- **No fusiones, no hagas push, no abras PR, no toques `main`.**

## Pasos

### Rebanada 1 — el cuerpo de error de una descarga llega como `Blob`

Va primero porque las rebanadas 5–8 dependen de que el `409` conserve su
cuerpo. Es un defecto vivo en `main`, no una parte de la feature.

En `src/api/client.ts`, dentro del manejador de error del interceptor de
respuesta, **rehidrata el cuerpo antes de validarlo**:

```ts
    // Con `responseType: "blob"` —el helper `descargar()`— axios entrega
    // también el cuerpo de ERROR como Blob, así que `safeParse` fallaba
    // siempre y cualquier fallo de descarga se degradaba a `sin-respuesta`:
    // el 409 `export-bloqueado` del cronograma perdía sus `bloqueos[]`, que
    // son justo lo que el usuario necesita para desbloquear la exportación.
    let datos: unknown = error.response?.data;
    if (datos instanceof Blob) {
      try {
        datos = JSON.parse(await datos.text());
      } catch {
        datos = undefined;
      }
    }
    const cuerpo = errorPayloadSchema.safeParse(datos);
```

y pasa `cuerpo` al `new ApiError(...)` como ya se hace. El `try/catch` es
necesario: un `Blob` de bytes binarios (un PDF a medias, un proxy que devuelve
HTML) no es JSON, y ahí el fallback sintético es lo correcto.

Arréglalo **en el interceptor y en ningún otro sitio**: es el único punto por
el que pasan todos los llamantes, presentes y futuros.

**Test primero** (rojo antes de tocar `client.ts`), en
`src/test/api/client.test.ts`, un `describe` nuevo:

- Un handler MSW que responde `409` con
  `{codigo:"export-bloqueado", mensaje:"…", bloqueos:[…], warnings:[]}`;
  se pide con `descargar("/ruta")` (que fuerza `responseType: "blob"`); se
  espera un `ApiError` con `status === 409`, `slug === "export-bloqueado"` y
  **`problem.bloqueos` con la longitud del array que mandó el handler** — esto
  último es lo que prueba que `passthrough()` del `errorPayloadSchema` conserva
  el superconjunto.
- Un handler que responde `500` con un `Blob` que **no** es JSON (p. ej.
  `HttpResponse.arrayBuffer(new ArrayBuffer(8), { status: 500 })`): se espera
  `codigo === "sin-respuesta"`.

**Verifica**: `pnpm test -- client` → pasan, incluidos los 2 nuevos.

### Rebanada 2 — devolver `export-bloqueado` al catálogo de códigos

En `src/api/problem.ts`, añade `"export-bloqueado"` a `PROBLEM_TYPES` y
**corrige el comentario que dice que no existe**. El texto de hoy —«Se cayeron
del catálogo `insumo-en-uso`, `export-bloqueado` y `csv-invalido`: cero
apariciones en todo el backend»— era cierto en `c337950` y dejó de serlo en
`5673615`. Deja constancia de dónde vive ahora:

```
 * `export-bloqueado` volvió al catálogo en `5673615` (plan 031 del backend):
 * lo emite `CronogramaDocumentoResource.descargar` con el cuerpo tipado
 * `BloqueoExportDetalle`, un superconjunto de `ErrorPayload`. `insumo-en-uso` y
 * `csv-invalido` siguen sin existir.
```

Agrupa la entrada nueva bajo un comentario propio, como ya hace el archivo con
las demás capas (`// Excepciones propias del módulo cronograma…`).

**Verifica**: `pnpm run typecheck` → exit 0; `pnpm test -- problem` → pasan.

### Rebanada 3 — los DTO y su esquema

En `src/api/contract.ts`, **al final de la sección
`// ————— Cronograma (§11) —————`** (o en una sección nueva
`// ————— Documentos: exportación del cronograma (§11) —————` justo después),
transcribe los `record` de la sección «Estado actual». Forma exacta:

```ts
export type FormatoExportCronograma = "xlsx" | "pdf" | "mspdi";

export interface BloqueoExportResponse {
  codigo: string;
  actividadId: string | null;
  detalle: string;
}

export interface WarningExportResponse {
  codigo: string;
  detalle: string;
}

export interface CronogramaExportPreflightResponse {
  exportable: boolean;
  formato: FormatoExportCronograma;
  bloqueos: BloqueoExportResponse[];
  warnings: WarningExportResponse[];
}

export interface BloqueoExportDetalle {
  presupuestoId: string;
  formato: FormatoExportCronograma;
  codigo: "export-bloqueado";
  mensaje: string;
  bloqueos: BloqueoExportResponse[];
  warnings: WarningExportResponse[];
}
```

Escribe encima un comentario de bloque que diga: contra qué SHA del backend se
transcribió (`5673615`), que los cuatro records llevan `@JsonInclude(ALWAYS)` y
que por eso `actividadId` llega como `null` y no ausente, y que `codigo` es
`string` a propósito —no una unión cerrada— porque la UI muestra `detalle` y
un código nuevo del backend no debe romper el tipado.

**`codigo: string`, no una unión de los siete literales.** Cerrar la unión
obliga a tocar el contrato cada vez que el backend añada un bloqueo, y la UI no
ramifica por código.

En `src/api/schemas.ts`, añade el esquema del preflight —es el único DTO de
este plan que se valida en runtime, porque la UI desreferencia
`data.bloqueos.map(...)` y `data.warnings.map(...)` sin guarda, que es
exactamente la clase de fallo que documenta el archivo:

```ts
export const cronogramaExportPreflightSchema = z.object({
  exportable: z.boolean(),
  formato: z.enum(["xlsx", "pdf", "mspdi"]),
  bloqueos: z.array(
    z.object({ codigo: z.string(), actividadId: z.string().nullable(), detalle: z.string() }),
  ),
  warnings: z.array(z.object({ codigo: z.string(), detalle: z.string() })),
});
```

Los cinco campos son obligatorios porque el record los declara obligatorios y
`@JsonInclude(ALWAYS)` garantiza que viajan. No los relajes con `.optional()`.

**Verifica**: `pnpm run typecheck` → exit 0.

### Rebanada 4 — la clave de query

En `src/api/queryKeys.ts`, junto a `cronograma`:

```ts
  cronogramaExportPreflight: (presupuestoId: string, formato: string) =>
    ["presupuesto", presupuestoId, "export-cronograma", formato] as const,
```

El `formato` va **dentro** de la clave: el preflight de `mspdi` puede tener un
bloqueo (`mspdi-fecha-inicio-requerida`) que el de `xlsx` no tiene, así que
compartir clave entre formatos mostraría bloqueos ajenos.

**Verifica**: `pnpm run typecheck` → exit 0.

### Rebanada 5 — los mocks MSW, con las formas de verdad

Antes del hook, para que el test rojo del hook tenga contra qué correr.

En `src/test/fixtures/cronograma.ts` añade, tipadas contra los DTO de la
rebanada 3 (el tipo es la guarda: una fixture sin tipar es un mock inventado):

- `preflightExportableFixture: CronogramaExportPreflightResponse` — `exportable:
  true`, `formato: "xlsx"`, `bloqueos: []`, `warnings: []`.
- `preflightConWarningFixture` — `exportable: true`, un warning
  `{codigo:"cronograma-desactualizado", detalle:"El total o fingerprint del
  presupuesto cambió desde la última revisión explícita"}`.
- `preflightBloqueadoFixture` — `exportable: false` y **dos** bloqueos: uno sin
  actividad (`{codigo:"presupuesto-pu-cero", actividadId: null, detalle:"Existen
  rubros con precio unitario cero (P-32)"}`) y uno con actividad
  (`{codigo:"cronograma-desviacion", actividadId: "<UUIDv7>", detalle:"La
  actividad tiene desviación distinta de 0.0000"}`). Los dos casos importan:
  `actividadId` nulo y no nulo.

En `src/test/handlers.ts`, dentro del bloque `// ———— Exportar ————`, dos
handlers nuevos. **Estrictos**, no permisivos — el patrón nº 1 de
`docs/bugs.md` es «el mock era la especificación»:

1. `GET ${API}/documentos/cronograma/:id/preflight`:
   - lee `formato` de `new URL(request.url).searchParams`;
   - si es `null`, `""` o no está en `["xlsx","pdf","mspdi"]` →
     `problema(400, "validacion", ...)`. Un mock que acepta cualquier `formato`
     no prueba nada: el backend devuelve 400.
   - si el `:id` es el presupuesto «ajeno» (exporta una constante nueva desde
     `handlers.ts`, en el estilo de las que ya hay —`INSUMO_EN_USO`,
     `APU_REFERENCIADO`— con un UUIDv7 reconocible, p. ej.
     `PRESUPUESTO_AJENO = "018f8a60-0000-7000-8000-0000000000404"`) →
     `problema(404, "no-encontrado", ...)`.
   - si el `:id` es el presupuesto «bloqueado» (otra constante exportada,
     p. ej. `PRESUPUESTO_BLOQUEADO`) → `preflightBloqueadoFixture` con el
     `formato` pedido.
   - en cualquier otro caso → `preflightExportableFixture` con el `formato`
     pedido. **El campo `formato` de la respuesta debe reflejar el pedido**, como
     hace el backend (`formato.token()`), no quedarse fijo en `"xlsx"`.
2. `GET ${API}/documentos/cronograma/:id`:
   - las mismas validaciones de `formato` (400) y de presupuesto ajeno (404);
   - si el `:id` es `PRESUPUESTO_BLOQUEADO` → `409` con un cuerpo
     `BloqueoExportDetalle` completo (los seis campos, `codigo:
     "export-bloqueado"`, y los mismos `bloqueos` que devuelve su preflight) más
     la cabecera `X-Cronograma-Desactualizado: false`;
   - si no → `HttpResponse.arrayBuffer(...)` con el `Content-Type` y la
     extensión que le tocan a ese `formato` según la tabla de media types, y
     `Content-Disposition: attachment; filename="PROY-A-Edificio_Principal-v2.<ext>"`,
     más `X-Cronograma-Desactualizado: false`. **Ojo: `mspdi` → `.xml` y
     `application/xml`.**

**Verifica**: `pnpm run typecheck` → exit 0. `pnpm test` → sigue en verde (los
handlers nuevos todavía no los usa nadie).

### Rebanada 6 — el hook

En `src/features/exportar/hooks/useExportar.ts`:

```ts
export function usePreflightCronograma(presupuestoId: string, formato: FormatoExportCronograma) {
  return useQuery({
    queryKey: qk.cronogramaExportPreflight(presupuestoId, formato),
    queryFn: () =>
      getValidado(
        `/documentos/cronograma/${presupuestoId}/preflight`,
        cronogramaExportPreflightSchema,
        { formato },
      ),
    enabled: !!presupuestoId,
  });
}
```

`!!presupuestoId`, **nunca** `Number(presupuestoId) > 0` — patrón B.
`getValidado`, no `get<T>`: la UI desreferencia los dos arrays.

Y en `useExportar()`, junto a `descargarEspecificacionesTecnicas`, añade
`descargarCronograma(presupuestoId, formato)`, con la **misma** mecánica de
`<a download>` + `URL.revokeObjectURL` del hermano (no la reescribas de otra
forma; si te sale idéntica en más de tres líneas, extrae un helper local en el
mismo archivo y úsalo desde los dos):

- `await descargar(`/documentos/cronograma/${presupuestoId}`, { formato })`.
- Nombre de archivo: `nombreArchivo ?? `cronograma.${ext}``, donde `ext` es
  `formato === "mspdi" ? "xml" : formato`. Solo es el fallback: el nombre bueno
  lo manda el backend.
- `catch`: si el error es un `ApiError` (`import { ApiError } from "@/api/problem"`)
  **muestra su `problem.mensaje`**, que en el 409 es «Exportación bloqueada: N
  bloqueo(s)»; si no, el genérico «Error al descargar». Y cuando el status sea
  `409`, invalida la query del preflight de ese formato
  (`useQueryClient()` + `invalidateQueries({ queryKey: qk.cronogramaExportPreflight(presupuestoId, formato) })`):
  un 409 significa que el preflight que la pantalla está mostrando ya no vale.

**Test primero** (rojo), en
`src/test/features/exportar/hooks/useExportar.contrato.test.tsx` —dos
`describe` nuevos, imitando los que ya hay, con `espiar()`/`ultima()`:

Sobre `usePreflightCronograma`:
- pide `GET /api/v1/documentos/cronograma/<UUID>/preflight` y el
  `searchParams` es **exactamente** `["formato"]` con valor `"xlsx"` (un
  `formato` de más o de menos es un 400 del backend);
- con `presupuestoId` vacío no dispara nada (`fetchStatus === "idle"`,
  `peticiones` con longitud 0);
- cambiar de `formato` dispara una petición nueva con el `formato` nuevo (la
  clave de query lleva el formato: si no, este test sale rojo);
- un preflight con la forma equivocada (handler que devuelve `{}`) falla con
  `codigo === "respuesta-invalida"` — prueba que el esquema Zod está enganchado.

Sobre `descargarCronograma`:
- los tres formatos piden `/documentos/cronograma/<UUID>?formato=<f>` y **nada
  más** en la query;
- el nombre del archivo sale de `Content-Disposition` tal cual (usa un handler
  con `filename="PROY-A-Edificio_Principal-v3.xlsx"` y comprueba
  `clicks[0].download`);
- sin cabecera, `mspdi` cae a `cronograma.xml` (**no** `cronograma.mspdi`);
- contra `PRESUPUESTO_BLOQUEADO`, el `409` produce
  `toast.error` con el **mensaje del backend** y **no** fabrica ningún `<a>`
  (`clicks` con longitud 0). Este test es el que ata la rebanada 1: sin ella el
  mensaje sería el genérico.

**Verifica**: `pnpm test -- useExportar` → pasan, con los nuevos.

### Rebanada 7 — la pantalla

Invoca la skill `shadcn` antes de escribir JSX.

En `src/features/exportar/pages/ExportPage.tsx`, añade una `Card` «Cronograma
valorizado» **debajo** de la de «Documentos disponibles» (o una fila nueva
dentro de ella; elige lo que salga más corto sin apretar el diseño), con:

- Un selector de formato: `Select` de `@/components/ui/select` (ya está en el
  repo) con las tres opciones etiquetadas en español —p. ej. «Excel (.xlsx)»,
  «PDF (.pdf)», «MS Project (.xml)»— y `xlsx` por defecto. Un `label`
  asociado, en español, para que el test pueda consultarlo por rol accesible.
- `usePreflightCronograma(versionId, formato)` — `versionId` es el que la
  página ya saca de `useSearchParams().get("v")`.
- Los `bloqueos` del preflight, cuando `exportable === false`, en un
  `Alert variant="destructive"` con **el `detalle` de cada bloqueo** en una
  lista. No traduzcas códigos: el backend ya redacta el texto.
- Los `warnings`, cuando los haya, en un aviso **no** destructivo (usa el token
  de estado `--advertencia`, no un color crudo de Tailwind). Un warning **no**
  impide descargar.
- Un botón «Descargar cronograma» que llama a
  `descargarCronograma(versionId, formato)`, `disabled` mientras el preflight
  carga o cuando `exportable === false`, con el mismo patrón de spinner
  (`Loader2`) y estado local `descargando` que ya usa el botón del DOCX.

Y **corrige el párrafo que miente**. El texto nuevo tiene que decir la verdad
de `5673615`: el cronograma ya se exporta; lo que sigue sin existir en el
servidor es la exportación del presupuesto y de los APUs. Algo como:

```tsx
            <p className="text-sm text-muted-foreground border-t pt-4">
              La exportación del presupuesto y de los APUs todavía no existe en el servidor.
            </p>
```

**Test** en `src/test/features/exportar/pages/ExportPage.test.tsx`:
- ofrece el cronograma con los tres formatos y un botón propio;
- con un preflight bloqueado, muestra el `detalle` de **los dos** bloqueos de
  la fixture y el botón del cronograma está `disabled`;
- con un preflight con warning, el aviso sale **y** el botón sigue habilitado
  (un warning no bloquea: si este test no existe, el bug de tratar un warning
  como bloqueo no lo caza nadie);
- al pulsar el botón sale la petición a `/documentos/cronograma/<id>` (con
  `espiar()`/`ultima()`);
- **actualiza las dos aserciones caducadas** citadas en «Estado actual»: el
  conteo de botones «Descargar» y el `queryByText(/^Cronograma$/)`. Que la
  aserción nueva siga afirmando lo que sí es cierto —que **presupuesto** y
  **APUs** no se ofrecen—, no la borres sin sustituirla.

**Verifica**: `pnpm test -- ExportPage` → pasan. `pnpm run lint` → exit 0.

### Rebanada 8 — la puerta completa

```bash
pnpm run verify
```

Exit 0. Si `format:check` sale rojo, `pnpm run format` y vuelve a pasarla — el
repo usa `printWidth: 100` y ya hubo un commit rojo por escribir a 80 columnas.

### Rebanada 9 — la captura E2E

En `e2e/screenshots.spec.ts`, en el test `11-documentos`:

- añade una ruta para el preflight. **Con `*` al final del patrón**, porque
  lleva `?formato=xlsx`:
  ```ts
  await page.route(`${API}/documentos/cronograma/${PRESUPUESTO_V2}/preflight*`, (route) =>
    route.fulfill(json({ exportable: true, formato: "xlsx", bloqueos: [], warnings: [] })),
  );
  ```
  Sin esto la tarjeta nueva sale en la captura en estado de carga o de error, y
  `capturar()` no lo detecta si no hay error boundary.
- añade una ruta para `/presupuestos/${PRESUPUESTO_V2}/validacion` si el test
  todavía no la tiene (hoy no la tiene): la página ya la pedía y la petición se
  iba sin mock.
- **añade una aserción antes de `capturar(...)`** de que la tarjeta del
  cronograma y su botón están en la página. Es la contramedida del patrón D de
  `docs/bugs.md`: una captura sin aserción fotografía una pantalla caída sin
  quejarse.

Recuerda que **`verify` no comprueba tipos en `e2e/`**: los errores de este
archivo no salen hasta correr Playwright. Y si Playwright sigue viendo la
pantalla vieja, mata el dev server (`playwright.config.ts` usa
`reuseExistingServer`).

**Verifica**: `pnpm run e2e` → 20 tests en verde. Y **mira la captura**
`11-documentos` que se genera: la tarjeta del cronograma tiene que verse
completa, con su selector y su botón.

### Rebanada 10 — el número del baseline

Cuenta los tests finales y actualiza la línea de [`AGENTS.md`](../AGENTS.md):

```
Baseline actual: **461 tests unitarios en 74 archivos**, `pnpm run e2e` en verde.
```

con las cifras que te dé `pnpm run verify`. El propio archivo explica por qué:
«un baseline que miente no detecta nada».

**Verifica**: `pnpm run format:check` → exit 0.

## Plan de test — resumen

| Archivo | Casos nuevos |
|---|---|
| `src/test/api/client.test.ts` | 409 con cuerpo JSON en `Blob` → `ApiError` conserva `codigo` y `bloqueos` · `Blob` no-JSON → `sin-respuesta` |
| `src/test/features/exportar/hooks/useExportar.contrato.test.tsx` | ruta y query del preflight (`formato` y nada más) · guarda `enabled` con id vacío · cambiar de formato refetchea · respuesta con forma mala → `respuesta-invalida` · las tres descargas y su query · filename de `Content-Disposition` · fallback `.xml` para `mspdi` · 409 → toast con el mensaje del backend y cero `<a>` |
| `src/test/features/exportar/pages/ExportPage.test.tsx` | tres formatos y botón propio · preflight bloqueado muestra los dos `detalle` y deshabilita · warning avisa **sin** deshabilitar · el click dispara la petición · las dos aserciones caducadas, actualizadas |
| `e2e/screenshots.spec.ts` | `11-documentos` mockea preflight y validación, y **asierta** la tarjeta antes de capturar |

Patrón estructural a imitar: `src/test/features/exportar/hooks/useExportar.contrato.test.tsx`
tal como está hoy (usa `espiar()`, `ultima()`, y espía
`HTMLAnchorElement.prototype.click` + `URL.createObjectURL` porque jsdom no
implementa descargas).

## Definición de hecho

Comprobable por máquina. **Todo** tiene que cumplirse:

- [ ] `pnpm run verify` exit 0.
- [ ] `pnpm run e2e` en verde (20 tests) y la captura `11-documentos`
      regenerada **y mirada**.
- [ ] `grep -n "export-bloqueado" src/api/problem.ts` casa dentro de
      `PROBLEM_TYPES`.
- [ ] `grep -rn "documentos/cronograma" src/api src/features src/test e2e`
      casa en: el hook, los dos handlers MSW, los tests del hook y el spec E2E.
- [ ] `grep -n "instanceof Blob" src/api/client.ts` casa una vez.
- [ ] `grep -rn "todavía no existe en el servidor" src/features/exportar/`
      **no** menciona el cronograma.
- [ ] `grep -rn "cronograma-avance-final\|\.mspdi\"" src/ e2e/` → sin
      resultados (el código fantasma no se transcribe; la extensión de MSPDI es
      `.xml`).
- [ ] `grep -rn "as never\|as unknown as" src/api src/features/exportar` → sin
      resultados nuevos.
- [ ] `pnpm run guard:adr9` exit 0 (va dentro de `verify`, pero confírmalo).
- [ ] Ningún archivo fuera de la lista «En alcance» modificado
      (`git status --short`).
- [ ] El número del baseline de `AGENTS.md` coincide con la salida real de
      `verify`.
- [ ] Commits conventional en tu rama; **`main` intacto**, sin push, sin PR.

## Condiciones de parada

Para y reporta, sin improvisar, si:

- El baseline al arrancar no es `verify` exit 0 con **461 tests en 74
  archivos**, o tu rama no sale de `eb004d1`. Un baseline que no coincide invalida
  todo lo que midas después.
- El código en «Estado actual» no coincide con lo que hay en el repo (deriva
  desde `eb004d1`).
- La verificación de una rebanada falla dos veces después de un intento
  razonable de arreglo.
- El arreglo parece exigir tocar un archivo **fuera de alcance** — en especial
  `src/api/request.ts` o `src/lib/disponibilidad.ts`.
- Descubres que **la forma real que sirve el backend no coincide** con los
  `record` transcritos en «Estado actual». Gana el código del backend; se lee
  con `git show origin/main:<path>` en `../thesis-back-quarkus` (**nunca hagas
  checkout ahí**: su working tree está en la rama `test/stuff`, que no está
  mergeada). Si discrepa, **para**: hay que reescribir el plan, no adivinar.
- Te encuentras necesitando aritmética de dinero o porcentajes en el cliente
  para que la pantalla «quede bien». Está prohibido (ADR 9) y es la regresión
  bienintencionada más probable de este repositorio.
- El preflight y la descarga te obligan a introducir un tercer estado de
  bloqueo que no está en la tabla de códigos de «Estado actual».

## Notas de mantenimiento

- **Lo que un revisor tiene que mirar con lupa**: (1) que los handlers MSW
  nuevos **rechacen** un `formato` desconocido y un presupuesto ajeno, y no
  acepten cualquier cosa — un handler permisivo es un test que no prueba nada;
  (2) que el test del `409` afirme el **mensaje del backend**, no un genérico;
  (3) que los `warnings` no deshabiliten el botón.
- **Deferido a propósito**: la exportación de presupuesto y de APUs (P-37 las
  contempla, el backend no las sirve todavía) y la cabecera
  `X-Cronograma-Desactualizado` (redundante con `warnings[]`).
- **Cuando el backend añada un bloqueo nuevo**, esta UI no necesita cambios: se
  muestra `detalle`, que el servidor redacta. Si algún día hace falta ramificar
  por `codigo`, ese es el momento de cerrar la unión de tipos, no antes.
- **El javadoc de `BloqueoExportResponse` documenta `cronograma-avance-final`,
  que ningún camino emite.** Está reportado al backend. Si aparece de verdad,
  llegará por `detalle` sin romper nada.
