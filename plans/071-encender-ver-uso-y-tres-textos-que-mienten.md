# Plan 071: Encender «Ver uso» y arreglar tres avisos que no dicen la verdad

> **Instrucciones para el ejecutor**: Invoca la skill `ponytail:ponytail` antes de escribir nada
> y mantenla activa toda la tarea. Sigue este plan paso a paso. Ejecuta cada comando de
> verificación y confirma el resultado esperado antes de pasar al siguiente. Si ocurre algo de la
> sección "Condiciones de parada", para y repórtalo — no improvises.
>
> **`pnpm`, nunca `npm`.** El gate de tipos es `pnpm run typecheck`; `npx tsc --noEmit` aquí no
> comprueba nada. Y ojo: **`verify` no comprueba tipos en `e2e/`** — un error de tipos en un
> `.spec.ts` no aparece hasta que corre Playwright.
>
> **Comprobación de deriva (ejecútala primero)**:
> `git diff --stat 1574988..HEAD -- src/features/insumos src/features/auth src/features/plantillas-proyecto src/components/ui`
> Si algún archivo en alcance cambió, compara los extractos de "Estado actual" contra el código
> vivo antes de seguir. Si no coinciden, es condición de parada.

## Estado

- **Prioridad**: P1
- **Esfuerzo**: S
- **Riesgo**: LOW
- **Depende de**: ninguno
- **Categoría**: bug
- **Planificado en**: commit `1574988`, 2026-09-07

## Por qué importa

Escribir los capítulos 01, 03 y 08 del manual destapó cuatro defectos. Tres son **avisos que
dicen algo distinto de lo que el sistema hace**, que es el modo de fallo más caro: el usuario
confía en el texto y el sistema le hace otra cosa. El cuarto es mejor noticia — **una
funcionalidad terminada que está apagada por un `disabled` olvidado**.

Ese cuarto es el que más valor tiene: encenderlo **recupera un proceso entero del manual (P-18)**
sin escribir una línea de funcionalidad nueva. Hoy el manual tiene que decir que no está
disponible, y es mentira: está, solo que apagada.

## Estado actual

### Defecto 1 — «Ver uso» está apagado, y funciona

`src/features/insumos/components/TablaInsumos.tsx:162-180` — el ítem del menú está `disabled` y
envuelto en un tooltip que culpa al backend:

```tsx
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <DropdownMenuItem
                        disabled
                        onClick={() =>
                          setUsoDialogo({
                            abierto: true,
                            insumoId: insumo.id,
                          })
                        }
                      >
                        <EyeIcon /> Ver uso
                      </DropdownMenuItem>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{MOTIVO_SIN_BACKEND}</TooltipContent>
                </Tooltip>
```

**El aviso es falso, y se puede demostrar:**

- **`"ver-uso"` no está en `MODULOS_SIN_BACKEND`** (`src/lib/disponibilidad.ts`). Compruébalo:
  `grep -c 'uso' src/lib/disponibilidad.ts` → `0`. O sea, ni siquiera está gateado: el `disabled`
  es fijo.
- **El endpoint existe.** En `../thesis-back-quarkus` @ `origin/main`,
  `src/main/java/ec/uce/propuestas/insumo/resource/InsumoResource.java:156` declara
  `@Path("/{insumoId}/usos")`.
- **El frontend está completo.** `src/features/insumos/hooks/useInsumoUsos.ts:13` llama a
  `/proyectos/${proyectoId}/insumos/${insumoId}/usos`, y
  `src/features/insumos/components/DialogoUsoInsumo.tsx` es un diálogo terminado, con su tabla y
  su estado de carga. Ya está montado en `TablaInsumos.tsx` y su estado (`usoDialogo`) ya existe.

No falta nada. Solo hay que encenderlo.

### Defecto 2 — El aviso del perfil dice lo contrario de lo que pasa

`src/features/auth/pages/PerfilPage.tsx:79-91`:

```tsx
              await cambiarPassword.mutateAsync({ … });
              passwordForm.reset();
              cerrar();
```

