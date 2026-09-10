# 084 — Pestaña APU — IMPLEMENTADO / DONE

## 01. Estado inicial verificable
`EditorApuPage` y `useApuEditor` existen para `/proyectos/:id/apus/:apuId`, con edición y mutaciones. El workspace de 082–083 necesita un detalle derecho que no replique ese estado.

## 02. Resultado observable
Al seleccionar un rubro, la pestaña `APU` del panel derecho muestra una composición compacta, de solo lectura, con secciones y totales del APU y un enlace explícito `Editar APU completo` al editor existente.

## 03. Dependencias y handoff
Depende de 083 y 076. Este plan entrega a 085 la pestaña APU; no incorpora cronograma ni otras pestañas.

## 04. Fuentes canónicas
`src/features/apu-editor/pages/EditorApuPage.tsx`, `hooks/useApuEditor.ts`, `components/EncabezadoApu.tsx`, `GridSeccion.tsx`, `PieTotales.tsx`, `PanelEspecificacionTecnica.tsx`, `SelectorInsumo`/componentes usados por el editor, `src/api/contract.ts`, `src/api/queryKeys.ts`, `src/test/features/apu-editor/pages/EditorApuPage.test.tsx`, hooks/fixtures y la integración workspace de 083.

## 05. Contrato de datos
La lectura principal es GET `/apus/:apuId` vía `useApuEditor`; la especificación técnica tiene GET propio. Reusar `ApuResponse`, `secciones`, filas y totales retornados. Verificar la respuesta actual antes de seleccionar campos; no inferir totales de detalles.

## 06. Alcance incluido
Pestaña/slot derecho read-only, encabezado compacto, secciones, totales y deep link. Estados sin selección, loading y error. Preferir componentes presentes con props read-only; si no son seguros, crear una vista compacta que solo lea datos.

## 07. Fuera de alcance
No mutaciones, `SelectorInsumo`, diálogos, guardar plantilla, especificación editable, queries duplicadas, store paralelo ni cambios al editor completo. No crear endpoint.

## 08. Archivos exactos candidatos
Crear `src/features/workspace/components/PestanaApu.tsx` y `src/test/features/workspace/components/PestanaApu.test.tsx`. Editar la página workspace de 082 para montar la pestaña y usar la selección de 083. Solo editar componentes APU existentes si aceptan explícitamente modo read-only sin alterar su comportamiento; de lo contrario no tocarlos.

## 09. Reuse boundary
El workspace pasa el `apuId` del rubro seleccionado. `PestanaApu` puede usar una única lectura ya existente o un hook read-only dedicado solo si la integración demuestra que no puede compartirla; no montar `EditorApuPage` dentro del panel. El link es `/proyectos/:id/apus/:apuId` y conserva `?v=` si el editor lo requiere.

## 10. RED específico
Afirmar: sin selección muestra “Selecciona un rubro”; loading muestra skeleton accesible; error muestra mensaje y reintento según patrón existente; fixture renderiza secciones/totales literalmente; no aparecen botones de mutación; el link tiene nombre exacto, `apuId` correcto y versión preservada; no se realizan PATCH/POST/PUT/DELETE.

## 11. Pasos
1. Confirmar shape de `ApuResponse` y qué componentes aceptan props read-only.
2. Escribir RED con MSW que permita GET y rechace mutaciones.
3. Implementar pestaña compacta y su lectura, reutilizando query/cache existente cuando sea posible.
4. Integrarla al slot derecho y conectar `rubro` seleccionado.
5. Probar cambio de rubro, stale/none, loading/error y deep link.

## 12. Aceptación
La pestaña presenta composición server-returned sin editar; cero mutaciones; no duplica `EditorApuPage` ni estado; todos los estados y deep link están cubiertos.

## 13. Verificación focalizada
- `pnpm exec vitest run src/test/features/workspace/components/PestanaApu.test.tsx src/test/features/apu-editor/pages/EditorApuPage.test.tsx src/test/features/workspace/pages/WorkspacePage.test.tsx`: **14 tests en 3 archivos** (PestanaApu: 6, WorkspacePage: 3, EditorApuPage: 5), ✅ verde.
- Prettier, lint y `git diff --check`: ✅ verdes.
- `pnpm exec tsc -b --pretty false`: bloqueado únicamente por el error conocido del Plan 076 en `src/test/features/proyectos/hooks/contrato.test.tsx:197`, porque `mostrarSeccionesVacias` está ausente de `ParametrosProyectoEditarRequest`.
- No se ejecutó E2E.

## 14. STOP
STOP si el rubro no expone `apuId`, si APU requiere otra API no documentada, si los componentes existentes mutan al montarse, o si no puede preservarse `?v=`. Entregar discrepancia a 085 sin añadir workaround.

## 15. Rollback
Retirar pestaña e integración workspace; no revertir ni modificar el editor APU existente.

## 16. Handoff
A 085: `PestanaApu` es una vista autónoma y de solo lectura. Usa `qk.apu`, `getValidado` y `apuSchema` con un GET compatible con caché; resuelve recursivamente `rubro → apuId`, muestra literalmente los valores del servidor y expone estados accesibles de carga, error y reintento. No contiene controles ni endpoints de mutación. El deep link al editor conserva `v` y omite `rubro`. No se reutilizaron los componentes existentes del editor APU porque están acoplados a mutaciones.

## 17. Invariantes
APU y totales provienen del servidor; sin CRUD/mutaciones; sin queries duplicadas; `src/api/` única HTTP; accesible; `?v=` coherente. **Cierre:** Plan 084 implementado y validado; queda listo el handoff a 085.
