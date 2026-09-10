# 079 — Valores de referencia

> **Deriva corregida el 2026-09-10** contra `../thesis-back-quarkus @ 2803575`, con los cuatro
> statuses comprobados por `curl` real. Reescritas §§1, 5, 8, 9, 13 y 14. El punto que hay que
> leer entero es la **§9bis**: distinguir 201 de 200 exige tocar `src/api/request.ts`.

## 1. Estado inicial
`ValorReferenciaAdminResource` @ `2803575`: `@Path("/admin/valores-referencia")`,
`@RolesAllowed("SUPER_ADMIN")`. DTOs en `proyecto/dto/{ValorReferenciaRequest,ValorReferenciaResponse}.java`.

**`AdminValoresPage.tsx` no es un wrapper** — renderiza `ModuloNoDisponible` incondicionalmente,
la misma deriva que ya se corrigió en 077 y 078. El patrón **ya existe y está mergeado**: copia
`src/features/admin/pages/AdminPlantillasPage.tsx`, que consulta
`MODULOS_SIN_BACKEND.has("admin-plantillas")` y delega en su `PageActiva`. Aquí la clave es
`admin-valores`. El gate sigue cerrado; lo abre 081.

Ojo a la confusión que el propio archivo advierte: los **parámetros** de sistema son otra pantalla
(`AdminParametrosPage`, sobre `/proyectos/parametros-sistema`) y no se tocan.

## 2. Objetivo medible
SUPER_ADMIN lista, crea/actualiza y elimina valores desde una UI activa, con clave en path, validación exacta, statuses 201/200/204 y errores visibles.

## 3. Dependencias
078 y 076. `admin-valores` no se activa (081).

## 4. Fuentes canónicas
Recurso, DTOs, service e IT citados; frontend admin, API contracts/schemas/keys, handlers y tests.

## 5. Evidencia del problema actual
`GET` sólo acepta `page` y `size` — **no hay `q`**, no lo inventes. Constraints reales del
request (`ValorReferenciaRequest`): los **tres campos son `@NotBlank`**, `valor` con
`@Size(max=100)` y `fuente` con `@Size(max=200)`; `descripcion` sin tope. La clave va **en el
path**, no en el cuerpo: `clave` no vacía y ≤ 50.

Respuesta real (`curl`, 2026-09-10, `SUPER_ADMIN`):

```
GET /admin/valores-referencia?page=0&size=25   200
{"items":[{"clave":"APORTE_PATRONAL","valor":"12.15","descripcion":"Aporte patronal IESS %",
           "fuente":"IESS 2023","actualizado":"2026-09-10T03:56:41.070085Z"}, …],
 "page":0,"size":25,"total":4,"totalPaginas":1}
```

**`valor` viaja como `string`** (`"450.00"`, `"12.15"`, `"1800"`). Es un decimal de sólo lectura:
se **muestra tal cual** y se edita como texto. **Cero aritmética** (ADR 9) — nada de `parseFloat`
ni `toFixed` fuera de `src/lib/decimal.ts`, que `pnpm run guard:adr9` vigila. `actualizado` es un
`Instant` ISO-8601: es una **fecha**, no dinero; no la pases por ningún formateador de importes.

La paginación ya la normaliza el interceptor de `src/api/client.ts` (`{items,total}` →
`{contenido,totalElementos}`): usa `paginaDe(...)` y no la repitas (`src/api/request.ts:15`).

## 6. Alcance incluido
Contrato, schemas, hooks, handlers estrictos, página activa y tests; wrapper/gate sin cambios funcionales.

## 7. Fuera de alcance
Backend/auditoría, otras UIs admin, filtros q no existentes, migraciones y gate 081.

## 8. Archivos concretos
Convención **plana** de `src/features/admin` (`hooks/` y `pages/`), la que dejaron 077 y 078 — no
la carpeta por entidad de la versión anterior de esta §8.

- `src/features/admin/hooks/useValoresReferencia.ts` — **nuevo**. Molde:
  `src/features/admin/hooks/usePlantillasAdmin.ts` (plan 078, ya mergeado).
