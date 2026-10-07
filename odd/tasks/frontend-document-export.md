# Plan04 — selección y descarga de documentos

Locator: `thesis-front-react/odd/tasks/frontend-document-export.md`
(frontend: `odd/tasks/frontend-document-export.md`).

FULL mirror #1899, revisión 54, PENDIENTE: el intento de insertar el cierre
falló con `replacement result exceeds maximum observation length`; límite exacto
no conocido. Objetivo editorial ≤42 000 caracteres Unicode, no límite confirmado.

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
(`approve_frontend04_work_unit_commits`). Primera unidad entregada localmente en
`f39da75a99a64da3261f1219d9c208799cf3b527`, cinco archivos/388 inserciones/1 eliminación;
frontend limpio tras el commit, sin push. El mapa actual confirma rutas
y opciones backend. Se añadió únicamente la prueba
`src/test/features/exportar/documento-preflight-error.test.ts`; RED confirmado
por verificación independiente: una prueba falla por pérdida del preflight 409.
El usuario aprobó el ajuste mínimo de `client.ts` mediante la opción
`approve_client_direct409`; corrección acotada con GREEN independiente
confirmado. Callbacks de descarga de presupuesto/APUs verificados (30 pruebas,
typecheck/lint/Prettier/diff PASS). Unidad entregada localmente en
`36665d85829decf1941cae0fdc7f567b957763ec`, tres archivos/340 inserciones/21 eliminaciones;
frontend limpio tras el commit, sin push.
Productor de preflight y query keys entregado localmente: F04-02b CERRADO en
`b9a850ecebbcf778dacf61c28a74bb3b222d0f2e`
(`feat(exportar): isolate document preflight by selected context`), cinco archivos,
462 inserciones/11 eliminaciones: 473 líneas authored. Frontend limpio tras commit;
44/44 pruebas y checks funcionales independientes PASS, AST PASS según registro.
F04-03 CERRADO: F04-03a CERRADO en
`5103a2b64f748cff2ccd15cdde813b49cacbbfbc`; F04-03b CERRADO en
`4254f441167f88909e55f27322fb2cdfb88e7a85`. Implementación y alcance funcional
CERRADOS por decisión del usuario; F04-05 cierra únicamente el estado del plan.
F04-04: regresión global DIFERIDA fuera de este cierre, no aprobada ni corregida.
Se conservan los resultados existentes: build PASS, suite y formato global FAIL;
timeouts en archivos distintos, causalidad desconocida; formato ajeno baseline.
No se añade informe de validación final. La validación exhaustiva con un proyecto
real pertenece a futuros procesos independientes, no al alcance de este plan.
Los registros históricos inferiores describen etapas anteriores, no el estado actual.
El índice de código no acreditaba las nuevas rutas backend y no se usará como contrato.
El estado antiguo «bloqueado» de plan04 corresponde a su redacción anterior;
los gates backend y la nueva autorización habilitan esta implementación.

Commits locales frontend autorizados por unidades verificadas en esta rama.
No push, PR, merge, despliegue ni cambios de DB. Cierre funcional aceptado por
el usuario, sin implementación pendiente identificada en el alcance aprobado;
no equivale a una suite global verde ni a validar exhaustivamente los contenidos.

Decisión explícita del usuario para futuras entregas plan04: conservar
`delivery_strategy=auto-chain`, `chain_strategy=feature-branch-chain`.
Es estrategia de revisión, no autoridad de publicación; sigue vigente únicamente
el permiso de commits locales de unidades verificadas. Slices propuestos:

1. Decoder: `f39da75` (primera unidad).
2. Callbacks: `36665d8` (segunda unidad).
3. Preflight/query keys: `b9a850e` (tercera unidad, F04-02b cerrado).
4. UI presupuesto/APUs: `5103a2b` (F04-03a).
5. Cronograma PDF A3 y layout local: `4254f44` (F04-03b).
   La rama feature tracker destino de la cadena no está creada; no hay refs de PR.
   Acumulado authored entregado: 389 + 361 + 473 + 765 + 274 = 2 262 líneas en cinco commits.
   Slice F04-03a: `5103a2b64f748cff2ccd15cdde813b49cacbbfbc`, tres archivos,
   +712/-53 (765 líneas), frontend limpio confirmado antes de F04-03b.
   Gate independiente `mux2tuoh-b-1vae`: 60/60 en seis archivos, typecheck,
   lint (9 warnings ajenos), Prettier y diff PASS. Chromium local 1440/390:
   token de 204 caracteres, cero overflow, anchos Card/Alert iguales, botones
   alcanzables y teclado PDF histórica V1 PASS. Solapamiento baseline de breadcrumb/
   versión queda fuera. AST: 22 604 nodos, 56 806 enlaces, 844 comunidades,
   2 033 manifest, cero duplicados/colgantes; 64 sin nodos, 109 SQL sin parser,
   aviso 843 labels/844 comunidades. Sin backend vivo/otros browsers/build/global.
   La tercera unidad ocupa 473 líneas/5 archivos; el conteo histórico de 443 era
   anterior a metadata final. El umbral 400 es heurística advisory de revisión,
   no tope obligatorio ni motivo para code golf. Esta actualización documental queda
   para la próxima unidad verificada; no amend ni commit en este paso.

### F04-03b — alcance y forecast antes de fuente

Ruta `/proyectos/:id/documentos?v=<UUID>`; A3 únicamente PDF de cronograma.
Callback compatible con dos argumentos: ausencia de papel conserva A4 backend;
tercer argumento opcional A4/A3 solo se transmite para PDF. Control PDF-only,
reset A4 al cambiar formato, UUID histórico y gates actuales intactos.
HTTP actual usa `papel`, no `paper`: CronogramaDocumentoResource:93–122,145–156.
Superficie exacta: hook exportar, pantalla, sus dos tests y este documento.
Forecast: 40–60 líneas producción + 80–120 tests + metadata; unidad cohesiva.
RED de assertions antes de producción; GREEN focalizado, typecheck/lint/Prettier/
diff; independiente navegador/AST/commit pendientes. F04-04/05 pendientes.
Rollback: únicamente opción de papel, control y pruebas añadidas; conservar 03a.

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

- [x] **F04-01 — CERRADO:** mapa del contrato real, selección de versión y
      pruebas existentes completado. Validar mediante prueba focalizada la pérdida
      del preflight directo en el interceptor Blob antes de solicitar ampliación
      mínima de superficie a `src/api/client.ts`. RED observado y ajuste aprobado.
      GREEN funcional independiente: 28/28 pruebas en cuatro archivos.
      B04-01 resuelto: typecheck/formato/diff PASS en candidato corregido.
      Sin cambios de tsconfig ni relajación de pruebas. Commit: `f39da75`.
