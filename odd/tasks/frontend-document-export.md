# Plan04 — selección y descarga de documentos

## Autorización y estado

El usuario autorizó continuar con plan04 después del commit del backend.
Backend cerrado en el alcance verificado y entregado localmente en
`9e327d7c2f468ad3f34d600bed7abe88edea2860` (`feat(exports): add budget and APU documents`).
El commit incluye 52 archivos; excluye las dos eliminaciones Compunex y evidencia
runtime. Sin push. La auditoría de entrega no repitió Gradle; las 461 pruebas/53
suites, Spotless y build son evidencia previa. Persisten tres fallos baseline y
un skip; no existe una ejecución única global verde.

Frontend partió limpio de `main`, `5304979`. Rama de trabajo:
`feat/document-export-ui`. Decoder y corrección B04-01 verificados de forma
independiente: 28 pruebas/4 archivos, typecheck, Prettier y diff-check PASS.
Los fallos previos TS1294/formato quedaron resueltos sin cambiar tsconfig.
El usuario autorizó commits locales por unidades verificadas de plan04
(`approve_frontend04_work_unit_commits`). Primera unidad lista para commit. El mapa actual confirma rutas
y opciones backend. Se añadió únicamente la prueba
`src/test/features/exportar/documento-preflight-error.test.ts`; RED confirmado
por verificación independiente: una prueba falla por pérdida del preflight 409.
El usuario aprobó el ajuste mínimo de `client.ts` mediante la opción
`approve_client_direct409`; corrección acotada con GREEN independiente
confirmado. Hooks/preflight keys y controles nuevos todavía no implementados. El índice de
código no acreditaba las nuevas rutas backend y no se usará como contrato.
El estado antiguo «bloqueado» de plan04 corresponde a su redacción anterior;
los gates backend y la nueva autorización habilitan esta implementación.

Commits locales frontend autorizados por unidades verificadas en esta rama.
No push, PR, merge, despliegue ni cambios de DB. No se declarará entrega completa
mientras falten verificaciones o tareas funcionales del plan.

## Contrato y límites

Fuente del alcance: backend
`docs/modulos/07-exportacion-presupuestos-apus/04-frontend.md`.
Fuente HTTP: recursos, opciones, preflight y pruebas actuales del backend,
no mocks ni índices históricos. Leer `docs/bugs.md` antes de aceptar `verify`.

- Presupuesto: XLSX/PDF; PDF A4 vertical default u horizontal.
- APUs referenciados: XLSX pestañas default/apilado; PDF A4 vertical.
- Cronograma: conservar XLSX/PDF/MSPDI y sus bloqueos; PDF A4 default/A3.
- Conservar ET DOCX. Usar el UUID de la versión seleccionada, incluso histórica.
- Sin UUID válido: no solicitar preflight ni descarga. Preflight separado por
  UUID/documento/formato/opciones; no reutilizar datos de otro contexto.
- Limpiar opciones incompatibles. Bloqueos impiden descarga; stale es advertencia
  que permite continuar, nunca aprobación. Un 409 retorna el preflight directo.
- No guardar JSON de errores como documento. Conservar nombre/MIME coherentes,
  fallback seguro, revocación de object URL, estado de carga y contexto del clic.
- Nada de fórmulas cliente, MSPDI para presupuesto/APUs, A3 para estos documentos,
  catálogos, logos, firmas, nuevas aprobaciones, dependencias o lockfile.

## Superficies autorizadas

- `src/features/exportar/hooks/useExportar.ts`
- `src/features/exportar/pages/ExportPage.tsx`
- `src/api/contract.ts`, `src/api/schemas.ts`, `src/api/queryKeys.ts`
- `src/features/cronograma/components/DescargaCronograma.tsx`, únicamente A3 si procede
- Pruebas focalizadas en `src/test/features/exportar/`; regresión/guards afectados
  en `src/test/features/cronograma/` y `src/test/features/presupuesto/`.
- Este documento de seguimiento.

`src/api/client.ts` autorizado adicionalmente por decisión explícita
`approve_client_direct409`: únicamente reconocer/validar preflight directo 409,
conservar cuerpo en error tipado y mantener auth/retry/errores estándar.
`src/api/request.ts` permanece solo lectura. Si un RED demuestra un ajuste
necesario, solicitar aprobación específica antes de editarlo. Sin handlers
compartidos permisivos ni expansión de superficie por conveniencia.

## Tareas recuperables

- [ ] **F04-01 — VERIFICADO, CIERRE PENDIENTE:** mapa del contrato real, selección de versión y
      pruebas existentes completado. Validar mediante prueba focalizada la pérdida
      del preflight directo en el interceptor Blob antes de solicitar ampliación
      mínima de superficie a `src/api/client.ts`. RED observado y ajuste aprobado.
      GREEN funcional independiente: 28/28 pruebas en cuatro archivos.
      B04-01 resuelto: typecheck/formato/diff PASS en candidato corregido.
      Sin cambios de tsconfig ni relajación de pruebas. Commit autorizado, en preparación.
- [ ] **F04-02 — PENDIENTE:** integrar contratos/hooks/preflight con pruebas
      primero para riesgos críticos: versión equivocada, 409 y errores como Blob.
- [ ] **F04-03 — PENDIENTE:** integrar controles/feedback de descarga, limpieza de
      opciones, selección histórica y cronograma A3, conservando ET y accesibilidad.