- `src/features/admin/pages/AdminValoresPageActiva.tsx` — **nuevo**. Nómbralo así, casando con
  `AdminValoresPage`, no `AdminValoresReferenciaPageActiva`.
- `src/features/admin/pages/AdminValoresPage.tsx` — **editar**, pasa a wrapper.
- `src/api/request.ts` — **editar**, sólo para añadir el helper de la §9bis. Nada más.
- `src/api/schemas.ts`, `src/api/contract.ts`, `src/api/queryKeys.ts` — schema, DTOs y claves
  `adminValoresFamilia/adminValores/adminValor`.
- `src/test/handlers.ts` — handlers estrictos con `soloCampos`. **Sin `*` final**: ninguno de los
  handlers MSW del archivo lo lleva (la regla del `*` de `AGENTS.md` es de Playwright).
- `src/test/fixtures/admin.ts` — fixture con las cuatro claves sembradas.
- `src/test/features/admin/hooks/contrato.test.tsx` — contrato saliente.
- `src/test/features/admin/pages/AdminValoresPageActiva.test.tsx` — **nuevo**.

**Intocable:** `src/lib/disponibilidad.ts` (081), `Guards.tsx`, `Sidebar.tsx`,
`src/test/features/admin/pages/paginas-admin.test.tsx` (afirma que `AdminValoresPage` no lanza
**ninguna** petición: con el gate cerrado tu wrapper lo sigue cumpliendo **sin editar el test**), y
todo lo de usuarios (077) y plantillas (078), ya mergeados.

## 9. Contratos request/response
| Método | Ruta | Body | OK |
| --- | --- | --- | --- |
| GET | `/admin/valores-referencia?page=0&size=25` | — | 200 `Page<ValorReferenciaResponse>` |
| PUT | `/admin/valores-referencia/{clave}` | `{valor, descripcion, fuente}` | **201 si crea, 200 si actualiza** |
| DELETE | `/admin/valores-referencia/{clave}` | — | **204** |

Respuesta: `{clave, valor, descripcion, fuente, actualizado}`. **La clave va en el path y NO en el
cuerpo.** Codifícala con `encodeURIComponent`.

**Statuses y errores, comprobados uno a uno por `curl` el 2026-09-10** (no transcritos de un DTO):

```
PUT  /admin/valores-referencia/ZZZ_PRUEBA  (clave nueva)      201
PUT  /admin/valores-referencia/ZZZ_PRUEBA  (misma clave)      200  {"clave":"ZZZ_PRUEBA","valor":"1.6",
                                                                    "descripcion":"…","fuente":"…",
                                                                    "actualizado":"2026-09-10T08:10:27.733539777Z"}
DELETE /admin/valores-referencia/ZZZ_PRUEBA                   204  (sin cuerpo)
DELETE /admin/valores-referencia/ZZZ_PRUEBA  (ya no existe)   404  {"codigo":"no-encontrado","mensaje":"Valor de referencia no encontrado"}
PUT    con {"valor":""}                                       400  {"codigo":"validacion","mensaje":"valor-requerido"}
```

Los mensajes de `@NotBlank` son **slugs**, no prosa: `valor-requerido`, `descripcion-requerida`,
`fuente-requerida`. Llegan en `mensaje`, así que **no los muestres en crudo** — un
`valor-requerido` en pantalla no es español. Mapéalos a texto en español, o valida en el
formulario para que no lleguen (los tres campos son obligatorios).

Resto: 403 `acceso-denegado` si no es SUPER_ADMIN; 400 `clave-requerida` (clave vacía),
`clave-excedida` (> 50) y `tamano-pagina-invalido` (`size` fuera de 1..200).

## 9bis. Distinguir 201 de 200 — el único punto que exige salir de la lista de siempre

La §12 pide que el upsert distinga **creación** de **actualización**, y comprobé por `curl` que el
backend lo señala **sólo por el status**: mismo cuerpo, `201` la primera vez y `200` la segunda.

