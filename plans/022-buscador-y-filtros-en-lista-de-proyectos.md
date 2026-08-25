# Plan 022: Buscador, filtro de estado y paginación en la lista de proyectos (completa P-05)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat ab31892..HEAD -- src/features/proyectos/pages/ListaProyectosPage.tsx src/features/proyectos/hooks/useProyectos.ts src/shell/SelectorProyecto.tsx src/api/contract.ts`
> `ListaProyectosPage.tsx` y `SelectorProyecto.tsx` **tienen cambios sin
> commitear** del rediseño de UI. Compara contra los extractos de abajo.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: ninguno
- **Category**: direction (completa un proceso especificado)
- **Planned at**: commit `ab31892` + rediseño de UI sin commitear, 2026-08-24
- **Backend verificado en**: `../thesis-back-quarkus` — implementado y coincidente

## Why this matters

El contrato del backend especifica el listado de proyectos como
`GET /proyectos?q&estado&page…` → `Page<ProyectoResponse>`
(`../thesis-docs/plan/architecture/07-api-contract.md` línea 91, proceso P-05).
El front implementa **solo el caso sin parámetros** y tipa la respuesta como
`{ contenido: ProyectoResponse[] }`, ignorando los campos de paginación que el
backend sí devuelve.

Tres consecuencias:

- No hay forma de buscar un proyecto. Con tres proyectos de prueba da igual;
  con los que tendrá una dirección de obra real, no.
- El pie de la tabla dice "Mostrando N de N proyectos" contando dos veces el
  mismo array. En cuanto el backend pagine, mentirá: mostrará el tamaño de
  página como si fuera el total.
- La misma query está escrita a mano en **dos** sitios
  (`ListaProyectosPage` y `SelectorProyecto`) mientras el hook `useProyectos()`
  que existe para eso **no lo usa nadie**.

Al aterrizar esto, P-05 queda completo y la lista se comporta como las otras dos
listas del sistema, que ya filtran contra el servidor.

## Realidad del backend (verificada 2026-08-24)

Este es de los pocos casos en que el backend **ya está implementado y coincide
campo a campo**. `ProyectoResource.listar` acepta exactamente los parámetros que
este plan va a enviar:

```java
// ../thesis-back-quarkus/.../proyecto/resource/ProyectoResource.java:52-58
@GET
public Page<ProyectoResponse> listar(
        @QueryParam("q") String q,
        @QueryParam("estado") EstadoProyecto estado,
        @QueryParam("page") @DefaultValue("0") int page,
        @QueryParam("size") @DefaultValue("25") int size) { … }
```

y `ProyectoResponse` es un record con los trece campos que el front ya declara
(`id, nombreProyecto, codigo, descripcion, anio, fechaInicio, plazoEjecucion,
plazoUnidad, estado, direccionInstitucional, subdireccionInstitucional,
tieneLogo, updatedAt`). El tipo de retorno es `Page<…>`, lo que **confirma** que
el `{ contenido: ProyectoResponse[] }` del front está mal tipado, tal como
diagnostica este plan.

Se puede ejecutar contra el backend real sin esperar a nada.

**Una salvedad**: el menú "Duplicar" de esta misma página llama a
`POST /proyectos/{id}/duplicar`, que **no existe** en el backend. Queda fuera de
este plan; lo deshabilita el plan 027.

## Current state

### El contrato

```
GET /proyectos?q&estado&page&size&sort   →  200 Page<ProyectoResponse>
```

Convención de paginación de todo GET de listado
(`07-api-contract.md` líneas 43-45):

> `?page` (0-based) `&size` (default 25, máx. 200) `&sort=campo,asc|desc`.
> Respuesta envuelta:
> `{ "contenido": [...], "page": 0, "size": 25, "totalElementos": 90, "totalPaginas": 4 }`

El tipo ya existe en `src/api/contract.ts:4-10`:

```ts
export interface Page<T> {
  contenido: T[];
  page: number;
  size: number;
  totalElementos: number;
  totalPaginas: number;
}
```

`ProyectoResponse.estado` es `"BORRADOR" | "EN_PROCESO" | "FINALIZADO"`
(`src/api/contract.ts:91-104`).

### El hook huérfano

`src/features/proyectos/hooks/useProyectos.ts:12-17` — acepta filtros pero
**nadie lo importa** (`grep -rn "useProyectos\b" src/` solo devuelve importaciones
de `useProyecto`, `useCrearProyecto`, `useEliminarProyecto`…):

