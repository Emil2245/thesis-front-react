# Estado de ejecución — rama administrativa 077–081

> **Memoria del orquestador.** Si la sesión muere, se reanuda leyendo **este archivo y nada más**,
> y verificando después con `git log`, `git worktree list` y `git status`. No reiniciar desde cero,
> no re-despachar un plan ya aprobado, no duplicar worktrees.

**Encargo:** [`../PROMPT-ORQUESTADOR-077-081.md`](../PROMPT-ORQUESTADOR-077-081.md)
**Rama destino:** `plans/077-081` · **Actualizado:** 2026-09-10

## Referencias fijas de esta rama

| Cosa | Valor |
| --- | --- |
| Backend contra el que se razona | `../thesis-back-quarkus` @ **`2803575`** (`main`, tras `fetch --all`) |
| Backend en ejecución | `http://localhost:8080`, prefijo `/api/v1`, con datos |
| Credenciales SUPER_ADMIN de prueba | `ana.armas@gmail.com` / `Clave1234` — **promovida a mano en la BD de desarrollo**, revertir a `USUARIO` al cerrar la rama |
| Prefijo de worktrees | `wa-0XX` (los `w-077`/`w-078` que ya existían son de los capítulos del manual, **otra estirpe**, no tocar) |

## Tablero

| Plan | Estado | Worktree | Rama | Rondas | Nota |
| --- | --- | --- | --- | --- | --- |
| — reactivación | ✅ hecho | — | — | — | banner quitado, índice a TODO, bitácora escrita (`5a7e480`) |
| 077 usuarios | 🔄 despachado | `.claude/worktrees/wa-077` | `wa-077` | 0/2 | plan corregido por deriva antes de despachar |
| 078 plantillas | ⏳ pendiente | — | — | — | no despachar hasta mergear 077 |
| 079 valores | ⏳ pendiente | — | — | — | no despachar hasta mergear 078 |
| 080 logs | ⏳ pendiente | — | — | — | no despachar hasta mergear 079 |
| 081 retirar gates | ⏳ pendiente | — | — | — | exige 077–080 en DONE |

## Por qué en serie

077–080 tocan los mismos cuatro archivos compartidos: `src/api/contract.ts`, `src/api/schemas.ts`,
`src/api/queryKeys.ts`, `src/test/handlers.ts`. En paralelo se pisan.

## Deriva encontrada y corregida (aplica a los cinco planes)

1. **El «wrapper de disponibilidad» no existía.** Las cuatro páginas admin renderizaban
   `ModuloNoDisponible` incondicionalmente; `MODULOS_SIN_BACKEND` sólo alimentaba la insignia
   «pronto» de `src/shell/Sidebar.tsx`. Vaciar el `Set` en 081 no habría encendido nada. Cada plan
   de 077–080 crea ahora su wrapper (`<Nombre>Page` consulta el `Set` y delega en
   `<Nombre>PageActiva`), el gate sigue cerrado hasta 081, y
   `src/test/features/admin/pages/paginas-admin.test.tsx` —que afirma cero peticiones— **sigue
   pasando sin editarse** durante 077–080.
2. **`Page` ya se normaliza en el interceptor** de `src/api/client.ts`
   (`{items,total}` → `{contenido,totalElementos}`). Los ejecutores no deben repetirlo:
   `paginaDe()` es `.strict()` y una segunda normalización la rompe.

## Bitácora de transiciones

- **2026-09-10** — Estado inicial verificado: front `98fd848` limpio, backend `2803575` arriba. Los
  cuatro recursos admin responden 200 con datos reales; `USUARIO` → 403, sin token → 401.
- **2026-09-10** — Diferimiento levantado y comiteado en `5a7e480` (solo documentación).
- **2026-09-10** — Plan 077 corregido por deriva (§§1, 5, 8, 9, 14) y despachado a `wa-077`.

## Recon del backend para 078–080 (hecho el 2026-09-10 @ `2803575`, no repetir)

Los cuatro recursos son `@RolesAllowed("SUPER_ADMIN")` a nivel de clase y todos paginan con
`Page<T>` = `{items,total,page,size,totalPaginas}`, que el interceptor de `src/api/client.ts`
normaliza a `{contenido,totalElementos,…}`. `size` válido 1..200, `page` ≥ 0.

### 078 — `PlantillaApuAdminResource` → `/admin/plantillas-apu`

| Método | Ruta | Notas |
| --- | --- | --- |
| GET | `?q=&tipo=SISTEMA&page=0&size=25` | `tipo` **sólo** admite `SISTEMA`; cualquier otro valor → 400 `validacion` «tipo debe ser SISTEMA». Es el `@DefaultValue`. |
| POST | `/admin/plantillas-apu` | `{desdeApuId, nombre, descripcionRubro}` → **201**. Se crea **desde un APU existente**, no desde cero. |
| PUT | `/{id}` | DTO tipo *merge-patch*: `PlantillaApuAdminEditarRequest` distingue **campo ausente** de **campo nulo** (`nombrePresente()`/`nombreOrNull()`). Patrón C en estado puro: mandar `null` ≠ no mandar la clave. |
| DELETE | `/{id}` | 204 |

Respuesta real: `{"id","nombre","descripcionRubro","tipo":"SISTEMA","usuarioId":null,"fechaCreacion"}`.
Ojo: `usuarioId` llegó **`null` explícito**, no ausente.

### 079 — `ValorReferenciaAdminResource` → `/admin/valores-referencia`

| Método | Ruta | Notas |
| --- | --- | --- |
| GET | `?page=0&size=25` | paginado |
| PUT | `/{clave}` | **upsert**: devuelve **201 si la creó** y **200 si la actualizó**. Esa distinción es el contrato, no un detalle. |
| DELETE | `/{clave}` | 204 |

`clave` no vacía y ≤ 50 (400 `clave-requerida` / `clave-excedida`). Respuesta real:
`{"clave":"SBU","valor":"450.00","descripcion":"…","fuente":"…","actualizado":"…"}` — **`valor`
viaja como string**. No hagas aritmética con él (ADR 9); trátalo como decimal de sólo lectura.

### 080 — `LogActividadResource` → `/admin/logs`

Sólo **GET**, con `usuarioId` (UUIDv7), `evento`, `desde`, `hasta`, `page`, `size`. `evento` debe
casar `^[a-z0-9._-]+$` y ≤ 60 (400 `evento-formato-invalido` / `evento-largo`); `desde`/`hasta` son
`Instant` ISO-8601 (400 `parametro-invalido`) y `desde > hasta` → 400 `rango-fechas-invalido`.
Respuesta real:
`{"id","usuarioId","usuarioNombre","evento":"auth.login","entidad":"auth","entidadId":null,"detalle":{"resultado":"ok"},"fecha"}`.
`detalle` es un objeto JSON libre y `entidadId` puede ser `null`. **No hay PII más allá del nombre
del actor** — la prueba `TC-12-P42-02-filtro-evento-sin-pii.bru` lo afirma; consérvalo así.

### Colección Bruno del backend (evidencia adicional, sólo lectura)

`../thesis-back-quarkus/api/bruno/12-admin/` cubre los cuatro recursos: `TC-12-P38-*` usuarios,
`TC-12-P40-01` plantillas, `TC-12-P41-*` valores/parámetros, `TC-12-P42-*` logs. Es contrato
ejecutable escrito por el backend; úsalo antes de inventar una forma.