- [x] **F04-02a — CERRADO:** integrar callbacks de descarga de presupuesto/APUs
      con contexto de UUID capturado y opciones compatibles. Unidad separada de
      preflight/query keys para mantener revisable el diff.
      Worker escribió dos pruebas (~120 líneas) solo en
      `src/test/features/exportar/hooks/useExportar.contrato.test.tsx`.
      API propuesta: `descargarPresupuesto(UUID, {formato, orientacion?})` y
      `descargarApus(UUID, {formato, layout?})`. Matriz de opciones cerradas y
      captura de selección histórica durante solicitud diferida; helper real,
      Blob/MIME/nombre backend/revocación. Esta evidencia corresponde a la fase
      de prueba antes de los cambios de producto descritos abajo.
      Verificador `muw4rq0l-1m-3m20`: 21 pruebas/2 archivos, 19 PASS y dos nuevas
      FAIL por `descargarPresupuesto` ausente (guards en líneas 202/256).
      RED real de capacidad no implementada, no import/runner. No se invocaron
      callbacks: rutas/query/auth/Blob/MIME/nombre/revocación/contexto pendientes.
      Primer intento en cwd raíz no encontró Vitest y no cuenta como RED;
      ejecución correcta desde frontend sí obtuvo los dos fallos descritos.
      Test/hook/request hashes sin cambios por verificación. Corregir fragilidad
      de orden en queries (líneas 210/240), manteniendo comparación exacta de
      pares clave/valor y duplicados.
      Worker `muw4wiip-1n-4z6o` implementó callbacks y tipos discriminados, copia
      de opciones al invocar, UUID explícito, guard síncrono de duplicados y
      estado compartido solo para callbacks nuevos; `finally` libera carga.
      MIME admite formato solicitado u octet-stream, rechaza JSON/HTML/vacío;
      errores se propagan sin guardar archivos. Query tests comparan entries
      ordenadas sin perder duplicados. Hook +94/-11; test acumulado +155/-1.
      Fallback independiente confirmó 30/30 pruebas en cuatro archivos: seis
      casos HTTP y selección diferida V1→V2 ejecutados con ruta/query/auth,
      bytes/MIME/nombre/revocación correctos. Lint PASS (9 warnings ajenos),
      Prettier focalizado y diff-check PASS. Typecheck FAIL TS2345 en test:243:38
      por unión de callbacks al seleccionar método dinámicamente.
      **B04-02 — CORRECCIÓN ESCRITA:** invocación de matriz ahora usa rama por
      `caso.metodo` y callback concreto presupuesto/APUs. Se conserva guard
      Reflect/typeof y todas las opciones/aserciones; sin casts ni cambio de
      tipos de producto/config. Verificador separado `muwsqeh0-2-a1ht` repetirá
      30 pruebas, typecheck, lint, Prettier y diff: todos PASS.
      Se ejecutaron seis casos y V1→V2; 9 warnings de lint ajenos y warning Vite
      de config no bloqueante. Hook hash `6c4f74da…`, test corregido `6c21fcb9…`,
      request/client/queryKeys sin cambios antes/después. No build/suite global/
      navegador/live backend. Gate funcional y estructural listo para commit;
      F04-02a y B04-02 cerrados con commit `36665d8`.
      Guard UUID/opciones, duplicados, cleanup en error y MIME/fallback nuevos
      solo inspeccionados en fuente: no atribuirlos a pruebas separadas.
      El handoff dijo TDD no activo; esa etiqueta no es evidencia: existe RED
      independiente previo (dos fallos) y GREEN funcional observado (30 PASS).
      Intentos de verificación `muw4yxna-1o-2hfs` y actualización AST
      `muw4zr4c-1p-tfqv` fallaron con `assistant reported an error`, sin handoff
      utilizable; no inferir resultado de comandos ni grafo actualizado.
      Recuperación: Git confirmó rama/HEAD `f39da75` y únicamente tres archivos
      M (hook, test, tarea); backend conserva solo Compunex D. La proyección
      todo se restaurará desde este documento porque retornó al estado antiguo.
      Roles read-only configurados en `openai-codex/gpt-6-luna`; fallo exacto de
      proveedor no disponible. No modificar configuración global. Fallback
      `muwsg0ww-1-bfzi`: sesión separada del agente con Bash disponible, limitada
      a verificación sin ediciones de fuente. Ejecutó los checks descritos arriba.
      AST `graphify update .` agotó 120 s tras extracción 521/521; 64 fuentes sin
      nodos, 109 SQL omitidos por `tree_sitter_sql` ausente, aviso de comunidades
      824 labels/863 comunidades (224 renombradas). Sin exit code ni proceso
      restante; no confirmar grafo actualizado. No instalar parsers ni regenerar
      con LLM. Mantenimiento separado `muwsrpsq-3-i776`: mismo comando AST una
      vez con límite 360 s, validar JSON/counts/hashes/status, sin tocar fuentes,
      configuración o dependencias. Completado exit 0: “Code graph updated”,
      modo “no LLM needed”. Graph/manifest/report/html/labels actualizados;
      backup CLI de cinco artefactos conservado. JSON: 22 582 nodos/56 754 edges,
      cero IDs duplicados y edges colgantes; manifest 2 032 entries, 859 comunidades.
      `.graph.tmp.json`/`.rebuild.lock` del intento parcial desaparecieron por CLI.
      Hash agregado de 344 fuentes frontend/490 backend y Git sin cambios.
      Persisten 64 fuentes sin nodos, 109 SQL sin parser y labels semánticos
      desactualizados (224 nombres de hubs); no instalar ni usar LLM. Mantenimiento
      completado; graph `69b85fad…`, manifest `0a387c17…`. Listo para commit de
      producto; ningún artefacto graphify-out se incluye en el commit frontend.
      Hook/test hashes antes/después iguales; helper/backend hashes solo abarcan
      AST (capturados después de checks funcionales). Backend/frontend status
      sin cambios incidentales. No build/global/browser/live-backend en este paso.
