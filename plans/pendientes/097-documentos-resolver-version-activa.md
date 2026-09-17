# Plan 097: La página de Documentos descarga con un id vacío y siempre da 404

> **Instrucciones para quien ejecute**: sigue este plan paso a paso. Corre cada
> comando de verificación y confirma el resultado esperado antes de avanzar al
> siguiente paso. Si ocurre algo listado en "Condiciones STOP", detente y
> repórtalo — no improvises. Al terminar, actualiza la fila de este plan en
> [`../00.INDEX.md`](../00.INDEX.md), salvo que quien te despache te diga que
> él mantiene el índice.
>
> **Comprobación de deriva (ejecutar primero)**:
> `git diff --stat d0094f3..HEAD -- src/features/exportar/ src/shell/contexto.ts src/test/features/exportar/`
> Si alguno de estos archivos cambió desde que se escribió este plan, compara
> los fragmentos de "Estado actual" contra el código real antes de continuar;
> si no coinciden, trátalo como condición STOP.

## Estado

- **Prioridad**: P0 — la funcionalidad principal de la ruta no funciona nunca
- **Esfuerzo**: S
- **Riesgo**: LOW — sustituye una fuente de id por la que ya usan las otras
  seis páginas del proyecto. No toca el contrato HTTP, ni la generación de
  documentos, ni el preflight.
- **Depende de**: ninguno
- **Categoría**: bug (correctness)
- **Planificado en**: commit `d0094f3`, 2026-09-16

## Por qué importa

En `http://localhost:5173/proyectos/{uuid}/documentos`, los dos botones de
descarga fallan siempre con 404. Lo que sale por la consola del navegador:

```
GET http://localhost:8080/api/v1/documentos/especificaciones-tecnicas/ 404 (Not Found)
GET http://localhost:8080/api/v1/documentos/cronograma/?formato=xlsx      404 (Not Found)
```

Fíjate en la URL: **el segmento del `presupuestoId` está vacío**. No es que el
endpoint no exista — existe y está implementado en el backend
(`DocumentoResource.exportarEspecificacionesTecnicas` y
`CronogramaDocumentoResource`, ambos en `origin/main` de
`../thesis-back-quarkus`). Lo que pasa es que el frontend construye
`/documentos/especificaciones-tecnicas/${presupuestoId}` con `presupuestoId`
igual a la cadena vacía, y el resultado es una ruta que el backend no mapea.

La causa es que `ExportPage` es **la única página del proyecto** que saca el id
del presupuesto leyendo a mano el parámetro `?v=` de la URL, en vez de usar el
hook compartido `useVersionActiva()`. Cuando el usuario llega a `/documentos`
desde el sidebar, la URL no lleva `?v=` — nadie lo pone — así que
`searchParams.get("v")` devuelve `null`, el `?? ""` lo convierte en cadena
vacía, y todo aguas abajo se rompe en silencio:

- `useValidacionExport` y `usePreflightCronograma` tienen `enabled: !!versionId`,
  así que **no se lanzan**: `validacion` y `preflight` quedan `undefined`.
- La guarda del botón de especificaciones técnicas es
  `disabled={descargando || (!validacion?.exportable && validacion !== undefined)}`.
  Con `validacion === undefined` esa expresión es `false`, o sea **el botón
  queda habilitado**. Igual el del cronograma, cuya guarda
  `preflight?.exportable === false` también es `false` con `preflight`
  `undefined`.
- Se hace clic, se pide la descarga con id vacío, y llega el 404.

El spec funcional lo dice explícitamente. `../thesis-docs`,
`plan/design/02-pantallas-flujos.md`, fila **S-35**:

> | S-35 | Exportar documentos | Página | `/proyectos/:id/documentos` | N | Selección
> de entregable … + **versión (default vigente)**; checklist de validaciones
> bloqueantes …

"default vigente" es exactamente lo que `useVersionActiva()` ya implementa.

**Por qué la suite está verde con esto roto.** Es el patrón nº 1 de
[`docs/bugs.md`](../../docs/bugs.md): *el mock era la especificación*. El test
`src/test/features/exportar/pages/ExportPage.test.tsx` monta la página con la
URL `?v=${PRESUPUESTO}` puesta a mano, así que prueba la única situación en la
que el código funciona y nunca la que ocurre en producción. No borres ese test:
hay que añadirle el caso que falta.