```tsx
            <p className="text-sm text-muted-foreground">
              Al cambiar tu contraseña, las demás sesiones se cerrarán.
            </p>
```

"Las **demás** sesiones" insinúa que la tuya sigue abierta. `cerrar()` cierra la tuya también.

**El comportamiento es correcto; el texto es el que miente.** En `../thesis-back-quarkus` @
`origin/main`, `AuthService.java:275-277`:

```java
        u.passwordHash = passwordService.hash(req.passwordNueva());
        // D-03: revoke all refresh tokens on password change
        tokenService.revokeAllRefreshTokensForUser(u.id);
```

Revoca **todas**, incluida la del navegador que hizo el cambio. Cerrar la sesión ahí mismo es lo
honesto: la alternativa es dejar al usuario con una sesión que morirá sola sin avisar.

Así que **se arregla el texto, no la lógica**. Además, el manual ya dice la verdad:
`docs/manual/usuario/01-cuenta-y-acceso.md:242` — *"tu contraseña queda actualizada y **tu sesión
se cierra**"*. Que la pantalla diga lo mismo.

### Defecto 3 — «Reenviar verificación» lleva a un botón muerto

`src/features/auth/pages/LoginPage.tsx:53-60`:

```tsx
            {emailNoVerificado ? (
              <p className="text-sm text-advertencia">
                Tu correo no ha sido verificado.{" "}
                <Link to="/verificar-email" className="underline">
                  Reenviar verificación
                </Link>
              </p>
            ) : null}
```

El enlace no lleva el correo. Y en `src/features/auth/pages/VerificarEmailPage.tsx:13,40`:

```tsx
  const email = searchParams.get("email");
```

```tsx
  async function handleReenviar() {
    if (!email || cooldown > 0) return;
```

Sin `?email=`, `email` es `null` y el botón **Reenviar verificación** de esa pantalla no hace nada
al pulsarlo. El usuario llega justo ahí para reenviar, y no puede.

El correo está a mano en el login: el formulario lo tiene. `form.getValues("email")`.

### Defecto 4 — Crear un proyecto desde plantilla sin nombre no hace nada

`src/features/plantillas-proyecto/pages/PlantillasProyectoPage.tsx:43`:

```tsx
  const handleCrear = async () => {
    if (!nombreNuevo.trim() || !usarId) return;
```

El botón **Crear proyecto** está siempre habilitado. Si el nombre está vacío, se pulsa y no ocurre
nada: ni aviso, ni error, ni foco en el campo. El usuario no sabe si falló o si va lento.

### Defecto 5 — Tres etiquetas que no apuntan a ningún control

No es cosmético: un lector de pantalla no anuncia el campo, y obliga a los tests a localizar por
rol sin nombre.

- `src/features/insumos/components/DialogoCopiarBase.tsx:76` — `<Label htmlFor="cb-base">` pero el
  `SelectTrigger` de debajo no tiene `id="cb-base"`.
- `src/features/insumos/components/ComboboxUnidad.tsx:44` — el `<Input>` de unidad personalizada no
  tiene `id`, así que el `<Label htmlFor="di-unidad">` de
  `src/features/insumos/components/DialogoInsumo.tsx:174` no apunta a nada **cuando el tipo es
  Material o Transporte** (para Mano de obra y Equipo sí funciona: ese `Input` sí lleva el `id`).
- `src/components/ui/sidebar.tsx:251-272` — `SidebarTrigger` es un botón con solo un icono, sin
  `aria-label` ni texto accesible.

Y de paso, en `DialogoInsumo.tsx:174-176` hay un ternario cuyas dos ramas devuelven lo mismo:

```tsx
            <Label htmlFor="di-unidad">
              {tipo === "MANO_OBRA" || tipo === "EQUIPO" ? "Unidad" : "Unidad"}
            </Label>
```

### Convenciones del repo

- **Idioma de la UI:** español (es-EC). Sustantivos del dominio en español: `insumo`, `rubro`,
  `apu`, `capitulo`, `presupuesto`, `cronograma`.