- [x] **F04-02b — CERRADO:** integrar preflight validado y query keys por
      UUID/documento/formato/opciones, guards y refresh exacto tras 409;
      pruebas críticas de aislamiento antes de integrar la pantalla.
      Nuevo test `src/test/features/exportar/hooks/useDocumentoPreflight.test.tsx`:
      246 líneas formateadas/11 casos escritos, sin ejecutar. API propuesta
      `usePreflightDocumento(contexto)` devuelve query + `invalidar()` que captura
      key exacta de ese render; no usar observer.refetch mutable para errores 409
      anteriores. Ejes de contexto, respuesta tardía, guards UUID, defaults
      canónicos e invalidación capturada aún no verificados. Sin producción nueva.
      Verificador fallback read-only `muwtfk9p-5-zogk`: RED real, exit 1,
      11/11 pruebas fallan en beforeEach:27 por export `usePreflightDocumento`
      ausente, colección/import correctos. Los cuerpos no se ejecutaron; ninguna
      solicitud/cache/default/guard/invalidation quedó probada todavía.
      Hashes test `05f8e24b…`, hook `6c4f74da…`, queryKeys `c007fcf2…`, request
      `bed9fbc1…` antes/después iguales; Git sin cambios. P-32/preflight directo
      fuente backend confirmados. Otros combos válidos usan opciones vacías;
      combinaciones incompatibles se rechazan, nunca se convierten en defaults.
      Forecast: 246 líneas test +10 cambios de tarea =256 antes de este registro;
      producción estimada 100–130 deja margen estrecho. El forecast original
      trató 400 como tope del diff total, incluidos nuevos archivos/metadata;
      esa instrucción queda sustituida por la heurística advisory: contar el
      authored completo, intentar slices coherentes y explicar el sobrepaso,
      sin quitar casos ni debilitar aserciones. Productor `muwtpzme-6-rd5f` implementó hook/keys:
      contexto discriminado copiado, opciones efectivas congeladas, identidad de
      respuesta validada y invalidación lexical exacta; callbacks/test intactos.
      Diff declarado 361 líneas (246 test +29 tarea +86 producción), antes de
      este registro; verificar conteo real. ASSESS sigue unassessable por repo
      anidado `ingepresupuestos`, RDD off: tratar como alto riesgo, sin aprobación
      nativa ni cambio de ignores. Verificador read-only `muwtxw1v-7-f2f0` ejecuta
      11 casos nuevos, 30 regresiones, typecheck/lint/formato/diff e integridad.
      Verificador `muwzer1y-1-vrh0`: comando focalizado de cinco archivos,
      41 casos: 38 PASS/3 FAIL (respuestas tardías formato/orientación/layout).
      Typecheck, lint (9 warnings ajenos), Prettier y diff-check PASS;
      hashes estables, 369 líneas authored. Sin AST/commit/build/navegador/suite global.
      Corrección delegada por múltiples archivos no triviales y checks: reparar
      routing MSW sin relajar aserciones y reproducir RED de UUID no v7 antes
      de ajustar exclusivamente guards nuevos. 400 líneas es advisory, no hardcap;
      conservar pruebas/comentarios y explicar el menor sobrepaso coherente.
      Corrección del writer: registrar handler nuevo sólo después de observar
      request antiguo; conserva queries exactas/defaults, assertions y ambos HTTP.
      `UuidV7.java` leído: versión 7/variante 8,9,a,b; helper local compartido sólo
      para preflight documento y callbacks presupuesto/APUs. ET/crono intactos.
      Cwd canónico de todos los comandos: `/home/kaandradec/Documents/workspace/uce/proyecto-grado/thesis-front-react`.
      RED `pnpm exec vitest run src/test/features/exportar/hooks/useDocumentoPreflight.test.tsx src/test/features/exportar/hooks/useExportar.contrato.test.tsx -t '01900000|rechaza UUID no v7'`: 3 FAIL por assertions (fetching≠idle dos veces; 4 HTTP≠0), 31 skipped.
      GREEN `pnpm exec vitest run src/test/features/exportar/hooks/useDocumentoPreflight.test.tsx src/test/features/exportar/hooks/useExportar.contrato.test.tsx src/test/features/exportar/hooks/useExportar.test.tsx src/test/features/exportar/documento-preflight-error.test.ts src/test/api/client.test.ts`: 44/44 PASS, cinco archivos.
      `pnpm run typecheck`: PASS. `pnpm run lint`: PASS, 9 warnings ajenos.
      `pnpm exec prettier --check src/features/exportar/hooks/useExportar.ts src/test/features/exportar/hooks/useDocumentoPreflight.test.tsx src/test/features/exportar/hooks/useExportar.contrato.test.tsx src/api/queryKeys.ts`: PASS tras formato del test preflight únicamente; primer check FAIL de formato.
      `git diff --check`: PASS. Routing es corrección de harness, no RED behavioral.
      Runtime MSW prueba aislamiento tardío, defaults, invalidación capturada,
      UUIDv4/variante c sin HTTP ni guardado y regresiones; no prueba live backend.
      Fuente confirma regex case-insensitive y refetch guard; sin tests separados
      de todas las variantes válidas, duplicados/cleanup/MIME/fallback.
      Hashes protegidos antes/después idénticos (SHA-256 prefijos): client
      `0c24df14`, request `bed9fbc1`, queryKeys `ad711b65`, package `55eb002c`,
      lockfile `aed1b255`, tsconfig app/root/node `4ff34df3`/`1f10234e`/`d366cc08`,
      vite/vitest `161c6a77`/`d8ecc2a2`. Inspección inicial de hashes salió 1 por
      glob eslint.config inexistente; no representa fallo de validación ni RED.
      Conteo final authored: 443 líneas (250 test nuevo +73 tarea +34 keys
      +62 hook +24 callback test), incluidas adiciones/eliminaciones; +43 sobre
      advisory 400. Exceso mínimo
      coherente: conservar 11 casos existentes + dos controles UUID + guard callback
      y evidencia, sin eliminar tests/comentarios para alcanzar 400 líneas.
      GREEN del writer observado; el gate independiente y AST posteriores se
      completaron según la evidencia final siguiente. En esa etapa el commit
      aún estaba pendiente; cierre local registrado al final de esta tarea.
      **Verificación final independiente `muwzsvab-3-2o46`:** 44/44 pruebas en
      cinco archivos PASS; typecheck, lint (9 warnings ajenos), Prettier y
      diff-check PASS. Warning Vite `__dirname` no bloqueante. Se conserva el
      RED del writer de tres assertions descrito arriba; routing MSW no es RED
      behavioral. Runtime MSW cubre contextos tardíos, defaults/cache, invalidación
      de key antigua capturada y guard UUID; no acredita matriz completa de
      variantes, live backend, navegador, build ni suite global.
      AST `graphify update .`: exit 0, límite 360 s, sin LLM; 22 594 nodos,
      56 786 edges, 833 comunidades, 2 033 entradas manifest, cero IDs duplicados
      o edges colgantes. Backup de cinco artefactos conservado. Persisten 64
      fuentes sin nodos, 109 SQL sin parser y 198 nombres de hubs obsoletos.
      Hashes fuente/protegidos y status frontend/backend sin cambios por AST.
      ASSESS nativo sigue unassessable por `ingepresupuestos` anidado; RDD off,
      sin aprobación nativa. Ese gate dejó F04-02b listo para commit y las tareas
      siguientes pendientes; se conserva como evidencia de aquella etapa.
      **Cierre local:** `b9a850ecebbcf778dacf61c28a74bb3b222d0f2e`,
      `feat(exportar): isolate document preflight by selected context`.
      Allowlist e identidades completas/índice/HEAD comprobados por el padre:
      5 archivos, +462/-11, 473 líneas authored; frontend limpio postcommit.
      Evidencia independiente funcional (44/44 y checks) y AST anterior conservada;
      no se repitieron tests ni AST para esta metadata. Sin PR/push/merge ni tracker.

