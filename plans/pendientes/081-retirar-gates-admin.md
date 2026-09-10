# 081 — Retirar gates de administración

## 01. Estado inicial verificable
`src/lib/disponibilidad.ts` contiene exactamente `admin-usuarios`, `admin-plantillas`, `admin-valores` y `admin-logs`. Las cuatro páginas aún pueden renderizar wrappers. Descuento global fue retirado del frontend en el Plan 075 porque no existe contrato backend.

## 02. Resultado observable
Las cuatro rutas admin activas dejan de mostrar “pronto” y renderizan su página real. Un usuario sin `SUPER_ADMIN` sigue bloqueado por `RutaAdmin`.

## 03. Dependencias
Requiere evidencia completa de 077, 078, 079 y 080: contrato real, handler estricto y prueba UI de cada página. Si una dependencia no aporta esa prueba, no se cambia el Set.

## 04. Fuentes canónicas
`src/lib/disponibilidad.ts`, `src/routes/index.tsx`, `src/shell/Sidebar.tsx`, `src/components/comunes/ModuloNoDisponible.tsx`, páginas `src/features/admin/pages/AdminUsuariosPage.tsx`, `AdminPlantillasPage.tsx`, `AdminValoresPage.tsx`, `AdminLogsPage.tsx`, y `src/test/features/admin/pages/paginas-admin.test.tsx` más pruebas específicas de 077–080.

## 05. Evidencia previa obligatoria
Para cada clave, identificar endpoint, DTO, hook, handler con `*` y prueba que afirma datos y error: usuarios (077), plantillas (078), valores (079), logs (080). Registrar paths y nombres exportados. No aceptar un montaje que solo compruebe el título.

## 06. Alcance incluido
Eliminar solo esas cuatro entradas del Set; activar exports reales, rutas y navegación; retirar comentarios/wrappers de “sin backend”; ajustar tooltips/insignias y pruebas.

## 07. Fuera de alcance
No DTOs, hooks HTTP, handlers de API ni backend: sus contratos son propiedad de 077–080. No tocar Bases, Parámetros ni otras rutas.

## 08. Archivos exactos candidatos
Editar `src/lib/disponibilidad.ts`, `src/shell/Sidebar.tsx`, `src/routes/index.tsx` y `src/test/features/admin/pages/paginas-admin.test.tsx`. Editar cada página admin solo si contiene wrapper stale. Añadir/editar pruebas específicas únicamente en `src/test/features/admin/pages/`. No renombrar una exportación sin actualizar su lazy import y prueba en la misma transacción.

## 09. Contrato de activación
`MODULOS_SIN_BACKEND` queda vacío. `RUTAS_ADMIN` no lleva `modulo` en las cuatro rutas. Las rutas siguen bajo `RutaAdmin` y no se crea HTTP.

## 10. RED específico
Antes del cambio, añadir expectativas que fallen: Set vacío, las cuatro entradas sin insignia “pronto” y cada ruta mostrando su contenido real. Los tests deben distinguir wrapper de página activa.

## 11. Pasos
1. Auditar y anotar la matriz de evidencia de dependencias.
2. Hacer RED sobre Set, navegación y render real.
3. Quitar las cuatro claves y limpiar únicamente comentarios/wrappers stale.
4. Mantener nombres/exportaciones actuales si ya son activos; si hay wrapper, seguir el patrón `<Nombre>PageActiva` y cambiar el lazy import de forma atómica.
5. Ejecutar pruebas de cada página y admin guard.

## 12. Aceptación
Ninguna de las cuatro rutas muestra `ModuloNoDisponible` ni “pronto”; cada prueba verifica datos, loading/error y accesibilidad. No hay cambios en contratos.

## 13. Verificación focalizada
`pnpm exec vitest run src/test/features/admin/pages`; `pnpm exec tsc -b --pretty false`; `pnpm run lint`; `git diff --check`.

## 14. STOP
STOP si falta una prueba contractual previa, una página sigue siendo wrapper, el Set requiere otra clave, o una ruta modifica DTO/API. Entregar la matriz y no retirar parcialmente gates.

## 15. Rollback
Restaurar solo `disponibilidad`, Sidebar, routes, páginas y tests del plan; mantener intactos contratos y cambios de dependencias. Si falla una página, volver a dejar su clave únicamente y documentar la razón.

## 16. Handoff
A 082 y 089: Set final, rutas activas, exports elegidos y comandos verdes. 082 puede asumir navegación admin activa, no cambios de API.

## 17. Invariantes
`RutaAdmin` no se relaja; no API/DTO; gates por página; `src/api/` única capa HTTP; textos accesibles.
