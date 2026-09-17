# Plan 098: El botón "Comparar" de Versiones no compara nada

> **Instrucciones para quien ejecute**: sigue este plan paso a paso. Corre cada
> comando de verificación y confirma el resultado esperado antes de avanzar al
> siguiente paso. Si ocurre algo listado en "Condiciones STOP", detente y
> repórtalo — no improvises. Al terminar, actualiza la fila de este plan en
> [`../00.INDEX.md`](../00.INDEX.md), salvo que quien te despache te diga que
> él mantiene el índice.
>
> **Comprobación de deriva (ejecutar primero)**:
> `git diff --stat d0094f3..HEAD -- src/features/presupuesto/pages/VersionesPage.tsx src/features/presupuesto/components/ComparadorVersiones.tsx src/features/presupuesto/hooks/usePresupuesto.ts`
> Si alguno de estos archivos cambió desde que se escribió este plan, compara
> los fragmentos de "Estado actual" contra el código real antes de continuar;
> si no coinciden, trátalo como condición STOP.

## Estado

- **Prioridad**: P1
- **Esfuerzo**: M
- **Riesgo**: LOW-MEDIUM — reorganiza una pantalla y mete la comparación en un
  diálogo. No cambia el contrato HTTP ni ninguna mutación; lo único destructivo
  de la página (eliminar versión) queda intacto.
- **Depende de**: ninguno
- **Categoría**: bug (funcionalidad ausente en la práctica)
- **Planificado en**: commit `d0094f3`, 2026-09-16

## Por qué importa

En `/proyectos/{uuid}/versiones`, la columna **Acciones** de cada fila tiene un
botón **Comparar**. Al pulsarlo no ocurre nada visible: ni diálogo, ni tabla,
ni error, ni aviso. En un proyecto con una sola versión —el caso más común— no
puede ocurrir nada nunca.

Hay **tres** defectos encadenados, y conviene entenderlos los tres antes de
tocar código:

**1. Se compara siempre contra la vigente, incluida la vigente consigo misma.**
`VersionesPage` fija el lado A de la comparación en la versión vigente y usa la
fila pulsada como lado B:

```tsx
  const vigente = versiones?.find((v) => v.esVigente);
  const { data: comparacion, isLoading: compLoading } = useComparacion(
    vigente?.presupuestoId ?? "",
    compararId ?? undefined,
  );
```

El botón **Comparar** existe en **todas** las filas, incluida la de la versión
vigente. Al pulsarlo ahí, `presupuestoId` y `con` son el mismo UUID, y el
backend lo rechaza explícitamente. `VersionadoService.comparar`, en
`../thesis-back-quarkus`:

```java
        if (presupuestoPath.equals(presupuestoCon)) {
            throw ProblemaException.validacion("No se puede comparar una versión consigo misma");
        }
```

Es un 400 `validacion`. Con una sola versión en el proyecto, esa versión **es**
la vigente, así que el único botón Comparar disponible produce siempre ese 400.

**2. El error no se enseña.** `useComparacion` es un `useQuery` y nadie mira su
`isError`. El 400 se queda dentro de TanStack Query y muere ahí. Pantalla
inmóvil.

**3. Cuando sí funciona, el resultado es casi invisible.** `ComparadorVersiones`
se renderiza suelto, después de `</TarjetaTabla>`, sin encabezado, sin
contenedor, sin scroll automático y sin nada que lo relacione con el clic que lo
provocó. Además tiene una guarda muerta:

```tsx
  if (!data || data.versiones.length < 2) return null;
```

El backend devuelve **siempre exactamente dos** elementos cuando responde 200
(`new ComparacionVersionesResponse(List.of(construirItem(a), construirItem(b)))`),
así que `length < 2` sólo se cumple cuando no hay datos — es decir, esa guarda
sólo sirve para no pintar nada, nunca para avisar de nada.

El spec funcional da por buena la comparación entre dos versiones cualesquiera.
`../thesis-docs`, `plan/design/02-pantallas-flujos.md`:

