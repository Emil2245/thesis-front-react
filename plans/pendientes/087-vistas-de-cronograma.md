# Plan 087: vistas de cronograma

## 01. Estado actual y dependencia
Depende de 076. `CronogramaPage.tsx` y `GanttChart.tsx` consumen `CronogramaResponse`; aún no consumen `/cronogramas/{id}/vistas`. Resource: `../thesis-back-quarkus/src/main/java/ec/uce/propuestas/cronograma/resource/VistasCronogramaResource.java:47-76`.

## 02. Resultado observable
Una vista de solo lectura consume una única GET y presenta Gantt jerárquico, valorizado y curva S, con loading/stale/empty/error, sin recalcular dinero ni avances.

## 03. Dependencias verificadas
076 define cronograma y versión activa. No cambiar edición ni POST `/revisado`.

## 04. Fuentes canónicas
Backend DTOs: `CronogramaVistasResponse.java`, `GanttBloqueResponse.java`, `ValorizadoBloqueResponse.java`, `CurvaSResponse.java`, `CapituloCronogramaResponse.java`, `RubroCronogramaResponse.java`, `ActividadCronogramaResponse.java`, `PeriodoValorizadoResponse.java`, `TotalesCronogramaResponse.java`, `PuntoCurvaSResponse.java`, `SegmentoResponse.java`; IT `src/test/java/ec/uce/propuestas/cronograma/VistasCronogramaResourceIT.java`. Frontend: `src/api/contract.ts:603-655`, `src/features/cronograma/{hooks/useCronograma.ts,components/GanttChart.tsx,pages/CronogramaPage.tsx}` y tests cronograma.

## 05. Contrato exacto
GET `/cronogramas/{id}/vistas` → `{ cronogramaId, gantt:{ cronograma: CronogramaResponse, capitulos: Capitulo[] }, valorizado:{ periodos: Periodo[], capitulos: Capitulo[], totales: Totales }, curvaS:{ puntos: Punto[] } }`. Capitulo: `id,item,descripcion,subcapitulos[],rubros[]`. Rubro: `id,item,codigo,descripcion,unidad,cantidad,precioUnitario,precioTotal,montoPorPeriodo,montoTotal,actividad|null`. Actividad: `id,rubroId,item,codigo,descripcion,unidad,cantidad,precioUnitario,precioTotal,pesoPonderado,avancePorPeriodo,segmentos[],desviacion`; Segmento `inicio,fin`. Periodo/Punto: `periodo,porcentajeParcial,porcentajeAcumulado,montoParcial,montoAcumulado`; Totales: `avanceFinalPorcentaje,montoTotalGeneral,porcentajeCierre`. Todos los decimales son strings.

## 06. Roles, statuses y errores
Resource permite `USUARIO` y `SUPER_ADMIN`; UUID inválido 400 `validacion`; inexistente/ajeno 404 `no-encontrado`; auth 401/403 según gateway. Lectura no escribe. Confirmar cuerpos/status en `VistasCronogramaResourceIT`.

## 07. Alcance incluido
Añadir todos los tipos a `src/api/contract.ts`, Zod schema en el validador existente, key `cronogramaVistas(id)`, `useCronogramaVistas`, jerarquía, valorizado y curva S. Reutilizar Gantt y su `SegmentoResponse`; una sola query.

## 08. Fuera de alcance y STOP de librería
No cambiar backend, mutar cronograma, sumar/parsear valores, ni pedir tres endpoints. Usar SVG/CSS/tablas. Si se propone una librería gráfica: STOP, justificar accesibilidad/licencia/bundle y esperar aprobación; no instalar dentro de este plan.

## 09. Archivos candidatos exactos
`src/api/contract.ts`, `src/api/queryKeys.ts`, `src/features/cronograma/hooks/useCronogramaVistas.ts`, `components/GanttChart.tsx`, nuevos `CronogramaValorizado.tsx`, `CurvaSChart.tsx`, `JerarquiaCronograma.tsx`, `pages/CronogramaPage.tsx`, schema existente, `src/test/features/cronograma/*`, `src/test/handlers.ts`.

## 10. TDD específico
**RED:** MSW acepta solo GET exacto y fixture completo; afirmar una request, strings, jerarquía recursiva, dos segmentos separados, series server y ausencia de cálculos. Casos stale, vacío, 400/404/500 y actividad null. **GREEN:** tipos/schema/hook/componentes. **TRIANGULATE:** `numeroPeriodos`, capítulos anidados y acumulado. **REFACTOR:** compartir filas sin segunda fuente de estado.

## 11. Implementación ordenada
1. Leer cada DTO Java e IT y congelar fixture literal. 2. Escribir tipos/Zod y prueba de tipos. 3. Añadir key/hook `enabled` por id. 4. Envolver/reusar Gantt con `gantt.cronograma` y `gantt.capitulos`. 5. Renderizar valorizado/curva desde strings. 6. Integrar estados/a11y. 7. Ejecutar pruebas focalizadas.

## 12. Aceptación verificable
Contrato completo validado; una GET; jerarquía capítulo→rubro→actividad; segmentos no fusionados; cifras intactas; stale/loading/empty/error distinguibles; tabla/SVG accesible; sin dependencia nueva.

## 13. Verificación
`pnpm run test -- src/test/features/cronograma`; `pnpm run typecheck`; `pnpm run lint`; si se necesita reconfirmar el contrato backend, `(cd ../thesis-back-quarkus && ./gradlew test --tests '*VistasCronogramaResourceIT')`; `git diff --check`.

## 14. STOP / rollback
STOP por DTO/status discrepante, schema imposible, librería o aritmética requerida. Rollback solo archivos candidatos, conservando RED y Gantt existente.

## 15. Riesgos y controles
Decimal convertido: fixture/schema string. Tres fetches: contar requests. Jerarquía plana: fixture recursivo y aserción estructural.

## 16. Handoff
A 088 entregar DTO/key/hook, componente público, estados, tests y decisión de reuso del Gantt; declarar el único fetch.

## 17. Invariantes
Una proyección/GET; solo lectura; servidor calcula; strings intactos; roles/owner-to-404; UI español accesible; CSS/SVG primero.