## Estado actual

### `src/features/exportar/pages/ExportPage.tsx` (líneas 56–79)

```tsx
export function ExportPage() {
  const [searchParams] = useSearchParams();
  const versionId = searchParams.get("v") ?? "";

  const { data: validacion, isLoading: valLoading } = useValidacionExport(versionId);
  const { descargarEspecificacionesTecnicas, descargarCronograma } = useExportar();
  const [descargando, setDescargando] = useState(false);

  const [formato, setFormato] = useState<FormatoExportCronograma>("xlsx");
  const { data: preflight, isLoading: preflightLoading } = usePreflightCronograma(
    versionId,
    formato,
  );
  const [descargandoCronograma, setDescargandoCronograma] = useState(false);

  const handleExport = async () => {
    setDescargando(true);
    await descargarEspecificacionesTecnicas(versionId);
    setDescargando(false);
  };

  const handleExportCronograma = async () => {
    setDescargandoCronograma(true);
    await descargarCronograma(versionId, formato);
    setDescargandoCronograma(false);
  };
```

Los dos botones, más abajo en el mismo archivo:

```tsx
            <Button
              size="sm"
              onClick={handleExport}
              disabled={descargando || (!validacion?.exportable && validacion !== undefined)}
            >
```

```tsx
            <Button
              size="sm"
              onClick={handleExportCronograma}
              disabled={
                descargandoCronograma || preflightLoading || preflight?.exportable === false
              }
            >
```

### El hook compartido que hay que usar — `src/shell/contexto.ts`

Ya existe y ya resuelve exactamente esto. **No lo modifiques**:

```ts
export function useVersionActiva() {
  const proyectoId = useProyectoActivoId();
  const [params, setParams] = useSearchParams();
  const { data: versiones, isPending } = useVersiones(proyectoId ?? "");

  const pedida = params.get("v");
  const encontrada = versiones?.find((x) => x.presupuestoId === pedida);
  const vigente = versiones?.find((x) => x.esVigente) ?? versiones?.[0] ?? null;
  const activa = encontrada ?? vigente;
  // …
  return {
    versiones: versiones ?? [],
    activa,
    presupuestoId: activa?.presupuestoId ?? null,
    cambiar,
    isPending,
  };
}
```

Es decir: si la URL trae `?v=` y apunta a una versión real, esa gana; si no,
gana la vigente; si no hay vigente, la primera. Justo el "default vigente" de
S-35.

### Ejemplar a imitar — `src/features/presupuesto/pages/PresupuestoPage.tsx`

```tsx
import { useVersionActiva } from "@/shell/contexto";
// …
  const { presupuestoId } = useVersionActiva();
```

Las otras cinco páginas que lo usan igual: `CronogramaPage.tsx`,
`ListaApusPage.tsx`, `EditorApuPage.tsx`, `ResumenProyectoPage.tsx`,
`WorkspacePage.tsx`.

## Qué hay que hacer

### Paso 1 — `ExportPage` resuelve la versión con `useVersionActiva()`

En `src/features/exportar/pages/ExportPage.tsx`:

1. Añade `import { useVersionActiva } from "@/shell/contexto";` y **elimina** el
   import de `useSearchParams` de `react-router-dom`. En este archivo
   `react-router-dom` no aporta nada más, así que la línea entera desaparece; si
   la dejas, `lint` falla por import sin usar.
2. Reemplaza las dos primeras líneas del cuerpo de `ExportPage` por:

```tsx
  const { presupuestoId, activa, isPending: versionPendiente } = useVersionActiva();
  const versionId = presupuestoId ?? "";
```

3. Deja el resto del cableado igual: `versionId` sigue alimentando
   `useValidacionExport`, `usePreflightCronograma`, `descargarEspecificacionesTecnicas`
   y `descargarCronograma`.

Verificación:

```bash
pnpm run typecheck
```

Esperado: sin errores.

### Paso 2 — Ningún botón habilitado sin versión

