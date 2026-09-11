# Plan frontend 004 — Integración del diálogo, accesibilidad y E2E

**Estado:** DONE · **Prioridad:** P1 · **Depende de:** frontend 002 y 003

**Integración:** 2026-09-11 · Flujo selector/manual, accesibilidad crítica, E2E Chromium y validación backend-real cerrados.

## 01. Resultado observable

El workspace ofrece un único flujo estable: buscar/agregar plantillas o cambiar a creación manual completa. Se retiran los diálogos encadenados del camino principal y se demuestra el journey contra MSW estricto y backend real.

## 02. Alcance

- Integrar `FormularioApuManualCompleto` en `DialogoAgregarApu`.
- Ajustar `WorkspacePage.tsx` solo si cambia la interfaz del contenedor.
- La solicitud actual reemplaza el flujo diferido previo: retirar del camino de `WorkspacePage` a `DialogoAgregarItem` y `DialogoNuevoApu`. Antes de borrar componentes o `useCrearApu`, enumerar todos sus consumidores; conservar cualquier seam que siga en uso fuera del workspace.
- Reconciliar pruebas de `WorkspacePage`, componentes y hooks sin relajar asserts existentes.
- Añadir Playwright crítico para selección simple, selección múltiple y creación manual.
- Añadir captura del diálogo a la colección existente si aporta documentación; no fijar ids Radix dinámicos.
- Actualizar Plan 074, Plan 072, Plan 089, índice y bitácora según el resultado real.

## 03. Casos E2E obligatorios

1. Apertura: lista inicial, ambos filtros, destino `Al final (última hoja)` y detalle al seleccionar.
2. Selección simple sin checkbox: crea un APU/rubro con cantidad `1.000000`.
3. Selección múltiple: una petición atómica; aparecen todos los rubros en orden.
4. Fallo de un elemento: se anuncia el nombre/posición permitido por backend y ningún rubro aparece.
5. Filtro PERSONAL respeta owner-scope; nunca revela una plantilla ajena.
6. Creación manual completa con al menos una fila y código auto/manual según parámetros.
7. Axe WCAG 2A/2AA, foco inicial, Escape/Cancelar y retorno de foco al botón `Agregar APU`.

## 04. Validación con backend real

No basta MSW. Ejecutar con PostgreSQL limpio y los seeds del backend 002:

- confirmar primera página con varias plantillas;
- búsqueda con y sin tilde;
- detalle SISTEMA y PERSONAL propia;
- lote mixto y rollback inducido;
- destino implícito a la última hoja;
- creación manual agregada.

Registrar método, ruta, body y código HTTP observados. No usar un handler permisivo como evidencia.

## 05. Aceptación

- No quedan dos modales abiertos o montados como flujo alternante.
- El selector no emite una petición por tecla.
- No hay N POST desde el navegador para un lote.
- El presupuesto y cronograma se invalidan/reintegran una sola vez por operación.
- No se pierde `?v=`.
- Los estados de carga/error/vacío son legibles y accesibles.

## 06. Verificación

```bash
pnpm exec vitest run src/test/features/workspace src/test/features/apu-editor/hooks
pnpm run verify
pnpm run e2e:screenshots
pnpm run e2e -- --project=chromium
git diff --check
graphify update .
```

Si Firefox/mobile no están disponibles, reportarlo como bloqueo ambiental; no declarar cobertura ejecutada.

## 07. STOP y rollback

STOP ante deriva backend, éxito parcial, pérdida de owner-scope, cálculo monetario cliente o imposibilidad de identificar el elemento fallido. Rollback: revertir integración/workspace/E2E y restaurar temporalmente el diálogo previo; no revertir contratos backend ni schemas ya validados.

## 08. Cierre documental

- Plan 074 queda reevaluado: la creación inicial completa de un APU ya está activa en el workspace; el armado posterior dentro del editor continúa diferido.
- Plan 072 se mantiene diferido hasta la pasada final de documentación.
- Plan 089 depende también de este paquete 004.
- El baseline se registra únicamente con los conteos medidos en los comandos de cierre.

## 09. Evidencia y límites del cierre

- `DialogoAgregarApu` presenta un solo flujo: selector de plantillas o formulario manual completo; ya no encadena `DialogoAgregarItem` ni `DialogoNuevoApu` desde `WorkspacePage`.
- Las pruebas focalizadas cubren búsqueda inicial, destino contextual, POST atómico exacto, creación manual, conservación de `?v=`/`?rubro=` y retorno de foco: 80/80 en 13 archivos. `pnpm run verify` pasa con 635/635 en 92 archivos, typecheck, lint, ADR9, formato y build.
- `e2e/manual/06-workspace.spec.ts` cubre en Chromium seis journeys con rutas y cuerpos estrictos: búsqueda/filtros/detalle/destino, selección simple, lote ordenado, rollback visual, creación automática y creación con código manual, Escape/Cancelar/foco y axe del selector y del formulario manual. El conjunto Chromium completo pasó 67/67; las capturas pasaron 13/13.
- Validación backend-real contra `http://localhost:8090` con PostgreSQL activo: búsqueda con y sin tilde devolvió los mismos resultados; el detalle SISTEMA y PERSONAL propio respondió 200; el owner-scope devolvió una plantilla PERSONAL para John Doe y cero para Ana de Armas; el lote mixto respondió 201 con dos resultados y destino implícito a la última hoja; el lote con una plantilla inexistente respondió 404 (`indice=1`) sin cambiar `totalGeneral` (9.250000 antes y después); la creación manual respondió 201 y generó `APU-006`.
- `ListaPlantillas` ya no anida controles interactivos: usa una lista `ul/li` con botón de detalle y checkbox hermano. Axe WCAG 2A/2AA pasa sobre selector y formulario manual. No se simuló owner-scope con MSW: la evidencia se obtuvo contra el backend real.
- Firefox no se ejecutó porque el binario Playwright no está instalado en el ambiente (`firefox-1538`); mobile-chrome no presentó fallos en la corrida completa. Esto queda como limitación ambiental, no como fallo de producto.
