# Plan 089: integración final y documentación

## 01. Estado y precondiciones
Depende de 081, 058, 072, 086, 087 y 088 en estado terminal. Este plan integra y valida; no implementa funcionalidades nuevas.

## 02. Resultado observable
Workspace completo probado contra MSW estricto y backend real: auth, selección/versiones, Insumos, APU, ET, resumen, cronograma y admin; documentación e índice reflejan evidencia medida.

## 03. Dependencias verificadas
Registrar commit/estado de cada rama terminal y conflictos. Si una rama no está terminal, STOP de integración y devolver a su plan.

## 04. Fuentes y archivos de cierre
Frontend `src/api/contract.ts`, `src/api/queryKeys.ts`, `src/api/request.ts`, hooks/componentes/workspace de 081–088, `src/test/handlers.ts`, tests `src/test/features/**`, `e2e/**`, `docs/bugs.md`, capturas/manual, `plans/README.md`, `plans/00.INDEX.md` y `plans/BITACORA.md`. Backend solo consulta/ejecuta; no modificarlo.

## 05. Contratos a comprobar
ET GET/PUT `/apus/{apuId}/especificacion-tecnica`; resumen GET `/presupuestos/{id}/resumen`; vistas GET `/cronogramas/{id}/vistas`; roles/status/errors según IT backend. Insumos deriva `ApuResponse.secciones[].detalles[]`; no existe endpoint APU-insumos ni copia personal.

## 06. Alcance incluido
Inspeccionar credenciales únicamente en `../thesis-back-quarkus/api/bruno/environments/dev.bru`, sin copiar secretos. Ejecutar real-backend journeys de auth, workspace, APU/ET, cronograma y admin; endurecer MSW/Playwright; a11y, screenshots, manual, baseline, índice/bitácora y comentarios obsoletos.

## 07. Fuera de alcance
No migraciones, DTO/backend nuevos, librerías, rediseños, endpoints, datos de prueba persistentes, secretos en repo ni scope creep por fallos ambientales.

## 08. Archivos candidatos exactos
`src/test/handlers.ts`; tests afectados; `e2e/*.spec.ts`, `playwright.config.ts` solo si el contrato real lo exige; `docs/manual/**`, `e2e/screenshots/**`; `docs/bugs.md`; `plans/README.md`, índice/bitácora. Cambiar solo files demostrados por fallo, preservando demás cambios.

## 09. Ambiente y comandos previos
Confirmar backend/base URL y credenciales desde Bruno sin imprimir valores. Precondición obligatoria: `pnpm exec playwright install`. Si no hay backend, DB, credencial o navegador, clasificar como blocker ambiental y no alterar implementación para ocultarlo.

## 10. TDD/regresión
**RED:** añadir/ajustar aserciones de journey que fallen por contrato real, handlers que rechacen bodies extra y pruebas a11y/visual con expectativa concreta. **GREEN:** corregir solo integración/fixtures. **TRIANGULATE:** 401/403/404, stale/error, no selección, cuerpos inválidos y navegador limpio. **REFACTOR:** limpiar comentarios stale sin cambiar alcance.

## 11. Secuencia ejecutable
1. Revisar DAG y git diff. 2. Leer Bruno sin copiar secretos. 3. Instalar navegadores. 4. Levantar backend autorizado y ejecutar journeys críticos reales. 5. Actualizar handlers estrictos/tests. 6. Ejecutar a11y, screenshots y manual. 7. Medir baseline antes/después. 8. Actualizar índice/bitácora/documentación y comentarios stale. 9. Ejecutar gates finales.

## 12. Aceptación verificable
Journeys auth/workspace/APU/ET/cronograma/admin pasan real y mock; requests/body/status están afirmados; a11y/screenshot/manual pasan; baseline reporta conteo medido; índice DAG y bitácora enlazan evidencia; no hay secreto ni scope creep.

## 13. Verificación final
`pnpm run verify`; `pnpm run e2e`; `git diff --check`; `graphify update .`. Ejecutar además el comando focal que corresponda a cada fallo y registrar salida. No afirmar verde si una precondición ambiental impide ejecutar.

## 14. STOP / rollback / handoff
STOP por rama no terminal, contrato contradictorio, secreto expuesto, backend inaccesible o gate no ejecutable. Rollback solo último cambio de cierre, nunca reset/restore destructivo. Handoff con blocker, comando, salida, archivo y responsable del plan; implementación queda congelada.

## 15. Riesgos y controles
Backend real puede diferir del mock: journeys reales y MSW estricto. Playwright puede usar servidor viejo: reiniciar dev server. Tests no tipan `e2e`: ejecutar e2e completo. Credenciales: nunca capturar/imprimir/copiar.

## 16. Handoff de cierre
Entregar matriz journey→spec→test→resultado, baseline medido, diff de docs/índice/bitácora, blockers ambientales separados y lista exacta de archivos modificados.

## 17. Invariantes
pnpm; API única; strings/ADR9; UI española accesible; no implementar endpoints inventados; no secretos; no cambios backend; el ambiente bloqueado no se disfraza de defecto de código.
