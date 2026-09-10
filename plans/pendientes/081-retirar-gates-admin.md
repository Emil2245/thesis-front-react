# 081 — Retirar gates de administración

> **Deriva corregida el 2026-09-10**, con 077–080 ya DONE y mergeados. La §05 trae la matriz de
> evidencia real y la §08bis la lista **exacta** de los 8 errores de compilación que provoca vaciar
> el `Set`, medida ejecutando el cambio. Este es el único plan de la rama que **debe** editar
> `paginas-admin.test.tsx`.

## 01. Estado inicial verificable
`src/lib/disponibilidad.ts` contiene exactamente `admin-usuarios`, `admin-plantillas`,
`admin-valores` y `admin-logs`.

Las cuatro páginas **son wrappers de verdad**, creados por 077–080: cada `AdminXPage` consulta
`MODULOS_SIN_BACKEND.has("admin-x")` y delega en su `AdminXPageActiva`, que ya consume el backend
real. Antes de esta rama no existía ningún wrapper — las páginas devolvían `ModuloNoDisponible`
incondicionalmente y vaciar el `Set` no habría encendido nada.

`RUTAS_ADMIN` en `src/shell/Sidebar.tsx` lleva `modulo` en esas cuatro entradas, que es lo que
pinta la insignia «pronto».

## 02. Resultado observable
Las cuatro rutas admin activas dejan de mostrar “pronto” y renderizan su página real. Un usuario sin `SUPER_ADMIN` sigue bloqueado por `RutaAdmin`.

## 03. Dependencias
Requiere evidencia completa de 077, 078, 079 y 080: contrato real, handler estricto y prueba UI de cada página. Si una dependencia no aporta esa prueba, no se cambia el Set.

## 04. Fuentes canónicas
`src/lib/disponibilidad.ts`, `src/routes/index.tsx`, `src/shell/Sidebar.tsx`, `src/components/comunes/ModuloNoDisponible.tsx`, páginas `src/features/admin/pages/AdminUsuariosPage.tsx`, `AdminPlantillasPage.tsx`, `AdminValoresPage.tsx`, `AdminLogsPage.tsx`, y `src/test/features/admin/pages/paginas-admin.test.tsx` más pruebas específicas de 077–080.

## 05. Evidencia previa obligatoria
**Matriz de evidencia — las cuatro dependencias están DONE y mergeadas en `plans/077-081`.**

| Clave | Plan | Endpoint real @ `2803575` | Hook | Página activa | Prueba que afirma datos |
| --- | --- | --- | --- | --- | --- |
| `admin-usuarios` | 077 | `/admin/usuarios` (GET, GET/{id}, POST, PUT, desactivar, reactivar, DELETE) | `src/features/admin/hooks/useUsuariosAdmin.ts` | `AdminUsuariosPageActiva.tsx` | `AdminUsuariosPageActiva.test.tsx` + contrato en `contrato.test.tsx` |
| `admin-plantillas` | 078 | `/admin/plantillas-apu` (GET `tipo=SISTEMA`, POST, PUT parcial, DELETE) | `usePlantillasAdmin.ts` | `AdminPlantillasPageActiva.tsx` | `AdminPlantillasPageActiva.test.tsx` + contrato |
| `admin-valores` | 079 | `/admin/valores-referencia` (GET, PUT upsert 201/200, DELETE) | `useValoresReferencia.ts` | `AdminValoresPageActiva.tsx` | `AdminValoresPageActiva.test.tsx` + contrato |
| `admin-logs` | 080 | `/admin/logs` (GET sólo lectura, filtros AND) | `useLogsActividad.ts` | `AdminLogsPageActiva.tsx` | `AdminLogsPageActiva.test.tsx` + contrato |

Las cuatro se verificaron contra el backend real por `curl` y sus tests afirman **cuerpo y query
params salientes**, no sólo el título. El revisor comprobó cada una rompiendo el código a
propósito. **La condición de la §03 está satisfecha: se puede retirar el gate.**

