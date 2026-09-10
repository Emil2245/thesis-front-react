# 078 — Plantillas APU de sistema

> **Deriva corregida el 2026-09-10** contra `../thesis-back-quarkus @ 2803575`. Reescritas §§1, 5,
> 8, 9 y 14. El hallazgo gordo está en la §9bis: **no existe listado global de APUs**, así que
> «crear desde APU» necesita una cascada. Razones en `plans/BITACORA.md`.

## 1. Estado inicial
`PlantillaApuAdminResource` @ `2803575`: `@Path("/admin/plantillas-apu")`,
`@RolesAllowed("SUPER_ADMIN")`. DTOs `PlantillaSistemaCrearRequest`,
`PlantillaApuAdminEditarRequest`, `PlantillaApuAdminResponse`.

**`AdminPlantillasPage.tsx` no es un wrapper**, igual que pasaba con usuarios: renderiza
`ModuloNoDisponible` incondicionalmente. El patrón de wrapper **ya existe** desde el plan 077 —
cópialo literalmente de `src/features/admin/pages/AdminUsuariosPage.tsx`: consulta
`MODULOS_SIN_BACKEND.has("admin-plantillas")` y delega en `AdminPlantillasPageActiva`. El gate
sigue cerrado; lo abre 081.

## 2. Objetivo medible
La página activa lista solo SISTEMA, crea desde APU, edita metadatos con semántica de presencia y elimina; tests prueban UI, payloads, permisos y errores.

## 3. Dependencias
077 y 076. Gate `admin-plantillas` permanece hasta 081.

## 4. Fuentes canónicas
Recurso, DTOs, service y `PlantillaApuAdminResourceIT.java`; página wrapper, API contracts/schemas/keys, handlers y tests frontend.

## 5. Evidencia del problema actual
La página sólo muestra `ModuloNoDisponible`. Respuesta real capturada por `curl` el 2026-09-10
con un `SUPER_ADMIN`:

```
GET /admin/plantillas-apu?page=0&size=25   200
{"items":[{"descripcionRubro":"Retiro de pisos de porcelanato/cerámica",
           "fechaCreacion":"2026-09-10T03:56:41.070085Z",
           "id":"0192f6c4-7c8a-7abc-8000-000000002001",
           "nombre":"Retiro de pisos de porcelanato/cerámica (Sistema)",
           "tipo":"SISTEMA","usuarioId":null}],
 "page":0,"size":25,"total":1,"totalPaginas":1}
```

Dos cosas que hay que leer con cuidado:

- **`usuarioId` llega siempre `null` explícito**, no ausente: `PlantillaApuAdminResponse.from()` lo
  pasa a `null` a pelo. En el esquema va `z.number().nullable()`, **no** `.optional()`.
- **La paginación ya está resuelta**: el interceptor de `src/api/client.ts` traduce
  `{items,total}` → `{contenido,totalElementos}` una sola vez. Usa `paginaDe(...)` y no la vuelvas
  a normalizar (ver `src/api/request.ts:15`). El plan 077 ya lo hizo así.

## 6. Alcance incluido
Contrato, schemas, hooks, handler estricto, página activa y tests aislados; no activar disponibilidad.

## 7. Fuera de alcance
APUs personales, backend, copiar arquitectura externa, gate 081, migraciones y funcionalidades fuera del recurso.

## 8. Archivos concretos
Convención **plana** de `src/features/admin` (`hooks/` y `pages/`), la misma que dejó 077 — no la
carpeta por entidad de la versión anterior de esta §8.

- `src/features/admin/hooks/usePlantillasAdmin.ts` — **nuevo**. Modelo:
  `src/features/admin/hooks/useUsuariosAdmin.ts` (plan 077, ya mergeado).
- `src/features/admin/pages/AdminPlantillasPageActiva.tsx` — **nuevo**.
- `src/features/admin/pages/AdminPlantillasPage.tsx` — **editar**, pasa a wrapper.
- `src/api/schemas.ts`, `src/api/contract.ts`, `src/api/queryKeys.ts` — añadir schema, DTOs y
  claves `adminPlantillasFamilia/adminPlantillas/adminPlantilla`.
