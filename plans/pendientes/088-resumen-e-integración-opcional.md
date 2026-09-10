# Plan 088: resumen e integración opcional — SUPERSEDED

## 01. Estado terminal

**SUPERSEDED / no aplicable desde 2026-09-10.** No debe ejecutarse ni producir código.

## 02. Motivo

La propuesta original trasladaba Resumen y Cronograma a pestañas de `WorkspacePage`. La decisión de navegación vigente conserva responsabilidades separadas:

- Resumen permanece en `ResumenProyectoPage` y sigue consumiendo `GET /presupuestos/{id}/resumen`.
- Cronograma permanece como ruta independiente `/proyectos/:id/cronograma` y etapa visible del sidebar.
- El workspace conserva Presupuesto, APU, Insumos y Especificación técnica; no absorbe el cronograma.

Esta separación evita duplicar queries, mezclar una superficie temporal ancha con el workspace dividido y convertir una etapa completa del flujo en un panel secundario.

## 03. Trabajo anulado

No crear `PestanaResumen`, `PestanaCronograma` ni tabs superiores adicionales en `WorkspacePage`; no extraer `FranjaTotales` para ese propósito; no montar los componentes del Plan 087 dentro del workspace; no añadir lazy queries condicionales para una integración descartada.

## 04. Trabajo sucesor

Los Planes 090–093 mejoran la presentación dentro de `CronogramaPage`: selector local de vistas, Gantt jerárquico interactivo, matriz valorizada y Curva S gráfica. El Plan 089 valida Resumen y Cronograma como journeys y rutas independientes.

## 05. Evidencia preservada

Los contratos identificados por este plan siguen vigentes, pero no requieren integración entre páginas: `useResumen` continúa siendo propiedad del resumen del proyecto y `useCronogramaVistas` de la ruta de cronograma. El Plan 087 ya verificó la petición única de vistas.

## 06. Invariantes

Sin cambios backend; sin duplicar queries; servidor como fuente de totales; Cronograma en sidebar; Resumen fuera del workspace; este plan no autoriza implementación.