Corrección: la §05 anterior pedía «handler con `*`». **No.** Ninguno de los handlers MSW de este
repo lleva `*` — se comprobó en 077 que la regla del `*` de `AGENTS.md` es de **Playwright**
(`page.route`), no de MSW, que casa por pathname ignorando el query string.

## 06. Alcance incluido
Vaciar el `Set`, quitar `modulo` de las cuatro entradas de `RUTAS_ADMIN`, retirar la rama del
gate de las cuatro páginas y **actualizar `paginas-admin.test.tsx`**, cuyos cuatro casos
«(degradada)» dejan de ser ciertos.

## 07. Fuera de alcance
No DTOs, hooks HTTP, handlers de API ni backend: sus contratos son propiedad de 077–080. No tocar Bases, Parámetros ni otras rutas.

## 08. Archivos exactos candidatos
- `src/lib/disponibilidad.ts` — vaciar el `Set`. **No borres el archivo, ni
  `MOTIVO_SIN_BACKEND`, ni el tipo `ModuloSinBackend`**: el patrón de degradación sigue
  documentado en `AGENTS.md` y volverá a hacer falta. Actualiza el comentario de cabecera, que
  hoy describe un estado que deja de ser verdad.
- `src/shell/Sidebar.tsx` — quitar `modulo` de las cuatro entradas de `RUTAS_ADMIN`.
- Las cuatro páginas `src/features/admin/pages/Admin{Usuarios,Plantillas,Valores,Logs}Page.tsx` —
  quitar la rama del gate. **Conserva el nombre exportado** (`AdminUsuariosPage`, etc.): así
  `src/routes/index.tsx` **no se toca**, porque hace `lazy` sobre esos nombres. Comprobado.
- `src/test/features/admin/pages/paginas-admin.test.tsx` — **este plan SÍ lo edita.** Ver §08bis.

**Fuera de alcance, sin excepción:** cualquier archivo de `src/api/`, los hooks, los handlers y
las `*PageActiva`. Son propiedad de 077–080 y ya están mergeados. `src/routes/index.tsx` tampoco
hace falta tocarlo.

## 08bis. Lo que rompe al vaciar el Set — lista exacta, medida

Vaciar el `Set` lo convierte en `Set<never>` y `ModuloSinBackend` en `never`. **Eso es
deliberado y bueno**: el compilador te obliga a terminar el trabajo. Ejecuté el cambio y
`pnpm run typecheck` devolvió **exactamente estos 8 errores**, que son tu lista de tareas:

```
src/features/admin/pages/AdminLogsPage.tsx(11,31):       TS2345 '"admin-logs"' no asignable a 'never'
src/features/admin/pages/AdminPlantillasPage.tsx(11,31): TS2345 '"admin-plantillas"' no asignable a 'never'
src/features/admin/pages/AdminUsuariosPage.tsx(11,31):   TS2345 '"admin-usuarios"' no asignable a 'never'
src/features/admin/pages/AdminValoresPage.tsx(13,31):    TS2345 '"admin-valores"' no asignable a 'never'
src/shell/Sidebar.tsx(96,70):   TS2322 'string' no asignable a 'undefined'
src/shell/Sidebar.tsx(102,5):   TS2322 'string' no asignable a 'undefined'
src/shell/Sidebar.tsx(109,5):   TS2322 'string' no asignable a 'undefined'
src/shell/Sidebar.tsx(111,65):  TS2322 'string' no asignable a 'undefined'
```

Los cuatro primeros se resuelven borrando la rama del gate de cada página; los cuatro de
`Sidebar` quitando `modulo` de las cuatro entradas de `RUTAS_ADMIN`. **Cuando no quede ninguno de
los ocho, el trabajo está completo.**

Hay un noveno error, `src/test/features/proyectos/hooks/contrato.test.tsx(197,47)`, que **NO es
tuyo**: es preexistente, del commit WIP `98fd848`, y pertenece a otro plan. **No lo arregles.**

## 08ter. `paginas-admin.test.tsx`: el único plan que lo edita