### Unidad F04-03a — alcance autorizado antes de fuente

Presupuesto/APUs: controles accesibles, opciones compatibles, UUID seleccionado
(incluida versión histórica), gate de preflight y aislamiento de errores 409.
Ruta: `/proyectos/:id/documentos?v=<UUID presupuesto>`; no usar UUID del proyecto.
Superficie de esta unidad: `src/features/exportar/pages/ExportPage.tsx`, su prueba
`src/test/features/exportar/pages/ExportPage.test.tsx` y este seguimiento.
Forecast cohesivo: 160–220 líneas UI + 180–250 pruebas + metadata; el total puede
superar 400 líneas advisory sin borrar evidencia ni ampliar la unidad.
RED primero con Vitest de pantalla; GREEN mínimo, seis archivos focalizados,
typecheck, lint, Prettier focalizado y diff-check. No build/AST/navegador aquí.
F04-03a permanece EN CURSO hasta verificación independiente y commit del padre.
F04-03b (cronograma A3) PENDIENTE, separado; ET y cronograma actual protegidos.
F04-04/05 pendientes; sin push/PR/merge ni aprobación nativa.

### F04-03a — corrección visual acotada, EN CURSO

Gate independiente `mux0ydxw-7-zo7u`: 60/60 pruebas, typecheck, lint (9 warnings),
Prettier y diff-check PASS; flujos de navegador PASS, geometría BLOCKER.
Captura desktop revisada por el padre y este writer: botón de presupuesto recortado;
evidencia independiente a 1440×1000: botón y=619–647, card termina en y=595.
APUs también presenta clipping al variar contenido. La suite verde no acredita layout.
Causa local: las cards nuevas son hijos flex de AppShell y se contraen; Card compartido
mantiene overflow-hidden. Ruta autorizada: impedir shrink únicamente en
DocumentoPresupuestario, conservar flujo completo y scroll vertical del shell,
sin overflow-visible, CSS global ni cambios de Card/AppShell o ET/cronograma.
Validar contenido largo/bloqueos/warnings a 1440×1000 y ancho 390 si navegador seguro;
no inventar RED jsdom de clases CSS. Tests existentes permanecen solo lectura.
F04-03a sigue EN CURSO hasta gate independiente postcorrección y commit del padre;
F04-03b A3 sigue PENDIENTE. Sin AST/build/backend vivo/DB en este writer.

Corrección escrita: una sola línea local, Card de DocumentoPresupuestario usa
`shrink-0 min-w-0 break-words`. No oculta la causa mediante overflow-visible:
conserva altura de contenido y permite scroll vertical del shell; palabras largas
pueden partirse dentro de las cards nuevas. Ningún handler/opción/gate fue editado.
Checks postcorrección desde cwd frontend absoluto: comando focalizado de seis
archivos registrado abajo PASS 60/60; `pnpm run typecheck` PASS;
`pnpm run lint` PASS con nueve warnings heredados;
**P2** (`pnpm exec prettier --check src/features/exportar/pages/ExportPage.tsx src/test/features/exportar/pages/ExportPage.test.tsx`) PASS;
`git diff --check` PASS. Sin formato aplicado ni pruebas nuevas/modificadas.
Hashes protegidos antes/después idénticos: test pantalla
`2b7edc674e570694e0fa2b1284b9801d3f35e5fdd85d7c74cd11d431991a4dd0`,
hook `880b8468`, client `0c24df14`, request `bed9fbc1`, keys `ad711b65`,
contrato `86d60ad9`, schemas `2be404f7`, Card `55e5845f`, AppShell `8134ea1e`,
DescargaCronograma `9506c65a`. Handlers ET/crono y bloque cronograma idénticos a HEAD;
ET conserva la eliminación preexistente del aviso obsoleto, no editada aquí.
Geometría postcorrección y teclado Radix PENDIENTES: no se ejecutó navegador en
este writer; test-results contiene capturas/log previo, no harness reutilizable.
No atribuir PASS visual a clases CSS ni al 60/60 jsdom. Padre repetirá gate
independiente 1440×1000/390, contenido largo, scroll y botones sin obstrucción.
Intentos iniciales de mirror HTTP dieron 405 (PUT) y 400 (PATCH sin query de
ownership), sin cambio de fuente; PATCH con expected_project en query funcionó.
Mirror completo 1899 verificado por readback, salvo newline terminal normalizado
por Engram. No stage/commit/push ni modificaciones fuera de las dos superficies.

### F04-03a — alerta anidada, diagnóstico previo a fuente

Verificador independiente `mux208bb`: Card `shrink-0 min-w-0 break-words`
PASS desktop/mobile para altura, botones y scroll vertical; conservar esa corrección.
Alerta anidada mobile FAIL: a ancho 390, Card clientWidth=342/scrollWidth=463,
121 px de clipping de texto. Capturas `f04-03a-verified-desktop.png`,
`f04-03a-verified-mobile-budget.png` y `f04-03a-verified-mobile-apus.png`
inspeccionadas realmente: desktop conserva botón; mobile recorta mensajes/rubros.
Alert compartido usa grid `auto 1fr`; sus hijos no tienen mínimo cero.
Corrección autorizada únicamente en hijos de Alert de DocumentoPresupuestario:
mínimo cero y wrapping robusto, sin ocultar/truncar mensajes, sin tocar shared UI.
Ruta `/proyectos/:id/documentos?v=<UUID presupuesto>`; F04-03a EN CURSO.
Antes de cerrar este writer: Chromium local 1440×1000/390 con fixtures interceptadas,
geometría Card/Alert/texto/botones y diagnóstico teclado Radix con cambio HTTP;
seis archivos Vitest, typecheck, lint, Prettier focalizado y diff-check nuevos.
Sin AST/build/backend vivo/DB/deps/config ni stage/commit/push; gate independiente
y commit del padre siguen pendientes. FULL mirror 1899/readback antes de fuente.