Sigue siendo posible que `presupuestoId` sea `null`: un proyecto recién creado
sin versiones, o mientras `useVersiones` aún está en vuelo. Hoy los botones se
habilitarían igual y volverían a pedir con id vacío. Añade la guarda.

1. Declara una constante después de las queries:

```tsx
  const sinVersion = !versionId;
```

2. Añade `sinVersion` a las dos expresiones `disabled`:

```tsx
              disabled={
                sinVersion || descargando || (!validacion?.exportable && validacion !== undefined)
              }
```

```tsx
              disabled={
                sinVersion ||
                descargandoCronograma ||
                preflightLoading ||
                preflight?.exportable === false
              }
```

3. Cuando no hay versión y la lista ya terminó de cargar, dilo en pantalla en
   vez de dejar dos botones muertos sin explicación. Justo debajo del
   `EncabezadoPagina`, antes del bloque `{valLoading && …}`:

```tsx
      {!versionPendiente && sinVersion && (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertTitle>Sin versión de presupuesto</AlertTitle>
          <AlertDescription>
            Este proyecto todavía no tiene ninguna versión de presupuesto, así que no hay nada que
            exportar.
          </AlertDescription>
        </Alert>
      )}
```

`Alert`, `AlertTitle`, `AlertDescription` y `AlertTriangle` **ya están
importados** en el archivo. No añadas imports nuevos para esto.

Verificación:

```bash
pnpm run typecheck && pnpm run lint
```

Esperado: sin errores ni warnings.

### Paso 3 — Mostrar qué versión se está exportando

El usuario tiene que poder ver cuál de las versiones va a descargar, ahora que
ya no lo decide la URL. Cambia el `EncabezadoPagina`:

```tsx
      <EncabezadoPagina
        titulo="Exportar"
        descripcion={
          activa
            ? `Descargue documentos de la versión ${activa.version}${
                activa.esVigente ? " (vigente)" : ""
              }`
            : "Descargue documentos del presupuesto"
        }
      />
```

El selector de versión del shell (`src/shell/SelectorVersion.tsx`, en la topbar)
ya permite cambiarla y escribe `?v=` en la URL, que `useVersionActiva()` respeta.
**No añadas otro selector dentro de la página**: sería una segunda fuente de
verdad para lo mismo.

Verificación:

```bash
pnpm run typecheck
```

### Paso 4 — El test que faltaba

En `src/test/features/exportar/pages/ExportPage.test.tsx`. El `setup()` actual
monta la página con `?v=` puesto a mano:

```tsx
  const result = renderConProviders(
    <Routes>
      <Route path="/proyectos/:id/documentos" element={<ExportPage />} />
    </Routes>,
    {
      ruta: `/proyectos/01927f4e-1a2b-7c3d-8e4f-000000000001/documentos?v=${PRESUPUESTO}`,
    },
  );
```

**No cambies ese `setup()`** — los tests que ya existen dependen de él. Añade al
final del `describe("ExportPage", …)` un caso nuevo que monte la página **sin**
`?v=` (que es cómo se llega desde el sidebar) y compruebe que la descarga se
pide con el id de la versión vigente, no con vacío.

Para escribirlo necesitas dos datos que **debes leer, no inventar**:

- qué devuelve el handler MSW del listado de versiones para ese proyecto —
  búscalo en `src/test/handlers.ts` y en `src/test/fixtures/presupuesto.ts`;
- el `presupuestoId` de la versión marcada `esVigente: true` en esa fixture.

El patrón para capturar la URL pedida es `espiar` / `ultima`, ya importado en
ese archivo desde `@/test/espia`. Mira cómo lo usan los tests existentes del
mismo fichero y síguelo.

La prueba, en esquema:

```tsx
  it("descarga con el presupuesto de la versión vigente cuando la URL no trae ?v=", async () => {
    // monta con ruta `/proyectos/<id>/documentos` (SIN ?v=)
    // clic en "Descargar"
    // la URL pedida termina en `/documentos/especificaciones-tecnicas/<id de la vigente>`
    // y NO en `/documentos/especificaciones-tecnicas/`
  });
```

Es el único test nuevo que pide este plan. Es un test de contrato de verdad
—método y ruta de una llamada que hoy sale mal—, no una batería sobre un cambio
presentacional, así que entra dentro de la política de
[`AGENTS.md`](../../AGENTS.md) §"Política de implementación y pruebas".

