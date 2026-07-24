# 005 — Auth module: registro, login, verificación, recuperación, perfil (P-01…P-04, S-01…S-06)

- **Status:** TODO
- **Written against:** repo state after plans 001–004. Spec repo `/home/etverkade/workspace/thesis-docs` at commit `d7508eb`.
- **Depends on:** 002 (client + `setRefrescador`), 003 (test harness), 004 (components + tokens).
- **Blocks:** 006 (shell guards need the session store) and everything behind auth.
- **Covers:** processes **P-01, P-02, P-03, P-04**; screens **S-01…S-06**; XP stories **US-01, US-02, US-06, US-07** (iterations I-01, I-02).

---

## 1. Why this matters

Every endpoint in the system except six auth routes requires a JWT (`../thesis-docs/plan/architecture/07-api-contract.md §1`). Plan 002 built the socket (`setRefrescador`, `setAccessToken`, `setOnSesionExpirada`) but left it unplugged. This plan plugs it in and ships the five public screens plus the profile screen.

## 2. Contract — endpoints (from `07-api-contract.md §2`)

| Método | Path | Rol | Request | Response | Códigos | Errores (`type`) |
|---|---|---|---|---|---|---|
| POST | `/auth/registro` | Público | `RegistroRequest` | `UsuarioResponse` | 201, 400 | `validacion` (correo duplicado = error de campo) |
| POST | `/auth/verificar-email` | Público | `VerificarEmailRequest` | — | 204, 410 | `token-invalido-o-expirado` |
| POST | `/auth/reenviar-verificacion` | Público | `ReenviarVerificacionRequest` | — | 202, 429 | `cooldown-activo` |
| POST | `/auth/login` | Público | `LoginRequest` | `TokenResponse` | 200, 401, 403 | `credenciales-invalidas` · `email-no-verificado` · `cuenta-desactivada` |
| POST | `/auth/refresh` | Público | `RefreshRequest` | `TokenResponse` | 200, 401 | `token-invalido-o-expirado` |
| POST | `/auth/logout` | Usuario | `RefreshRequest` | — | 204 | — |
| POST | `/auth/recuperar` | Público | `RecuperarPasswordRequest` | — | 202 | **siempre 202 — anti-enumeración** |
| POST | `/auth/restablecer` | Público | `RestablecerPasswordRequest` | — | 204, 400, 410 | `validacion` · `token-invalido-o-expirado` |
| GET | `/perfil` | Usuario | — | `PerfilResponse` | 200 | — |
| PUT | `/perfil` | Usuario | `PerfilActualizarRequest` | `PerfilResponse` | 200, 400 | `validacion`; cambio de correo dispara re-verificación (D-03) |
| PUT | `/perfil/password` | Usuario | `PasswordCambiarRequest` | — | 204, 400, 401 | `validacion` · `credenciales-invalidas`; revoca refresh tokens (D-03) |

DTO shapes are already in `src/api/contract.ts` (plan 002, transcribed from `07 §11`).

## 3. Domain rules that must be honoured (decisions D-01…D-03, `design/03-procesos-detalle.md §J`)

- **D-01** — password **≥ 8 characters with at least 1 letter and 1 number**. Verification token expires in **24 h**. Resend allowed with a **60 s cooldown**.
- **D-02** — access JWT **60 min**; refresh token **30 days** when the user ticks *"recordar sesión"*; unticked → the refresh lasts only the browser session.
- **D-03** — changing the password **revokes all refresh tokens**; changing the email requires **re-verifying the new address** (the account keeps working with the old one until verified).
- **Anti-enumeration** — `/auth/recuperar` always returns 202, and `credenciales-invalidas` carries a **generic** message. Never let the UI reveal whether an email exists.

## 4. Screens (`design/02-pantallas-flujos.md §3`)