### F04-03a — wrapping local verificado por writer, sin cierre

Cambio mínimo: solo los seis AlertTitle/AlertDescription locales de documentos
nuevos reciben `min-w-0 [overflow-wrap:anywhere]`. El grid compartido `auto 1fr`
tenía mínimo intrínseco; `break-words` en Card no reducía ese mínimo. Anywhere
conserva texto completo y reduce min-content, heredado por mensajes/listas/rubros.
Card `shrink-0 min-w-0 break-words` intacto; sin elipsis, overflow mask ni shared edit.

Chromium 151.0.7922.34 / Playwright instalado 1.62.1, `node <<'NODE'` efímero,
cwd canónico (F04-02b).
Cada ejecución lanzó `node node_modules/vite/bin/vite.js --host 127.0.0.1
--port <puerto libre obtenido con net.listen(0)> --strictPort` desde ese cwd,
login UI y context nuevo; interceptó exclusivamente `/api/v1/**` con fixtures
existentes de auth/proyectos/presupuesto/cronograma y preflight del contrato actual.
Sin backend vivo, cookies reales, instalación, script de repo ni log de tokens.
Todos los servidores propios recibieron SIGTERM y finalizaron; puertos liberados.

RED navegador antes de fuente: ambos Card mobile 342/1287 con token sin espacios
más extremo (204 caracteres), mensajes normales y tres rubros largos en bloqueo
Y warning. El FAIL independiente anterior 342/463 sigue siendo evidencia distinta.
GREEN exit 0 a 1440×1000 y 390×844, ambos documentos: Card client/scroll
1136/1136 y 342/342; cada Alert 1102/1102 y 308/308; cada Description
1058/1058 y 264/264. Cero descendientes con overflow y cero fragmentos de texto
fuera de bounds Alert; botones dentro de Card, alcanzables por scroll y sin overlay.
Warnings-only mobile adicional PASS: mismos anchos, botones habilitados y hit-test
sobre botón real. No se pulsaron descargas ni se afirmó una nueva matriz HTTP.
Capturas `test-results/f04-03a-anywhere-{1440,390}-{budget,apus}-{text,button}.png`
y `f04-03a-anywhere-390-{presupuesto,apus}-enabled.png` abiertas como imágenes;
texto y token se parten sin clipping horizontal, botones visibles. Header móvil
preexistente solapa breadcrumb/selector de versión: fuera de superficie, no corregido.

Teclado PASS en ambos controles: focus preparado, Shift+Tab→Tab (assert foco real),
Enter (presupuesto) / Space (APUs) abre listbox, aria-expanded=true y activeElement
option Excel seleccionada; ArrowDown y espera explícita de foco PDF, Enter confirma.
SelectedValue=PDF y portal cerrado; GET real interceptado de preflight histórica V1:
`/api/v1/documentos/presupuesto/0198c1a0-0000-7000-8000-000000000010/preflight?formato=pdf&orientacion=vertical`
y `/api/v1/documentos/apus/0198c1a0-0000-7000-8000-000000000010/preflight?formato=pdf`.
Evento medido en bubble window: Enter/Space de apertura y ArrowDown defaultPrevented
true; Enter de confirmación false. Snapshot inicial en capture/microtask veía false
antes del handler React: instrumentación corregida, no defecto del componente.
No se demostró bug global Select; no cambios nuevos de props Select ni shared UI.

Intentos de harness conservados: primer exit 1 por buscar «Iniciar sesión» en vez
de «Ingresar»; segundo exit 1 por interceptar versiones con ruta errónea en vez de
`/proyectos/:id/presupuestos`; corregidos desde fuentes actuales. RED exit 0;
primer GREEN exit 1 por hit-test de botón disabled (pointer-events:none): el hit
correcto era ancestro, no overlay; GREEN corregido exit 0, cero rutas sin fixture.
Diagnóstico final bubble/warnings-only exit 0. Sin atribuir esos errores a producto.

Checks frescos (mismo cwd absoluto; invocaciones sin suite amplia):

- **V6** (`pnpm exec vitest run src/test/features/exportar/pages/ExportPage.test.tsx src/test/features/exportar/hooks/useDocumentoPreflight.test.tsx src/test/features/exportar/hooks/useExportar.contrato.test.tsx src/test/features/exportar/hooks/useExportar.test.tsx src/test/features/exportar/documento-preflight-error.test.ts src/test/api/client.test.ts`): exit 0, 60/60 en 6 archivos; warning Vite __dirname y cuatro avisos jsdom navigation.
- `pnpm run typecheck`: exit 0.
- `pnpm run lint`: exit 0, nueve warnings heredados, cero errores.
- **P2** (comando canónico en corrección visual): primer exit 1 solo formato de título Avisos; colapsado con edit local, repetición exit 0. Test intacto.
- `git diff --check`: exit 0 tras formato, se repite después de metadata.
  SHA-256 pantalla final `4f1bd79baaabbe09a6d44275a29939c06881461884f1b219389bbf3d4bec6e1f`;
  test `2b7edc674e570694e0fa2b1284b9801d3f35e5fdd85d7c74cd11d431991a4dd0` intacto.
  Hashes before/after idénticos para hook/API/Alert/Card/AppShell/DescargaCronograma;
  ET/crono no editados en este writer, diff de fuente limitado a seis hijos Alert.
  F04-03a EN CURSO: gate independiente y commit del padre pendientes; F04-03b/F04-04/05
  siguen pendientes. Sin RDD approval, AST/build/global E2E, stage/commit/push.
  Diff completo vs HEAD: +712/-53 = 765 líneas authored, incluida metadata y cambios
  preexistentes de pantalla/test/tarea. 400 es advisory: preservar evidencia y unidad
  cohesiva, sin code golf ni expansión de superficie. FULL taskdoc/mirror 1899 y
  readback finales obligatorios, conservando historia.

### F04-03a — evidencia del writer, sin cierre

