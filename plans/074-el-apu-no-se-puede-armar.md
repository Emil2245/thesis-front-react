# Plan 074: Que se pueda armar un APU

**Estado: IMPLEMENTADO** · **Prioridad: P1** · **Reevaluado: 2026-09-10** · **Cerrado: 2026-09-11**

> El paquete de búsquedas de plantillas 004 reactivó e integró la **creación inicial completa** de un APU dentro del workspace, incluida al menos una fila de insumo. El alcance restante de 074 — armar o ampliar después un APU desde `EditorApuPage`, conectar allí `SelectorInsumo` y mostrar sus secciones vacías — queda implementado en esta pasada. El alta completa de F-004 vive en `WorkspacePage` y no se duplica aquí.

## 1. Estado inicial
`SelectorInsumo` y `agregarFila` existen, pero `EditorApuPage` no los conecta. `GridSeccion` oculta secciones vacías y los errores de validación no llegan a la celda. Evidencia: `src/features/apu-editor/components/SelectorInsumo.tsx`, `useApuEditor.ts`, `GridSeccion.tsx`, `CeldaEditable.tsx`.

**Estado tras esta pasada (corregida por verificación independiente, hallazgo restante cerrado):** `EditorApuPage` monta un único `SelectorInsumo` y le pasa `agregarFila`; el diálogo del selector se cierra tras una selección exitosa (sin dejar al usuario atrapado en el modal). `GridSeccion` siempre renderiza su tarjeta (aunque la fila esté vacía) y expone en la cabecera un botón accesible `Agregar insumo a {sección}`. `useApuEditor` propaga el mensaje del esquema (`zod issues[0].message`) y del servidor (`ApiError.problem.mensaje`) **por celda**, no por fila, a `FilaEditor.mensajesValidacion: { cantidad?, rendimiento?, precioOverride? }`; las claves internas son `${detalleId}:${campo}`. Cuando el usuario reingresa el mismo valor que ya tiene la celda (no hay PATCH), la rama de retorno limpia el error obsoleto **de esa única celda** vía `actualizarEstado(detalleId, campo, "estable")` sin tocar las vecinas. `restaurarHerencia` opera sólo sobre `precioOverride`. `CeldaEditable` mantiene montado el nodo `<output>` referenciado por `aria-describedby` y `aria-errormessage` durante la edición (WAI-ARIA), y lo pinta con `AlertCircle` + `text-destructive`.

## 2. Objetivo medible
Un APU vacío muestra sus cuatro secciones, permite seleccionar un insumo y refleja la fila creada; un valor inválido muestra el mensaje del esquema. El delta de pruebas debe reportarse, sin umbral futuro inventado.

**Evidencia de esta pasada:** delta de pruebas focal del editor APU = **+33 tests** (6 `GridSeccion` + 7 `CeldaEditable` + 14 `useApuEditor` + 6 `EditorApuPage`). Total `pnpm run verify` = **670/670 tests en 94 archivos** (baseline 637/637; +33 netos), typecheck, lint, guard:adr9, formato y build verdes; 9 warnings de lint (0 nuevos).

## 3. Dependencias
Plan 076 (contrato y validación API) antes de ejecutar; los planes 058 y 072 son downstream y quedan desbloqueados después. Backend actual y fuentes canónicas son solo lectura.

## 4. Fuentes canónicas
`../thesis-docs`; código/pruebas actuales de `../thesis-back-quarkus`; `plans/00.INDEX.md`; `plans/README.md`; `AGENTS.md`.

## 5. Evidencia del problema actual
La página no referencia `SelectorInsumo` ni destructura `agregarFila`; el early-return de `GridSeccion` elimina el punto de entrada; `editarCelda` marca error y retorna sin propagarlo.

## 6. Alcance incluido
Conectar un selector único, botones por sección, render de secciones vacías y mensajes de validación **en el editor posterior al alta**. Añadir pruebas de hook, página y componentes necesarias. La creación inicial completa desde `WorkspacePage` ya pertenece al paquete de búsquedas de plantillas 004 y queda fuera de este alcance restante.

## 7. Fuera de alcance
No rediseñar Equipo/Mano de obra, parámetros de exportación, disponibilidad, backend, manual, ni cálculos del motor.

## 8. Archivos concretos candidatos
`src/features/apu-editor/components/GridSeccion.tsx`; `src/features/apu-editor/pages/EditorApuPage.tsx`; `src/features/apu-editor/hooks/useApuEditor.ts`; `src/features/apu-editor/components/CeldaEditable.tsx`; `src/features/apu-editor/components/FilaDetalle.tsx` solo si es imprescindible; pruebas espejo en `src/test/features/apu-editor/`.

## 9. Contratos request/response
Usar las firmas existentes: selección `{seccionTipo, insumoId}` y mutación de detalle con `cantidad` inicial válida. Confirmar contra el recurso actual `POST /apus/{apuId}/detalles` y sus DTOs antes de editar. No cambiar contratos por conveniencia.

## 10. Estrategia TDD
- **RED:** añadir pruebas que fallen para sección vacía, apertura por tipo, creación de fila y mensaje de validación.
- **GREEN:** implementar la conexión mínima y propagar el error validado.
- **REFACTOR:** simplificar props/estado sin duplicar selector ni estado servidor; mantener pruebas verdes.

## 11. Pasos secuenciales
1. Verificar deriva y contrato backend.
2. Escribir y ejecutar pruebas RED.
3. Mostrar secciones vacías con estado discreto y botón `Agregar insumo`.
4. Montar un `SelectorInsumo` y conectar `agregarFila` con el tipo seleccionado.
5. Hacer visible el mensaje proveniente del esquema.
6. Ejecutar triangulación y revisión de alcance.

## 12. Criterios de aceptación
El flujo completo desde APU vacío hasta fila visible funciona; cada sección conserva su tipo; errores inválidos son legibles; no hay duplicación de queries ni aritmética monetaria.

## 13. Comandos de verificación
`pnpm run typecheck`; `pnpm run lint`; `pnpm run test -- src/test/features/apu-editor`; `pnpm run verify`; `pnpm run e2e` (reportar bloqueos ambientales sin convertirlos en fallos de producto).

## 14. STOP conditions
Detenerse si el POST real o sus DTOs contradicen este plan, si `SelectorInsumo` requiere cambios no previstos, si la mutación no repinta la fila, o si aparece una decisión de UX/canon no resuelta. Documentar archivo, línea y respuesta observada.

## 15. Riesgos y rollback
Riesgo: cambios en el ciclo de commit o en la invalidación de queries. Rollback: revertir únicamente los archivos candidatos, sin tocar backend ni fixtures ajenos; conservar la prueba que reproduzca el defecto.

## 16. Handoff
Al cerrar, actualizar el estado del plan y entregar a 058 y 072; cualquier divergencia de contrato pasa a 076 o a un STOP, nunca a una solución inventada.

## 17. Invariantes explícitas
No inventar endpoints, DTOs ni estados. No realizar cálculos monetarios en TypeScript; todos los totales vienen del servidor. `src/api/` es la única capa HTTP y se usa `pnpm` exclusivamente.
