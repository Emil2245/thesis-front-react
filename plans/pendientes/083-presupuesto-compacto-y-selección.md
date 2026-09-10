# 083 — Presupuesto compacto y selección

**Estado: IMPLEMENTADO / DONE** · Verificado el 2026-09-09.

Evidencia: `pnpm exec vitest run src/test/features/workspace src/test/routes/index.test.tsx` pasó con **10 tests en 4 archivos** (el test focalizado del compacto cubre 6); Prettier, lint y `git diff --check` pasaron. El typecheck permanece bloqueado únicamente por el error conocido del Plan 076 en `src/test/features/proyectos/hooks/contrato.test.tsx:197` (`mostrarSeccionesVacias` no pertenece a `ParametrosProyectoEditarRequest`). No se ejecutó E2E.

## 01. Estado inicial verificable
`PresupuestoPage` usa `useVersionActiva`, `usePresupuesto` y `ArbolPresupuesto`; el árbol está orientado a CRUD (`FilaCapitulo`, `FilaRubro`) y no publica un rubro seleccionado en URL ni en un panel hermano.

## 02. Resultado observable
En el panel izquierdo del workspace se ve un árbol compacto con columnas Ítem, Descripción, Und., Cantidad, P.U. y Parcial; los capítulos se expanden y un rubro seleccionable determina el detalle del panel derecho.

## 03. Dependencias
Depende de 082. El panel derecho y la pestaña APU pertenecen a 084; aquí solo se define la selección y su contrato.

## 04. Fuentes canónicas
`src/features/presupuesto/pages/PresupuestoPage.tsx`, `components/ArbolPresupuesto.tsx`, `FilaCapitulo.tsx`, `FilaRubro.tsx`, `hooks/usePresupuesto.ts`, `src/api/contract.ts`, `src/api/queryKeys.ts`, `src/shell/contexto.ts`, fixtures/handlers y `src/test/features/presupuesto/pages/PresupuestoPage.test.tsx`.

## 05. Contrato real a preservar
`usePresupuesto(presupuestoId)` hace GET `/presupuestos/:id`; versión viene de `useVersionActiva`. Leer la forma real de `PresupuestoResponse`, `CapituloResponse` y rubro antes de mapear columnas. Los valores monetarios se muestran como `Decimal` del servidor; no usar `parseFloat`, `toFixed` ni sumar en cliente.

## 06. Alcance incluido
Variante compacta reutilizable del árbol para workspace, expansión de capítulos y rubros, selección por URL, fallback válido y botón/estado de selección accesible. El CRUD existente queda fuera de la variante compacta.

## 07. Fuera de alcance
No editar/crear/eliminar desde el árbol compacto, no nueva query ni endpoint, no cambios de DTO, no cálculo de totales, no alterar la página presupuesto completa fuera de integración mínima.

## 08. Archivos exactos candidatos
Crear `src/features/workspace/components/PresupuestoCompacto.tsx` y `src/test/features/workspace/components/PresupuestoCompacto.test.tsx`. Editar la página workspace creada en 082 y, solo para reutilización tipada, `src/features/presupuesto/components/ArbolPresupuesto.tsx`. Editar `src/api/contract.ts` únicamente si la forma real ya existente demuestra una omisión; detenerse antes de hacerlo.

## 09. Decisión de URL
Usar `?rubro=<rubroId>` (nombre único y explícito). Preservar `v` al seleccionar mediante `URLSearchParams`; si el ID no existe en la respuesta, limpiar `rubro` y seleccionar el primer rubro visible válido; si no hay rubros, no inventar selección. No mantener una copia Zustand/local paralela.

## 10. RED específico
Afirmar antes de implementar: columnas exactas; capítulo colapsado no muestra hijos y expandido sí; click/teclado en rubro actualiza `rubro` conservando `v`; `aria-selected` identifica uno; ID stale se limpia y cae al primero; no aparecen botones CRUD; dinero coincide literalmente con fixture; loading/error/vacío son accesibles.

## 11. Pasos
1. Extraer la forma de DTO y construir fixture con capítulo, subcapítulo, rubro y APU.
2. Escribir RED sobre URL y columnas.
3. Implementar lectura de search params y fallback determinista.
4. Renderizar filas compactas y expansión sin mutar datos ni calcular importes.
5. Conectar la selección al slot derecho del workspace mediante props; cubrir back/forward.

## 12. Aceptación
Selección reproducible por URL, fallback y limpieza verificables; `v` intacto; columnas y valores server-rendered; sin mutaciones/CRUD ni aritmética; teclado y estados cubiertos.

## 13. Verificación focalizada
**IMPLEMENTADO / DONE.** `pnpm exec vitest run src/test/features/workspace src/test/routes/index.test.tsx` pasó con **10 tests en 4 archivos** (el test focalizado de `PresupuestoCompacto` cubre 6). Prettier, lint y `git diff --check` pasaron. El typecheck permanece bloqueado únicamente por el error conocido del Plan 076 en `src/test/features/proyectos/hooks/contrato.test.tsx:197` (`mostrarSeccionesVacias` no está en `ParametrosProyectoEditarRequest`). No se ejecutó E2E.

## 14. STOP
STOP si DTO no contiene unidad/cantidad/precio/parcial como se supone, si un rubro no tiene ID estable, o si seleccionar exige otra query/mutación. Documentar la discrepancia y handoff a revisión, no inventar campos.

## 15. Rollback
Retirar componente compacto e integración de 082; dejar intacto el árbol CRUD y hooks existentes.

## 16. Handoff
**Cerrado y entregado a 084:** la selección es propietaria de la URL mediante `?rubro`, conserva `v`, renderiza un árbol recursivo accesible y de solo lectura, muestra literalmente los `Decimal` string del servidor y no añade CRUD ni API. El contrato para el panel derecho y la pestaña APU es el rubro seleccionado; 084 debe consumir esa selección y su shape de APU disponible. No existe edición en compact view.

## 17. Invariantes
`usePresupuesto` y versión activa se reutilizan; URL conserva `?v=`; dinero del servidor; no CRUD; accesibilidad; no API nueva.