UI escrita solo en pantalla y prueba local: presupuesto XLSX/PDF A4
vertical/horizontal; APUs XLSX pestañas/apilado y PDF sin layout. Las opciones
incompatibles se eliminan, no viajan ocultas. Gate cerrado sin éxito validado del
contexto actual, mientras fetching/loading o ante bloqueos/error. Stale avisa sin
aprobar. Un único hook de descarga conserva el guard compartido. 409 captura
UUID/opciones/key, muestra detalles solo en su contexto e invalida la key antigua;
el feedback bloquea el éxito cached hasta refrescarlo. ET/cronograma intactos.

Cwd explícito de todos los comandos: frontend absoluto indicado en F04-02b.

- RED `pnpm exec vitest run src/test/features/exportar/pages/ExportPage.test.tsx`:
  5 FAIL/9 PASS, falta UI presupuesto/APUs (botones, detalles y cantidad aprobada),
  sin fallo de colección/import. Los cuerpos avanzados todavía no se ejecutaban.
- GREEN mismo comando: 14/14 PASS tras implementar UI y corregir fixtures locales.
  La fixture de rubro necesitaba `codigo`; el UUID histórico es V1, no V2 vigente.
  Los dos fallos intermedios por fixture no son RED behavioral nuevo.
- TRIANGULATE: gate pendiente/respuesta de otro UUID, rubros bloqueantes vs stale,
  descarga histórica V1 y limpieza XLSX→PDF→XLSX, 409 actual durante refresh
  diferido y 409 tardío tras cambiar formato con invalidación exacta antigua.
- **V6** (comando canónico en wrapping):
  60/60 PASS, seis archivos (16 pantalla + 44 regresiones), repetido tras formato.
- `pnpm run typecheck`: primer FAIL TS2769 por `exact` no admitido en ByRoleOptions;
  corregido solo en test, segundo PASS. Strings de nombre siguen siendo exactos.
- `pnpm run lint`: PASS, nueve warnings heredados fuera de superficie.
- **P2** (comando canónico en corrección visual): PASS;
  formato aplicado únicamente a los dos archivos autorizados.
- `git diff --check`: PASS. Warning Vite `__dirname` y navegación jsdom no bloquean.
- Fingerprints SHA-256 protegidos idénticos antes/después: hook `880b8468`, client
  `0c24df14`, request `bed9fbc1`, keys `ad711b65`, contrato `86d60ad9`, schemas
  `2be404f7`, package/lock/config y DescargaCronograma `9506c65a`. Fragmentos ET
  y cronograma (handlers, ET/botón y cronograma hasta EOF) versus HEAD:
  `03ad2a6703f12f815d752c9396d667d16b6cd4f576708f0510e1e0a487d31fbb` iguales.
- Diff completo: 636 líneas (+583/-53), incluida metadata previa del padre.
  Exceso cohesivo sobre 400 advisory: UI + cinco regresiones críticas y evidencia.
  No dividir por tipo de archivo, borrar evidencia ni ampliar a cronograma A3.
- Solo fuente: matriz completa de orientación/formatos, errores genéricos de descarga,
  recuperación por refresh exportable y selección tardía de versión no tienen test UI
  separado; hooks cubren contexto UUID. Sin navegador/live backend/build/AST global.
- Rollback revisable: retirar únicamente componente DocumentoPresupuestario y sus
  dos instancias/imports, pruebas nuevas y metadata de esta unidad; conservar las
  secciones ET/cronograma, hooks previos y metadata preexistente. Sin reset.

- [x] **F04-03 — CERRADO:** F04-03a en `5103a2b`; F04-03b en
      `4254f441167f88909e55f27322fb2cdfb88e7a85`, gate independiente y AST
      registrados abajo. Cierre de unidad aceptado por el padre, no PASS global.
      ASSESS unassessable/RDD off; sin aprobación nativa ni push/PR/merge.
- [ ] **F04-04 — REGRESIÓN GLOBAL DIFERIDA FUERA DEL CIERRE FUNCIONAL:**
      checks ejecutados y resultados históricos conservados; suite global FAIL,
      build PASS. No se marca aprobada ni se atribuye causalidad a baseline.
      Implementación y aceptación funcional concluidas por decisión del usuario;
      sin más reruns, fixes ni investigación en este plan.
      Registro histórico conservado: checks globales `mux9b08j-3-dukq`;
      diagnóstico read-only `mux9imby-6-0b8q` terminado. Leer `docs/bugs.md`
      y baselines antes de atribuir causalidad; aislamiento offline, sin DB
      ni backend vivo. Los checks de navegador de unidad no equivalen a E2E
      completo. No fixes de producto sin decisión acotada del padre.
      Runtime limitado a las cinco capturas before/after, `.vite/**` y dos salidas
      `.tmp/tsbuildinfo` autorizadas; `dist` ignorado es salida inherente del build,
      no fuente authored. Estos límites describen las ejecuciones anteriores,
      no nuevas tareas de validación.
- [x] **F04-05 — CERRADO:** estado reconciliado con el cierre funcional solicitado;
      sin informe adicional de validación final ni publicación. FULL mirror
      pendiente por capacidad; el documento local conserva el historial completo.

Las pruebas deben seguir la política mínima de AGENTS: RED/GREEN observado para
riesgos críticos reproducibles; copy/layout/cableado simple se valida mediante
checks y navegador, sin fabricar RED ni duplicar exhaustivamente contratos.
Ninguna tarea se marca cerrada con fallos, checks pendientes o entrega incompleta.

### F04-03b — evidencia del writer, sin cierre

Hook: tercer argumento `papel?: "a4" | "a3"`; solo PDF lo transmite, ausencia
mantiene default A4 backend. UI PDF-only A4/A3 horizontal, reset A4 al cambiar
formato. Preflight crono sigue por formato (backend evalúa lo mismo para ambos
papeles), sin query key/schema nuevos. ET y DocumentoPresupuestario intactos.
HTTP authority: Resource y CronogramaExportResourceIT:268–350 leídos; `papel`
es el nombre real. No pruebas backend ejecutadas ni API viva.
Cwd canónico (F04-02b).