> **P-31** Versiones de presupuesto: crear (deep copy), marcar vigente,
> **comparar totales**, notas

y el flujo **F-06**:

> … el selector de versión (S-43) cambia a la nueva → ajustar … → S-31
> **comparar totales** → "marcar vigente" → S-35 exporta la vigente por defecto.

## Estado actual

### `src/features/presupuesto/pages/VersionesPage.tsx`

Estado y query (líneas 31–38):

```tsx
  const [compararId, setCompararId] = useState<string | null>(null);
  const [versionAEliminar, setVersionAEliminar] = useState<string | null>(null);

  const vigente = versiones?.find((v) => v.esVigente);
  const { data: comparacion, isLoading: compLoading } = useComparacion(
    vigente?.presupuestoId ?? "",
    compararId ?? undefined,
  );
```

Botón en la fila:

```tsx
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCompararId(v.presupuestoId)}
                      >
                        Comparar
                      </Button>
```

Render del resultado, suelto después de la tabla:

```tsx
      <ComparadorVersiones data={comparacion} isLoading={compLoading} />
```

### `src/features/presupuesto/hooks/usePresupuesto.ts` (líneas 46–55)

```ts
export function useComparacion(presupuestoId: string, conPresupuestoId?: string) {
  return useQuery({
    queryKey: [...qk.presupuesto(presupuestoId), "comparar", conPresupuestoId] as const,
    queryFn: () =>
      getValidado(`/presupuestos/${presupuestoId}/comparar`, comparacionVersionesSchema, {
        con: conPresupuestoId,
      }),
    enabled: !!presupuestoId && !!conPresupuestoId,
  });
}
```

Este hook está bien: ruta, método y parámetro coinciden con
`ComparacionResource.comparar` del backend. **No lo modifiques.**

### `src/features/presupuesto/components/ComparadorVersiones.tsx`

Renderiza la comparación (totales lado a lado + capítulos raíz con flechas de
sentido) y respeta ADR 9: no resta dinero en el cliente, sólo compara el
sentido con `compararDecimal`. La parte de presentación es correcta y se
reutiliza tal cual. Lo único que cambia es **dónde** se monta y qué se enseña
cuando no hay nada que enseñar.

### Tipos que vas a usar

`src/api/contract.ts`:

```ts
export interface PresupuestoVersionResponse {
  presupuestoId: string;
  version: number;
  esVigente: boolean;
  origenId?: string | null;
  notas?: string;
  fechaCreacion: string;
  totalGeneral: Decimal;
}
```

### Ejemplar de diálogo a imitar

`src/features/presupuesto/components/DialogoNuevaVersion.tsx` — misma carpeta,
mismo dominio, ya usa `Dialog` + `Select` de shadcn con `aria-label` en el
`SelectTrigger` y etiquetas en español. Cópiale la estructura.

## Qué hay que hacer

### Paso 1 — Un diálogo `DialogoCompararVersiones`

Crea `src/features/presupuesto/components/DialogoCompararVersiones.tsx`.

Props:

```tsx
interface DialogoCompararVersionesProps {
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
  versiones: PresupuestoVersionResponse[];
  /** Versión sobre cuya fila se pulsó "Comparar"; es el lado A por defecto. */
  versionInicialId: string | null;
}
```

Comportamiento:

- Dos `Select`, **Versión A** y **Versión B**, poblados con `versiones` y
  etiquetados como en `DialogoNuevaVersion`:
  `v{v.version} {v.esVigente ? "(vigente)" : ""} — {fecha}`.
- Estado local `ladoA` / `ladoB`. Al abrirse:
  - `ladoA` = `versionInicialId`;
  - `ladoB` = la vigente si es distinta de `versionInicialId`; si no, la primera
    versión de la lista que sea distinta de `versionInicialId`; si no hay
    ninguna, `""`.
  - Reinicia ese estado cada vez que `abierto` pasa a `true` o cambia
    `versionInicialId` (un `useEffect` con esas dos dependencias, o resetea con
    un `key` desde el padre — elige uno y sé consistente).