```ts
export function useProyectos(filtros?: Record<string, unknown>) {
  return useQuery({
    queryKey: qk.proyectos(filtros),
    queryFn: () => get<{ contenido: ProyectoResponse[] }>("/proyectos", filtros),
  });
}
```

### Las dos copias inlineadas

```tsx
// src/features/proyectos/pages/ListaProyectosPage.tsx:34-37
const { data, isPending } = useQuery({
  queryKey: qk.proyectos(),
  queryFn: () => get<{ contenido: ProyectoResponse[] }>("/proyectos"),
});
```

```tsx
// src/shell/SelectorProyecto.tsx:23-26
const { data } = useQuery({
  queryKey: qk.proyectos(),
  queryFn: () => get<{ contenido: ProyectoResponse[] }>("/proyectos"),
});
```

### El pie que cuenta mal

```tsx
// src/features/proyectos/pages/ListaProyectosPage.tsx (rediseño sin commitear)
const total = data.contenido.length;
// ...
<TarjetaTabla
  pie={
    <span>
      Mostrando {total} de {total} {total === 1 ? "proyecto" : "proyectos"}
    </span>
  }
>
```

### El exemplar a copiar

`src/features/apu-editor/pages/ListaApusPage.tsx:45-53` hace exactamente lo que
hay que hacer aquí, contra el servidor:

```tsx
const [q, setQ] = useState("");
const [soloAuxiliares, setSoloAuxiliares] = useState(false);

const filtros: Record<string, unknown> = {};
if (q) filtros.q = q;
if (soloAuxiliares) filtros.soloAuxiliares = true;

const { data, isPending } = useApus(presupuestoId, filtros);
```

`src/features/insumos/components/TablaInsumos.tsx:96-105` es la variante con
`useMemo` y paginación (`f.page = page`). Sigue esa cuando añadas la página.

### Componentes de UI disponibles

Ya instalados en `src/components/ui/`: `input`, `select`, `pagination`,
`input-group`, `field`, `empty`. Y en `src/components/comunes/`:
`EncabezadoPagina` (título + descripción + acciones), `TarjetaTabla`
(contenedor con `titulo` / `accion` / `pie`), `EstadoVacio`, `ChipEstado`.