- [ ] **F04-04 — PENDIENTE:** verificación independiente focalizada, regresión,
      typecheck/lint/build y comprobación funcional en navegador cuando disponible.
- [ ] **F04-05 — PENDIENTE:** reconciliar evidencia, documentación y estado final;
      cerrar unidades verificadas mediante commits locales autorizados, sin publicación.

Las pruebas deben seguir la política mínima de AGENTS: RED/GREEN observado para
riesgos críticos reproducibles; copy/layout/cableado simple se valida mediante
checks y navegador, sin fabricar RED ni duplicar exhaustivamente contratos.
Ninguna tarea se marca cerrada con fallos, checks pendientes o entrega incompleta.

## Evidencia y pendientes

- Backend: commit citado; después del commit solo quedan dos eliminaciones
  Compunex no staged. Índice vacío.
- Frontend: estado Git inicial limpio, rama creada antes de cambios; worker
  escribió únicamente la prueba. Verificador `muw3qnkv-1g-pv8x` ejecutó desde
  frontend `pnpm exec vitest run src/test/features/exportar/documento-preflight-error.test.ts`:
  exit 1, una prueba fallida por ausencia de `preflight` en `ApiError`.
  Pasaron las aserciones previas de método GET, ruta, única query `formato=pdf`,
  Bearer esperado, exactamente una solicitud y status 409. RED semántico real.
- Incidente del runner: primer intento desde raíz workspace salió 254 (`vitest`
  no encontrado), sin ejecutar la prueba. No cuenta como RED. El verificador
  corrigió cwd y obtuvo el fallo de aserción descrito; warning Vite `__dirname`
  no bloqueante. Para próximas verificaciones usar siempre cwd explícito frontend.
- Hashes antes/después sin cambios: prueba `7f509b…1f147c`, client
  `44bac5…b3f3c57c` (resumen del verificador). Sin modificaciones de producto,
  suite amplia, typecheck/build ni pruebas backend en este paso.
- Riesgo identificado por lectura: `client.ts` decodifica JSON Blob pero acepta
  solo `{codigo,mensaje}`; el preflight directo 409 pierde bloqueos/rubros y cae
  a `sin-respuesta`. No confundirlo con el 409 estándar `export-inconsistente`.
- Ajuste adicional aprobado explícitamente (`approve_client_direct409`):
  reconocer/validar el cuerpo directo y conservarlo en error tipado, sin alterar
  auth, retry ni errores estándar `export-inconsistente`. Worker implementó
  `DocumentoPreflightError`, DTOs separados y `documentoPreflightSchema` estricto,
  con guard GET/409/ruta/UUID/documento/no-exportable. Mantiene la prueba RED y
  agrega controles `export-inconsistente` y opciones malformadas. Cambios de
  producto en `client.ts`, `contract.ts`, `schemas.ts`: 104 inserciones/1 eliminación
  según handoff del worker, aún sin verificación independiente.
- Verificación independiente `muw48x49-1i-7kry`: cuatro archivos Vitest,
  28 pruebas PASS (incluye nuevo decoder y controles, client y hooks existentes).
  Contrato confirmado contra recursos/DTO backend, rutas relativas GET y orden
  auth/Blob. `git diff --check` PASS; hashes fuente/prueba/request.ts idénticos
  antes/después. Sin edits del verificador; las dos Compunex D siguen excluidas.
- [ ] **B04-01 — VERIFICADO, CIERRE PENDIENTE:** corrección acotada de bloqueadores.
      Gate anterior: `pnpm run typecheck` falló TS1294 en
      `src/api/client.ts:11`: constructor parameter property incompatible con
      `erasableSyntaxOnly`. Prettier focalizado falla únicamente en `contract.ts`.
      Worker `muw4fy9o-1j-tbv3` aplicó propiedad readonly explícita + asignación
      inmediatamente después de super, parámetro normal (`client.ts`: +3/-1), y
      formato únicamente del miembro presupuesto/PDF (`contract.ts`: +5/-1).
      Readback del autor confirmó inicialización y diff de contrato sin semántica.
      Sin modificar configuración, auth/retry, schema ni aserciones existentes.
      Verificador `muw4h3yp-1k-db9m` confirmó cwd absoluto/rama y repitió:
      Vitest cuatro archivos/28 pruebas PASS; `pnpm run typecheck` PASS;
      Prettier focalizado PASS; `git diff --check` PASS. Hash de prueba idéntico
      (`c6da294b…`); schemas/request.ts sin cambios ni modificaciones incidentales.
      Backend sigue con las dos Compunex D esperadas, excluidas. Commits locales
      autorizados explícitamente; registrar identidad tras el commit de esta unidad.
- `request.ts` no editado; sin controles UI/hooks nuevos. Commit local autorizado;
  no build, suite global ni verificación navegador en este paso.
- ASSESS: riesgo `unassessable`, RDD off por `ingepresupuestos` anidado no tracked
  en raíz. Se aplica verificación independiente de riesgo alto; no modificar
  ignores ni atribuir aprobación nativa. Evaluación no acredita cero cambios.
  `request.ts` sigue solo lectura; no ampliar su firma por cancelación preventiva.
- Rollback: únicamente controles/hooks nuevos, con revisión y autorización;
  conservar ET/cronograma existentes y backend entregado. Sin reset destructivo.