Problema real: **ningún helper de `src/api/request.ts` expone el status.** Todos devuelven
`r.data` y tiran el resto de la respuesta. Y el hook no puede importar `http` a pelo, porque
`src/api/` es la única capa que sabe que existe HTTP (invariante del repo).

**Decisión del orquestador:** añade en `src/api/request.ts` un helper que devuelva también si se
creó. `src/api/request.ts` queda **excepcionalmente dentro del alcance de este plan**, sólo para
esto. Hay precedente en el mismo archivo: `descargar()` devuelve `{blob, nombreArchivo}` en vez de
sólo los datos.

```ts
export const putValidadoConEstado = async <S extends z.ZodTypeAny>(
  url: string,
  schema: S,
  body?: unknown,
): Promise<{ datos: z.infer<S>; creado: boolean }> => {
  const r = await http.put(url, body);
  const parsed = schema.safeParse(r.data);
  if (!parsed.success) throw errorDeRespuesta(url, parsed.error);
  return { datos: parsed.data, creado: r.status === 201 };
};
```

Ése es el diseño; ajústalo al estilo del archivo si hace falta, pero **no cambies ni un helper
existente** — sólo añades. La UI usa `creado` para decir «Valor creado» o «Valor actualizado», y
un test debe afirmar que un 201 y un 200 producen mensajes distintos. **No infieras la creación
mirando si la clave estaba en la lista**: eso es adivinar, y el contrato ya lo dice.

## 10. Estrategia TDD
RED: body exacto, clave URL codificada, 201/200 según existencia, Page cinco campos y validaciones. GREEN mínimo. TRIANGULATE: clave 51, fuente vacía, delete doble, 403 y página parcial. REFACTOR local.

## 11. Pasos secuenciales
1. Leer service/IT para reglas de existencia y mensajes.
2. Escribir contrato/schema/handlers RED.
3. Implementar hooks y formulario/tabla activa con campos y confirmación.
4. Probar wrapper separado sin quitar gate.
5. Ejecutar tests focalizados y documentar statuses observados.

## 12. Criterios de aceptación
GET no manda q; clave siempre va path codificado; body no contiene clave; UI muestra valor/descripcion/fuente/actualizado; upsert distingue 201/200; delete 204; errores 400/403/404 cubiertos; gate intacto.

## 13. Verificación
En el worktree, y **`pnpm` siempre, `npm` nunca**:

```
pnpm install
pnpm exec vitest run src/test/features/admin
pnpm run typecheck        # es `tsc -b --noEmit`; `npx tsc --noEmit` NO comprueba nada aquí
pnpm run lint
pnpm run guard:adr9       # obligatorio aquí: `valor` es un decimal en string
git diff --check
```

**La línea base de esta rama ya está roja por causas ajenas** (el WIP `98fd848`): 20 tests fallan,
`typecheck` da un error en `src/test/features/proyectos/hooks/contrato.test.tsx:197` y
`format:check` se queja de `src/features/apu-editor/hooks/useApuEditor.ts`. **No los arregles ni
los cuentes como tuyos**; tu listón es *no añadir ni uno*. Tras 078 la suite completa va **495
pasan / 20 fallan**. Compara contra eso.

## 14. STOP conditions
STOP si el recurso o los DTOs de `@ 2803575` contradicen la §9. STOP si hiciera falta quitar
`admin-valores` de `MODULOS_SIN_BACKEND` (eso es 081). STOP si apareciera la necesidad de un
endpoint de búsqueda `q`, que **no existe**.

**Ya NO es STOP** «si el upsert no permite determinar la creación»: se comprobó por `curl` que sí
—201 frente a 200— y la §9bis dice exactamente cómo leerlo.

## 15. Riesgos y rollback
Riesgo de tratar `actualizado` como dinero o perder clave por query encoding. Rollback solo §8; conservar tests de path y statuses.

## 16. Handoff
Entregar contrato, fixture seed, pruebas y decisión de gate a 081 y al siguiente plan.

## 17. Invariantes explícitas
SUPER_ADMIN; clave en path max50; no q inventado; Page normalizada; no aritmética; HTTP solo `src/api`; `pnpm`.
