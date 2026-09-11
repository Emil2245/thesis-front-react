# Plan frontend 004 — Integración del diálogo, accesibilidad y E2E

**Estado:** TODO · **Prioridad:** P1 · **Depende de:** frontend 002 y 003

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

- Reevaluar 074: registrar que el usuario reactivó en esta solicitud la creación inicial completa; el editor posterior puede seguir pendiente.
- Mantener 072 diferido hasta capturar el flujo ya estable.
- Añadir este paquete como dependencia de 089.
- Actualizar el baseline de tests únicamente con conteo medido.
