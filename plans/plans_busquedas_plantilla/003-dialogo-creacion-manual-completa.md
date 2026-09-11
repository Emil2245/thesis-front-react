# Plan frontend 003 — Creación manual completa de APU

**Estado:** TODO · **Prioridad:** P0 · **Depende de:** frontend 001 y backend 004

## 01. Resultado observable

`Crear manualmente` abre una superficie donde el usuario completa la cabecera y las filas de las cuatro secciones antes de confirmar. Una sola mutación crea el APU, lo vincula al capítulo elegido o a la última hoja y devuelve el presupuesto consolidado.

## 02. Alcance aislado

Crear sin editar las superficies del plan frontend 002:

- `src/features/workspace/components/agregar-apu/FormularioApuManualCompleto.tsx`, exportado con props `{presupuestoId, proyectoId, capituloId?, onCreado, onCancelar}` para que el plan 004 lo monte.
- Subcomponentes locales de cabecera y filas si reducen complejidad.
- Pruebas espejo bajo `src/test/features/workspace/components/agregar-apu/`.
- Reusar el hook del plan 001. Si `SelectorInsumo` no admite `seccionTipo`, crear un wrapper `SelectorInsumoSeccion` sin cambiar el componente usado por `EditorApuPage`.

No editar `DialogoAgregarApu.tsx`, `src/api/**`, `src/test/handlers.ts` ni `WorkspacePage.tsx` en este worktree.

## 03. Campos

Cabecera editable:

- Código: vacío/omitido cuando `modoCodigoRubro=AUTOGENERADO`; requerido y máximo 20 cuando es MANUAL.
- Descripción y unidad: requeridas.
- Porcentaje indirecto: opcional; vacío significa heredar el valor del proyecto.
- Capítulo: usar el valor del contenedor; omitido significa última hoja.

Filas:

- Secciones EQUIPO, MANO_OBRA, MATERIAL y TRANSPORTE siempre visibles, incluso vacías.
- Cada fila selecciona un insumo visible para el proyecto y captura `cantidad` como edición numérica, serializada al formato Decimal que fija el DTO backend (`"1.000000"` en el ejemplo contractual).
- `rendimiento` solo se habilita donde el contrato backend lo admite.
- La fila Herramienta Menor no se crea manualmente: el backend mantiene su regla canónica.
- Costos, subtotales, HM, CD, CI y CT son read-only y solo aparecen después de respuesta del servidor; no se calculan en el formulario.

## 04. UX

- Permitir añadir/eliminar/reordenar borradores locales antes de enviar.
- Cada sección tiene estado vacío y botón `Agregar insumo`.
- Errores de validación se muestran junto al campo/fila, no solo en toast.
- Confirmación deshabilitada durante la mutación y protegida contra doble submit.
- Cancelar vuelve al selector de plantillas sin enviar datos; decidir con el contenedor si conserva búsqueda/selección.

## 05. RED crítico

1. Las cuatro secciones se muestran vacías.
2. El modo AUTOGENERADO omite código; el modo MANUAL lo exige.
3. No se puede enviar cantidad no positiva ni rendimiento inválido.
4. El body contiene solo campos editables; nunca totales ni precios calculados.
5. Una respuesta de error mantiene todos los borradores para corregir.
6. Un éxito entrega el presupuesto al contenedor y limpia el formulario.
7. Etiquetas, errores y controles de filas son accesibles por teclado; al fallar validación, mover foco al primer campo inválido y anunciar un resumen con `role="alert"` o región `aria-live="assertive"`.

## 06. Pasos

1. Revalidar el DTO backend 004 y el contrato actual de `SelectorInsumo`.
2. Crear modelo local del formulario sin duplicar estado servidor.
3. Implementar cabecera y secciones.
4. Conectar validación del body y mutación única.
5. Añadir prevención de doble submit y foco al primer error.
6. Dejar una interfaz de integración mínima para frontend 004.

## 07. Relación con Plan 074

La solicitud actual del usuario reactiva explícitamente la **creación/armado inicial completo** que había quedado diferida en el Plan 074, pero no corrige por sí sola el editor de un APU ya creado. Al integrarlo:

- marcar como resuelta la creación manual completa desde workspace;
- conservar en 074, si sigue vigente, únicamente la edición posterior de secciones vacías y la propagación de errores dentro de `EditorApuPage`;
- no declarar 074 DONE sin reevaluar esos criterios.

## 08. Verificación

```bash
pnpm exec vitest run src/test/features/workspace/components/agregar-apu/FormularioApuManualCompleto.test.tsx
pnpm run typecheck
pnpm run lint
pnpm run guard:adr9
git diff --check
```

## 09. STOP y rollback

STOP si backend 004 exige llamadas secuenciales, acepta totales del cliente, no es atómico o no distingue `rendimiento` por sección. Rollback: borrar únicamente formulario, subcomponentes y pruebas; conservar el seam API del plan 001.
