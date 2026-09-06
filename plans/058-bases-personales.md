# Plan 058 — Bases personales de insumos (N04 §A9)

**Status:** TODO
**Escrito contra:** frontend `8cc08b5` · backend `origin/main` @ `c337950`
**Fuente de verdad:** `BasesPersonalesResource` y `BasePersonalResponse` en `origin/main`
**Esfuerzo:** M (4–6 h) · **Riesgo:** BAJO — es construir sobre backend probado, sin corregir nada
**Depende de:** `061` → `053`
**Choca con:** `050` — ambos tocan los componentes de insumos

## Por qué

**Cuatro endpoints en producción, cero líneas de frontend.** Ni tipo en `contract.ts`, ni hook, ni
pantalla, ni mención en los planes 001–057. No es una feature degradada: es una que nadie vio.

Salió del barrido de endpoints ([`INVENTARIO-COBERTURA.md`](INVENTARIO-COBERTURA.md) §3.2), no de
ningún plan ni documento — precisamente porque no aparece en ninguno.

## Qué es

La **base PERSONAL** de N04 §A9: un catálogo de insumos del usuario, transversal a sus proyectos.
El modelo de bases tiene tres niveles:

| Nivel | Quién la mantiene | Dónde vive hoy en el frontend |
|---|---|---|
| **CENTRAL** | Super-Admin | S-17 (explorar) + S-38/S-39 (admin) |
| **PERSONAL** | el propio usuario | **nada** |
| **PROYECTO** | copia editable por proyecto | S-14 (la pantalla principal de insumos) |

`02-pantallas-flujos.md` S-23 lo menciona de pasada: *«cualquier insumo usado desde
CENTRAL/PERSONAL se copia aquí»*. El selector de insumo del editor de APU debería poder buscar en
la base personal, y hoy no sabe que existe.

## Contrato

Todo `@RolesAllowed({"USUARIO","SUPER_ADMIN"})`, con **aislamiento por propietario** verificado en
`BasesPersonalesResourceIT` (Alice no ve las de Bob).

| Verbo | Ruta | Body | Devuelve |
|---|---|---|---|
| `GET` | `/bases-personales` | — | `List<BasePersonalResponse>` — **lista pelada** |
| `POST` | `/bases-personales` | `{nombre}` `@NotBlank @Size(max=200)` | 201 `BasePersonalResponse` |
| `DELETE` | `/bases-personales/{id}` | — | 204 · 404 si no es tuya |

```ts
BasePersonalResponse {
  id: string          // UUIDv7
  nombre: string
  archivada: boolean
  totalInsumos: number   // long → number, no Decimal
  createdAt: string      // Instant ISO
  updatedAt: string
}
```

Nótese que `BasePersonalResponse` trae `createdAt`/`updatedAt` y `AdminBaseCentralResponse` no.
No unificar los dos tipos: son distintos a propósito.

## Los dos límites que hay que respetar

**No hay endpoint para renombrar ni archivar una base personal.** Central tiene `PUT` y
`/archivar`; personal no. El campo `archivada` viene en la respuesta pero **el usuario no puede
cambiarlo** desde ninguna ruta. Mostrarlo como estado de solo lectura; no poner un botón de
archivar que no existe.

**No hay CRUD de insumos dentro de una base personal.** Central tiene
`POST/PUT/DELETE /admin/bases-centrales/{id}/insumos` e import CSV; personal no tiene equivalente.
Se puede crear la base y borrarla, pero no llenarla por esta vía.

Eso deja una pregunta que el backend no responde: **¿cómo entran insumos en una base personal?**
Probablemente por `POST /proyectos/{id}/insumos/copiar` en sentido inverso, o por una ruta que aún
no existe. **Verificarlo antes de diseñar la pantalla** — si no hay forma de llenarla, una pantalla
de gestión sirve de poco y este plan se reduce a la rebanada 1.

## Rebanadas

### 1 — tipo, hook y selector

Lo mínimo con valor: que la base personal exista en el seam y se pueda **usar como origen**.

- `BasePersonalResponse` en `contract.ts`.
- `useBasesPersonales()` en `src/features/insumos/hooks/` — lista pelada, no `Page`.
- `qk.basesPersonales()`.
- **`DialogoCopiarBase`** (S-18, P-17): hoy ofrece «base central» y «proyecto propio». Añadir
  «base personal» como tercer origen. `POST /proyectos/{id}/insumos/copiar` es el endpoint que ya
  usa; comprobar qué acepta como fuente antes de asumir que soporta personal.

Con esto la feature aporta valor sin pantalla nueva.

### 2 — pantalla de gestión (condicional)

**Solo si la rebanada 1 confirma que existe forma de llenar una base personal.**

Una vista más en `InsumosPage`, junto a la de bases centrales (`VistaBasesCentrales` es el
patrón a copiar): listar, crear, borrar. Sin renombrar, sin archivar.

Si resulta que no hay forma de llenarla, **parar aquí y anotarlo como pregunta al backend**. Es
mejor una feature a medias documentada que una pantalla que crea contenedores vacíos.

### 3 — selector de insumo del editor de APU

`SelectorInsumo` (S-23) busca sobre `GET /proyectos/{id}/insumos/selector`. Comprobar si ese
endpoint ya incluye resultados de la base personal —`InsumoBusquedaResponse` trae `fuente` y
`baseNombre`, lo que sugiere que sí— y, si es así, **solo hay que mostrar la procedencia**, no
consultar `/bases-personales` desde el selector.

Ese es el trabajo real de esta rebanada: `fuente`/`baseNombre` ya vienen del backend y el frontend
los ignora (§7 del plan 059). Mostrarlos cierra el hueco de N04 §A9 sobre saber de dónde salió un
precio.

## Antes de empezar

Este plan tiene **una pregunta abierta que decide su tamaño** (cómo se llena una base personal).
Resolverla es media hora de leer `BasesPersonalesService` e `InsumoCrudService` en el backend.
Hacerlo primero.

## Definición de hecho

- `npm run verify` en verde.
- `BasePersonalResponse` en `contract.ts`, `useBasesPersonales` con test de hook (plan 057).
- `DialogoCopiarBase` ofrece la base personal como origen, con test.
- La pregunta de la rebanada 2 respondida por escrito, en este archivo.
