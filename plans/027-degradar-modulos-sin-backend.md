# Plan 027: Degradar honestamente los módulos que el backend todavía no implementa

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat ab31892..HEAD -- src/shell/ src/routes/ src/features/`
> Todo `src/shell/` **tiene cambios sin commitear** del rediseño de UI.
> **Antes de empezar, vuelve a levantar el inventario del backend** (paso 0):
> este plan caduca en cuanto el backend crezca.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: 019 (unifica de dónde sale la versión activa; este plan decide qué mostrar cuando no hay ninguna)
- **Category**: bug
- **Planned at**: commit `ab31892` + rediseño de UI sin commitear, 2026-08-24
- **Backend verificado en**: `../thesis-back-quarkus` — 9 clases `@Path`, paquetes `apu`, `common`, `insumo`, `motor`, `proyecto`, `usuario`

## Why this matters

El frontend está **por delante** del backend, no por detrás. El backend
implementa nueve recursos; el front tiene pantallas para los cuarenta y cuatro
procesos del contrato. Cinco módulos completos del front llaman a endpoints que
**no existen en ninguna forma** — no hay recurso, ni servicio, ni entidad:

| Módulo del front | Endpoints que llama | Estado en el backend |
|---|---|---|
| Presupuesto y versiones | `/proyectos/{id}/presupuestos`, `/presupuestos/{id}`, `/presupuestos/{id}/resumen`, `/presupuestos/{id}/validacion`, `/presupuestos/{id}/capitulos…`, `/presupuestos/{id}/vigente`, `/presupuestos/{id}/comparar`, `/presupuestos/{id}/descuento-global` | **no existe** |
| Cronograma | `/presupuestos/{id}/cronograma`, `/cronograma/{id}/actividades/{aid}`, `/cronograma/{id}/revisar` | **no existe** |
| Exportar / documentos | endpoints de exportación | **no existe** |
| Plantillas APU | `/plantillas-apu`, `/plantillas-apu/{id}` | **no existe** |
| Administración | `/admin/usuarios`, `/admin/bases`, `/admin/plantillas`, `/admin/parametros-sistema`, `/admin/valores-referencia`, `/admin/logs` | **no existe** |

El efecto compuesto es peor que la suma. `GET /proyectos/{id}/presupuestos`
—la lista de versiones— es la puerta a todo lo demás: sin ella no hay
`presupuestoId`, y **sin `presupuestoId` el módulo APU del backend, que sí está
implementado, es inalcanzable desde la interfaz**. La entidad `Apu` guarda un
`presupuesto_id` (`Apu.java:16-17`) que apunta a una tabla sin entidad ni recurso
propietario.

Hoy el usuario ve nueve entradas de navegación por proyecto. Cinco llevan a
pantallas que no pueden funcionar. `src/shell/contexto.ts` ya atrapa el 404 de
la lista de versiones y devuelve `[]`, así que no revientan: se quedan en blanco,
sin explicar nada.

Al aterrizar esto, la interfaz ofrece lo que puede cumplir y nombra lo que
todavía no, en vez de invitar a callejones sin salida.

## Current state

### Inventario verificado del backend

Nueve `@Path` a nivel de clase, y nada más:

```
/auth                                    AuthResource
/perfil                                  PerfilResource
/proyectos                               ProyectoResource      (+ /parametros-sistema)
/proyectos/{proyectoId}/firmantes        FirmanteResource
/proyectos/{proyectoId}/parametros       ParametrosProyectoResource
/proyectos/{proyectoId}/insumos          InsumoResource        (+ /selector, /importar, /copiar)
/bases-centrales                         BaseInsumosResource
/presupuestos/{presupuestoId}/apus       PresupuestoApuResource
/apus/{apuId}                            ApuResource           (+ /detalles…)
```

Paquetes: `apu`, `common`, `insumo`, `motor`, `proyecto`, `usuario`. No hay
`presupuesto`, `cronograma`, `export`, `plantilla` ni `admin`.

Comando que regenera el inventario:

```
grep -rn '^@Path(' ../thesis-back-quarkus/src/main/java --include=*.java | sed 's/.*@Path(//' | sort -u
```

### Endpoints que el front llama y el backend no tiene, **fuera** de los cinco módulos

Estos tres son casos sueltos dentro de módulos que por lo demás sí funcionan:

- `POST /proyectos/{id}/duplicar` — el menú "Duplicar" de la lista de proyectos
  y del resumen. No existe.
- `PUT /proyectos/{id}/logo` — la subida de logo del asistente de creación.
  No existe (aunque `ProyectoResponse.tieneLogo` sí viene).
- `GET /proyectos/{id}/insumos/{iid}/uso` — el diálogo "¿dónde se usa este
  insumo?". El DTO `InsumoUsoResponse` existe en el backend pero **ningún
  recurso lo expone**.

### Ruta con nombre distinto

El front pide `GET /admin/parametros-sistema`; el backend lo expone en
`GET /proyectos/parametros-sistema` (`ProyectoResource:91-94`), sin rol de
admin. Mismo dato, otra ruta.

### Lo que ya existe para degradar bien

- `src/components/comunes/EstadoVacio.tsx` — estado vacío con título,
  descripción y acción.
- `src/components/ui/empty.tsx` y `src/components/ui/alert.tsx`.
- `src/shell/contexto.ts` ya tolera el 404 de la lista de versiones:

```ts
} catch (e) {
  // El backend aún no expone esta ruta para proyectos sin presupuestos.
  if (e instanceof ApiError && e.status === 404) return [];
  throw e;
}
```

- `src/routes/Guards.tsx` — `RutaPrivada` y `RutaAdmin`, el patrón para
  condicionar rutas.
- El plan 026 introduce `MOTIVO_SIN_BACKEND`, la constante con el texto
  "Disponible cuando el backend implemente esta operación." — **reutilízala**.

### Convenciones del repo

- UI en español (`es-EC`).
- Los estados vacíos usan `EstadoVacio`, no marcado propio.
- El shell vive en `src/shell/`; la navegación del proyecto está en
  `RUTAS_PROYECTO` (`src/shell/Sidebar.tsx:56-65`) y la de admin en
  `RUTAS_ADMIN` (`:67-74`).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Inventario backend | `grep -rn '^@Path(' ../thesis-back-quarkus/src/main/java --include=*.java \| sed 's/.*@Path(//' \| sort -u` | 9 líneas |
| Typecheck | `pnpm run typecheck` | exit 0 |
| Tests | `pnpm test` | todos pasan |
| Gate | `pnpm run verify` | exit 0 |

## Scope

**In scope**:
- `src/shell/Sidebar.tsx`
- `src/components/comunes/` (un componente nuevo, ver paso 2)
- Las páginas raíz de los cinco módulos sin backend:
  `src/features/presupuesto/pages/PresupuestoPage.tsx`,
  `src/features/presupuesto/pages/VersionesPage.tsx`,
  `src/features/cronograma/pages/CronogramaPage.tsx`,
  `src/features/exportar/pages/ExportPage.tsx`,
  `src/features/plantillas/pages/MisPlantillasPage.tsx`,
  y las seis de `src/features/admin/pages/`
- `src/features/proyectos/pages/ListaProyectosPage.tsx` y
  `ResumenProyectoPage.tsx` (solo el control "Duplicar")
- Los `*.test.tsx` que se rompan

**Out of scope** (NO tocar):
- **Borrar código.** Ni rutas, ni hooks, ni componentes, ni DTOs. Todo ese
  trabajo vuelve a servir en cuanto el backend crezca; borrarlo lo tiraría.
- `src/api/contract.ts` — los DTOs de los módulos sin backend describen el
  contrato acordado y siguen siendo la especificación.
- `src/routes/index.tsx` — las rutas se quedan. Alguien con la URL directa debe
  llegar a la explicación, no a un 404 del router.
- Implementar nada en el backend.
- El módulo APU — plan 026.

## Git workflow

- Rama: `advisor/027-modulos-sin-backend`
- Un commit por módulo.
- Estilo: conventional commits, p. ej. `feat: explain unavailable modules instead of blank screens`
- No hagas push ni abras PR salvo instrucción explícita.

## Steps

### Step 0: Reconfirmar el inventario

Ejecuta el comando de inventario. **Si devuelve más de nueve rutas, para**: el
backend ha crecido desde que se escribió el plan y hay que rehacer la tabla de
módulos antes de deshabilitar nada.

**Verify**: la salida coincide con las nueve rutas listadas en "Current state".

### Step 1: Un único sitio que declare qué hay disponible

Crea `src/lib/disponibilidad.ts` con el inventario como dato, no repartido por
la interfaz:

```ts
/**
 * Módulos cuyo backend todavía no existe (verificado en ../thesis-back-quarkus:
 * nueve recursos JAX-RS, sin paquetes presupuesto/cronograma/export/plantilla/admin).
 * Cuando el backend implemente uno, basta con quitarlo de este conjunto.
 */
