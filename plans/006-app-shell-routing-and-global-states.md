# 006 — App shell, routing, guards, project/version context, and global states (P-43, P-44, S-43, S-44)

- **Status:** TODO
- **Written against:** repo state after plans 001–005. Spec repo `/home/etverkade/workspace/thesis-docs` at commit `d7508eb`.
- **Depends on:** 002 (query layer), 004 (components), 005 (session store).
- **Blocks:** 007–014 — every feature page mounts inside this shell and is reached through this route table.
- **Covers:** processes **P-43, P-44**; screens **S-43 (shell layout), S-44 (error/404)**; XP stories **US-03, US-04** (iteration I-01, maintained continuously).

---

## 1. Why this matters

`design/02-pantallas-flujos.md §2` and `design/03-procesos-detalle.md P-43` give the shell three jobs, and the third one is the subtle one:

1. Sidebar navigation ordered by the workflow, plus a breadcrumb.
2. **A project selector *and* a budget-version selector.** APU / Presupuesto / Cronograma / Documentos all operate on the *active version*; Insumos and Parámetros belong to the *project*. Getting this wrong means every downstream module reads from the wrong budget.
3. Guards: no session → `/login` (with return); `/admin/*` for SUPER_ADMIN only; another user's resource → 404 (isolation, RNF-05).

P-44 is the other half: empty states, skeletons, inline field errors, toasts, destructive confirmations, 404/403. `TC-P44-01` is an E2E acceptance criterion, so these are not decorations.

## 2. The open decision this plan must close

`design/02 §5.3` marks the version selector as **provisional**:

> Propuesta: selector en el topbar junto al de proyecto, default = vigente, persistido en la URL (`?v=`). La alternativa (rutas anidadas `/versiones/:vId/...`) es más explícita pero más ruidosa. **Confirmar al construir el shell.**

**You are building the shell, so you are closing it. Implement the `?v=` search-param approach** — it is the documented proposal, it keeps the route map in `§2` unchanged, and `TC-P43-02` already asserts *"URL `?v=` persistida"*. Record the decision in `src/shell/README.md` and flag it in your final report so the humans can update `design/02 §5.3`.

## 3. Route map (`design/02 §2` — implement exactly this)

```
(público)
 /login · /registro · /verificar-email · /recuperar · /restablecer/:token

(autenticado — shell S-43)
 /proyectos                       Lista de proyectos (home)
 /perfil                          Perfil de usuario
 /plantillas                      Mis plantillas APU (PERSONAL)
 /proyectos/:id                   Resumen del proyecto
 /proyectos/:id/parametros        Parámetros del proyecto
 /proyectos/:id/insumos           Insumos (tabs: por tipo · bases centrales)
 /proyectos/:id/versiones         Versiones de presupuesto
 /proyectos/:id/apus              APUs de la versión activa
 /proyectos/:id/apus/:apuId       Editor de APU  ← pantalla núcleo
 /proyectos/:id/presupuesto       Árbol del presupuesto (versión activa)
 /proyectos/:id/cronograma        Cronograma (versión activa)
 /proyectos/:id/documentos        Exportar documentos

(Super-Admin)
 /admin/usuarios · /admin/bases · /admin/bases/:id
 /admin/plantillas · /admin/parametros · /admin/logs
```

Sidebar order mirrors the workflow (`design/01 §1.3`, principle #3): **Insumos → APU → Presupuesto → Cronograma → Documentos**.

## 4. Files in scope

```
src/routes/index.tsx              route table
src/routes/Guards.tsx             RutaPrivada, RutaAdmin
src/shell/AppShell.tsx            S-43 layout
src/shell/Sidebar.tsx
src/shell/Topbar.tsx
src/shell/SelectorProyecto.tsx
src/shell/SelectorVersion.tsx
src/shell/Breadcrumbs.tsx
src/shell/contexto.ts             active project + version hooks
src/shell/README.md               records the ?v= decision
src/features/errores/pages/{NoEncontradaPage,SinPermisoPage,ErrorPage}.tsx   S-44
src/components/comunes/LimiteDeError.tsx   error boundary
src/App.tsx                       (edit — router + bootstrap + Toaster)
src/test/handlers.ts              (edit)
```

**Out of scope:** the pages the routes point at (plans 007–014). Render a placeholder for each route that later plans replace — a component that renders the screen id (`<Placeholder pantalla="S-14" />`). **Never edit `plans/`** beyond `Status:`/README. **Never write to `../thesis-docs`.**

## 5. Steps

### Step 1 — Install the shell components

```bash
npx shadcn@4 add sidebar breadcrumb avatar command combobox popover sheet spinner empty pagination
```

(`sidebar` and `breadcrumb` per `02-shadcn-components.md §1` "App shell"; `command`+`popover` back the project/version comboboxes.)

### Step 2 — Router and guards

`src/routes/Guards.tsx`:

```tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSesionStore, esSuperAdmin } from "@/features/auth/sesion";
import { PantallaCargando } from "@/components/comunes/PantallaCargando";

export function RutaPrivada() {
  const { usuario, cargando } = useSesionStore();
  const location = useLocation();
  // Mientras el bootstrap resuelve el refresh guardado NO redirigimos:
  // si no, cada recarga parpadea en /login (plan 005 §3).
  if (cargando) return <PantallaCargando />;
  if (!usuario) {
    const retorno = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?retorno=${retorno}`} replace />;
  }
  return <Outlet />;
}