**Regla del sistema de diseño** (`.claude/skills/shadcn`): los botones dentro de
inputs usan `InputGroup` + `InputGroupAddon`, y los conjuntos de 2–7 opciones
usan `ToggleGroup`, no un `Button` en bucle con estado activo manual. Nada de
`space-y-*`: usa `flex` con `gap-*`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm run typecheck` | exit 0 |
| Tests | `pnpm test` | todos pasan |
| Test dirigido | `pnpm test -- ListaProyectosPage` | pasa |
| Gate | `pnpm run verify` | exit 0 |

## Scope

**In scope**:
- `src/features/proyectos/hooks/useProyectos.ts`
- `src/features/proyectos/pages/ListaProyectosPage.tsx`
- `src/features/proyectos/pages/ListaProyectosPage.test.tsx`
- `src/shell/SelectorProyecto.tsx`
- `src/test/handlers.ts` (solo el handler de `GET /proyectos`)

**Out of scope** (NO tocar):
- `src/api/contract.ts` — `Page<T>` y `ProyectoResponse` ya son correctos.
- Filtrado **en cliente**. El backend filtra; el contrato lo dice. Si filtras en
  el array ya descargado, el buscador mentirá en cuanto haya más de una página.
- El resto de listados (insumos, APUs, admin) — ya filtran o van en otro plan.
- `src/components/ui/*` — no modifiques primitivas de shadcn; compón con ellas.

## Git workflow

- Rama: `advisor/022-buscador-proyectos`
- Estilo de commit: conventional commits, p. ej. `feat: search and filter projects server-side`
- No hagas push ni abras PR salvo instrucción explícita.

## Steps

### Step 1: El hook devuelve `Page<ProyectoResponse>`

En `src/features/proyectos/hooks/useProyectos.ts`, corrige el tipo de retorno y
añade `placeholderData` para que la tabla no parpadee entre búsquedas:

```ts
import { keepPreviousData } from "@tanstack/react-query";

export function useProyectos(filtros?: Record<string, unknown>) {
  return useQuery({
    queryKey: qk.proyectos(filtros),
    queryFn: () => get<Page<ProyectoResponse>>("/proyectos", filtros),
    placeholderData: keepPreviousData,
  });
}
```

Importa `Page` desde `@/api/contract`.

**Verify**: `pnpm run typecheck` → exit 0

### Step 2: Las dos copias inlineadas pasan a usar el hook

En `src/shell/SelectorProyecto.tsx`, sustituye el `useQuery` inlineado por
`const { data } = useProyectos();` e importa desde
`@/features/proyectos/hooks/useProyectos`. El `.map` sobre `data?.contenido`
no cambia. Elimina los imports que queden sin uso (`useQuery`, `get`, `qk`,
`ProyectoResponse`).

Haz lo mismo en `ListaProyectosPage`, pero pasándole los filtros del paso 3.

**Verify**: `grep -rn "qk.proyectos()" src/ | grep -v hooks/useProyectos.ts | grep -v test` → sin resultados · `pnpm run typecheck` → exit 0

### Step 3: Estado de búsqueda y filtro, y la query que los usa

En `ListaProyectosPage`, siguiendo el patrón de `TablaInsumos`:

```tsx
const [q, setQ] = useState("");
const [estado, setEstado] = useState<"" | "BORRADOR" | "EN_PROCESO" | "FINALIZADO">("");
const [page, setPage] = useState(0);

const filtros = useMemo(() => {
  const f: Record<string, unknown> = {};
  if (q) f.q = q;
  if (estado) f.estado = estado;
  f.page = page;
  return f;
}, [q, estado, page]);

const { data, isPending } = useProyectos(filtros);
```

Cualquier cambio en `q` o `estado` debe devolver la página a 0; si no, buscar
desde la página 3 muestra una tabla vacía. Hazlo en los manejadores
(`setQ(v); setPage(0);`), no con un efecto.

**Verify**: `pnpm run typecheck` → exit 0

### Step 4: Los controles en el encabezado

Añade al `acciones` de `EncabezadoPagina`, **antes** del botón "Nuevo proyecto":

- Un buscador: `InputGroup` con `InputGroupAddon` conteniendo `SearchIcon` y un
  `InputGroupInput` (nunca un `Input` suelto dentro de `InputGroup`), con
  `placeholder="Buscar proyecto…"`, `aria-label="Buscar proyecto"` y ancho
  `w-64`.
- Un filtro de estado: `Select` con `SelectTrigger` (`aria-label="Filtrar por estado"`)
  y un `SelectGroup` con las opciones **Todos**, **Borrador**, **En proceso**,
  **Finalizado**. Los `SelectItem` van siempre dentro de `SelectGroup`.
  El valor "Todos" mapea a `""`.

Aplica *debounce* de ~300 ms al buscador antes de meterlo en `filtros`, para no
disparar una petición por tecla. Si el repo no tiene un hook de debounce
(`grep -rn "debounce" src/`), escribe uno local con `useEffect` + `setTimeout`
dentro del propio archivo de la página; **no añadas una dependencia** para esto.

**Verify**: `pnpm run lint` → exit 0 (oxlint marca fallos de jsx-a11y) · `pnpm run verify` → exit 0

### Step 5: Pie y paginación honestos

Sustituye el pie que cuenta dos veces el mismo array por los campos reales:

```tsx
pie={
  <>
    <span>
      Mostrando {data.contenido.length} de {data.totalElementos}{" "}
      {data.totalElementos === 1 ? "proyecto" : "proyectos"}
    </span>
    {data.totalPaginas > 1 ? (/* controles de Pagination */) : null}
  </>
}
```

Usa el componente `Pagination` de `src/components/ui/pagination.tsx` para
anterior/siguiente, deshabilitando los extremos según `data.page` y
`data.totalPaginas`. Si su API no encaja bien con paginación controlada, dos
`Button variant="outline" size="icon-sm"` con `aria-label` explícitos
("Página anterior" / "Página siguiente") son aceptables; lo que no es aceptable
es un control sin etiqueta accesible.

### Step 6: Estado vacío distinto para "no hay" y "no encontré"

Hoy el `EstadoVacio` dice "No hay proyectos · Crea tu primer proyecto para
empezar", lo cual es falso cuando el usuario acaba de buscar "zzz". Distingue:

```tsx
const hayFiltros = q !== "" || estado !== "";
```

- Sin filtros y sin resultados → el estado vacío actual, con el botón de crear.
- Con filtros y sin resultados → `EstadoVacio` con título
  "Sin resultados" y descripción "Ningún proyecto coincide con la búsqueda.",
  y una acción "Limpiar filtros" que resetea `q`, `estado` y `page`.

**Verify**: `pnpm run verify` → exit 0

### Step 7: MSW responde a los filtros

En `src/test/handlers.ts:83`, el handler actual ignora los parámetros:

```ts
http.get(`${API}/proyectos`, () => HttpResponse.json(pagina<ProyectoResponse>(proyectosFixture))),
```

Hazlo filtrar de verdad, para que los tests puedan comprobar el comportamiento
extremo a extremo:

```ts
http.get(`${API}/proyectos`, ({ request }) => {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.toLowerCase() ?? "";
  const estado = url.searchParams.get("estado") ?? "";
  const filtrados = proyectosFixture.filter(
    (p) =>
      (!q ||
        p.nombreProyecto.toLowerCase().includes(q) ||
        p.codigo.toLowerCase().includes(q)) &&
      (!estado || p.estado === estado),
  );
  return HttpResponse.json(pagina<ProyectoResponse>(filtrados));
}),
```

Comprueba la firma real del helper `pagina()` en el mismo archivo antes de
usarlo, y que rellene `totalElementos` con la longitud del array recibido.

**Verify**: `pnpm test` → todos pasan

## Test plan

En `src/features/proyectos/pages/ListaProyectosPage.test.tsx`, modelado sobre
los tests existentes del archivo (`renderConProviders` + consultas por rol y
etiqueta accesible en español):

1. **Buscar filtra la lista** — escribe en el campo con
   `getByLabelText("Buscar proyecto")` y espera (`findBy`) a que desaparezca un
   proyecto que no coincide y siga el que sí.
2. **El filtro de estado filtra** — abre el `Select` por
   `getByLabelText("Filtrar por estado")`, elige "Borrador" y verifica que solo
   quedan los proyectos en borrador.
3. **Sin resultados muestra el vacío correcto** — busca "zzz" y verifica que
   aparece "Sin resultados" y **no** "Crea tu primer proyecto para empezar".
4. **Limpiar filtros restaura la lista** — desde el estado (3), pulsa
   "Limpiar filtros" y verifica que vuelven los tres proyectos.
5. **El pie usa el total del servidor, no el de la página** — con un handler
   `server.use()` que devuelva `totalElementos: 42` y 3 elementos, verifica que
   el texto contiene "de 42".

El (5) es el test de regresión del pie que contaba dos veces el mismo array.

**Verification**: `pnpm test -- ListaProyectosPage` → pasa, con 5 tests nuevos.

## Done criteria

- [ ] `pnpm run verify` sale con exit 0
- [ ] `grep -rn 'get<{ contenido: ProyectoResponse\[\] }>' src/` no devuelve nada
- [ ] `grep -rn "qk.proyectos()" src/ | grep -v hooks/useProyectos.ts | grep -v test` no devuelve nada
- [ ] `grep -n "Mostrando" src/features/proyectos/pages/ListaProyectosPage.tsx` muestra `totalElementos`, no `.length` dos veces
- [ ] Los 5 tests nuevos existen y pasan
- [ ] `pnpm run lint` no reporta fallos nuevos de `jsx-a11y`
- [ ] `git status` no muestra archivos fuera de "In scope"
- [ ] Fila de estado actualizada en `plans/README.md`

## STOP conditions

Para y reporta si:

- El backend rechaza `?q=` o `?estado=` con 400. Significa que la
  implementación del servidor va por detrás del contrato: repórtalo, no
  retrocedas a filtrar en cliente sin decirlo.
- `data.totalElementos` llega `undefined` desde el backend real. Sería una
  desviación del contrato §43-45: repórtala en vez de calcular el total con
  `contenido.length`.
- Necesitas añadir una dependencia para el debounce: no lo hagas, y si crees
  que hace falta, reporta por qué.

## Maintenance notes

- El buscador es **de servidor**. Cualquiera que "optimice" filtrando el array
  cacheado en cliente rompe la corrección en cuanto haya más de una página; es
  el error de revisión a vigilar aquí.
- `SelectorProyecto` (la migaja conmutadora de la barra superior) comparte la
  query con esta página vía `qk.proyectos(filtros)`. Ojo: al pasar filtros, la
  clave cambia, así que el selector — que llama a `useProyectos()` **sin**
  filtros — mantiene su propia entrada de caché con la lista completa. Es lo
  correcto (el conmutador debe ofrecer todos los proyectos, no los filtrados),
  pero significa dos peticiones. Si eso molesta, la solución es que el selector
  lea de la caché, no que comparta filtros.
- Cuando el listado de admin (`/admin/usuarios?q&activo&page…`) reciba el mismo
  tratamiento, extraer un `useFiltrosPaginados` compartido empezará a valer la
  pena. Con dos casos aún no.