- **Tests:** Vitest + RTL + MSW, con `onUnhandledRequest: "error"`. Viven en `src/test/`, en
  espejo de `src/`. El wrapper es `renderConProviders` (`src/test/render.tsx`), las fixtures están
  en `src/test/fixtures/` y los handlers en `src/test/handlers.ts`.
- **Comentarios:** este repo comenta el *porqué*, no el *qué*, y cita el plan que originó el
  cambio. Sigue esa costumbre donde añadas algo no obvio.

## Comandos que vas a necesitar

| Propósito | Comando | Esperado |
|---|---|---|
| Instalar | `pnpm install` | exit 0 |
| Tipos | `pnpm run typecheck` | exit 0 |
| Tests | `pnpm run test` | exit 0 |
| Gate completo | `pnpm run verify` | exit 0 |
| Capturas del manual | `pnpm run e2e:manual` | exit 0 |
| Suite E2E | `pnpm run e2e` | exit 0 |

**Baseline que no puedes bajar:** 480 tests unitarios en 74 archivos, `pnpm run e2e` en verde con
54 tests. Tus tests nuevos **suben** ese número.

Si `format:check` falla, corre `pnpm run format`.

## Alcance

**En alcance:**

- `src/features/insumos/components/TablaInsumos.tsx`
- `src/features/insumos/components/DialogoCopiarBase.tsx`
- `src/features/insumos/components/DialogoInsumo.tsx`
- `src/features/insumos/components/ComboboxUnidad.tsx`
- `src/features/auth/pages/PerfilPage.tsx`
- `src/features/auth/pages/LoginPage.tsx`
- `src/components/ui/sidebar.tsx`
- `src/features/plantillas-proyecto/pages/PlantillasProyectoPage.tsx`
- Tests nuevos bajo `src/test/`, en espejo de los archivos de arriba
- `e2e/manual/03-insumos.spec.ts` y `docs/manual/usuario/03-insumos.md` — **solo en el paso 6**
- `docs/manual/img/03-insumos/09-uso-insumo.png` — generada, nunca a mano
- `docs/manual/README.md` — **solo la fila del capítulo 03 y la de P-18**, en el paso 6

**Fuera de alcance** (NO los toques):

- `src/features/auth/pages/VerificarEmailPage.tsx` — su guard `if (!email …) return;` es
  correcto: sin correo no hay nada que reenviar. Lo que se arregla es quien la llama sin el dato.
- `src/lib/disponibilidad.ts` — ningún módulo entra ni sale de ese conjunto en este plan.
  «Ver uso» nunca estuvo ahí.
- **Todo lo relacionado con «Duplicar proyecto»**, que sí está correctamente apagado por no tener
  endpoint. Ver el plan 067.
- Los demás capítulos del manual y sus specs.
- `../thesis-back-quarkus` y `../thesis-docs`, ambos de solo lectura.
- Cualquier otra limpieza que se te ocurra de camino.

## Flujo de git

- Rama: `fix/071-ver-uso-y-textos`, desde `main`.
- Commits en estilo conventional en español: `fix: …`. Uno por defecto o por grupo lógico.
- **No hagas push ni abras PR.**

## Pasos

### Paso 1: Encender «Ver uso»

En `TablaInsumos.tsx`, quita el `disabled` del `DropdownMenuItem` de **Ver uso** y desenvuélvelo
del `Tooltip` — el aviso ya no aplica. Deja el `onClick` como está: abre el diálogo que ya existe.

Comprueba antes de tocar nada que `MOTIVO_SIN_BACKEND` sigue usándose en ese archivo para otra
cosa; si queda sin usar, quita también su `import` (lo dirá `pnpm run lint`).

**Verifica**:
`grep -c 'disabled' src/features/insumos/components/TablaInsumos.tsx` → un número menor que antes
`pnpm run typecheck` → exit 0
`pnpm run lint` → exit 0, sin import sin usar

### Paso 2: Que el aviso del perfil diga la verdad

