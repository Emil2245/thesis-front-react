# Plan frontend 002 — Selector paginado de plantillas con detalle y selección múltiple

**Estado:** TODO · **Prioridad:** P0 · **Depende de:** frontend 001

## 01. Resultado observable

Al abrir `Agregar APU`, el usuario ve inmediatamente un buscador y la primera página de plantillas. Puede filtrar por SISTEMA/PERSONAL, elegir opcionalmente un capítulo, revisar el detalle de la fila activa y agregar una o varias plantillas.

## 02. Diseño cerrado

```text
┌ Agregar APU ───────────────────────────────────────────────────────┐
│ [ Buscar plantillas…                                      ]       │
│ [✓ Sistema] [✓ Personales]        [Capítulo: Al final (última hoja)]│
│ ┌ lista con checks ────────────┐  ┌ detalle de fila activa ─────┐ │
│ │ □ Plantilla A               │  │ nombre · tipo · unidad      │ │
│ │ □ Plantilla B               │  │ descripción                 │ │
│ │ □ Plantilla C               │  │ secciones M/N/O/P readonly  │ │
│ └──────────────────────────────┘  └──────────────────────────────┘ │
│ [Crear manualmente]                         [Agregar] [Cancelar]   │
└────────────────────────────────────────────────────────────────────┘
```

- Ambos filtros activos por defecto.
- Click en fila activa el detalle, pero no marca el checkbox.
- Si hay checks, `Agregar` usa todos los marcados en orden visual.
- Si no hay checks, `Agregar` usa solo la fila activa.
- Sin fila activa ni checks, `Agregar` está deshabilitado.
- El selector de capítulo muestra `Al final (última hoja)` como opción implícita y envía `capituloId` omitido.
- Todos los rubros se crean con cantidad backend `1.000000`; no mostrar editor de cantidad aquí.

## 03. Alcance aislado

- Reescribir `src/features/workspace/components/DialogoAgregarApu.tsx` como contenedor único de plantillas.
- Componentes nuevos bajo `src/features/workspace/components/agregar-apu/`: buscador/filtros, lista seleccionable, detalle readonly y selector de capítulo.
- Pruebas espejo bajo `src/test/features/workspace/components/agregar-apu/`.
- El botón `Crear manualmente` invoca una prop literal `onCrearManualmente: () => void`; este plan prueba la callback pero no importa ni monta el formulario del plan 003. El plan 004 realiza ese montaje, preservando el paralelismo.

No editar `src/api/**`, `src/test/handlers.ts`, `DialogoNuevoApu.tsx` ni archivos del formulario manual.

## 04. Detalle de plantilla

Consumir exclusivamente el snapshot price-free validado por frontend 001. Nunca usar casts ni calcular subtotales o precios. Mostrar nombre, tipo, unidad, descripción y filas agrupadas por EQUIPO/MANO_OBRA/MATERIAL/TRANSPORTE con código, cantidad y rendimiento disponibles. El snapshot no trae precios por diseño. Estado de carga y error deben pertenecer al panel derecho sin borrar la lista.

## 05. Capítulos

- Aplanar el árbol en orden de presentación con profundidad visible.
- Si `defaultCapituloId` está presente y existe en el árbol aplanado, preseleccionarlo porque proviene de una acción contextual explícita; en otro caso usar `Al final (última hoja)`.
- El cálculo definitivo de la última hoja pertenece al backend; el frontend no deriva ni envía ese id.

## 06. RED crítico

1. Apertura dispara una sola página de búsqueda con ambas fuentes.
2. `useDeferredValue` o debounce de 300 ms en UI evita una petición por tecla; la query conserva la página previa con `placeholderData: keepPreviousData` y nunca pinta un resultado obsoleto como perteneciente al texto actual.
3. Click carga detalle sin marcar; checkbox marca sin perder fila activa.
4. Con checks, el body exacto es `{plantillaIds:[idCheck1,idCheck2]}` —y `capituloId` solo si fue elegido—; conserva orden visual y no añade la fila activa.
5. Sin checks, se agrega únicamente la fila activa.
6. Fallo atómico mantiene el diálogo abierto, conserva selección y anuncia la plantilla indicada por el error.
7. Navegación por teclado y nombres accesibles de checkboxes/paneles.

## 07. Pasos

1. Fijar test focal del diálogo antes del refactor.
2. Construir layout responsive: dos columnas desde `md`; apilado en viewport estrecho.
3. Conectar búsqueda, filtros, paginación o `Cargar más` sin descargar todo el catálogo.
4. Conectar detalle bajo demanda y conservar cache por id.
5. Conectar selección y mutación atómica.
6. Mostrar advertencias no bloqueantes devueltas después del éxito, agrupadas por plantilla.
7. Entregar el seam `onCrearManualmente` para frontend 003.

## 08. Aceptación

- El diálogo sustituye la elección inicial `Usar APU existente / Crear APU`.
- La lista inicial no está vacía cuando hay seeds visibles.
- Filtros, detalle y selección son independientes.
- El éxito cierra el diálogo y muestra el presupuesto actualizado.
- El error identifica el elemento fallido y no simula que una parte se agregó.

## 09. Verificación

```bash
pnpm exec vitest run src/test/features/workspace/components/agregar-apu/DialogoAgregarApu.test.tsx
pnpm exec vitest run src/test/features/workspace/pages/WorkspacePage.test.tsx
pnpm run typecheck
pnpm run lint
pnpm run guard:adr9
git diff --check
```

## 10. STOP y rollback

STOP si el detalle sigue siendo JSON opaco no validable, el backend permite éxito parcial, o la respuesta de error no identifica la plantilla visible. Rollback: restaurar `DialogoAgregarApu.tsx` y borrar solo componentes/pruebas de `agregar-apu/`; conservar contratos del plan 001.
