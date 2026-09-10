# Plan 091: Gantt jerárquico interactivo

> **Estado: DONE.** Implementado en `CronogramaPage` con una única cuadrícula jerárquica, edición preservada, controles accesibles y drag/resize progresivo.

## 01. Estado y dependencia

Depende del Plan 090. Sustituye la duplicación actual entre `JerarquiaCronograma`, `TablaActividades` y `GanttChart` por una única superficie dentro del panel Gantt, sin cambiar los flujos de configuración o revisión.

## 02. Resultado observable

El usuario ve presupuesto y programación en paralelo: a la izquierda, la jerarquía capítulo → subcapítulo → rubro → actividad; a la derecha, el eje temporal por períodos y las barras de cada actividad. Cada fila mantiene alineados identidad y timeline durante scroll, expansión y edición.

## 03. Modelo de interacción

- Columnas de identidad fijadas: ítem, descripción y, solo donde el DTO lo entrega, unidad y peso.
- Encabezado temporal fijado con `M1…Mn` o `S1…Sn`; no se inventan fechas calendario.
- Capítulos/subcapítulos colapsables; rubros sin actividad se muestran como «Sin actividad».
- Una actividad con varios `segmentos[]` conserva barras separadas.
- Click o activación por teclado abre `DialogoEditarActividad`.
- Drag de una barra completa propone `MOVER_SEGMENTO { inicio, fin, delta }`.
- Drag de sus extremos propone `REDIMENSIONAR_SEGMENTO { inicio, fin, nuevoInicio, nuevoFin }`.
- El gesto muestra preview acotado a `1..numeroPeriodos` y exige confirmación antes de mutar.
- Toda acción de puntero tiene alternativa accesible mediante botones/menú y campos de período; el drag es mejora progresiva, no la única vía.

## 04. Fuentes canónicas

Backend: `ActividadProgramarRequest`, `ActividadCronogramaResponse.segmentos`, `PATCH /cronogramas/{id}/actividades/{actividadId}` y sus pruebas. Funcional: entrevista N05 y, solo como referencia UX, `../ingepresupuestos/core/cronograma.py` y `views/cronograma_view.py`.

Referencias web no normativas evaluadas:

- [Kibo UI Gantt](https://www.kibo-ui.com/components/gantt)
- [Frappe Gantt](https://github.com/frappe/gantt)
- [gantt-task-react](https://github.com/MaTeMaTuK/gantt-task-react)

No se adoptan en este plan: sus modelos son principalmente orientados a fechas y no se verificaron garantías específicas de teclado/lector de pantalla para nuestro caso. El contrato canónico es ordinal por períodos y ya define mutaciones semánticas. Reabrir la decisión exige spike, medición de bundle, adaptación sin fechas, auditoría a11y y aprobación explícita de dependencia.

## 05. Contrato y errores

La UI nunca envía coordenadas o píxeles. Convierte el desplazamiento visual a enteros de período y emite únicamente las dos operaciones canónicas. `409 segmento-solapado` conserva los datos previos, revierte el preview y muestra un error accesible. Los demás errores usan el manejo existente; el éxito invalida cronograma y vistas mediante el hook actual.

## 06. Alcance incluido

- Crear una superficie semántica única con jerarquía y timeline alineados.
- Reutilizar el árbol y los `segmentos[]` de `/vistas`; reutilizar el hook de mutación existente.
- Mantener edición manual y distribución uniforme del diálogo actual.
- Añadir controles de mover/redimensionar accesibles y drag/resize progresivo.
- Conservar estados BORRADOR, desactualizado y actividad nula.
- Eliminar del render final las tres presentaciones solapadas, sin borrar utilidades todavía reutilizadas.

## 07. Fuera de alcance

No fechas absolutas, calendario laboral, feriados, dependencias, lag, hitos, CPM, ruta crítica, holgura, auto-programación, adquisición de insumos, CRUD libre de actividades, cambio de unidad/plazo ni cálculos de dominio.

## 08. Archivos candidatos

`src/features/cronograma/components/GanttJerarquicoInteractivo.tsx` y componentes auxiliares acotados; `CronogramaPage.tsx`; `DialogoEditarActividad.tsx` solo para exponer operaciones existentes sin regresión; hooks de cronograma únicamente si falta un adaptador de parámetros; tests de componentes/página/contrato y handler `PATCH` estricto.

## 09. Arquitectura de presentación

Preferir una sola cuadrícula/tabla semántica con columnas izquierdas `sticky` y timeline desplazable, de modo que las filas compartan altura y scroll vertical. No sincronizar dos listas independientes si puede evitarse. No virtualizar en esta primera entrega sin evidencia de rendimiento que lo exija.

## 10. TDD focal

**RED crítico:** actividad con segmentos `[2,2]` y `[4,4]` produce dos barras; mover `[2,2]` a un período emite exactamente `MOVER_SEGMENTO`; resize emite exactamente `REDIMENSIONAR_SEGMENTO`; 409 revierte preview y anuncia el conflicto; alternativa de teclado produce el mismo request. **GREEN:** cuadrícula y adaptadores mínimos. **TRIANGULATE:** límites 1/n, capítulo anidado, rubro sin actividad, MES/SEMANA y scroll. **REFACTOR:** retirar duplicación de filas sin mezclar lógica monetaria.

## 11. Implementación ordenada

1. Añadir pruebas que congelen barras, orden jerárquico y requests.
2. Construir filas normalizadas de presentación sin sumar datos.
3. Implementar cuadrícula y colapsado local.
4. Reusar apertura del diálogo por click/teclado.
5. Añadir controles accesibles para mover/redimensionar.
6. Añadir pointer drag/resize como capa progresiva con preview/confirmación.
7. Reemplazar superficies duplicadas y validar errores.

## 12. Aceptación verificable

Jerarquía y timeline mantienen alineación; header/identidad quedan visibles; segmentos discontinuos no se fusionan; click y teclado editan; drag/resize generan solo verbos canónicos; 409 no deja estado optimista falso; no aparecen conceptos que el backend no modela.

## 13. Verificación

Pruebas focales del componente, página, diálogos y contrato de `useCronograma`; `pnpm run typecheck`; `pnpm run lint`; `pnpm run guard:adr9`; captura Playwright de desktop estrecho/ancho y chequeo axe; `git diff --check`.

## 14. STOP y rollback

STOP si no puede mapearse inequívocamente un gesto a períodos enteros, si se requiere enviar fechas/coordenadas, si el drag carece de alternativa accesible o si surge un contrato de dependencias/CPM. Rollback primero la capa de puntero y conservar controles accesibles y diálogo.

## 15. Riesgos y controles

DnD puede ocultar errores de red: confirmación y rollback explícito. Dos scrolls producen desalineación: cuadrícula única. Filas muy extensas degradan rendimiento: medir antes de añadir virtualización. Los capítulos no tienen actividad ni totales: tratarlos solo como estructura.

## 16. Handoff

Entregar al Plan 089 requests capturados, estados de 409, evidencias de segmentos discontinuos, teclado y capturas de alineación.

## 17. Invariantes

Períodos ordinales; segmentos del servidor; mutaciones semánticas; sin cálculo monetario; una query de vistas; edición/revisión preservadas; UI accesible.

## 18. Cierre

Implementado en `GanttJerarquicoInteractivo.tsx` e integrado en `CronogramaPage.tsx`. Se retiraron del render final las superficies duplicadas, se conservaron los componentes legacy aún cubiertos por pruebas, y se añadieron pruebas de jerarquía, segmentos discontinuos, teclado, resize, drag y rollback `409`. La verificación queda en verde: `pnpm run verify` ejecuta 607 pruebas en 88 archivos, además de typecheck, lint, guard ADR9, formato y build. Se mantienen advertencias lint preexistentes y la advertencia de `role="button"` necesaria para la barra con handles anidados.
