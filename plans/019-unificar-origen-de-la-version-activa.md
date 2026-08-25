# Plan 019: Unificar el origen de la versión activa (`presupuestoId`) en todas las pantallas del proyecto

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat ab31892..HEAD -- src/shell/contexto.ts src/features/apu-editor/pages/ListaApusPage.tsx src/features/apu-editor/pages/EditorApuPage.tsx src/features/cronograma/pages/CronogramaPage.tsx src/features/presupuesto/pages/PresupuestoPage.tsx`
> Estos archivos **ya tienen cambios sin commitear** del rediseño de UI (ver
> "Current state"). Compara contra los extractos de abajo, no contra `ab31892`.
> Si un extracto no coincide con el archivo vivo, es STOP condition.

## Status

- **Status**: EJECUTADO 2026-08-24 en rama `plan/019` — verify en verde (typecheck · lint · format · test · build), 176 tests en 42 archivos. Nota: el grep del done-criteria sobre `searchParams.get("v")` deja ver `src/features/exportar/pages/ExportPage.tsx:39`, pantalla fuera del alcance de este plan (su unificación corresponde al plan 027).
- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: ninguno
- **Category**: bug
- **Planned at**: commit `ab31892` + rediseño de UI sin commitear, 2026-08-24
- **Backend verificado en**: `../thesis-back-quarkus` — ver "Realidad del backend" abajo

## Why this matters

La aplicación tiene **cuatro maneras distintas** de responder a la pregunta
"¿qué versión del presupuesto estoy viendo?", y dos de ellas están mal.

`ListaApusPage` y `EditorApuPage` toman el parámetro de ruta `:id` — que es el
**id del proyecto** — y lo pasan como `presupuestoId` a endpoints que esperan el
**id de la versión** (`GET /presupuestos/{id}/apus`). Con el proyecto 1 y la
versión vigente id 11, la pantalla pide `GET /presupuestos/1/apus`: los APUs de
otro presupuesto, sin error visible. El selector de versión de la barra superior
no tiene ningún efecto sobre estas dos pantallas.

Es un bug silencioso de correctitud: no rompe, muestra datos equivocados. Los
tests unitarios no lo detectan porque MSW responde con un comodín `:id` y
devuelve el mismo fixture para cualquier id.

Cuando esto aterrice, las seis pantallas con alcance de versión leerán la versión
del mismo sitio, y el selector de la barra superior será la única fuente de
verdad.

## Realidad del backend (verificada 2026-08-24)

`GET /proyectos/{id}/presupuestos` —la lista de versiones de la que sale
`presupuestoId`— **no existe en el backend**. No hay recurso, ni servicio, ni
entidad `Presupuesto`: los nueve `@Path` de `../thesis-back-quarkus` son
`/auth`, `/perfil`, `/proyectos`, `/proyectos/{id}/firmantes`,
`/proyectos/{id}/parametros`, `/proyectos/{id}/insumos`, `/bases-centrales`,
`/presupuestos/{id}/apus` y `/apus/{id}`.

Esto **no invalida el plan, lo hace más necesario**. `useVersionActiva()` ya
atrapa el 404 y devuelve `[]`, así que `presupuestoId` será `null` y las
pantallas mostrarán su estado vacío. Hoy, en cambio, `ListaApusPage` y
`EditorApuPage` pasan el id del proyecto y piden `/presupuestos/1/apus` — un
endpoint que **sí existe** y responde: devuelven los APUs de otro presupuesto
como si fueran los del proyecto abierto. Es decir: contra el backend real, el
bug no da una pantalla vacía, da **datos ajenos con aspecto de correctos**.

Tras este plan, esas pantallas mostrarán "Sin versión seleccionada" hasta que el
backend exponga la lista de versiones. Es la degradación honesta, y el plan 027
la extiende al resto de la interfaz.

## Current state

### La fuente correcta ya existe

`src/shell/contexto.ts` expone `useVersionActiva()`, que resuelve la versión
desde `?v=` y cae en la vigente cuando el parámetro no está:

```ts
// src/shell/contexto.ts:35-57
export function useVersionActiva() {
  const proyectoId = useProyectoActivoId();
  const [params, setParams] = useSearchParams();
  const { data: versiones, isPending } = useVersiones(proyectoId);

  const pedida = Number(params.get("v"));
  const encontrada = versiones?.find((x) => x.id === pedida);
  const vigente = versiones?.find((x) => x.vigente) ?? versiones?.[0] ?? null;
  const activa = encontrada ?? vigente;

  const cambiar = (id: number) => {
    const next = new URLSearchParams(params);
    next.set("v", String(id));
    setParams(next, { replace: false });
  };

  if (encontrada == null && vigente != null && params.has("v")) {
    cambiar(vigente.id);          // ← setState en fase de render (paso 4)
  }

  return { versiones, activa, presupuestoId: activa?.id ?? null, cambiar, isPending };
}
```

`useProyectoActivoId()` lee `useParams().id`, que en todas estas rutas es el id
del **proyecto**.

### Las rutas (`src/routes/index.tsx:102,109`)

```
/proyectos/:id/apus            →  ListaApusPage      (:id = proyecto)
/proyectos/:id/apus/:apuId     →  EditorApuPage      (:id = proyecto)
/proyectos/:id/cronograma      →  CronogramaPage     (:id = proyecto)
```

### Estado por pantalla

| Pantalla | Cómo obtiene `presupuestoId` hoy | Veredicto |
|---|---|---|
| `PresupuestoPage` | `useVersionActiva()` | ✅ correcto (arreglado en el rediseño) |
| `ResumenProyectoPage` | `useVersionActiva()` | ✅ correcto |
| `VersionesPage` | `useParams().id` como id de **proyecto** | ✅ correcto (lista versiones de un proyecto) |
| `ListaApusPage` | `Number(useParams().id)` como `presupuestoId` | ❌ **id equivocado** |
| `EditorApuPage` | `Number(useParams().id)` como `presupuestoId` | ❌ **id equivocado** |
| `CronogramaPage` | `Number(searchParams.get("v")) \|\| 0` | ⚠️ vacío en la primera carga |

Extractos exactos:

```tsx
// src/features/apu-editor/pages/ListaApusPage.tsx:41-42
const { id } = useParams<{ id: string }>();
const presupuestoId = Number(id);          // ← es el id del PROYECTO
```

```tsx
// src/features/apu-editor/pages/EditorApuPage.tsx:15-17
const { id, apuId } = useParams<{ id: string; apuId: string }>();
const presupuestoId = Number(id);          // ← es el id del PROYECTO
const parsedApuId = Number(apuId);
```

```tsx
// src/features/cronograma/pages/CronogramaPage.tsx:20-21
const [searchParams] = useSearchParams();
const versionId = Number(searchParams.get("v")) || 0;   // 0 si no hay ?v=
```

El patrón correcto, ya aplicado en `src/features/presupuesto/pages/PresupuestoPage.tsx:20-24`:

```tsx
// La versión la manda el selector de la barra superior, que ya cae en la
// vigente cuando la URL no trae `?v=`; leer el parámetro en crudo dejaba la
// pantalla vacía en la primera carga.
const { presupuestoId } = useVersionActiva();
const versionId = presupuestoId ?? 0;
```

### Convenciones del repo que aplican

- Estado de servidor **solo** en TanStack Query; nada de estado duplicado.
- Los hooks de query llevan `enabled: id > 0` para no disparar peticiones con
  ids inválidos — ver `src/features/presupuesto/hooks/usePresupuesto.ts:12-18`.
- UI en español (`es-EC`); los sustantivos de dominio se quedan en español.
- Los tests consultan por rol/etiqueta accesible y mockean en la capa de red
  con MSW (`src/test/handlers.ts`).

## Commands you will need

| Purpose   | Command                                   | Expected on success |
|-----------|-------------------------------------------|---------------------|
| Install   | `pnpm install`                            | exit 0              |
| Typecheck | `pnpm run typecheck`                      | exit 0, sin errores |
| Tests     | `pnpm test`                               | todos pasan         |
| Un test   | `pnpm test -- ListaApusPage`              | pasa                |
| Lint      | `pnpm run lint`                           | exit 0              |
| Gate      | `pnpm run verify`                         | exit 0              |

## Scope

**In scope** (los únicos archivos que debes modificar):
- `src/features/apu-editor/pages/ListaApusPage.tsx`
- `src/features/apu-editor/pages/EditorApuPage.tsx`
- `src/features/cronograma/pages/CronogramaPage.tsx`
- `src/shell/contexto.ts`
- `src/features/apu-editor/pages/ListaApusPage.test.tsx`
- `src/features/apu-editor/pages/EditorApuPage.test.tsx`
- `src/test/handlers.ts` (solo el paso 5)

**Out of scope** (NO tocar, aunque parezcan relacionados):
- `src/features/presupuesto/pages/PresupuestoPage.tsx` y
  `src/features/proyectos/pages/ResumenProyectoPage.tsx` — ya usan
  `useVersionActiva()`; son el modelo a copiar, no algo que cambiar.
- `src/features/presupuesto/pages/VersionesPage.tsx` — usa `:id` como id de
  proyecto y eso es **correcto**: lista las versiones de un proyecto.
- `src/routes/index.tsx` — las rutas no cambian. No inventes rutas anidadas por
  versión: el ADR del proyecto fija `?v=` como search param (ver `README.md`,
  "Version selector uses `?v=` search param (not nested routes)").
- Cualquier cambio a `src/api/contract.ts` o a los endpoints.

## Git workflow

- Rama: `advisor/019-version-activa`
- Un commit por paso o por unidad lógica. Estilo observado en `git log`:
  `fix: align insumos module with backend endpoints` (conventional commits).
- No hagas push ni abras PR salvo instrucción explícita del operador.

## Steps

### Step 1: `ListaApusPage` toma la versión del selector

En `src/features/apu-editor/pages/ListaApusPage.tsx`, reemplaza las dos líneas
que derivan `presupuestoId` del parámetro de ruta:

```tsx
// ANTES
const { id } = useParams<{ id: string }>();
const presupuestoId = Number(id);

