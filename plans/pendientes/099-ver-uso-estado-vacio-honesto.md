# Plan 099: "Ver uso" del insumo enseña una tabla vacía sin explicar por qué

> **Instrucciones para quien ejecute**: sigue este plan paso a paso. Corre cada
> comando de verificación y confirma el resultado esperado antes de avanzar al
> siguiente paso. Si ocurre algo listado en "Condiciones STOP", detente y
> repórtalo — no improvises. Al terminar, actualiza la fila de este plan en
> [`../00.INDEX.md`](../00.INDEX.md), salvo que quien te despache te diga que
> él mantiene el índice.
>
> **Comprobación de deriva (ejecutar primero)**:
> `git diff --stat d0094f3..HEAD -- src/features/insumos/components/DialogoUsoInsumo.tsx src/features/insumos/hooks/useInsumoUsos.ts src/test/features/insumos/components/DialogoUsoInsumo.test.tsx`
> Si alguno de estos archivos cambió desde que se escribió este plan, compara
> los fragmentos de "Estado actual" contra el código real antes de continuar;
> si no coinciden, trátalo como condición STOP.

## Estado

- **Prioridad**: P1
- **Esfuerzo**: S
- **Riesgo**: LOW — cambia copy y añade un estado vacío en un diálogo de sólo
  lectura. No toca peticiones ni mutaciones.
- **Depende de**: nada en este repo. El **contenido** real de la lista depende
  del plan `032` del backend (ver más abajo); este plan es correcto y útil con
  o sin él.
- **Categoría**: bug (UX) + honestidad de la interfaz
- **Planificado en**: commit `d0094f3`, 2026-09-16

## Por qué importa

En `/proyectos/{uuid}/insumos`, cada fila tiene un menú `[…]` con **Ver uso**.
Al pulsarlo se abre un diálogo con la tabla `Código · Descripción · Bloque ·
Precio` **vacía, en todos los casos, para todos los insumos** — incluidos los
que el propio backend se niega a borrar porque están referenciados en APUs.

**El frontend no tiene la culpa y no se puede arreglar aquí.** La causa está en
`../thesis-back-quarkus`, `InsumoResource.java`, método `usos` (línea ~156). El
endpoint resuelve el proyecto, resuelve el insumo… y devuelve una lista vacía
literal:

```java
    @GET
    @Path("/{insumoId}/usos")
    @Consumes(MediaType.WILDCARD)
    public java.util.List<InsumoUsoResponse> usos(
            @PathParam("proyectoId") String proyectoId, @PathParam("insumoId") String insumoId) {
        UUID insumoPublicId = UuidV7.parse(insumoId);
        ProyectoYBase contexto = resolverProyectoYBase(proyectoId);
        Insumo insumo = insumoRepository
                .findByPublicIdAndBase(insumoPublicId, contexto.base().id)
                .orElseThrow(() -> ProblemaException.noEncontrado("Insumo no encontrado en esta base"));
        return java.util.List.of();
    }
```

Es un stub. Ya estaba registrado en [`../00.INDEX.md`](../00.INDEX.md):

> STOP backend: usos de insumo continúa devolviendo una lista vacía por stub.

La petición del frontend es correcta: `GET
/proyectos/{proyectoId}/insumos/{insumoId}/usos`, validada contra
`insumoUsoSchema`, coincide con la ruta y el DTO `InsumoUsoResponse` del
backend. No cambies el hook.

Lo que sí es responsabilidad de esta pantalla: **una tabla con cabeceras y cero
filas no comunica nada**. El usuario no puede distinguir "este insumo no se usa
en ningún APU" de "esto está roto". Y el copy actual miente en el caso normal:
el diálogo se abre desde **Ver uso**, no desde un borrado fallido, pero afirma
«Este insumo está siendo usado y no puede eliminarse» aunque no lo esté.

## Estado actual

`src/features/insumos/components/DialogoUsoInsumo.tsx`:

```tsx
  const { data: usos, isPending } = useInsumoUsos(proyectoId, insumoId, {
    habilitado: abierto,
  });

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Insumo en uso</DialogTitle>
          <DialogDescription>
            Este insumo está siendo usado y no puede eliminarse.
          </DialogDescription>
        </DialogHeader>

        {isPending ? (
          <CargandoTabla filas={3} />
        ) : (
          <Table>
            …cabeceras Código / Descripción / Bloque / Precio…
            <TableBody>
              {usos?.map((u) => (
                …
              ))}
            </TableBody>
          </Table>
        )}
```

No hay rama para `usos.length === 0` ni para `isError`.

Observación adicional, menor pero real: la cuarta columna se titula **Precio**
y su celda pinta `u.override ? "Manual" : "Heredado"`. El comentario del código
dice que `override` explica por qué no se puede borrar (S-19). El título de la
columna no corresponde con su contenido.

`src/features/insumos/hooks/useInsumoUsos.ts` — correcto, no se toca:

```ts
export function useInsumoUsos(
  proyectoId: string,
  insumoId: string,
  { habilitado = true }: { habilitado?: boolean } = {},
) {
  return useQuery({
    queryKey: qk.insumoUso(proyectoId, insumoId),
    queryFn: () =>
      getValidado(`/proyectos/${proyectoId}/insumos/${insumoId}/usos`, z.array(insumoUsoSchema)),
    enabled: habilitado,
  });
}
```

DTO, en `src/api/contract.ts`:

```ts
export interface InsumoUsoResponse {
  apuId: string;
  codigo: string;
  descripcion: string;
  /** Bloque M/N/O/P donde aparece el insumo. */
  bloque: string;
  /** El APU tiene un precio manual para este insumo: explica el bloqueo de borrado (S-19). */
  override: boolean;
}
```

## Qué hay que hacer

Un solo archivo: `src/features/insumos/components/DialogoUsoInsumo.tsx`.

### Paso 1 — Copy que no mienta

- `DialogTitle`: **"Uso del insumo"**.
- `DialogDescription`: **"APUs de este proyecto que referencian el insumo."**

El diálogo se abre desde **Ver uso** y describe un hecho, no un bloqueo. El
mensaje de "no se puede eliminar" ya lo da el backend en el 400 del borrado, y
`TablaInsumos` ya lo muestra con `notificarError` — ahí sigue estando bien.

### Paso 2 — Estado vacío explícito

Sustituye la rama única por tres:

```tsx
        {isPending ? (
          <CargandoTabla filas={3} />
        ) : isError ? (
          <p role="alert" className="py-6 text-center text-sm text-muted-foreground">
            No se pudo consultar el uso de este insumo.
          </p>
        ) : !usos?.length ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Este insumo no aparece en ningún APU de este proyecto.
          </p>
        ) : (
          <Table>
            … igual que ahora …
          </Table>
        )}
```

Saca `isError` de la desestructuración del hook:
`const { data: usos, isPending, isError } = useInsumoUsos(…)`.

### Paso 3 — Titular bien la cuarta columna

Cambia la cabecera `Precio` por **`Precio`→`Origen del precio`** y deja la celda
como está (`Manual` / `Heredado`). Es lo que de verdad pinta.

Verificación de los tres pasos:

```bash
pnpm run typecheck && pnpm run lint && pnpm run format:check
```

### Paso 4 — Cubrir el estado vacío en el test existente

`src/test/features/insumos/components/DialogoUsoInsumo.test.tsx` ya existe.
**Léelo entero antes de tocarlo** y añade un caso: con el handler devolviendo
`[]`, el diálogo muestra «no aparece en ningún APU» y **no** muestra la tabla.

Sobrescribe el handler con `server.use(...)` dentro del test, como hacen los
demás tests del repo; no cambies el handler global de `src/test/handlers.ts`
(la fixture `insumoUsoFixture` con filas sigue haciendo falta para el caso
poblado).

Nada más. Un cambio de copy y un estado vacío no llevan más tests que éste:
[`AGENTS.md`](../../AGENTS.md) es explícito en que copy y componentes
presentacionales no exigen batería nueva.

Verificación:

```bash
pnpm exec vitest run src/test/features/insumos/components/DialogoUsoInsumo.test.tsx
```

## Condiciones STOP

- Si al leer el test existente descubres que ya cubre el caso vacío, **no
  dupliques**: dilo en el reporte y salta el paso 4.
- Si `insumoUsoSchema` o `InsumoUsoResponse` ya no tienen el campo `override`,
  para: el contrato cambió y el paso 3 deja de tener sentido.
- No intentes arreglar el vacío "rellenando" datos en el cliente, ni derivando
  los usos de otra query (por ejemplo recorriendo los APUs y buscando el
  insumo). Eso sería inventarse una respuesta que el servidor no da, y es
  exactamente el patrón que [`docs/bugs.md`](../../docs/bugs.md) llama *el mock
  era la especificación*. Si crees que hace falta, para y reporta.

## Fuera de alcance

- `src/features/insumos/hooks/useInsumoUsos.ts` — correcto.
- `src/api/schemas.ts`, `src/api/contract.ts`.
- `src/test/handlers.ts` (el handler global se queda como está).
- El borrado de insumos y su manejo de error en `TablaInsumos.tsx`.
- **El backend.** La implementación real del endpoint va en el plan `032` del
  repositorio `../thesis-back-quarkus`, que se ejecuta aparte. Cuando ese plan
  aterrice, este diálogo empezará a mostrar filas sin ningún cambio adicional
  aquí — por eso el paso 2 mantiene intacta la rama de la tabla.

## Criterios de terminado (comprobables por máquina)

```bash
pnpm run typecheck
pnpm run lint
pnpm run format:check
pnpm exec vitest run src/test/features/insumos
pnpm run verify
```

Y:

```bash
grep -n "no puede eliminarse" src/features/insumos/components/DialogoUsoInsumo.tsx
```

Esperado: sin coincidencias.

## Verificación manual

Backend en `localhost:8080`, `pnpm run dev`, sesión
`john.doe@uce.edu.ec` / `Clave1234`.

1. `/proyectos/{uuid}/insumos` → menú `[…]` de cualquier fila → **Ver uso**.
2. Mientras el backend siga con el stub, debe verse el texto «Este insumo no
   aparece en ningún APU de este proyecto» — **no** una tabla vacía con
   cabeceras.
3. En la pestaña Red, la petición debe ser
   `GET /api/v1/proyectos/{uuid}/insumos/{uuid}/usos` y responder 200 con `[]`.

## Nota de mantenimiento

Esta pantalla es el recordatorio de la regla: **una tabla vacía no es un estado
vacío.** Cero filas bajo unas cabeceras es indistinguible de un fallo, y aquí
llevaba meses ocultando un stub de backend que sí estaba registrado en el
índice de planes.

Cuando el plan `032` del backend aterrice, revisa que el diálogo pinte filas
reales y que el `bloque` que llega sea uno de M/N/O/P.
