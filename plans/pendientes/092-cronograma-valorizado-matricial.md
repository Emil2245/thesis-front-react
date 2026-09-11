# Plan 092: cronograma valorizado matricial

> **Estado: DONE.** Implementado con una matriz única, jerarquía recursiva, columnas sticky, períodos M/S y resúmenes literales del servidor.

## 01. Estado y dependencia

Depende del Plan 090 y reutiliza sin modificar `CronogramaVistasResponse.valorizado`. La vista actual separa una tabla vertical de períodos y un detalle jerárquico desplegable; el resultado no se aproxima al documento valorizado de obra ni aprovecha el ancho disponible.

## 02. Resultado observable

El panel **Cronograma valorizado** presenta una matriz grande y compacta: jerarquía de presupuesto en filas, identidad y valores base a la izquierda, períodos en columnas y resúmenes del servidor al pie. Encabezados y columnas de identidad permanecen visibles durante el desplazamiento.

## 03. Fuentes canónicas

- `ValorizadoBloqueResponse`, `PeriodoValorizadoResponse`, `RubroCronogramaResponse` y `TotalesCronogramaResponse` del backend.
- Entrevista N05 y ejemplo real de cronograma valorizado aportado en `../thesis-docs`/material visual de la tesis.
- `CronogramaValorizado.tsx` y fixture `cronogramaVistasFixture`.

La referencia define densidad y lectura matricial, no autoriza copiar fórmulas, columnas inexistentes ni estructura de datos externa.

## 04. Estructura de la matriz

- Filas estructurales para capítulo y subcapítulo, sin subtotales inventados.
- Filas de rubro con ítem, descripción, unidad, cantidad, precio unitario, precio total y `montoPorPeriodo[periodo]`.
- Actividad como contexto de programación solo cuando aporte información entregada por el DTO; no duplicar una fila sin valor de lectura.
- Filas finales, alimentadas por `periodos[]`, para porcentaje parcial, porcentaje acumulado, monto parcial y monto acumulado.
- Resumen visible con `avanceFinalPorcentaje`, `montoTotalGeneral` y `porcentajeCierre`.
- Etiquetas `M1…Mn` o `S1…Sn` coherentes con Gantt.

## 05. Reglas de datos

Todos los Decimal cruzan el seam como strings y se formatean solo para presentación. No sumar `montoPorPeriodo`, no derivar subtotales de capítulo, no reconstruir acumulados y no redondear. Una ausencia se muestra como «—» o cero solo según el significado contractual; no se convierten ambos casos en lo mismo.

## 06. Alcance incluido

- Reorganizar `CronogramaValorizado` como una sola matriz principal.
- Sticky header y columnas de ítem/descripción; scroll horizontal y vertical dentro del panel.
- Densidad compacta con números tabulares, encabezados agrupados y leyenda mínima.
- Estado vacío para períodos y para rubros.
- Tabla semántica con `caption`, scopes y asociación comprensible de headers.
- Prueba representativa de 120 períodos y jerarquía recursiva sin truncar columnas.

## 07. Fuera de alcance

No subtotales por capítulo, porcentajes calculados por rubro, edición en celdas, fórmulas, exportación PDF/XLSX, paginación backend, segunda query, nuevas propiedades DTO ni virtualización sin medición.

## 08. Archivos candidatos

`src/features/cronograma/components/CronogramaValorizado.tsx`; auxiliares presentacionales acotados si reducen complejidad; pruebas del componente y página; fixture de cronograma solo para casos adicionales contractualmente válidos; captura E2E/manual de la matriz.

## 09. TDD focal

**RED:** afirmar orden jerárquico, columnas `M/S`, valores byte a byte de `montoPorPeriodo`, cuatro filas resumen desde `periodos[]`, ausencia de subtotal de capítulo, sticky headers/identidad y accesibilidad. **GREEN:** matriz mínima. **TRIANGULATE:** 1 y 120 períodos, rubro sin actividad/montos, capítulo anidado y strings de seis/cuatro decimales. **REFACTOR:** compartir etiquetas de período sin crear agregaciones.

## 10. Implementación ordenada

1. Congelar fixture y semántica de ausencias.
2. Definir encabezado y filas sin cálculos.
3. Implementar la matriz y resúmenes del servidor.
4. Aplicar sticky/scroll/densidad.
5. Validar teclado, lector de pantalla y viewport estrecho.
6. Medir el caso 120 períodos antes de considerar optimizaciones.

## 11. Aceptación verificable

La jerarquía se lee verticalmente y los períodos horizontalmente; identidad y encabezados permanecen visibles; los cuatro resúmenes coinciden con el payload; no se muestra subtotal de capítulo no entregado; Decimal no cambia; 120 períodos siguen siendo alcanzables mediante scroll.

## 12. Verificación

`pnpm exec vitest run src/test/features/cronograma/components/CronogramaValorizado.test.tsx src/test/features/cronograma/pages/CronogramaPage.test.tsx`; `pnpm run typecheck`; `pnpm run lint`; `pnpm run guard:adr9`; Playwright/axe de la vista; `git diff --check`.

## 13. STOP y rollback

STOP si el diseño exige subtotal de capítulo, cálculo monetario, columnas que el DTO no posee o una nueva ruta backend. Rollback limitado a la presentación; conservar la tabla actual hasta que la matriz cumpla semántica y a11y.

## 14. Riesgos y controles

Una tabla ancha puede ser ilegible: sticky, encabezados agrupados y scroll explícito. Grandes presupuestos pueden producir muchas celdas: medir DOM/scroll antes de introducir dependencia. Ausente no equivale a cero: prueba dedicada.

## 15. Handoff

Entregar al Plan 089 matriz de payload→celda, captura a ancho reducido/amplio y medición del caso máximo mensual de 120 períodos.

## 16. Invariantes

Servidor calcula; matriz no agrega; Decimal string; jerarquía recursiva; una proyección; sin edición ni dependencia nueva; UI española y accesible.

## 17. Cierre

`CronogramaValorizado.tsx` ahora presenta una sola matriz semántica con identidad, valores base, `montoTotal`, montos por período y cuatro filas de resumen alimentadas directamente por `periodos[]`. La unidad temporal se recibe del bloque Gantt de la misma proyección, sin crear otra consulta. Se añadieron casos de ausencia/null, MES/SEMANA y 120 períodos.

Evidencia: `pnpm run verify` verde con 609 pruebas en 88 archivos; Playwright Chromium de capturas 13/13 verde; la captura actualizada es `screenshots/10-cronograma-valorizado.png`.