- **La misma versión en los dos lados es un estado inválido del formulario, no
  una petición.** Si `ladoA === ladoB`, no lances la query: enseña en el propio
  diálogo el texto «Elige dos versiones distintas para compararlas.» El hook se
  llama igual, pero pasando `undefined` como segundo argumento cuando son
  iguales, para que `enabled` lo deje en reposo:

```tsx
  const distintas = !!ladoA && !!ladoB && ladoA !== ladoB;
  const { data, isLoading, isError, error } = useComparacion(
    distintas ? ladoA : "",
    distintas ? ladoB : undefined,
  );
```

  Así nunca se manda el 400 «consigo misma»: el cliente ya sabe que es inválido.
- Dentro del diálogo, debajo de los dos selectores, monta
  `<ComparadorVersiones data={data} isLoading={isLoading} />`.
- Si `isError`, enseña el mensaje del backend en un `Alert variant="destructive"`.
  Para sacar el texto usa el mismo criterio que `src/lib/manejoErrores.ts`:
  `error instanceof ApiError ? error.problem.mensaje : "No se pudo comparar las versiones"`.
  Importa `ApiError` de `@/api/problem`. **No uses un `toast` aquí**: el error
  pertenece al contenido del diálogo, y un toast se pierde detrás del overlay.
- `DialogContent` con `className="sm:max-w-2xl"`: la comparación es ancha.

Verificación:

```bash
pnpm run typecheck
```

### Paso 2 — El caso "sólo hay una versión"

Con una sola versión no hay nada que comparar, y el usuario tiene que
enterarse. La regla que pidió el usuario: **debe salir una notificación que lo
diga**.

En `VersionesPage`, el handler del botón:

```tsx
  const handleComparar = useCallback(
    (versionId: string) => {
      if ((versiones?.length ?? 0) < 2) {
        toast.info("Este proyecto sólo tiene una versión: no hay con qué compararla.");
        return;
      }
      setCompararId(versionId);
      setCompararAbierto(true);
    },
    [versiones],
  );
```

`toast` viene de `sonner`, que ya es la librería de avisos del repo
(`src/lib/manejoErrores.ts` la usa). Añade el import.

Verificación:

```bash
pnpm run typecheck && pnpm run lint
```

### Paso 3 — Cablear la página

En `src/features/presupuesto/pages/VersionesPage.tsx`:

1. **Borra** la query suelta y la variable `vigente` si deja de usarse:

```tsx
  const vigente = versiones?.find((v) => v.esVigente);
  const { data: comparacion, isLoading: compLoading } = useComparacion(
    vigente?.presupuestoId ?? "",
    compararId ?? undefined,
  );
```

   La query ahora vive dentro del diálogo. Quita también el import de
   `useComparacion` y el de `ComparadorVersiones` de esta página si ya no se
   usan — `lint` falla si los dejas.

2. Añade `const [compararAbierto, setCompararAbierto] = useState(false);`.

3. El botón de la fila llama a `handleComparar(v.presupuestoId)`.

4. **Sustituye** `<ComparadorVersiones data={comparacion} isLoading={compLoading} />`
   por el diálogo:

```tsx
      <DialogoCompararVersiones
        abierto={compararAbierto}
        onOpenChange={setCompararAbierto}
        versiones={versiones ?? []}
        versionInicialId={compararId}
      />
```

Verificación:

```bash
pnpm run typecheck && pnpm run lint && pnpm run format:check
```

### Paso 4 — Tests focalizados

Dos casos, y sólo dos. Son comportamiento de una pantalla que hoy no funciona,
no cobertura decorativa.

Archivo: `src/test/features/presupuesto/pages/VersionesPage.test.tsx` si ya
existe; si no, créalo siguiendo el patrón de cualquier test de página del mismo
directorio (`renderConProviders` de `@/test/render`, sesión en
`useSesionStore`, consultas por rol/etiqueta accesible en español).