| ID | Pantalla | Tipo | Ruta | Prio | Contenido clave | Procesos |
|---|---|---|---|---|---|---|
| S-01 | Login | Página | `/login` | N | Email + contraseña, recordar sesión, link a recuperación | P-02 |
| S-02 | Registro | Página | `/registro` | N | Nombre, email, contraseña ×2; validación inline | P-01 |
| S-03 | Verificación de email | Página | `/verificar-email` | N | Estado "revisa tu correo" + landing del token (éxito/expirado/reenviar) | P-01 |
| S-04 | Solicitar recuperación | Página | `/recuperar` | S | Email → envío de enlace | P-03 |
| S-05 | Restablecer contraseña | Página | `/restablecer/:token` | S | Nueva contraseña ×2; token inválido/expirado | P-03 |
| S-06 | Perfil | Página | `/perfil` | S | Editar nombre/email, cambiar contraseña, **rol visible no editable** | P-04 |

## 5. Files in scope

```
src/features/auth/
  pages/{LoginPage,RegistroPage,VerificarEmailPage,RecuperarPage,RestablecerPage,PerfilPage}.tsx
  components/                 (form pieces shared between the pages)
  hooks/{useSesion.ts,useAuthMutaciones.ts}
  sesion.ts                   (Zustand store)
  schemas.ts                  (Zod)
  *.test.tsx
src/test/handlers.ts          (edit — add auth handlers)
src/test/fixtures/auth.ts     (create)
src/main.tsx                  (edit — mount the session bootstrapper)
```

**Out of scope:** routing table and guards (plan 006 owns `src/routes/` and `src/shell/`) — export what 006 needs and stop. Admin user management (P-38) is plan 014. **Never edit `plans/`** beyond `Status:`/README table. **Never write to `../thesis-docs`.**

## 6. Steps

### Step 1 — Zod schemas (`src/features/auth/schemas.ts`)

The password rule is D-01 and appears in three forms (registro, restablecer, cambiar). Define it **once**:

```ts
import { z } from "zod";

/** D-01: ≥ 8 caracteres con al menos una letra y un número. */
export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .regex(/[a-zA-Z]/, "La contraseña debe incluir al menos una letra")
  .regex(/[0-9]/, "La contraseña debe incluir al menos un número");

const confirmacion = <T extends { password: string; passwordConfirmacion: string }>(
  s: z.ZodType<T>,
) =>
  s.refine((d) => d.password === d.passwordConfirmacion, {
    message: "Las contraseñas no coinciden",
    path: ["passwordConfirmacion"],
  });

export const registroSchema = confirmacion(
  z.object({
    nombre: z.string().min(1, "El nombre es obligatorio"),
    email: z.string().email("Correo electrónico inválido"),
    password: passwordSchema,
    passwordConfirmacion: z.string(),
  }),
);

export const loginSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
  recordarSesion: z.boolean().default(false),
});

export const restablecerSchema = confirmacion(
  z.object({ password: passwordSchema, passwordConfirmacion: z.string() }),
);

export const perfilSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  email: z.string().email("Correo electrónico inválido"),
});

export const cambiarPasswordSchema = z
  .object({
    passwordActual: z.string().min(1, "Ingresa tu contraseña actual"),
    passwordNueva: passwordSchema,
    passwordConfirmacion: z.string(),
  })
  .refine((d) => d.passwordNueva === d.passwordConfirmacion, {
    message: "Las contraseñas no coinciden",
    path: ["passwordConfirmacion"],
  });
```

All messages are **Spanish, domain-worded** (`design/01 §7`: *"inline, field-level, domain-worded"*).

### Step 2 — Session store (`src/features/auth/sesion.ts`)

Zustand, per the stack decision. Holds the current user and the refresh token; the access token stays in plan 002's in-memory slot.