- RED `pnpm exec vitest run src/test/features/exportar/pages/ExportPage.test.tsx src/test/features/exportar/hooks/useExportar.contrato.test.tsx -t 'papel|elegir A3'`: 3 FAIL/37 skipped, query falta papel=a3 y control PDF ausente; colección/import PASS. Reflect sobre callback existente permitió RED antes de ampliar tipo; GREEN refactor usa calls tipadas directas.
- GREEN mismo comando: 3 PASS/37 skipped. Triangulación: V1 histórica, pares exactos con duplicados conservados, PDF explícito A4/default ausente, XLSX/MSPDI sin papel, reset y bloqueos/stale existentes intactos.
- **V6** (comando canónico en wrapping): 63/63 PASS en seis archivos, repetido después de corregir fixture.
- `pnpm run typecheck`: primer FAIL TS2353 por presupuestoId extra en fixture de preflight crono; eliminado solo el campo no canónico, repetición PASS.
- `pnpm run lint`: PASS, nueve warnings ajenos. Warning Vite __dirname y ocho avisos jsdom navigation no bloquean.
- `pnpm exec prettier --check src/features/exportar/hooks/useExportar.ts src/features/exportar/pages/ExportPage.tsx src/test/features/exportar/hooks/useExportar.contrato.test.tsx src/test/features/exportar/pages/ExportPage.test.tsx`: PASS; --write previo limitado a esos cuatro paths (solo tests cambiaron formato).
- `git diff --check`: PASS antes de metadata, repetido al finalizar. No tests DescargaCronograma encontrados en búsqueda acotada; no suite crono amplia ejecutada.
- SHA-256 protegido before/after idéntico: API client/request/contract/schemas/queryKeys, package/lock/tsconfigs/vite/vitest, DescargaCronograma, Card/Alert/AppShell. Diff fuente únicamente hook crono y controles/handler de pantalla crono; ET y componente presupuestario no cambian.
- Diff final +203/-11 = 214 líneas authored, cinco archivos, debajo de 400 advisory. Rollback: quitar tercer argumento/query/control y tres pruebas nuevas; conservar 03a, preflight y gates crono anteriores.
- Solo fuente: captura al clic conserva UUID/formato/papel; no prueba diferida nueva ni matriz de errores A3 independiente. Browser/geometría/teclado nuevo, AST, gate independiente y commit PENDIENTES; no build/global/live backend/publicación. F04-03b no DONE.

### F04-03b — corrección local de layout, EN CURSO

Gate independiente `mux3wijl`: 63/63 y typecheck/lint (9 warnings)/formato/diff
PASS; teclado y queries históricas PASS, visual mobile FAIL. El padre inspeccionó
ET recortada y cronograma con controles fuera de Card; causalidad frente a baseline
no demostrada. Corregir solo sizing/wrapping local de ET y cronograma en pantalla;
Card/AppShell/Alert, handlers, gates, textos, tests y A3 permanecen protegidos.
Verificar las cuatro cards en Chromium 1440×1000/390×844 con fixtures interceptadas,
sin API/DB viva. Capturas nombradas y cache Vite runtime autorizados; no harness escrito.
F04-03b EN CURSO; cierre pendiente de navegador, gate independiente, AST y commit
del padre. F04-04/05 pendientes. Umbral 400 advisory; sin stage/commit/push.

### F04-03b — layout verificado por writer, cierre pendiente

Cuatro líneas presentacionales: ET/cronograma Card `shrink-0 min-w-0`; filas de
copy/descarga apiladas en móvil y horizontales desde sm. Texto completo conservado;
handlers ET/crono y componente presupuestario SHA-256 idénticos antes/después.
Agregado de todos los tracked salvo pantalla/tarea idéntico (`fcc73c12…`): incluye
hook/tests/API/shared UI/deps/config/DescargaCronograma. Sin nuevas pruebas ni formato.

Chromium 151.0.7922.34, inline Node/Playwright instalado, login UI y fixtures
canónicas interceptadas (incluido config/display); salidas externas bloqueadas.
Vite programático con config en memoria, puerto libre propio y cwd frontend absoluto;
perfil/temporales en cache runtime autorizada. Todas las instancias cerradas y puertos
liberados comprobados. Cero rutas desconocidas/pageerrors en ejecución final exit 0.
A 1440×1000 y 390×844, las cuatro cards tienen clientWidth=scrollWidth 1136/342;
documento 1440/1440 y 390/390. Cero overflow anidado, fragmentos de texto o controles
fuera de Card; botones alcanzables por scroll, habilitados con hit-test real.
Alturas ET/presupuesto/APUs/crono: warnings PDF A3 desktop 110/368/438/322,
móvil 154/648/718/398; bloqueos desktop 110/604/674/344, móvil 154/1164/1234/460.
Mensajes/rubros largos y token de 230 caracteres en documentos nuevos conservados.
ET completa; crono warning normal y bloqueos canónicos dentro de bounds, sin shared fix.

Teclado: foco real, Enter abre, Home/ArrowDown con espera de foco y Enter confirma
PDF (.pdf)/A3. Descargas histórica V1 `0198c1a0-0000-7000-8000-000000000010`:
pares exactos PDF papel=a3, XLSX/MSPDI sin papel, volver a PDF reset A4 y papel=a4.
Las cinco capturas autorizadas before/after abiertas como imágenes. Fullpage móvil
390×2156 con viewport expandido solo para captura del scroller; tamaños de las cuatro
cards idénticos antes/después de expandir y restaurar 390×844. No confundir contenido
fuera del viewport con clipping. Header baseline solapado permanece fuera de alcance.

Checks frescos: mismo comando focalizado de seis archivos arriba, exit 0 63/63;
`pnpm run typecheck`, `pnpm run lint`, Prettier de los cuatro paths F04-03b y
`git diff --check`: exit 0. Lint conserva nueve warnings ajenos; Vitest aviso Vite
__dirname y ocho navigation jsdom; navegador HydrateFallback no bloqueante.
Intentos fallidos de harness: config/display ausente; etiqueta PDF incorrecta;
locator main ambiguo para captura. Corregidos inline, no defectos ni RED de producto.
Diff al cerrar metadata +259/-15 =274 líneas authored/5 archivos; 400 advisory.
Writer validado, F04-03b EN CURSO hasta gate independiente/AST/commit del padre;
F04-04/05 pendientes. Sin build/suite global/otros browsers/backend vivo/DB/publicación.
FULL mirror 1899 actualizado por patch preservador y readback; no raw HTTP.

### F04-03b — cierre local y gate independiente aceptado

Commit `4254f441167f88909e55f27322fb2cdfb88e7a85`,
`feat(exportar): add A3 paper selection for schedule PDF`: cinco archivos,
+259/-15, 274 líneas authored. El padre comprobó allowlist staged exacta,
identidades/hash de índice y HEAD; frontend limpio tras commit, sin push.
Las dos eliminaciones Compunex backend se conservan, excluidas.

