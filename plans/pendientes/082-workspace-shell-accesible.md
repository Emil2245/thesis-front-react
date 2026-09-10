# 082 — Workspace shell accesible

**Estado: IMPLEMENTADO.** Este plan se adelantó por decisión del usuario; la dependencia funcional de 074 queda diferida porque el workspace solo introduce el shell y no implementa creación de APUs. Verificación focalizada: 4 pruebas de workspace/ruta en verde; lint y formato correctos; typecheck global queda bloqueado por el error preexistente de Plan 076.

## 01. Estado inicial verificable
`src/routes/index.tsx` no tiene `/proyectos/:id/workspace`. `AppShell` compone `AppSidebar`, `Topbar` y `main`; `SidebarRail` ya existe, pero no es un separador de panes. `Topbar` decide el selector de versión por pathname.

## 02. Resultado observable
La ruta nueva muestra un workspace progresivo: panel izquierdo de presupuesto y panel derecho de detalle, sin quitar ni redirigir las rutas existentes. En desktop el izquierdo ocupa 40–50% y el derecho el resto; en móvil los paneles se apilan.

## 03. Dependencias y límite
Depende de 076. El plan 074 queda diferido: 082 solo introduce la ruta y el shell, no reemplaza el AppShell global ni necesita resolver el armado/creación de APUs.

## 04. Fuentes canónicas
`src/routes/index.tsx`, `src/shell/AppShell.tsx`, `src/shell/Sidebar.tsx`, `src/shell/Topbar.tsx`, `src/shell/contexto.ts`, `src/components/comunes/EncabezadoPagina.tsx`, `TarjetaTabla.tsx`, y sus tests existentes. Revisar `SelectorVersion` para conservar `?v=`.

## 05. Contrato de ruta
`/proyectos/:id/workspace?v=<presupuestoId>` es autenticada y vive bajo `AppShell`; `/proyectos/:id`, `/presupuesto`, `/apus/:apuId` y demás rutas permanecen idénticas. Si falta `v`, el workspace usa la versión activa existente, no inventa una consulta.

## 06. Alcance incluido
Página, layout split, divisor redimensionable solo en desktop, navegación de teclado, orden DOM lógico, focus visible, responsive stack y pruebas de ruta/URL/a11y. Sin endpoint nuevo.

## 07. Fuera de alcance
No modificar backend, query keys, contratos, AppShell global para todas las páginas, ni resolver plan 056.

## 08. Archivos exactos candidatos
Crear `src/features/workspace/pages/WorkspacePage.tsx`, `src/features/workspace/components/WorkspaceSplit.tsx` y `src/test/features/workspace/pages/WorkspacePage.test.tsx`. Editar `src/routes/index.tsx`, `src/shell/Topbar.tsx` solo para reconocer `/workspace` cuando corresponda, y `src/shell/Sidebar.tsx` solo para enlace/activo si el diseño aprobado lo exige. No tocar componentes presupuesto/APU aún.

## 09. Reuso y límites
Reusar `useProyectoActivoId`, `useVersionActiva`, `AppShell`, `EncabezadoPagina`, `TarjetaTabla` y componentes hijos; no crear store ni fetch. El split recibe `left`/`right`, expone `aria-valuenow/min/max`, `aria-label="Separador del workspace"` y no roba foco.

## 10. RED específico
Tests fallan antes de implementar si la ruta no monta, `?v=` se conserva al abrir/enlazar, existen dos regiones etiquetadas, el tab order es izquierda → separador → derecha, las flechas/Home/End cambian el divisor dentro de límites, y viewport móvil apila sin overflow horizontal.

## 11. Pasos
1. Confirmar wiring de router y selector de versión.
2. Escribir RED con `MemoryRouter` y `userEvent` de teclado.
3. Añadir ruta lazy y página mínima con estados de versión/proyecto existentes.
4. Implementar split CSS responsive y divisor `button` o elemento equivalente operable.
5. Añadir enlace de sidebar solo si no duplica navegación existente; verificar rutas previas.

## 12. Aceptación
La URL y `?v=` sobreviven navegación; desktop cumple proporción 40–50%; teclado opera el divisor y foco es visible; móvil apila; no hay request adicional ni reclamo sobre 056.

## 13. Verificación focalizada
Se ejecutaron las pruebas focalizadas de `src/test/features/workspace` y `src/test/routes/index.test.tsx`: 4 pruebas en verde. Prettier, `pnpm run lint` y `git diff --check` pasan; `pnpm run typecheck` conserva únicamente el error conocido de Plan 076 en `src/test/features/proyectos/hooks/contrato.test.tsx` (`mostrarSeccionesVacias` no pertenece al request estricto). No se ejecutó E2E.

## 14. STOP
STOP si el contexto no puede resolver proyecto/versión con APIs existentes, si Topbar pierde `?v=`, si el divisor no es operable sin ratón, o si se necesita API/global shell. Handoff sin ampliar alcance.

## 15. Rollback
Eliminar solo archivos nuevos y revertir cambios de router/shell del plan; no tocar páginas existentes ni estado persistido.

## 16. Handoff
A 083: ruta estable, props del split, regiones y URL confirmadas; 083 implementará el árbol izquierdo y selección. La creación/armado de APU del 074 sigue diferida para una futura evolución de 084 o posterior.

## 17. Invariantes
Sin API nueva; rutas existentes intactas; teclado y foco; tokens del tema; responsive sin prometer 056; `?v=` consistente.