```ts
import { create } from "zustand";
import type { UsuarioResponse } from "@/api/contract";

const CLAVE_REFRESH = "apu.refresh";

interface EstadoSesion {
  usuario: UsuarioResponse | null;
  refreshToken: string | null;
  cargando: boolean;
  iniciar: (u: UsuarioResponse, refresh: string | null, recordar: boolean) => void;
  cerrar: () => void;
  setCargando: (v: boolean) => void;
}

export const useSesionStore = create<EstadoSesion>((set) => ({
  usuario: null,
  refreshToken: null,
  cargando: true,
  iniciar: (usuario, refreshToken, recordar) => {
    // D-02: "recordar sesión" → localStorage (30 días, lo fija el servidor).
    // Sin recordar → sessionStorage (muere con la pestaña).
    if (refreshToken) {
      (recordar ? localStorage : sessionStorage).setItem(CLAVE_REFRESH, refreshToken);
    }
    set({ usuario, refreshToken, cargando: false });
  },
  cerrar: () => {
    localStorage.removeItem(CLAVE_REFRESH);
    sessionStorage.removeItem(CLAVE_REFRESH);
    set({ usuario: null, refreshToken: null, cargando: false });
  },
  setCargando: (cargando) => set({ cargando }),
}));

export const leerRefreshGuardado = (): string | null =>
  localStorage.getItem(CLAVE_REFRESH) ?? sessionStorage.getItem(CLAVE_REFRESH);

export const esSuperAdmin = (u: UsuarioResponse | null) => u?.rol === "SUPER_ADMIN";
```

Storing the refresh token in web storage is a deliberate, bounded trade-off: the **access** token stays in memory (plan 002), so an XSS gets at most a refresh token, and D-03 gives the user a revocation path (changing the password kills all refresh tokens). Note it in your report; if the humans prefer an httpOnly cookie (`01-react-libraries.md §8` mentions it as preferable), that is a backend change and out of scope here.

### Step 3 — Bootstrap and the refresh plumbing (`src/features/auth/hooks/useSesion.ts`)

On app start: if a refresh token exists, exchange it for an access token before rendering guarded routes. Install `setRefrescador` and `setOnSesionExpirada`.

```ts
import { useEffect } from "react";
import { post } from "@/api/request";
import { setAccessToken, setOnSesionExpirada, setRefrescador } from "@/api/client";
import type { TokenResponse } from "@/api/contract";
import { leerRefreshGuardado, useSesionStore } from "../sesion";

export function useBootstrapSesion() {
  useEffect(() => {
    const { iniciar, cerrar, setCargando } = useSesionStore.getState();

    setRefrescador(async () => {
      const refreshToken = useSesionStore.getState().refreshToken ?? leerRefreshGuardado();
      if (!refreshToken) return null;
      try {
        const r = await post<TokenResponse>("/auth/refresh", { refreshToken });
        iniciar(r.usuario, r.refreshToken ?? refreshToken, !!localStorage.getItem("apu.refresh"));
        return r.accessToken;
      } catch {
        cerrar();
        return null;
      }
    });

    setOnSesionExpirada(() => {
      cerrar();
      setAccessToken(null);
    });

    const guardado = leerRefreshGuardado();
    if (!guardado) {
      setCargando(false);
      return;
    }
    void (async () => {
      try {
        const r = await post<TokenResponse>("/auth/refresh", { refreshToken: guardado });
        setAccessToken(r.accessToken);
        iniciar(r.usuario, r.refreshToken ?? guardado, !!localStorage.getItem("apu.refresh"));
      } catch {
        cerrar();
      } finally {
        setCargando(false);
      }
    })();
  }, []);
}
```

Call `useBootstrapSesion()` once, at the top of `App.tsx`. While `cargando` is true, plan 006's guard renders a full-page skeleton rather than bouncing to `/login` — otherwise every reload flashes the login screen.

### Step 4 — Mutations (`src/features/auth/hooks/useAuthMutaciones.ts`)

One `useMutation` per endpoint. Each maps `ApiError` to UI:

- `validacion` → `error.camposConError.forEach(e => form.setError(e.campo, { message: e.mensaje }))`. Write this once as a shared helper (`src/lib/formErrors.ts`) — plans 007–014 all need it:

```ts
import type { UseFormSetError, FieldValues, Path } from "react-hook-form";
import { ApiError } from "@/api/problem";

/** Vuelca los errores de campo de problem+json en el formulario (RNF-09). */
export function aplicarErroresDeApi<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): boolean {
  if (!(error instanceof ApiError) || !error.is("validacion")) return false;
  for (const { campo, mensaje } of error.camposConError) {
    setError(campo as Path<T>, { type: "server", message: mensaje });
  }
  return error.camposConError.length > 0;
}
```

- `credenciales-invalidas` → a **generic** form-level message: `"Correo o contraseña incorrectos"`. Never "ese correo no existe".
- `email-no-verificado` → inline alert with a "reenviar verificación" action.
- `cuenta-desactivada` → inline alert, no retry action.
- `cooldown-activo` (429) → disable the resend button for 60 s with a visible countdown (D-01).
- `token-invalido-o-expirado` (410) → S-03/S-05 render the "expired" state with a resend/restart path.

On successful login: `setAccessToken(r.accessToken)` then `iniciar(r.usuario, r.refreshToken ?? null, recordarSesion)`, then navigate to the `?retorno=` route if present, else `/proyectos`.

On logout: `POST /auth/logout` with the refresh token, then `cerrar()` and `setAccessToken(null)` — and `queryClient.clear()` so the next user never sees the previous user's cached data.

### Step 5 — The screens

Build S-01…S-06 with shadcn `Card` + `Field` + `Input` + `Label` + `Button` (`02-shadcn-components.md §1`, Auth row). `Field` replaced the old `Form` helper in shadcn's April 2026 update (§0.3) — if the installed CLI still generates `form`, use whichever it provides and note it.

Layout: centred `Card` on a neutral background, app name, Spanish copy throughout. Each page ~80–150 lines.

Screen-specific notes:

- **S-01 Login** — email, password, `Checkbox` "Recordar sesión", link to `/recuperar`, link to `/registro`.
- **S-02 Registro** — on 201, navigate to `/verificar-email?email=…` showing the "revisa tu correo" state.
- **S-03 Verificar email** — dual purpose. With `?token=` in the URL: POST `/auth/verificar-email` on mount and show success/expired. Without a token: the "revisa tu correo" state with a resend button (60 s cooldown).
- **S-04 Recuperar** — always show the same confirmation copy regardless of response (anti-enumeration; the endpoint always returns 202).
- **S-05 Restablecer** — reads `:token` from the route; on 410 show "el enlace expiró" with a link back to `/recuperar`.
- **S-06 Perfil** — two cards: datos (nombre, email) and cambiar contraseña. **Rol is displayed as read-only text**, never a control. On email change, surface D-03's consequence in the UI *before* submitting: *"Cambiar tu correo requiere verificar la nueva dirección. Tu cuenta seguirá funcionando con el correo actual hasta que la verifiques."* On password change, warn that other sessions will close (D-03 revokes refresh tokens) and then run `cerrar()` if the server invalidates the current session.

### Step 6 — MSW handlers and fixtures

Add to `src/test/handlers.ts` the happy-path handlers for all 11 endpoints, typed from `contract.ts`. Put the usuario fixture in `src/test/fixtures/auth.ts`:

```ts
import type { PerfilResponse, TokenResponse, UsuarioResponse } from "@/api/contract";

export const usuarioFixture: UsuarioResponse = {
  id: 1, nombre: "Ana Torres", email: "ana@ejemplo.ec",
  rol: "USUARIO", emailVerificado: true,
};

export const tokenFixture: TokenResponse = {
  accessToken: "access-1", expiraEnSegundos: 3600,
  refreshToken: "refresh-1", usuario: usuarioFixture,
};

export const perfilFixture: PerfilResponse = {
  id: 1, nombre: "Ana Torres", email: "ana@ejemplo.ec",
  rol: "USUARIO", fechaCreacion: "2026-07-01T10:00:00Z",
};
```

### Step 7 — Tests

Use `renderConProviders` from `src/test/render.tsx`, accessible Spanish queries, `server.use(...)` for the error cases.