export const MODULOS_SIN_BACKEND = new Set([
  "presupuesto",
  "versiones",
  "cronograma",
  "documentos",
  "plantillas",
  "admin",
] as const);

export type ModuloSinBackend = typeof MODULOS_SIN_BACKEND extends Set<infer T> ? T : never;

export const MOTIVO_SIN_BACKEND =
  "Disponible cuando el backend implemente esta operación.";
```

Si el plan 026 ya definió `MOTIVO_SIN_BACKEND`, **muévela aquí** y que 026 la
importe: una sola definición.

**Verify**: `pnpm run typecheck` → exit 0

### Step 2: Un componente para la pantalla "todavía no"

Crea `src/components/comunes/ModuloNoDisponible.tsx`, compuesto sobre
`EstadoVacio` (no marcado propio):

```tsx
export function ModuloNoDisponible({ modulo, descripcion }: { modulo: string; descripcion: string }) {
  return (
    <EstadoVacio
      titulo={`${modulo} todavía no está disponible`}
      descripcion={descripcion}
    />
  );
}
```

La `descripcion` la escribe cada página y debe decir **qué falta**, no "vuelve
más tarde". Ejemplo para presupuesto: *"El servidor todavía no expone las
versiones de presupuesto. La pantalla está construida y se activará cuando el
endpoint exista."*

**Verify**: `pnpm run typecheck` → exit 0

### Step 3: Las páginas de los cinco módulos explican en vez de quedarse en blanco

En cada una de las once páginas listadas en el alcance, sustituye el cuerpo por
`EncabezadoPagina` + `ModuloNoDisponible`. Conserva **todo** el resto del
archivo (hooks, manejadores, diálogos) tras un `return` temprano, para que
reactivar el módulo sea borrar cuatro líneas:

```tsx
export function CronogramaPage() {
  // El backend no expone /presupuestos/{id}/cronograma todavía (plan 027).
  // Para reactivar: borra este bloque y quita "cronograma" de MODULOS_SIN_BACKEND.
  return (
    <>
      <EncabezadoPagina titulo="Cronograma" />
      <ModuloNoDisponible
        modulo="El cronograma"
        descripcion="El servidor todavía no expone el cronograma de un presupuesto. La pantalla está construida y se activará cuando el endpoint exista."
      />
    </>
  );
}
```

Los hooks que quedan por debajo del `return` no se ejecutan, así que **no se
disparan peticiones a endpoints inexistentes** — que es la mitad del valor de
este plan. Si el linter marca código inalcanzable, extrae el cuerpo viejo a una
función interna sin exportar en vez de comentarlo.

**Verify**: levanta la app (`pnpm run dev`), navega a las once rutas y confirma
en la pestaña de red del navegador que **ninguna** dispara una petición a los
endpoints de la tabla de "Why this matters".

### Step 4: La navegación distingue lo que funciona

En `src/shell/Sidebar.tsx`, marca las entradas de `RUTAS_PROYECTO` y
`RUTAS_ADMIN` cuyo módulo esté en `MODULOS_SIN_BACKEND`. **No las escondas**: el
sistema tiene esas pantallas y ocultarlas engañaría igual, en la otra dirección.
Muéstralas atenuadas y con una insignia discreta:

- `className="opacity-60"` en el `SidebarMenuButton`
- un `<span className="ml-auto text-xs text-muted-foreground">pronto</span>`
  después de la etiqueta

Añade a cada entrada de las dos constantes un campo `modulo` que case con las
claves de `MODULOS_SIN_BACKEND`, y deriva el estado de ahí. No repitas la lista.

El grupo de administración completo entra en esta categoría: sus seis entradas
van atenuadas.

**Verify**: `pnpm test -- Sidebar` → pasa. Los dos tests existentes comprueban
que "Usuarios" aparece para `SUPER_ADMIN` y no para `USUARIO`: siguen valiendo,
porque la entrada sigue estando.

### Step 5: Los tres casos sueltos

- **"Duplicar" proyecto** (`ListaProyectosPage.tsx` y `ResumenProyectoPage.tsx`):
  `disabled` + tooltip con `MOTIVO_SIN_BACKEND`, como en el paso 5 del plan 026.
- **Subida de logo** (`AsistenteCrearProyecto.tsx`): si el asistente tiene un
  paso de logo, deshabilita el control con el mismo tooltip. **Comprueba antes**
  si el asistente ya lo omite; si el logo es opcional y no bloquea la creación,
  déjalo y solo anótalo.
- **"Uso de insumo"** (el diálogo de `TablaInsumos.tsx`): mismo tratamiento.

**Verify**: `pnpm run verify` → exit 0

### Step 6: `parametros-sistema` apunta a la ruta real

`src/features/admin/hooks/useParametrosSistema.ts` pide
`/admin/parametros-sistema`; el backend lo expone en
`/proyectos/parametros-sistema` (sin rol de admin). Cambia la URL.

Es el **único** endpoint de todo el módulo admin que existe de verdad, así que
la página que lo consume puede funcionar en modo solo lectura. Decide y anota en
el commit: o la excluyes de `MODULOS_SIN_BACKEND` y la dejas viva en lectura, o
la incluyes por coherencia con el resto del grupo. Recomendación: **excluirla**
— una pantalla que funciona vale más que la coherencia visual del menú.

**Verify**: `grep -rn "/admin/parametros-sistema" src/` → sin resultados

## Test plan

1. **Las páginas no piden endpoints inexistentes** — para `CronogramaPage`,
   `PresupuestoPage` y una de admin: renderiza con `renderConProviders` y
   verifica que aparece el texto "todavía no está disponible". Como
   `src/test/setup.ts` arranca MSW con `onUnhandledRequest: "error"`, cualquier
   petición no mockeada hace fallar el test: eso convierte "no dispara
   peticiones" en algo verificable de verdad.
2. **La navegación marca los módulos pendientes** (`Sidebar.test.tsx`):
   verifica que la entrada "Cronograma" existe y lleva la insignia "pronto", y
   que "Insumos" **no** la lleva.
3. **Los controles sueltos están deshabilitados** (`ListaProyectosPage.test.tsx`):
   abre el menú de un proyecto y comprueba que "Duplicar" está deshabilitado.

**Verification**: `pnpm run verify` → exit 0

## Done criteria

- [ ] `pnpm run verify` sale con exit 0
- [ ] El inventario del backend sigue devolviendo nueve rutas
- [ ] Navegando las once rutas en el navegador, la pestaña de red no muestra ninguna petición a los endpoints de la tabla
- [ ] `grep -rn "/admin/parametros-sistema" src/` no devuelve nada
- [ ] `MODULOS_SIN_BACKEND` es el **único** sitio que enumera los módulos pendientes: `grep -rn "cronograma" src/shell/` no devuelve ninguna lista codificada a mano
- [ ] Ninguna ruta eliminada de `src/routes/index.tsx` (`git diff` no lo toca)
- [ ] Ningún hook, componente ni DTO borrado (`git diff --stat` no muestra archivos eliminados)
- [ ] Fila de estado actualizada en `plans/README.md`

## STOP conditions

Para y reporta si:

- El paso 0 devuelve más de nueve rutas: el backend creció y el plan hay que
  rehacerlo, no forzarlo.
- Te ves borrando una pantalla, un hook o un DTO. El objetivo es **degradar**,
  no amputar.
- Alguien ha implementado ya alguno de los cinco módulos en el backend: quítalo
  de la tabla y repórtalo, no lo deshabilites.
- El plan 019 no ha aterrizado y `PresupuestoPage` sigue leyendo `?v=` en crudo:
  ejecútalo antes, o los dos se pisarán en el mismo archivo.

## Maintenance notes

- **Este plan tiene fecha de caducidad.** Cada vez que el backend gane un
  módulo, el trabajo es: quitar la clave de `MODULOS_SIN_BACKEND`, borrar el
  `return` temprano de sus páginas y correr sus tests. Por eso nada se borra.
- El orden en que conviene que el backend crezca, si alguien pregunta:
  **`/proyectos/{id}/presupuestos` primero**. Es el desbloqueo de mayor
  apalancamiento del proyecto: sin él, el módulo APU del backend —que ya está
  implementado, con su motor de cálculo— es inalcanzable desde la interfaz. Con
  él, se activan APUs y quedan a tiro presupuesto, cronograma y exportación.
- Lo que este plan **no** hace y conviene tener en el radar: el front no valida
  las respuestas en runtime (`src/api/request.ts` es un cast puro), así que un
  endpoint que aparezca con una forma distinta a la del contrato dará pantalla
  blanca en vez de error. Ver la dirección abierta nº 1 en `plans/README.md`.
- `AGENTS.md` y `README.md` describen el frontend como si los cuarenta y cuatro
  procesos estuvieran operativos. Mientras dure esta situación, esa
  documentación induce a error; actualizarla es conversación con los humanos,
  no un paso colado aquí.