- `src/test/handlers.ts` — handlers estrictos con `soloCampos`. **Sin `*` final**: ninguno de los
  handlers MSW del archivo lo lleva y MSW casa por pathname ignorando el query string. (La regla
  del `*` de `AGENTS.md` es de Playwright; se comprobó en el plan 077.)
- `src/test/fixtures/admin.ts` — añadir la fixture.
- `src/test/features/admin/hooks/contrato.test.tsx` — añadir el contrato saliente.
- `src/test/features/admin/pages/AdminPlantillasPageActiva.test.tsx` — **nuevo**.

**Intocable:** `src/lib/disponibilidad.ts` (081), `Guards.tsx`, `Sidebar.tsx` y
`src/test/features/admin/pages/paginas-admin.test.tsx` — este último afirma que
`AdminPlantillasPage` no lanza **ninguna** petición, y con el gate cerrado tu wrapper debe seguir
cumpliéndolo **sin editar el test**. Tampoco toques nada de usuarios (077, ya mergeado).

## 9. Contratos request/response
| Método | Ruta | Body | OK |
| --- | --- | --- | --- |
| GET | `/admin/plantillas-apu?q=&tipo=SISTEMA&page=0&size=25` | — | 200 `Page<PlantillaApuAdminResponse>` |
| POST | `/admin/plantillas-apu` | `{desdeApuId, nombre, descripcionRubro}` | **201** |
| PUT | `/{id}` | parcial: `nombre` y/o `descripcionRubro` | 200 |
| DELETE | `/{id}` | — | **204** |

Respuesta: `{id, nombre, tipo:"SISTEMA", usuarioId:null, descripcionRubro, fechaCreacion}`.

**`tipo` sólo admite `SISTEMA`.** El recurso lo valida a mano: cualquier otro valor → 400
`validacion` «tipo debe ser SISTEMA». Es además el `@DefaultValue`, así que **manda siempre
`tipo=SISTEMA` explícito** y aserta ese query param en el test.

**El PUT es semántica de presencia de verdad, no un reemplazo.**
`PlantillaApuAdminEditarRequest` usa `JsonNullable<String>`, y las tres situaciones son distintas:

| Lo que mandas | Qué hace el backend |
| --- | --- |
| la clave **no aparece** | no toca ese campo |
| `"nombre": null` | lo pone a `null` |
| `"nombre": "X"` | lo pone a `"X"` |

Omitir **no** es lo mismo que mandar `null` — es el Patrón C de `docs/bugs.md` en el lado del
request. El frontend debe **omitir** las claves que no cambian; no mandes el objeto entero.

**Los dos requests rechazan campos desconocidos en el propio servidor**, con `@JsonAnySetter` →
400 `validacion` «Campo no permitido: X». Tu handler estricto con `soloCampos` no es una
invención del mock: reproduce lo que hace el backend real.

Errores: 403 `acceso-denegado`; 400 `validacion` (tipo, UUID, campo no permitido) y
`tamano-pagina-invalido` (`size` fuera de 1..200); 404 `no-encontrado`.

## 9bis. El problema de «crear desde APU» — léelo antes de diseñar la pantalla

`POST /admin/plantillas-apu` exige `desdeApuId` de un APU **existente**. Verificado el 2026-09-10:

- **No existe ningún endpoint que liste APUs globalmente.** Los APUs sólo cuelgan de
  `GET /presupuestos/{presupuestoId}/apus`. No inventes `/admin/apus`: no existe.
- Un `SUPER_ADMIN` ve en `GET /proyectos` **sólo los proyectos que le son visibles**, no todos. En
  los datos de desarrollo actuales, el único proyecto que ve la cuenta admin **no tiene ningún
  presupuesto**, luego no tiene ningún APU: `GET /proyectos/{id}/presupuestos` → `[]`.