Escríbelo **antes** del paso 1 si puedes: debe fallar con la URL terminada en
`/especificaciones-tecnicas/` (sin id). Eso es haber reproducido el bug.

Verificación:

```bash
pnpm exec vitest run src/test/features/exportar
```

Esperado: todos los tests del directorio en verde, incluido el nuevo.

## Condiciones STOP

Detente y reporta, sin improvisar, si:

- `useVersionActiva()` **no** devuelve `presupuestoId` con la forma descrita
  arriba: el contrato del hook cambió y el plan está desactualizado.
- El handler MSW de versiones de `src/test/handlers.ts` no devuelve ninguna
  versión con `esVigente: true` para el proyecto que usa el test. El paso 4 no
  se puede escribir honestamente sin eso, y cambiar la fixture es una decisión
  que hay que consultar.
- Con el id ya arreglado, la descarga real contra `localhost:8080` devuelve algo
  distinto de 200 o del 409 `export-bloqueado` documentado — por ejemplo 500.
  Eso sería un defecto de backend y **no** es el objeto de este plan.
- `pnpm run verify` estaba rojo **antes** de tus cambios. Regístralo y reporta;
  no lo arregles dentro de este plan.

## Fuera de alcance

No toques, en este plan:

- `src/features/exportar/hooks/useExportar.ts` — construye bien las URLs; el
  problema era el argumento que recibía.
- `src/api/request.ts`, `src/api/schemas.ts`, `src/api/contract.ts`.
- `src/shell/contexto.ts` y `src/shell/SelectorVersion.tsx`.
- El backend `../thesis-back-quarkus`.
- El aviso "La exportación del presupuesto y de los APUs todavía no existe en el
  servidor" — sigue siendo cierto, no hay endpoint para esos dos entregables.
  No lo borres ni lo conviertas en botones apagados.

## Criterios de terminado (comprobables por máquina)

```bash
pnpm run typecheck        # sin errores
pnpm run lint             # sin errores
pnpm run format:check     # sin diferencias
pnpm exec vitest run src/test/features/exportar   # verde, con el test nuevo
pnpm run verify           # verde de punta a punta
```

Y un `grep` que debe salir vacío:

```bash
grep -n 'searchParams.get("v")' src/features/exportar/pages/ExportPage.tsx
```

Esperado: sin coincidencias.

## Verificación manual

Con el backend en `localhost:8080` y `pnpm run dev`:

1. Entra con `john.doe@uce.edu.ec` / `Clave1234`.
2. Abre un proyecto y ve a **Documentos** desde el sidebar (sin tocar la URL).
3. La descripción del encabezado debe nombrar la versión vigente.
4. Pulsa **Descargar**: en la pestaña Red del navegador la petición debe ser
   `GET /api/v1/documentos/especificaciones-tecnicas/<uuid>` — con uuid, no
   vacío — y responder 200 con `Content-Disposition`.
5. Pulsa **Descargar cronograma** con formato `xlsx`: la petición debe ser
   `GET /api/v1/documentos/cronograma/<uuid>?formato=xlsx` y responder 200, o
   409 `export-bloqueado` si el preflight ya avisaba de bloqueos.

Si el navegador sigue mostrando el comportamiento viejo, reinicia el dev server:
`playwright.config.ts` usa `reuseExistingServer`, así que un `vite` levantado de
antes sirve el bundle obsoleto y produce diagnósticos falsos.

## Nota de mantenimiento

`ExportPage` era el último consumidor de `?v=` leído a mano. A partir de aquí la
regla es: **el id de presupuesto sale siempre de `useVersionActiva()`**. Si en
una revisión futura aparece `searchParams.get("v")` fuera de
`src/shell/contexto.ts`, es este mismo bug volviendo.

Cuidado también con el patrón de guarda `!x?.campo && x !== undefined`: es la
forma exacta en que este defecto se escondió. Con la query deshabilitada `x` es
`undefined` y la guarda se evalúa a "habilitado". Cuando una query está
deshabilitada por falta de un id, lo que tiene que bloquear el botón es **la
ausencia del id**, no el resultado de la query.