En `PerfilPage.tsx`, cambia el texto para que diga que se cierran **todas** las sesiones,
**incluida la actual**, y que habrá que volver a iniciar sesión. Una o dos frases, en el tono del
resto de la aplicación (tuteo, presente).

**No toques `cerrar()`**: el comportamiento es correcto, el backend revoca todos los tokens.

Que el texto sea coherente con lo que ya dice el manual en
`docs/manual/usuario/01-cuenta-y-acceso.md:242`.

**Verifica**: `grep -n 'demás sesiones' src/features/auth/pages/PerfilPage.tsx` → sin coincidencias

### Paso 3: Llevar el correo a la pantalla de verificación

En `LoginPage.tsx`, haz que el enlace **Reenviar verificación** incluya el correo que el usuario
acaba de escribir, para que la pantalla de destino pueda reenviar de verdad. El valor está en el
formulario. Codifica el correo para la URL.

**Verifica**: `grep -n 'verificar-email' src/features/auth/pages/LoginPage.tsx` → la línea incluye
el parámetro `email`

### Paso 4: Que el botón de crear desde plantilla no mienta

En `PlantillasProyectoPage.tsx`, deshabilita el botón **Crear proyecto** mientras el nombre esté
vacío (o solo espacios). Es la solución más corta y la que ya usa el repo en otros diálogos.

Deja el guard de `handleCrear` como está: sigue protegiendo la ruta del teclado (`Enter`).

**Verifica**: `pnpm run typecheck` → exit 0

### Paso 5: Conectar las tres etiquetas

- `DialogoCopiarBase.tsx`: dale al `SelectTrigger` el `id` que la etiqueta ya espera.
- `ComboboxUnidad.tsx`: acepta un `id` opcional por props y pásalo al `<Input>`; en
  `DialogoInsumo.tsx`, pásale el que la etiqueta ya espera. **No cambies la firma más de lo
  necesario** ni conviertas el componente en otra cosa.
- `sidebar.tsx`: dale al `SidebarTrigger` un texto accesible describiendo lo que hace.
- `DialogoInsumo.tsx`: sustituye el ternario de las dos ramas iguales por el literal.

**Verifica**: `pnpm run verify` → exit 0

### Paso 6: Poner el manual al día

Encender «Ver uso» convierte en falsa una frase del manual. Arréglala en el mismo cambio, o el
manual miente desde hoy.

1. En `e2e/manual/03-insumos.spec.ts`, añade la captura que faltaba,
   `09-uso-insumo.png`: abre el menú **⋯** de una fila, pulsa **Ver uso**, **afirma que el diálogo
   es visible** y fotografía el diálogo (`locator.screenshot()`), no la página entera. Copia el
   patrón de los tests que ya están en ese archivo, y mockea
   `**/api/v1/proyectos/*/insumos/*/usos` con la fixture que corresponda de
   `src/test/fixtures/insumos.ts`.
2. En `docs/manual/usuario/03-insumos.md`, escribe la sección **3.6 Ver dónde se usa un insumo**
   (`<!-- P-18 · S-19 -->`) con la forma de las demás secciones del capítulo: *Quién puede
   hacerlo* · *Antes de empezar* · *Pasos* (con la captura) · *Si algo sale mal* · *Al terminar*.
   Y **quita de la sección final "Lo que todavía no está disponible" el punto que dice que Ver uso
   está desactivado**, que ya no es cierto.
3. En `docs/manual/README.md`, cambia la fila del capítulo 03 de `P-13…P-17` a `P-13…P-18`, quita
   la fila de **P-18** de la tabla de procesos que no se documentan, y ajusta las dos cuentas del
   texto: **37 → 38** procesos documentables y **nueve → ocho** que quedan fuera. Revisa también
   la frase que empieza "Nueve procesos de la especificación quedan fuera…", que menciona P-18
   explícitamente.

**Verifica**:
`pnpm run e2e:manual` → exit 0, y `docs/manual/img/03-insumos/09-uso-insumo.png` existe
`grep -c 'Ver uso' docs/manual/README.md` → `0`