Verificador independiente fresco `mux7zv55-1-v564`: comando Vitest focalizado
de seis archivos registrado en F04-03b, exit 0, 63/63; `pnpm run typecheck`
exit 0; `pnpm run lint` exit 0, nueve warnings ajenos; Prettier de los cuatro
paths F04-03b exit 0; `git diff --check` exit 0. No repetidos por esta metadata.
Chromium real: cuatro cards a 1440×1000 y 390×844, warnings y bloqueos,
anchos 1136/342, cero violaciones de bounds anidados/texto/controles;
botones alcanzables y gates conservados. El intento combinado agotó tiempo
por su foco de teclado DESPUÉS de las assertions geométricas. El harness de
captura falló después de escribir imágenes: no fue una ejecución browser única
limpia. No se observó fallo de producto. Ejecución separada de teclado exit 0:
V1 histórica `0198c1a0-0000-7000-8000-000000000010`, PDF `papel=a3`,
XLSX/MSPDI sin `papel`, regreso PDF reset `papel=a4`. Sin API desconocida,
salidas externas ni pageerrors. Capturas after desktop/mobile/fullpage autorizadas
inspeccionadas por verificador; padre inspeccionó fullpage móvil. Solapamiento
breadcrumb/versión baseline fuera de alcance. Checks separados observados más
pruebas/estáticos bastan para la unidad aceptada; no inventar rerun ni E2E global.
Intento cancelado anterior `mux594mz-h-682h` NO es PASS.

AST `graphify update .` una vez, exit 0: 22 608 nodos, 56 810 enlaces,
843 comunidades, 2 033 manifest; cero duplicados/colgantes. Persisten 64 fuentes
sin nodos, 109 SQL sin `tree_sitter_sql`, semántica stale 844 guardadas frente a
843 comunidades y 241 hubs renombrados. Backup `graphify-out/2026-10-06`
conservado; candidato/protegidos/fuentes frontend y backend estables.
RDD off; ASSESS nativo unassessable por `ingepresupuestos` anidado, sin aprobación
nativa. F04-03b/F04-03 cerrados; F04-04 EN CURSO y F04-05 PENDIENTE.
Esta reconciliación no ejecuta checks, staging ni commits; el padre verificará
metadata y decidirá su work-unit commit local posterior.

### F04-04 — checks globales ejecutados, cierre bloqueado

Verificador independiente fresco `mux9b08j-3-dukq`, resultados suministrados
por el padre: typecheck exit 0; lint exit 0, nueve warnings ajenos;
`guard:adr9` PASS; build de producción PASS; diff-check PASS.
`pnpm run format:check` FAIL únicamente en
`odd/tasks/frontend-document-export.md` y `odd/tasks/workspace-compact-layout.md`.
`pnpm run test` FAIL: 746/747 PASS; `AdminPlantillasProyectoPage.test.tsx:20`
agotó timeout de 5 segundos. Causalidad DESCONOCIDA: no atribuir a baseline.
F04-04 EN CURSO con cierre bloqueado, no DONE; F04-05 PENDIENTE.

Diagnóstico read-only `mux9imby-6-0b8q` terminado, sin cambiar configuración:

- Global original exit 1: 746/747 pruebas, 100/101 archivos PASS; timeout admin
  en `src/test/features/admin/pages/AdminPlantillasProyectoPage.test.tsx:20:3`,
  5 424 ms observados, duración global 84,20 s.
- Aislado `pnpm exec vitest run src/test/features/admin/pages/AdminPlantillasProyectoPage.test.tsx`:
  exit 0, 2/2 pruebas, un archivo, 4,40 s; no borra el fallo global.
- Una nueva suite `pnpm run test`: exit 1, 746/747 pruebas, 100/101 archivos PASS;
  timeout distinto en `src/test/features/workspace/components/PestanaApu.test.tsx:89:3`,
  5 221 ms observados, duración 80,95 s. Sin skips; no más reruns.
- Causalidad DESCONOCIDA; `docs/bugs.md` no identifica baseline del timeout.
  No aumentar timeout ni cambiar paralelismo/retries, fuentes o tests.
- Este taskdoc: Prettier focalizado y diff-check PASS tras formato autorizado.
  Formato ajeno baseline probado: mismo blob `09a66c847ea86908414a5097732d116b6ec0c8cf`
  en `5304979` y HEAD; ambos checks stdin exit 1, mismo hash de salida formateada
  `9d0d50d03ce29084f2665c65a25289b073963fd92fff5ee83b9046acdc35e9ce`.
  Documento ajeno intacto; formato global no repetido.
- Build exit 0: `tsc -b && vite build`, Vite 8.2.2, 3 177 módulos, 2,45 s.
- Agregado SHA-256 de 574 tracked excluyendo este taskdoc estable antes/después:
  `1b410244e8ab8c90f5de35d97e369e691e73e03bd94ebbd0794bd1bb917b449b`.

No PASS global ni causalidad baseline de tests inferida. F04-04 sigue bloqueado;
F04-05 pendiente. Siguiente paso: diagnóstico específico de timeouts con alcance
acordado, no repetir suites hasta obtener verde. Sin cambios de producto/fuente;
las dos Compunex D backend se conservan. FULL mirror #1899 revisión 54 PENDIENTE,
capacidad exacta desconocida; sin retry ni compresión adicional. El padre verifica
esta metadata y registra su snapshot local sin declarar cierre del plan.

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
  según handoff original; verificación y corrección posteriores detalladas abajo.
- Verificación independiente `muw48x49-1i-7kry`: cuatro archivos Vitest,
  28 pruebas PASS (incluye nuevo decoder y controles, client y hooks existentes).
  Contrato confirmado contra recursos/DTO backend, rutas relativas GET y orden
  auth/Blob. `git diff --check` PASS; hashes fuente/prueba/request.ts idénticos
  antes/después. Sin edits del verificador; las dos Compunex D siguen excluidas.
- [x] **B04-01 — CERRADO:** corrección acotada de bloqueadores.
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
      autorizados explícitamente; commit de la unidad: `f39da75`.
- `request.ts` no editado; sin controles UI/hooks nuevos. Commit local autorizado;
  no build, suite global ni verificación navegador en este paso.
- ASSESS: riesgo `unassessable`, RDD off por `ingepresupuestos` anidado no tracked
  en raíz. Se aplica verificación independiente de riesgo alto; no modificar
  ignores ni atribuir aprobación nativa. Evaluación no acredita cero cambios.
  `request.ts` sigue solo lectura; no ampliar su firma por cancelación preventiva.
- Rollback: únicamente controles/hooks nuevos, con revisión y autorización;
  conservar ET/cronograma existentes y backend entregado. Sin reset destructivo.
