# Auditoría de validación de planes — 2026-09-09

## Resultado ejecutivo
El frontend está parcialmente alineado con el backend actual. Los planes 001–027 y 029–037, 048–054, 057 y 059–071, 073 están cerrados; 028 y 055 son parciales; 056 está bloqueado por alcance humano; 058 está TODO por procedencia; 072 está bloqueado por 074; 074 requiere corrección y se reescribe. Los planes 038–045 y 047 son históricos/superseded.

## Baseline reproducible

> Nota de documentación stale: el baseline histórico 480 tests/54 E2E verde contradice la medición actual. El 2026-09-09 se descubrieron 484 tests, 5 fallaron y 65 lanzamientos E2E quedaron bloqueados por ejecutables ausentes; no son resultados de producto.
- Frontend `53dd369b5a230976b5ca168a111b11250b1e4ece`; backend `2803575a6956ce5029df06edbf9a43d14aa6b586`.
- `pnpm run verify`: FAIL. Typecheck y lint pasan (8 warnings), ADR9 y formato pasan; Vitest: 71/74 archivos, 479/484 tests, 5 fallos en multipart/logo/import. Build no corrió por la cadena.
- `pnpm run e2e`: bloqueado antes de comportamiento: faltan ejecutables del navegador; 65 tests no pudieron iniciar. Preparación posterior autorizable: `pnpm exec playwright install`.
- Ambos worktrees estaban limpios antes de las herramientas. `.codegraph/` fue generado después y queda fuera de la auditoría.
- Delta backend: `c337950..HEAD`: 172 archivos, +20369/-204; `5673615..HEAD`: 125 archivos, +9878/-603.

## Matriz frontend/backend
| Área | Estado frontend | Backend actual | Problema | Acción |
|---|---|---|---|---|
| Auth | Operativa | Recursos actuales | Contratos deben seguir validándose | 076 |
| Proyectos | Parcial | CRUD y parámetros | duplicar/logo no existen; degradar y STOP; descuento sin backend | 075 |
| Insumos | Parcial | CRUD, selector, importación | PUT exige campos requeridos; usos es stub vacío | 075 y STOP backend |
| APU | Bloqueada | detalle y cálculo reales | selector y agregarFila no están unidos; secciones vacías ocultas | 074 |
| Presupuesto | Parcial | respuestas paginadas | bases centrales backend paginado, front espera array | 075 |
| Cronograma | Parcial | `/cronogramas/{id}/vistas` con Gantt, valorizado y curva S | sin DTO, key, schema, hook ni consumidor | 087 |
| Documentos | Parcial, con exportación ya entregada por 066 | exportación de cronograma implementada | 076 valida el seam existente; 089 verifica integración; ninguno añade funcionalidad nueva de Documentos | 076/089 |
| Admin | Desactivado parcialmente | usuarios, plantillas APU, valores y logs paginados | cuatro gates, páginas/DTO/hooks ausentes | 077–081 |

## STOPs y decisiones
- No abrir `descuento-global`: no hay backend.
- No fabricar duplicación de proyecto ni logo: degradación honesta o STOP canónico.
- Insumo usos: STOP backend; el endpoint devuelve lista vacía por stub.
- Cualquier cambio backend requiere decisión y plan separado.
- Workspace se añade progresivamente en `/proyectos/:id/workspace`, conservando rutas actuales.

## Trazabilidad
Ver [`../00.INDEX.md`](../00.INDEX.md), [`../BITACORA.md`](../BITACORA.md), [`../HANDOFF-ESTADO-Y-GAPS.md`](../HANDOFF-ESTADO-Y-GAPS.md), [`../ORQUESTADOR-PARIDAD.md`](../ORQUESTADOR-PARIDAD.md) y [`../../public/VistaEjemplo.png`](../../public/VistaEjemplo.png).