### Paso 7: Gate

**Verifica**: `pnpm run verify` → exit 0 · `pnpm run e2e` → exit 0, con más de 54 tests

## Plan de pruebas

Tests nuevos, en `src/test/` en espejo del archivo que cubren, siguiendo la estructura de los que
ya existen (por ejemplo `src/test/features/proyectos/pages/ResumenProyectoPage.test.tsx`):

| Test | Cubre |
|---|---|
| **Ver uso** no está deshabilitado y al pulsarlo abre el diálogo con la lista de APUs | Defecto 1 — el que más valor tiene, y el que impide que alguien lo vuelva a apagar |
| El aviso del perfil no dice "las demás sesiones" | Defecto 2 |
| El enlace de reenviar verificación incluye el correo escrito | Defecto 3 |
| El botón **Crear proyecto** está deshabilitado con el nombre vacío y habilitado al escribirlo | Defecto 4 |

Los tres de etiquetas no necesitan test propio: quedan cubiertos si escribes los localizadores por
etiqueta (`getByLabel`) en los tests que ya toquen esos diálogos. No añadas tests solo para ellos.

**Verificación**: `pnpm run test` → exit 0, con **484 tests o más**.

## Criterios de terminado

- [ ] `pnpm run verify` sale 0, con ≥ 484 tests unitarios
- [ ] `pnpm run e2e` sale 0, con > 54 tests
- [ ] `grep -c 'uso' src/lib/disponibilidad.ts` → `0` (no se gateó nada nuevo)
- [ ] `grep -n 'demás sesiones' src/features/auth/pages/PerfilPage.tsx` → sin coincidencias
- [ ] `docs/manual/img/03-insumos/09-uso-insumo.png` existe y la sección 3.6 la referencia
- [ ] `grep -c 'Ver uso' docs/manual/README.md` → `0`
- [ ] `git status` no muestra archivos fuera de la lista "En alcance"

## Condiciones de parada

Para y reporta con evidencia `archivo:línea` — no improvises — si:

- **`GET /proyectos/{proyectoId}/insumos/{insumoId}/usos` ya no existe** en
  `../thesis-back-quarkus` @ `origin/main`. Compruébalo antes del paso 1 con:
  `git -C ../thesis-back-quarkus grep -n 'usos' origin/main -- '*InsumoResource.java'`
  Si no está, el `disabled` era correcto y este plan parte de una premisa falsa.
- Al encender «Ver uso», el diálogo se abre pero falla, se queda cargando o muestra el límite de
  error. Significaría que el frontend no estaba tan completo como parece, y eso es otro plan.
- El backend **ya no** revoca todos los refresh tokens al cambiar la contraseña
  (`AuthService.java`, método `cambiarPassword`). Entonces el texto actual sería el correcto y el
  defecto estaría en `cerrar()`, que es el arreglo contrario al que pide este plan.
- Un paso falla su verificación dos veces tras un intento razonable de arreglo.
- El arreglo parece exigir tocar un archivo fuera de alcance.
- `pnpm run test` baja de 480, o `pnpm run e2e` de 54.

## Notas de mantenimiento

- **Qué mirar en la revisión**: que el paso 1 no haya gateado nada nuevo en `disponibilidad.ts`
  («Ver uso» nunca estuvo apagado por falta de backend, sino por olvido); que el texto del perfil
  diga lo mismo que el manual; y que la sección 3.6 no contradiga la sección final del capítulo.
- **Qué interactuará con esto**: si algún día `cambiarPassword` deja de revocar la sesión actual,
  hay que revisar a la vez `PerfilPage.tsx`, el capítulo 01 del manual y este plan.
- **Deuda que este plan NO toca, a propósito**: el código muerto de «Duplicar proyecto»
  (`DialogoDuplicar.tsx`, `useDuplicarProyecto`), el hook muerto `useSubirLogo`, y que la
  importación CSV cree siempre materiales — esto último es del backend, no de aquí.
