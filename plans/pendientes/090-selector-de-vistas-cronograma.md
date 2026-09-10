# Plan 090: selector de vistas del cronograma

## 01. Estado y dependencia

Depende del Plan 087, ya integrado. `CronogramaPage.tsx` obtiene una sola proyección con `useCronogramaVistas` y hoy apila el Gantt jerárquico, el valorizado, la tabla de Curva S y las superficies de edición.

## 02. Resultado observable

La ruta independiente `/proyectos/:id/cronograma` muestra un selector accesible con tres vistas: **Gantt**, **Cronograma valorizado** y **Curva S**. Solo el panel seleccionado ocupa el área de trabajo; Gantt es la vista inicial.

## 03. Decisión de navegación

El selector vive dentro de `CronogramaPage`. Cronograma permanece como etapa del sidebar y no se convierte en pestaña de `WorkspacePage`. La edición pertenece a la vista Gantt; no se crea una cuarta pestaña «Edición».

La selección se representa con `?vista=gantt|valorizado|curva-s`, conserva el parámetro `v` y omite o normaliza valores inválidos a `gantt`. Es estado de presentación local al frontend: no modifica DTOs ni backend.

## 04. Fuentes canónicas

- Backend: `GET /cronogramas/{id}/vistas`, `CronogramaVistasResponse` y `VistasCronogramaResourceIT`.
- Funcional: `../thesis-docs/DOCUMENTOS/entrevistas/05/N05_entrevista-cronograma.md`.
- Frontend: `CronogramaPage.tsx`, `useCronogramaVistas.ts`, `src/components/ui/tabs.tsx` y pruebas de cronograma.
- Referencia visual no normativa: imágenes entregadas por el usuario, con navegación horizontal entre Gantt, valorizado y Curva S.

## 05. Contrato que no cambia

La página mantiene una única instancia de `useCronogramaVistas(cronogramaId)`. Cambiar de tab no dispara otra petición, no fragmenta `/vistas` en endpoints por bloque y no altera los flujos `PATCH` de actividad, `PUT` de configuración ni `POST /revisado`.

## 06. Alcance incluido

- Integrar `Tabs`, `TabsList`, `TabsTrigger` y `TabsContent` existentes.
- Sincronizar `vista` con la URL sin perder `v` ni otros parámetros reconocidos.
- Mover las presentaciones actuales al panel correspondiente.
- Conservar loading, fetching, stale, empty y error en un nivel común a los tres paneles.
- Mantener temporalmente, dentro de Gantt, las superficies actuales hasta que el Plan 091 las unifique.
- Ajustar pruebas unitarias y captura E2E de cronograma para seleccionar cada vista.

## 07. Fuera de alcance

No rediseñar todavía el Gantt, la matriz o la gráfica; no agregar persistencia en backend/localStorage/Zustand; no crear tabs en el workspace; no añadir endpoints, cálculos ni dependencias.

## 08. Archivos candidatos

`src/features/cronograma/pages/CronogramaPage.tsx`; pruebas de página en `src/test/features/cronograma/pages/`; `e2e/screenshots.spec.ts` y fixture/handler E2E solo para mostrar las tres vistas. No modificar el hook ni el contrato salvo que una prueba demuestre una incompatibilidad real.

## 09. TDD focal

**RED:** afirmar tablist y tres tabs, Gantt por defecto, contenido exclusivo por selección, URL compartible, conservación de `v`, fallback de `vista` inválida y una sola GET durante varios cambios. **GREEN:** composición mínima con `Tabs`. **TRIANGULATE:** navegación atrás/adelante, loading/error y cambio de versión. **REFACTOR:** retirar wrappers de layout duplicados.

## 10. Implementación ordenada

1. Congelar con pruebas la petición única y los estados comunes.
2. Añadir el selector y el mapeo URL ↔ tab.
3. Reubicar los bloques actuales sin cambiar su lógica.
4. Actualizar la prueba de página para no esperar contenido de paneles ocultos.
5. Capturar Gantt, valorizado y Curva S por separado.

## 11. Aceptación verificable

- Solo un panel principal es visible.
- Gantt es el valor por defecto.
- `?v=` se conserva al cambiar de vista.
- Cambiar de tab no aumenta el contador de GET `/vistas`.
- Los estados de red se anuncian una sola vez y los tabs funcionan por teclado.
- La ruta del sidebar y `WorkspacePage` permanecen intactos.

## 12. Verificación

`pnpm exec vitest run src/test/features/cronograma/pages/CronogramaPage.test.tsx src/test/features/cronograma/hooks/useCronogramaVistas.contrato.test.tsx`; `pnpm run typecheck`; `pnpm run lint`; `pnpm run guard:adr9`; `git diff --check`.

## 13. STOP y rollback

STOP si el selector requiere una segunda query, si pierde `v`, si remonta mutaciones en curso o si los componentes Tabs no cumplen navegación por teclado. Rollback limitado a composición, tests y captura; no tocar contrato ni backend.

## 14. Riesgos y controles

Contenido desmontado puede perder estado de edición: cerrar o bloquear el cambio de tab mientras exista una edición no confirmada. Un test de conteo evita refetch accidental. La URL evita estado oculto no compartible.

## 15. Handoff

Entrega al Plan 091 el panel Gantt estable y al 092/093 los paneles independientes, todos alimentados por la misma proyección.

## 16. Invariantes

Una proyección/GET; Cronograma fuera del workspace; edición preservada; URL conserva versión; UI española y accesible; sin dependencia nueva.