// DESPUÉS
const { presupuestoId: versionActiva } = useVersionActiva();
const presupuestoId = versionActiva ?? 0;
```

Añade `import { useVersionActiva } from "@/shell/contexto";`. Si `useParams`
queda sin uso en el archivo, elimina el import (oxlint lo marcará).

`useApus(presupuestoId, filtros)` ya lleva su propio `enabled`, pero
confírmalo en `src/features/apu-editor/hooks/useApus.ts`. Si **no** lo lleva,
añádelo (`enabled: presupuestoId > 0`) siguiendo el patrón de
`src/features/presupuesto/hooks/usePresupuesto.ts:12-18`.

Cuando no hay versión activa (`presupuestoId === 0`), la página debe mostrar el
estado vacío en vez de una tabla en blanco. Usa `EstadoVacio` igual que
`PresupuestoPage`:

```tsx
if (!presupuestoId) {
  return (
    <EstadoVacio
      titulo="Sin versión seleccionada"
      descripcion="Elige una versión en la barra superior para ver sus APUs."
    />
  );
}
```

**Verify**: `pnpm run typecheck` → exit 0

### Step 2: `EditorApuPage` toma la versión del selector

Mismo cambio en `src/features/apu-editor/pages/EditorApuPage.tsx:15-17`.
`parsedApuId` **no cambia**: viene de `:apuId` y eso es correcto.

```tsx
const { apuId } = useParams<{ apuId: string }>();
const { presupuestoId: versionActiva } = useVersionActiva();
const presupuestoId = versionActiva ?? 0;
const parsedApuId = Number(apuId);
```

`useApuEditor(parsedApuId, presupuestoId)` recibe `presupuestoId` como segundo
argumento opcional; revisa en `src/features/apu-editor/hooks/useApuEditor.ts:78`
para qué se usa antes de asumir que un `0` es inocuo. Si se usa para invalidar
cachés, pasa `undefined` en vez de `0` cuando no haya versión.

**Verify**: `pnpm run typecheck` → exit 0

### Step 3: `CronogramaPage` deja de leer `?v=` en crudo

En `src/features/cronograma/pages/CronogramaPage.tsx:20-21`:

```tsx
const { presupuestoId } = useVersionActiva();
const versionId = presupuestoId ?? 0;
```

Elimina el import de `useSearchParams` si queda sin uso.

**Verify**: `pnpm run typecheck` → exit 0 · `pnpm run lint` → exit 0

### Step 4: Sacar el `setParams` de la fase de render

En `src/shell/contexto.ts`, el bloque

```ts
if (encontrada == null && vigente != null && params.has("v")) {
  cambiar(vigente.id);
}
```

llama a `setSearchParams` **durante el render**, lo que en React 19 provoca el
warning "Cannot update a component while rendering a different component" y una
cascada de renders. Muévelo a un efecto:

```ts
useEffect(() => {
  if (encontrada == null && vigente != null && params.has("v")) {
    cambiar(vigente.id);
  }
  // `cambiar` se recrea en cada render: depende de los valores, no de la función.
}, [encontrada, vigente, params]);
```

Añade `import { useEffect } from "react";`. **No cambies** el valor de retorno
del hook: `activa` ya cae en `vigente`, así que la corrección de la URL es
cosmética y puede ocurrir un tick después sin afectar los datos mostrados.

**Verify**: `pnpm test` → todos pasan (172 al escribir este plan)

### Step 5: Que MSW deje de enmascarar el bug

En `src/test/handlers.ts:285`, el handler de APUs responde a cualquier id:

```ts
http.get(`${API}/presupuestos/:id/apus`, ({ request }) => { ... }),
```

Cámbialo para que devuelva `404` cuando el id **no** sea una versión conocida
(`versionesStub` define los ids `10` y `11`, ver `src/test/handlers.ts:62-78`):

```ts
http.get(`${API}/presupuestos/:id/apus`, ({ params, request }) => {
  const id = Number(params.id);
  if (id !== 10 && id !== 11) {
    return HttpResponse.json({ title: "No encontrado" }, { status: 404 });
  }
  /* ...el cuerpo actual, sin cambios... */
}),
```

Esto convierte el bug en un test que falla si alguien reintroduce el id del
proyecto. Si al aplicarlo algún test **existente** empieza a fallar, es porque
dependía del comodín: STOP y reporta cuáles, no los "arregles" relajando el
handler.

**Verify**: `pnpm test` → todos pasan

## Test plan

Modela los tests nuevos sobre `src/features/presupuesto/pages/PresupuestoPage.test.tsx`
(mismo patrón: `renderConProviders` + `Routes` + una ruta con `?v=`).

En `src/features/apu-editor/pages/ListaApusPage.test.tsx`, añade:

1. **Usa la versión vigente cuando la URL no trae `?v=`** — renderiza en
   `/proyectos/1/apus`, espera a que aparezca un APU del fixture y verifica que
   la petición fue a `/presupuestos/11/apus` (id 11 = vigente en
   `versionesStub`). Captura la URL con un handler `msw` ad-hoc mediante
   `server.use(...)` y una variable capturada, como se hace en otros tests del
   repo que inspeccionan la petición.
2. **Respeta `?v=10`** — renderiza en `/proyectos/1/apus?v=10` y verifica que la
   petición fue a `/presupuestos/10/apus`.
3. **Estado vacío sin versiones** — con `server.use()` haz que
   `GET /proyectos/:id/presupuestos` devuelva `[]` y verifica que aparece
   "Sin versión seleccionada".

En `src/features/apu-editor/pages/EditorApuPage.test.tsx`, añade el caso (1)
equivalente.

**Verification**: `pnpm test` → todos pasan, incluidos los 4 tests nuevos.

## Done criteria

Todas deben cumplirse:

- [ ] `pnpm run verify` sale con exit 0
- [ ] `grep -n "const presupuestoId = Number(id)" src/features/apu-editor/pages/*.tsx` no devuelve nada
- [ ] `grep -rn 'searchParams.get("v")' src/features/` no devuelve nada (solo `src/shell/contexto.ts` puede leer `?v=`)
- [ ] `grep -c "useVersionActiva" src/features/apu-editor/pages/ListaApusPage.tsx src/features/apu-editor/pages/EditorApuPage.tsx src/features/cronograma/pages/CronogramaPage.tsx` devuelve ≥1 en los tres
- [ ] Existen y pasan los 4 tests nuevos descritos arriba
- [ ] `git status` no muestra archivos modificados fuera de la lista "In scope"
- [ ] Fila de estado de este plan actualizada en `plans/README.md`

## STOP conditions

Para y reporta (no improvises) si:

- Los extractos de "Current state" no coinciden con el código vivo.
- `useApuEditor` usa `presupuestoId` de una forma que hace que `0` o `undefined`
  produzcan una petición inválida, y no es obvio cuál de los dos pasar.
- Al endurecer el handler de MSW (paso 5) falla algún test **preexistente**:
  reporta cuáles y para. Que un test dependiera del comodín es información, no
  un obstáculo que haya que quitar.
- Descubres que el backend acepta el id de proyecto en `/presupuestos/{id}/apus`
  (es decir, que el bug no es tal). En ese caso el contrato en
  `../thesis-docs/plan/architecture/07-api-contract.md` línea 127 estaría mal:
  reporta el hallazgo en vez de cambiar código.

## Maintenance notes

- Cualquier pantalla nueva con alcance de versión debe llamar a
  `useVersionActiva()`. No leas `?v=` directamente: es un detalle interno de
  `src/shell/contexto.ts`.
- En revisión de PR, mirar específicamente que ningún `useParams().id` acabe
  pasado a un endpoint `/presupuestos/...`. Es el error que este plan corrige y
  el sistema de tipos no lo puede atrapar: ambos son `number`.
- Un `presupuestoId` con marca de tipo (`type PresupuestoId = number & {__brand}`),
  al estilo de `Decimal` en `src/lib/decimal.ts`, haría imposible este bug.
  Queda **deliberadamente fuera** de este plan: es refactor de tipos en toda la
  capa de API y merece su propio plan.
- `src/shell/contexto.ts` exporta `useVersiones` **y** existe otro `useVersiones`
  en `src/features/presupuesto/hooks/usePresupuesto.ts` con la misma query key.
  No es un bug (TanStack los deduplica), pero es confuso; consolidarlos es
  candidato a plan aparte.
