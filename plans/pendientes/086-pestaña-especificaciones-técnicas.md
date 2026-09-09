# Plan 086: pestaña Especificaciones técnicas

## 01. Estado actual y dependencia
Depende de 085. Ya existe `PanelEspecificacionTecnica.tsx` y `useApuEditor.ts:92,320`: GET `/apus/{apuId}/especificacion-tecnica`, PUT con `{ texto }`, key `qk.apuEspecificacion`. El panel recibe `string | null | undefined` y limita 64 KiB.

## 02. Resultado observable
El workspace ofrece la especificación del APU seleccionado, carga su contenido actual, distingue ausencia (`contenido: null`) de texto vacío, permite editar/guardar una vez y conserva el resultado sin duplicar query ni mutation.

## 03. Dependencias verificadas
084 define composición/selección; 085 define la pestaña y su estado. No mover el panel del editor ni crear otro contrato.

## 04. Fuentes canónicas
`src/api/contract.ts:354-362`; `src/features/apu-editor/hooks/useApuEditor.ts:92-99,315-323`; `src/features/apu-editor/components/PanelEspecificacionTecnica.tsx`; `src/features/apu-editor/pages/EditorApuPage.tsx`; `src/api/queryKeys.ts`; `src/test/handlers.ts:600`; backend `src/main/java/ec/uce/propuestas/apu/resource/ApuResource.java:150-166`, `EspecificacionTecnicaRequest.java`, `EspecificacionTecnicaResponse.java`, `src/test/java/.../ApuResourceIT.java:728-893`.

## 05. Evidencia del contrato
GET devuelve `{ apuId, contenido: string|null }`; PUT recibe `{ texto: string }`, no `contenido`. Backend valida UUID/ownership, autenticación y errores problem+json; verificar status exactos en `ApuResourceIT`. El panel ya controla bytes, loading de guardado y botón deshabilitado.

## 06. Alcance incluido
Componer el panel existente en la pestaña o extraer una vista read/write común solo si la composición lo exige; conectar el APU seleccionado; mostrar estados de query y mutation; invalidar `qk.apuEspecificacion(apuId)` tras PUT. Reutilizar exactamente el hook del editor o extraerlo a un hook común, nunca ambos.

## 07. Fuera de alcance
No endpoint alternativo, autosave, copia de ET, almacenamiento local, duplicación de query/mutation, cambios backend ni edición de especificación sin APU seleccionado.

## 08. Archivos candidatos exactos
Crear `src/features/workspace/components/PestanaEspecificacionTecnica.tsx` y `src/test/features/workspace/components/PestanaEspecificacionTecnica.test.tsx`; integrar en `src/features/workspace/pages/WorkspacePage.tsx`. Editar `src/features/apu-editor/hooks/useApuEditor.ts` o extraer un hook común nuevo en esa carpeta, pero no mantener ambos caminos. Tocar `src/features/apu-editor/components/PanelEspecificacionTecnica.tsx` solo si faltan props/estado, y `src/api/contract.ts` solo si el DTO backend demuestra una diferencia.

## 09. Contrato, roles y errores
GET `/apus/{apuId}/especificacion-tecnica` → `EspecificacionTecnicaResponse`; PUT mismo path → body exacto `{ texto }`. Cubrir 200 con texto, 200 null, texto vacío, 400 por payload/UUID, 401/403 según backend, 404 owner-to-404 y 5xx. Guardar conserva texto ante error y muestra error accesible; éxito invalida/relee una sola key.

## 10. TDD específico
**RED:** MSW rechaza cualquier body distinto de `{ texto }`; render seleccionado afirma GET, null/empty, editar y PUT; afirma que no ocurre un segundo GET paralelo. **GREEN:** reutilizar panel/hook y conectar estados. **TRIANGULATE:** límite bytes, error PUT y cambio de APU mientras carga. **REFACTOR:** un solo hook/key y mensajes accesibles.

## 11. Implementación ordenada
1. Leer DTOs y todos los casos IT; anotar status/auth. 2. Localizar composición real de 084/085. 3. Añadir RED con handler estricto. 4. Extraer o reutilizar el hook sin doble `useQuery`. 5. Conectar `PanelEspecificacionTecnica` y estado seleccionado. 6. Probar null, vacío, error y éxito. 7. Ejecutar comandos focalizados.

## 12. Aceptación verificable
Una sola GET y una sola mutation por acción; payload exacto; null, vacío, loading, error y stale visibles; guardar exitoso se refleja al refetch; teclado/label/alert accesibles; ningún endpoint duplicado.

## 13. Verificación
`pnpm run test -- src/test/features/workspace/components/PestanaEspecificacionTecnica.test.tsx src/test/features/apu-editor`; `pnpm run typecheck`; `pnpm run lint`; si se necesita reconfirmar el contrato backend, `(cd ../thesis-back-quarkus && ./gradlew test --tests '*ApuResourceIT')`; `git diff --check`.

## 14. STOP / rollback
STOP si IT contradice DTO/status, si 084/085 no expone selección, o si reaprovechar el panel exige dos fuentes de verdad. Rollback solo paths del plan; no revertir cambios previos del editor.

## 15. Riesgos y controles
Riesgo de `texto`/`contenido` intercambiados: handler estricto. Riesgo de estado local inicial obsoleto: remount/key por APU o sincronización explícita probada. Riesgo de doble query: revisar React Query keys.

## 16. Handoff
A 087: confirmar que workspace puede cambiar de pestaña sin perder selección; entregar DTO, statuses, tests y si el hook quedó común.

## 17. Invariantes
No duplicar endpoint ni estado servidor; PUT es `{texto}`; HTTP solo API; UI español; no aritmética ni cambios backend.