**Decisión (tomada en ausencia del usuario, para no bloquear el plan entero por una de cuatro
operaciones):** el alta se construye como **cascada con los hooks que ya existen**, sin endpoints
nuevos:

1. `useProyectos()` — `src/features/proyectos/hooks/useProyectos.ts`
2. `useVersiones(proyectoId)` — `src/features/presupuesto/hooks/usePresupuesto.ts:38`, pega a
   `GET /proyectos/{id}/presupuestos`
3. `useApus(presupuestoId)` — `src/features/apu-editor/hooks/useApus.ts`

Tres selectores encadenados, cada uno habilitado por el anterior. **Reutiliza esos hooks; no
escribas hooks nuevos para esto** y no los muevas de sitio.

Si en cualquier nivel la lista viene vacía, la pantalla lo dice con un estado vacío honesto («No
hay APUs disponibles para crear una plantilla») y el botón de crear queda deshabilitado. **Eso no
es un fallo: es el estado real de los datos de hoy**, y es justamente el caso que hay que cubrir
con un test.

Consecuencia honesta para la verificación: el alta **no se puede comprobar contra datos reales**
en este entorno, porque no hay ningún APU alcanzable por la cuenta admin. Se verifica con MSW. Dilo
así en tu informe; no afirmes haberla probado contra el backend real.

## 10. Estrategia TDD
RED: handler rechaza tipo distinto/campos extra y afirma body exacto; PUT ausente no envía campos; UI afirma SISTEMA y estados. GREEN mínimo. TRIANGULATE: descripción de 800 caracteres, APU inexistente, 403, delete 204. REFACTOR local.

## 11. Pasos secuenciales
1. Extraer fixtures/status/códigos del recurso, DTOs e IT.
2. Escribir schemas y tests RED de Page y presencia.
3. Implementar hook/UI accesible: tabla, crear desde APU, edición y confirmación delete.
4. Añadir handler estricto y probar wrapper sin activar gate.
5. Ejecutar tests focalizados.

## 12. Criterios de aceptación
Filtro siempre manda `tipo=SISTEMA`; body POST no agrega campos; PUT preserva ausencia; UI cubre loading/vacío/error/403; respuesta normalizada; gate intacto.

## 13. Verificación
En el worktree, y **`pnpm` siempre, `npm` nunca**:

```
pnpm install
pnpm exec vitest run src/test/features/admin
pnpm run typecheck        # es `tsc -b --noEmit`; `npx tsc --noEmit` NO comprueba nada aquí
pnpm run lint
git diff --check
```

**La línea base de esta rama ya está roja por causas ajenas** (el commit WIP `98fd848`): 20 tests
fallan, `typecheck` da un error en `src/test/features/proyectos/hooks/contrato.test.tsx:197` y
`format:check` se queja de `src/features/apu-editor/hooks/useApuEditor.ts`. **No los arregles y no
los cuentes como tuyos**: tu listón es *no añadir ni uno*. Tras el plan 077 la suite completa va
478 pasan / 20 fallan. Compara contra eso.

## 14. STOP conditions
STOP si el recurso o los DTOs de `@ 2803575` contradicen la §9 (ruta, campo, status,
`JsonNullable` o código). STOP si hiciera falta quitar `admin-plantillas` de `MODULOS_SIN_BACKEND`
(eso es 081). STOP si apareciera la necesidad de gestionar plantillas `PERSONAL`, que están fuera.

**Ya NO es STOP** «si crear exige selector/endpoint no disponible»: se investigó y la respuesta
está en la §9bis — se resuelve con la cascada de tres hooks ya existentes. No te detengas por eso
ni inventes un endpoint de APUs.

## 15. Riesgos y rollback
Riesgo de convertir PUT parcial en reemplazo total o truncar descripción. Rollback §8 únicamente, conservando RED.

## 16. Handoff
Entregar contrato, pruebas de presencia y gate a 079/081.

## 17. Invariantes explícitas
Solo SISTEMA; SUPER_ADMIN; Page canónica; no endpoint inventado; HTTP en `src/api`; no cálculos.
