# Plan 088: resumen e integración opcional

## 01. Estado actual y dependencia
Depende de 083–087. `src/features/presupuesto/hooks/usePresupuesto.ts:20-27` ya define `useResumen` para GET `/presupuestos/{id}/resumen`; `ResumenProyectoPage.tsx` usa sus datos en `FranjaTotales`.

## 02. Resultado observable
El workspace muestra tab Resumen con totales server y, solo si cronograma está listo, una entrada Cronograma que compone la vista 087. Cambiar tab no dispara fetch duplicado ni pierde selección.

## 03. Dependencias verificadas
Inspeccionar composición real de 083–087, `useVersionActiva`, `ResumenComponentesResponse` en `src/api/contract.ts`, rutas y tests. Si 087 no entrega componente estable, no inventar integración: STOP.

## 04. Fuentes canónicas
`src/features/presupuesto/hooks/usePresupuesto.ts`; `src/features/proyectos/pages/ResumenProyectoPage.tsx`; `src/api/queryKeys.ts`; `src/api/contract.ts`; workspace/tab files de 083–087; `src/test/features/presupuesto/hooks/contrato.test.tsx`, tests de proyecto/workspace y handlers.

## 05. Contrato exacto
Resumen usa solo `GET /presupuestos/{id}/resumen` y `ResumenComponentesResponse` existente, incluyendo `totalGeneral` y `porComponente`. Cronograma usa el hook/key de 087 y su único GET; no copiar DTO ni hacer aritmética.

## 06. Alcance incluido
Añadir tab/panel Resumen; reutilizar `useResumen`, `Moneda`, `FranjaTotales` o extraerlo sin cambiar contrato; enlace/entrada opcional a componente 087; composición de loading/stale/error/no-selection/a11y.

## 07. Fuera de alcance
No endpoint, DTO, query paralela, cálculo de porcentajes/dinero, cambios backend, ni reimplementar Gantt/valorizado/curva.

## 08. Archivos candidatos exactos
Crear `src/features/workspace/components/PestanaResumen.tsx` y `src/test/features/workspace/components/PestanaResumen.test.tsx`; integrar en `src/features/workspace/pages/WorkspacePage.tsx`. Reusar `src/features/presupuesto/hooks/usePresupuesto.ts`, `src/features/proyectos/pages/ResumenProyectoPage.tsx` solo para extraer presentación compartida cuando sea necesario, y los componentes públicos de 087. No modificar handlers salvo que falte un fixture exacto.

## 09. Estados y a11y
Sin versión: “Selecciona una versión”; loading skeleton; stale badge sin ocultar datos; error con reintento; resumen vacío con mensaje; cronograma opcional oculto/disabled con razón contractual. Tabs keyboard-accessible, `aria-selected`, panel asociado y headings únicos.

## 10. TDD específico
**RED:** afirmar que tab Resumen muestra exactamente valores del fixture, una request a resumen, no calcula; cronograma reutiliza la query de 087 y no hace GET al montar si no se selecciona. **GREEN:** composición. **TRIANGULATE:** cambio de versión, stale/error y a11y. **REFACTOR:** composición sin nueva fuente de estado.

## 11. Implementación ordenada
1. Mapear shell y selección. 2. Confirmar response/fixtures. 3. Escribir RED. 4. Montar panel con `useResumen` existente. 5. Componer entrada 087 con lazy/render condicional sin duplicar hook. 6. Cubrir estados/a11y. 7. Focal tests.

## 12. Aceptación verificable
Totales coinciden byte por byte con server; una query por contrato; transición de tabs conserva versión/APU; cronograma opcional no agrega fetch; todos los estados y roles accesibles pasan.

## 13. Verificación
`pnpm run test -- src/test/features/workspace/components/PestanaResumen.test.tsx src/test/features/presupuesto src/test/features/proyectos`; `pnpm run typecheck`; `pnpm run lint`; `git diff --check`.

## 14. STOP / rollback
STOP si shell/selection no coincide, 087 no puede componerse sin segundo fetch o resumen requiere cálculo. Rollback solo paths candidatos; no alterar hooks compartidos sin prueba.

## 15. Riesgos y controles
Doble `useResumen`: request-count. Desincronización de versión: key existente y cambio-version test. Optional cronograma ambiguo: decisión documentada en tab, no fallback ficticio.

## 16. Handoff
A 089 entregar composición, paths, baseline focal, decisiones de cronograma opcional y estados cubiertos.

## 17. Invariantes
Servidor es fuente de totales; composición no dominio nuevo; HTTP en API/hooks existentes; UI española/accesible; sin aritmética.