`LoginPage.test.tsx`:
- renders and submits; on success the store holds the usuario and `getAccessToken()` is set.
- `credenciales-invalidas` (401) → shows the **generic** message; asserts the email is *not* echoed as "no existe".
- `email-no-verificado` (403) → shows the resend action.
- "Recordar sesión" ticked → refresh token lands in `localStorage`; unticked → in `sessionStorage`. *(This is D-02 made testable.)*

`RegistroPage.test.tsx`:
- imports `registroSchema` from the module (never a test-local copy — `quality/01 §B2`) and asserts D-01: `"abc12"` too short, `"abcdefgh"` no digit, `"12345678"` no letter, `"abc12345"` valid.
- mismatched confirmation shows *"Las contraseñas no coinciden"* on the confirmation field.
- server `validacion` for a duplicate email lands on the **email field**, not as a banner.

`VerificarEmailPage.test.tsx`:
- with a valid `?token=` → success state.
- 410 → expired state with a resend action.
- resend then 429 `cooldown-activo` → button disabled with a countdown.

`RecuperarPage.test.tsx`: identical confirmation copy for a known and an unknown email (anti-enumeration).

`PerfilPage.test.tsx`: rol rendered as text and not editable; changing the email shows the D-03 warning; password change uses `cambiarPasswordSchema`.

`useSesion.test.ts`: bootstrap with a stored refresh calls `/auth/refresh` once and populates the store; a failing refresh clears storage and ends with `cargando === false`.

**Verify:** `npm test` exits 0; `npm run verify` exits 0.

### Step 8 — Commit

```bash
npm run verify
git add -A && git commit -m "feat(auth): registro, login, verificación, recuperación y perfil (P-01…P-04)"
```

## 7. Done criteria

| Command | Expected |
|---|---|
| `npm run verify` | exit 0 |
| `npm test -- auth` | ≥ 18 tests passing |
| `grep -rn "from \"axios\"" src/features/auth \| wc -l` | `0` (goes through `@/api/request`) |
| `grep -rn "no existe\|not found" src/features/auth/pages/LoginPage.tsx \| wc -l` | `0` (anti-enumeration) |
| `test -f src/lib/formErrors.ts` | exit 0 |
| all six pages exist under `src/features/auth/pages/` | exit 0 |

Acceptance criteria from the XP plan (`roadmap/01 §4`): US-01 → TC-P01-01…05; US-02 → TC-P02-01…05; US-06 → TC-P03-01…04; US-07 → TC-P04-01…05. Those TC ids are defined in `../thesis-docs/plan/quality/02-catalogo-pruebas.md`; **most are `api`-level and belong to the backend repo** — implement only the UI-observable behaviour listed in §6 Step 7 here.

## 8. Boundaries

- **Do not** build route guards, the sidebar, or the version selector — plan 006.
- **Do not** build admin user management (S-37/P-38) — plan 014.
- **Do not** put the access token in storage. In memory only.
- **Do not** show whether an email is registered, anywhere, on any screen.
- **Do not** implement 2FA. `02-shadcn-components.md §1` lists Input OTP as *"only if scope allows"* — it is not in v1.1.
- **Do not** touch `src/api/**` other than reading it. If the client needs a change, report it.

## 9. Escape hatches

- If `TokenResponse.refreshToken` comes back absent on a "recordar sesión" login, that contradicts D-02 — **report it as a contract defect**, don't invent a fallback.
- If the backend does not exist yet (likely), develop against MSW handlers only, and say so in your report. Every screen must be demonstrable under MSW.
- If a screen needs a shadcn component not installed by plan 004, install it with `npx shadcn@4 add <name>` and list it in your report.

## 10. Maintenance note

The refresh interceptor (plan 002) and `useBootstrapSesion` are coupled: the interceptor calls whatever `setRefrescador` installed. If someone later adds a second place that refreshes tokens, concurrent 401s will double-refresh. Keep exactly one refresher.

D-03 (password change revokes refresh tokens) means the UI must handle "my own request just invalidated my session" gracefully. Watch for it in review of any future password-related change.