1. **Con una sola versión, avisa.** Sobrescribe el handler del listado
   (`server.use(http.get(...))`) para devolver un array de una sola versión,
   pulsa **Comparar** y comprueba que aparece el texto «sólo tiene una versión».
   El diálogo **no** debe abrirse.
2. **Con dos versiones, compara las dos que elige el usuario.** Handler con dos
   versiones, clic en **Comparar** de la no vigente, y comprueba que el diálogo
   se abre y que la petición que sale es
   `GET /presupuestos/{A}/comparar?con={B}` con A ≠ B. Captura la URL con
   `espiar` / `ultima` de `@/test/espia` (mira cualquier test que ya lo use para
   el patrón exacto).

Antes de escribirlos, **lee** `src/test/handlers.ts` y
`src/test/fixtures/presupuesto.ts` para usar los UUID que ya existen. No
inventes UUID nuevos: una fixture es una afirmación sobre el backend
([`docs/bugs.md`](../../docs/bugs.md) §6).

Verificación:

```bash
pnpm exec vitest run src/test/features/presupuesto
```

Esperado: todo verde.

## Condiciones STOP

- Si el handler MSW de `GET /presupuestos/:id/comparar` no existe en
  `src/test/handlers.ts`, **no inventes su forma**: léela del schema
  `comparacionVersionesSchema` en `src/api/schemas.ts` y del DTO
  `ComparacionVersionesResponse` en `src/api/contract.ts`, y construye la
  fixture a partir de ahí. Si aun así no cuadra, para y reporta.
- Si al probarlo contra el backend real el 200 trae un array de longitud
  distinta de 2, para: el contrato cambió y `ComparadorVersiones` asume
  `const [vA, vB] = data.versiones`.
- Si `pnpm run verify` estaba rojo antes de tus cambios, regístralo y reporta.

## Fuera de alcance

- `useComparacion` en `src/features/presupuesto/hooks/usePresupuesto.ts` — la
  llamada es correcta.
- El cuerpo de `ComparadorVersiones` (cálculo de sentido, formato de dinero,
  mapa de capítulos). Sólo cambia dónde se monta. **No metas aritmética de
  dinero en el cliente**: ADR 9, y el comentario del propio componente explica
  que restar ahí imprimía `39511.53200000001`.
- Crear, marcar vigente y eliminar versiones.
- El backend.

## Criterios de terminado (comprobables por máquina)

```bash
pnpm run typecheck
pnpm run lint
pnpm run format:check
pnpm exec vitest run src/test/features/presupuesto
pnpm run verify
```

Y estos dos `grep`:

```bash
grep -n "useComparacion" src/features/presupuesto/pages/VersionesPage.tsx   # sin coincidencias
grep -n "useComparacion" src/features/presupuesto/components/DialogoCompararVersiones.tsx  # 1 coincidencia
```

## Verificación manual

Backend en `localhost:8080`, `pnpm run dev`, sesión
`john.doe@uce.edu.ec` / `Clave1234`.

1. Proyecto con **una** versión → **Versiones** → **Comparar**: sale el aviso
   «sólo tiene una versión», no se abre nada.
2. Crea una segunda versión → **Comparar** en cualquier fila: se abre el
   diálogo con dos selectores ya rellenos con versiones distintas y la
   comparación pintada debajo.
3. Pon la misma versión en los dos selectores: aparece «Elige dos versiones
   distintas» y **no** sale ninguna petición a `/comparar` en la pestaña Red.
4. Vuelve a ponerlas distintas: se pide
   `GET /api/v1/presupuestos/{A}/comparar?con={B}` y se pinta el resultado.

## Nota de mantenimiento

La regla que deja este plan: **un estado que el backend rechaza con 400 no se
manda; se bloquea en el formulario.** Comparar una versión consigo misma era un
400 previsible que el cliente podía evitar, y cuyo mensaje además nunca llegaba
al usuario.

Y la otra: un `useQuery` cuyo `isError` nadie lee es un error que desaparece.
Cuando añadas una query nueva a una pantalla, decide dónde se enseña su fallo
antes de dar el trabajo por terminado.