Ese archivo tiene cuatro casos `describe.each` «(degradada)» que afirman que cada `AdminXPage`
muestra «todavía no está disponible» y **no lanza ninguna petición**. Durante 077–080 eso era
cierto y por eso era intocable. **Al vaciar el `Set` deja de serlo**, y los cuatro se pondrán en
rojo: es la señal correcta, no un fallo.

**No los borres** — está prohibido retirar pruebas para avanzar. **Conviértelos**: donde afirmaban
que la página no pedía nada, deben afirmar que ahora **sí** pide su endpoint real y pinta sus
datos. Usa `espiar()`, que ya está importado en ese archivo, y conserva el bloque de
`AdminParametrosPage` **intacto** (cinco de sus casos ya fallan por causas ajenas y preexistentes;
no son tuyos y no debes tocarlos ni contarlos).

Es la mejor prueba de que el gate se abrió de verdad: el mismo archivo que garantizaba el silencio
pasa a garantizar la petición.

## 09. Contrato de activación
`MODULOS_SIN_BACKEND` queda vacío. `RUTAS_ADMIN` no lleva `modulo` en las cuatro rutas. Las rutas siguen bajo `RutaAdmin` y no se crea HTTP.

## 10. RED específico
Antes del cambio, deja en rojo lo que debe cambiar: que `MODULOS_SIN_BACKEND` queda vacío, que
las cuatro entradas de `RUTAS_ADMIN` no llevan `modulo` (ninguna insignia «pronto») y que cada
`AdminXPage` renderiza su contenido real y lanza su petición. Los cuatro casos convertidos de
`paginas-admin.test.tsx` son precisamente ese RED.

## 11. Pasos
1. Auditar y anotar la matriz de evidencia de dependencias.
2. Hacer RED sobre Set, navegación y render real.
3. Quitar las cuatro claves y limpiar únicamente comentarios/wrappers stale.
4. Mantener nombres/exportaciones actuales si ya son activos; si hay wrapper, seguir el patrón `<Nombre>PageActiva` y cambiar el lazy import de forma atómica.
5. Ejecutar pruebas de cada página y admin guard.

## 12. Aceptación
Ninguna de las cuatro rutas muestra `ModuloNoDisponible` ni “pronto”; cada prueba verifica datos, loading/error y accesibilidad. No hay cambios en contratos.

## 13. Verificación focalizada
En el worktree, y **`pnpm` siempre, `npm` nunca**:

```
pnpm install
pnpm exec vitest run src/test/features/admin
pnpm run typecheck        # deben quedar 0 errores tuyos; sólo sobrevive el ajeno de contrato.test.tsx:197
pnpm run lint
pnpm run format:check     # sólo debe quejarse de useApuEditor.ts
git diff --check
```

**La línea base de la rama está roja por causas ajenas** (WIP `98fd848`): 20 tests, el typecheck de
`contrato.test.tsx:197` y el formato de `useApuEditor.ts`. **No los arregles ni los cuentes como
tuyos.** Tras 080 la suite completa va **527 pasan / 20 fallan**. Tu listón: no añadir ni un fallo,
y que los 8 errores de la §08bis queden en cero.

## 14. STOP
STOP si alguna de las cuatro dependencias no tuviera su prueba de contrato — **no es el caso, la
§05 lo documenta**. STOP si hiciera falta relajar `RutaAdmin` (jamás) o tocar un DTO, hook o
handler de `src/api/`. STOP si apareciera una quinta clave en el `Set`.

**No es STOP** que se pongan rojos los cuatro casos «(degradada)» de `paginas-admin.test.tsx`: es
el resultado esperado y la §08ter dice qué hacer con ellos.

## 15. Rollback
Restaurar solo `disponibilidad`, Sidebar, routes, páginas y tests del plan; mantener intactos contratos y cambios de dependencias. Si falla una página, volver a dejar su clave únicamente y documentar la razón.

## 16. Handoff
A 082 y 089: Set final, rutas activas, exports elegidos y comandos verdes. 082 puede asumir navegación admin activa, no cambios de API.

## 17. Invariantes
`RutaAdmin` no se relaja; no API/DTO; gates por página; `src/api/` única capa HTTP; textos accesibles.
