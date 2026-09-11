# Búsqueda y agregado de APUs desde plantillas — frontend

Este paquete reemplaza el diálogo escalonado actual de `WorkspacePage` por una sola superficie para buscar plantillas, revisar su detalle, seleccionar una o varias y agregarlas atómicamente al presupuesto. También incorpora la creación manual completa de un APU.

## Decisiones cerradas

| Tema | Decisión |
| --- | --- |
| Fuentes | SISTEMA y PERSONAL activas por defecto mediante dos checkboxes independientes. |
| Carga inicial | Consultar la primera página al abrir; no descargar el catálogo completo. |
| Selección | Click en una fila muestra detalle. Los checkboxes permiten seleccionar varias. Sin checks, `Agregar` usa solo la fila activa. |
| Lote | Todo o nada. Si falla, no se agrega ningún APU y el mensaje identifica la plantilla problemática sin filtrar datos ajenos. |
| Destino | Selector opcional; sin elección, el backend usa la última hoja del árbol de capítulos. |
| Cantidad de obra | `1.000000` para cada rubro creado; se edita después en Presupuesto. |
| Creación manual | Formulario completo de cabecera y filas M/N/O/P; no solo cabecera seguida del editor. |
| Botones | Pie: `Crear manualmente` a la izquierda; `Agregar` y `Cancelar` a la derecha. |

## Contratos backend requeridos

Los planes frontend no deben adelantarse con mocks permisivos. Esperan estos contratos implementados y probados en `../thesis-back-quarkus/plans/plans_busquedas_plantilla/`:

1. `GET /plantillas-apu/busqueda?q=&tipo=SISTEMA&tipo=PERSONAL&page=0&size=20` → `Page<PlantillaApuResumenResponse>`.
2. `GET /plantillas-apu/{id}` → detalle existente, sin cambio de forma.
3. `POST /presupuestos/{presupuestoId}/rubros/desde-plantillas` → lote atómico.
4. `POST /presupuestos/{presupuestoId}/apus/completo` → APU manual completo y vinculado, atómico.

## DAG y ejecución en worktrees

```text
Backend 001 FTS ───────────────┐
Backend 002 seeds ─────────────┼─► Frontend 001 seam HTTP
Backend 003 lote atómico ──────┘          │
             │                            ├─► Frontend 002 selector de plantillas ─┐
             └─► Backend 004 APU manual ──┴─► Frontend 003 creador manual ─────────┤
                                                                                   ▼
                                                                       Frontend 004 integración
                                                                                   │
                                                                                   ▼
                                                                              Plan 089
```

- **Ola backend A, tres worktrees paralelos:** 001, 002 y 003. Sus superficies son migración/query, seed y escritura transaccional respectivamente.
- **Ola backend B:** 004 después de 003, porque reutiliza la resolución de última hoja y la orquestación transaccional.
- **Ola frontend A:** 001 después de cerrar los contratos backend.
- **Ola frontend B, dos worktrees paralelos:** 002 y 003. No deben editar archivos compartidos entre sí.
- **Ola frontend C:** 004 integra, elimina el flujo legado y ejecuta E2E.

## Planes

| # | Plan | Depende de | Superficie principal |
| --- | --- | --- | --- |
| 001 | [Contratos, schemas y hooks](001-contratos-hooks-busqueda-y-lotes.md) | backend 001, 003, 004 | `src/api/**`, hooks y MSW |
| 002 | [Selector de plantillas](002-dialogo-selector-plantillas.md) | frontend 001 | diálogo, lista, detalle, filtros, capítulo |
| 003 | [Creación manual completa](003-dialogo-creacion-manual-completa.md) | frontend 001, backend 004 | formulario nuevo aislado |
| 004 | [Integración, accesibilidad y E2E](004-integracion-accesibilidad-e2e.md) | frontend 002–003 | workspace, retiro legado, Playwright |

## Invariantes

- El backend actual es la fuente de verdad del contrato HTTP; no adaptar el backend a fixtures frontend.
- `src/api/` es la única capa que conoce HTTP.
- No hay aritmética monetaria en TypeScript ni `parseFloat`/`toFixed` fuera de `src/lib/decimal.ts`.
- Los snapshots de plantilla son de solo lectura: el detalle visual no calcula costos ni inventa precios.
- Mantener `?v=` y el contexto del workspace.
- Pruebas nuevas solo para riesgos críticos: contrato HTTP, atomicidad percibida, selección múltiple, autorización y mutaciones destructivas.
- No ejecutar el Plan 089 hasta cerrar este paquete y reconciliar 074/072.