export function RutaAdmin() {
  const { usuario, cargando } = useSesionStore();
  if (cargando) return <PantallaCargando />;
  if (!usuario) return <Navigate to="/login" replace />;
  if (!esSuperAdmin(usuario)) return <Navigate to="/403" replace />;
  return <Outlet />;
}
```

`src/routes/index.tsx` — a `createBrowserRouter` table matching §3 exactly, with the public routes outside the shell and everything else nested under `RutaPrivada` → `AppShell`. Add a catch-all `*` → `NoEncontradaPage` and `/403` → `SinPermisoPage`.

### Step 3 — Active project & version context (`src/shell/contexto.ts`)

The rule (`design/02 §2`): APU / Presupuesto / Cronograma / Documentos are scoped by **version**; Insumos and Parámetros by **project**. Insumos are shared across versions (data model §3), which is exactly why `/insumos` does not depend on the version selector.

```ts
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/api/request";
import { qk } from "@/api/queryKeys";
import type { PresupuestoVersionResponse } from "@/api/contract";

/** Id del proyecto activo, leído de la ruta. */
export function useProyectoActivoId(): number | null {
  const { id } = useParams();
  const n = Number(id);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Versiones del proyecto activo. */
export function useVersiones(proyectoId: number | null) {
  return useQuery({
    queryKey: qk.versiones(proyectoId ?? 0),
    queryFn: () => get<PresupuestoVersionResponse[]>(`/proyectos/${proyectoId}/presupuestos`),
    enabled: proyectoId != null,
  });
}

/**
 * Versión activa: `?v=` si viene en la URL y pertenece al proyecto; si no, la
 * vigente. Decisión de shell (design/02 §5.3, cerrada en el plan 006).
 */
export function useVersionActiva() {
  const proyectoId = useProyectoActivoId();
  const [params, setParams] = useSearchParams();
  const { data: versiones, isPending } = useVersiones(proyectoId);

  const pedida = Number(params.get("v"));
  const encontrada = versiones?.find((x) => x.presupuestoId === pedida);
  const vigente = versiones?.find((x) => x.esVigente) ?? versiones?.[0] ?? null;
  const activa = encontrada ?? vigente;

  const cambiar = (presupuestoId: number) => {
    const next = new URLSearchParams(params);
    next.set("v", String(presupuestoId));
    setParams(next, { replace: false });
  };

  return { versiones: versiones ?? [], activa, presupuestoId: activa?.presupuestoId ?? null, cambiar, isPending };
}
```

**Every downstream plan uses `useVersionActiva().presupuestoId`** to build its endpoints. Do not let a feature module read `?v=` itself.

Edge case to handle explicitly: `?v=` pointing at a version of a *different* project (a pasted URL). The lookup above falls back to `vigente` silently — that is the right behaviour, but **normalise the URL** (call `cambiar(vigente.presupuestoId)`) so the address bar stops lying.

### Step 4 — S-43 shell layout

`AppShell.tsx` composes shadcn `Sidebar` + a topbar + `<Outlet/>`:

- **Sidebar:** app name; a project-scoped section (Resumen · Insumos · APUs · Presupuesto · Cronograma · Documentos · Parámetros · Versiones) that renders only when a project is active; a global section (Proyectos · Mis plantillas); and an **Admin section visible only to SUPER_ADMIN** (`design/02 §3` S-43). Collapses to icons/drawer on narrow widths (`design/01 §8`).
- **Topbar:** `Breadcrumbs` + `SelectorProyecto` + `SelectorVersion` + user `DropdownMenu` (Perfil · Cerrar sesión).
- `SelectorVersion` renders **only** on version-scoped routes (`/apus`, `/presupuesto`, `/cronograma`, `/documentos`, `/versiones`). It shows `Versión N` plus a `vigente` chip, and lists versions newest-first.
- `Breadcrumbs`: Proyecto → módulo → detalle (`design/01 §3`).

### Step 5 — S-44 and the error boundary

- `NoEncontradaPage` (404) — "No encontramos esta página". Note the RNF-05 subtlety: a resource belonging to another user returns **404, not 403**, so this page is also the "not yours" page. Do not word it as "no existe" *or* "no tienes permiso"; use neutral copy.
- `SinPermisoPage` (403) — for `/admin/*` reached by a USUARIO.
- `ErrorPage` — unexpected failures, with a "reintentar" action.
- `LimiteDeError.tsx` — a React error boundary wrapping `<Outlet/>` so one broken screen doesn't blank the app.

### Step 6 — P-44 global states

Most of the pieces exist from plan 004 (`EstadoVacio`, `CargandoTabla`, `ConfirmarDestructivo`, sonner). This step adds the **global error→UI policy**, in one place, so all of 007–014 behave identically:

`src/lib/manejoErrores.ts`:

```ts
import { toast } from "sonner";
import { ApiError } from "@/api/problem";

/**
 * Política global de presentación de errores (P-44, design/01 §7):
 * - validacion   → NO toast: lo pinta el formulario campo a campo
 *                  (aplicarErroresDeApi, plan 005).
 * - 409 de negocio → diálogo o alerta inline con el detalle: el usuario debe
 *                  entender qué bloquea y dónde corregirlo.
 * - resto        → toast de error con el `title` del problem+json.
 */
export function notificarError(error: unknown, fallback = "Ocurrió un error inesperado") {
  if (error instanceof ApiError) {
    if (error.is("validacion")) return;           // lo maneja el formulario
    toast.error(error.problem.title, { description: error.problem.detail });
    return;
  }
  toast.error(fallback);
}
```

Wire it as the QueryClient's global `onError` for mutations where a screen has not handled the error itself.

### Step 7 — Placeholders for later plans

Create `src/components/comunes/Placeholder.tsx` rendering `Pantalla <id> — pendiente`. Point every not-yet-built route at it. Plans 007–014 each replace their own placeholders; a placeholder still present at plan 015 is a gap.

### Step 8 — Tests

`Guards.test.tsx`:
- no session → redirects to `/login?retorno=…` preserving the original path **and** query string.
- `cargando === true` → renders the loading screen, **not** a redirect (regression guard for the reload flash).
- USUARIO on `/admin/usuarios` → `/403`.
- SUPER_ADMIN on `/admin/usuarios` → renders.

`SelectorVersion.test.tsx`:
- default selection is the version with `esVigente: true`.
- choosing another version sets `?v=` in the URL (**TC-P43-02**).
- `?v=` pointing at an unknown id falls back to vigente and rewrites the URL.

`Sidebar.test.tsx`: the Admin section is absent for USUARIO and present for SUPER_ADMIN (**TC-P43-01**, second half).

`manejoErrores.test.ts`: a `validacion` error produces **no** toast; a 409 produces one with the problem title.

**Verify:** `npm test` and `npm run verify` exit 0.

### Step 9 — Commit

```bash
npm run verify
git add -A && git commit -m "feat(shell): rutas, guards, selectores de proyecto/versión y estados globales (P-43, P-44)"
```

## 6. Done criteria

| Command | Expected |
|---|---|
| `npm run verify` | exit 0 |
| `npm test -- shell routes` | ≥ 12 tests passing |
| every route in §3 resolves (add a routing test that walks the list) | exit 0 |
| `grep -rn "useSearchParams" src/features \| wc -l` | `0` — feature modules read the version via `useVersionActiva` |
| `test -f src/shell/README.md` | exit 0, and it records the `?v=` decision |

## 7. Boundaries

- **Do not** implement any feature page. Placeholders only.
- **Do not** invent routes not in §3. If a later plan needs one, it adds it in its own plan.
- **Do not** duplicate version-resolution logic anywhere else.
- **Do not** change the auth store's shape — plan 005 owns it.
- **Do not** switch to nested `/versiones/:vId/...` routes. That alternative is explicitly the road not taken (§2).

## 8. Escape hatches

- If shadcn's `sidebar` component's API differs materially from what you expect, follow its generated code — it is ours once copied in — but keep the module order from §3.
- If `useVersiones` 404s because the project has no budget version yet (a brand-new project before plan 007/011 create one), render the selector disabled with copy *"Sin versiones"* rather than crashing. Report the case; the spec assumes a version exists from project creation (`design/03 P-06`).
- If you find that a feature route genuinely needs a version id **in the path** rather than the query string, **STOP and report** — that reopens the §2 decision and the humans should make it.

## 9. Maintenance note

`useVersionActiva` is the single most reused hook in the app; a change to its fallback logic silently changes which budget every downstream module reads. Any edit to it deserves the `SelectorVersion` tests re-run and a note in review.

The sidebar's Admin visibility is a UX affordance, **not** a security control — the server enforces roles (`07 §1`, `/admin/*` solo Admin). Never let a reviewer accept "it's hidden in the UI" as authorisation.
