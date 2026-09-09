# Plan 074: Que se pueda armar un APU

**Estado: TODO** · **Prioridad: P1** · **Fecha de corrección: 2026-09-09**

> Plan funcional ejecutable. El audit registró el estado anterior como `NEEDS CORRECTION`; esta versión reemplaza instrucciones obsoletas y conserva TDD estricto. No invocar skills no disponibles ni fijar pisos de conteos futuros.

## 1. Estado inicial
`SelectorInsumo` y `agregarFila` existen, pero `EditorApuPage` no los conecta. `GridSeccion` oculta secciones vacías y los errores de validación no llegan a la celda. Evidencia: `src/features/apu-editor/components/SelectorInsumo.tsx`, `useApuEditor.ts`, `GridSeccion.tsx`, `CeldaEditable.tsx`.

## 2. Objetivo medible
Un APU vacío muestra sus cuatro secciones, permite seleccionar un insumo y refleja la fila creada; un valor inválido muestra el mensaje del esquema. El delta de pruebas debe reportarse, sin umbral futuro inventado.

## 3. Dependencias
Plan 076 (contrato y validación API) antes de ejecutar; los planes 058 y 072 son downstream y quedan desbloqueados después. Backend actual y fuentes canónicas son solo lectura.

## 4. Fuentes canónicas
`../thesis-docs`; código/pruebas actuales de `../thesis-back-quarkus`; `plans/00.INDEX.md`; `plans/README.md`; `AGENTS.md`.

## 5. Evidencia del problema actual
La página no referencia `SelectorInsumo` ni destructura `agregarFila`; el early-return de `GridSeccion` elimina el punto de entrada; `editarCelda` marca error y retorna sin propagarlo.

## 6. Alcance incluido
Conectar un selector único, botones por sección, render de secciones vacías y mensajes de validación. Añadir pruebas de hook, página y componentes necesarias.

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
