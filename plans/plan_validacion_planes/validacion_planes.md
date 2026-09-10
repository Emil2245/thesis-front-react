# Prompt — Validación y replanificación de la integración frontend

Copia el contenido de esta sección en una nueva sesión iniciada en la raíz de `thesis-front-react`.

---

Trabaja principalmente en el repositorio `thesis-front-react` para auditar su estado real y preparar la siguiente secuencia de integración con el backend actual.

Puedes inspeccionar y, solo si resulta extremadamente necesario, proponer o realizar un ajuste mínimo en `../thesis-back-quarkus`. Una modificación del backend requiere evidencia de un bloqueo o defecto real del contrato; no se permite cambiarlo por comodidad del frontend, duplicar lógica, inventar endpoints ni reabrir el motor de cálculo. Si la corrección no es pequeña, segura y claramente autorizada por el canon, documenta un STOP y crea un plan backend separado en lugar de implementarla silenciosamente.

La tarea principal de esta sesión es **auditar, reconciliar y producir planes ejecutables**. No empieces la implementación funcional del frontend antes de terminar y presentar la nueva planificación. No hagas commit, push, merge ni release.

## Contexto actual

El backend está en:

`../thesis-back-quarkus`

Está técnicamente terminado hasta I-11, incluido el Plan 040. Ya implementa:

- autenticación y perfil;
- proyectos, firmantes y parámetros;
- insumos y bases;
- APU y especificaciones técnicas;
- presupuesto, capítulos, rubros y versionado;
- cronograma, vistas, Gantt, valorizado y curva S;
- exportaciones XLSX, PDF, MSPDI y DOCX;
- panel Super-Admin:
  - usuarios e invitaciones;
  - bases centrales;
  - plantillas APU de sistema;
  - parámetros del sistema;
  - valores de referencia;
  - logs de actividad.

No confíes en documentos del frontend que analicen commits antiguos del backend, como `c337950` o `5673615`. Comprueba el contrato contra el código actual de `../thesis-back-quarkus`.

Orden de autoridad:

1. Decisiones canónicas vigentes en `../thesis-docs`.
2. Código y pruebas actuales de `../thesis-back-quarkus`.
3. Documentación del frontend, únicamente cuando todavía coincida con las fuentes anteriores.

No hagas checkout, reset ni operaciones destructivas en ninguno de los repositorios.

## Lecturas obligatorias

Lee completamente, antes de planificar:

- `AGENTS.md`
- `CLAUDE.md`
- `README.md`
- `docs/bugs.md`
- `plans/README.md`
- `plans/BITACORA.md`
- `plans/HANDOFF-ESTADO-Y-GAPS.md`
- `plans/ORQUESTADOR-PARIDAD.md`
- `plans/INVENTARIO-COBERTURA.md`
- `plans/074-el-apu-no-se-puede-armar.md`
- `package.json`
- `public/VistaEjemplo.png`

Si `graphify-out/graph.json` existe en el proyecto padre, comienza con consultas Graphify específicas sobre el frontend, los planes y la integración con el backend. No leas el reporte completo salvo que las consultas acotadas no sean suficientes.

Usa únicamente `pnpm`; nunca `npm` ni `npx`.

## Fase 1 — Auditoría del estado real

Antes de modificar planes:

1. Registra:
   - rama actual;
   - HEAD actual;
   - estado del working tree;
   - HEAD y estado del backend local;
   - diferencia entre el backend actual y el commit citado por los documentos antiguos del frontend.

2. Ejecuta y registra el baseline real:

   ```bash
   pnpm run verify
   pnpm run e2e
   ```

   Si el entorno no permite ejecutar E2E, documenta el bloqueo exacto. No inventes resultados ni repitas números históricos como si fueran actuales.

3. No uses `npx tsc --noEmit`: en este repositorio no representa el gate real. El gate correcto es `pnpm run typecheck` o `pnpm run verify`.

4. Inspecciona, como mínimo:

   - `src/api/contract.ts`
   - `src/api/schemas.ts`
   - `src/api/queryKeys.ts`
   - `src/api/client.ts`
   - `src/api/request.ts`
   - `src/api/problem.ts`
   - `src/lib/disponibilidad.ts`
   - `src/test/handlers.ts`
   - `src/routes/index.tsx`
   - hooks que construyan peticiones HTTP;
   - páginas de administración;
   - presupuesto;
   - editor APU;
   - insumos;
   - cronograma;
   - exportaciones;
   - shell y contexto de versión activa.

5. Construye una matriz verificable:

   | Área | Estado frontend | Backend actual | Problema | Acción |
   |---|---|---|---|---|
   | Auth | | | | conservar/corregir |
   | Proyectos | | | | |
   | Insumos | | | | |
   | APU | | | | |
   | Presupuesto | | | | |
   | Cronograma | | | | |
   | Documentos | | | | |
   | Admin | | | | |

6. No consideres que un endpoint funciona solamente porque existe un handler MSW. Contrasta cada petición con:
   - recurso JAX-RS;
   - método HTTP;
   - `@Path`;
   - DTO request;
   - DTO response;
   - código de error;
   - autorización;
   - forma paginada o lista directa.

7. Verifica especialmente estas sospechas ya detectadas:

   - `src/lib/disponibilidad.ts` todavía desactiva `admin-usuarios`, `admin-plantillas`, `admin-valores` y `admin-logs`, aunque el backend actual ya implementa esas cuatro áreas. Determina qué DTO, hooks, páginas, esquemas Zod y tests deben restaurarse o crearse.
   - `descuento-global` continúa sin backend y debe retirarse del frontend, incluidos UI, hooks, DTOs y mocks.
   - El editor APU tiene `SelectorInsumo` y `agregarFila`, pero aparentemente no están conectados a `EditorApuPage`. Reevalúa el Plan 074 antes de duplicarlo.
   - El backend ofrece `GET /cronogramas/{id}/vistas`, pero el frontend no parece consumir las vistas de Gantt jerárquico, cronograma valorizado y curva S.
   - El estado del Plan 028 parece incorrecto: parte de la validación Zod ya existe. Determina si está `DONE`, `PARTIAL` o necesita corrección.

## Fase 2 — Reconciliación de los planes existentes

No borres planes antiguos indiscriminadamente.

Clasifica cada plan con exactamente uno de estos estados:

- `DONE`
- `PARTIAL`
- `TODO`
- `BLOCKED`
- `NEEDS CORRECTION`
- `SUPERSEDED`

Para cada clasificación incluye evidencia: archivo, componente, hook, prueba o commit.

Revisa especialmente:

- `001–037`: probablemente implementados; confirmar, no asumir.
- `038–045`: planes históricos de backend escritos desde el frontend; probablemente `SUPERSEDED`.
- `047`: probablemente `SUPERSEDED`.
- `048–071` y `073`: comprobar qué está realmente implementado.
- `072`: actualmente bloqueado por 074.
- `074`: candidato a ser el primer plan funcional de la nueva secuencia.
- `055`, rebanada de vistas de cronograma: reconsiderar porque el backend ya expone `/cronogramas/{id}/vistas`.
- `056`: mantener diferido si responsive todavía requiere una decisión o alcance humano.

Conserva los planes superseded para trazabilidad. Márcalos claramente como históricos y enlázalos desde el nuevo índice.

## Fase 3 — Índice rápido obligatorio

Crea:

`plans/00.INDEX.md`

Usa exactamente ese nombre.

Debe permitir entender el proyecto en menos de cinco minutos e incluir:

1. Fecha de auditoría.
2. SHA del frontend auditado.
3. SHA o identidad del backend auditado.
4. Estado general del frontend.
5. Baseline real de typecheck, lint, tests unitarios, build y E2E.
6. Tabla de todos los planes con número, título, estado, evidencia, dependencia y siguiente acción.
7. Sección separada de planes `SUPERSEDED`.
8. Funcionalidades rotas.
9. Funcionalidades desactivadas aunque ya tienen backend.
10. Funcionalidades legítimamente sin backend.
11. Etapa actual de ejecución.
12. Próximo plan autorizado.
13. DAG resumido de los nuevos planes.
14. Enlaces a `BITACORA.md`, `HANDOFF-ESTADO-Y-GAPS.md`, `ORQUESTADOR-PARIDAD.md`, documentación del backend y `public/VistaEjemplo.png`.

Actualiza también `plans/README.md` y `plans/BITACORA.md` para que apunten a `plans/00.INDEX.md` como entrada principal. No borres el contenido histórico.

## Fase 4 — Nueva secuencia de planes

Después de la auditoría, crea una secuencia nueva y monotónica. El siguiente número esperado es 075, pero verifica primero que no exista.

La secuencia debe basarse en dependencias reales. Evalúa este orden inicial y corrígelo si la evidencia exige otro:

### Etapa A — Reconciliar el seam API

- Corregir contratos TypeScript frente al backend actual.
- Corregir esquemas Zod.
- Corregir query keys.
- Corregir catálogo de errores.
- Hacer que MSW rechace payloads y rutas incorrectas.
- Añadir pruebas de contrato para los hooks.

No mezcles correcciones del contrato con un rediseño visual grande.

### Etapa B — Reactivar el panel Super-Admin

Prepara planes secuenciales para:

1. Usuarios e invitaciones.
2. Plantillas APU de sistema.
3. Valores de referencia.
4. Logs de actividad.
5. Retirar las cuatro claves correspondientes de `MODULOS_SIN_BACKEND`.

Estos cambios probablemente comparten `src/api/contract.ts`, `src/api/schemas.ts`, `src/api/queryKeys.ts` y `src/test/handlers.ts`. Evita proponer escrituras paralelas sobre esos archivos. Prefiere una secuencia o un único plan dividido en rebanadas verificables.

### Etapa C — Desbloquear la edición de APU

Reevalúa y, si sigue vigente, conserva o corrige el Plan 074:

- montar `SelectorInsumo`;
- conectar `agregarFila`;
- permitir agregar la primera fila a una sección vacía;
- mostrar errores reales de edición;
- actualizar pruebas de hook, componente y E2E;
- desbloquear posteriormente el Plan 072 del manual.

No dupliques el Plan 074 si solo necesita ajustes menores.

## Fase 5 — Vista integrada del proyecto

Esta es una preferencia explícita del usuario y debe aparecer en los planes nuevos.

Usa `public/VistaEjemplo.png` como referencia visual general. La imagen proviene del proyecto de ejemplo `../ingepresupuestos`, pero no se permite copiar su código, arquitectura, modelo de datos, nombres internos ni todas sus funcionalidades.

No se busca fidelidad exacta. Se debe adaptar la idea al frontend React, al backend Quarkus y al diseño existente.

### Descripción textual de la referencia

Esta descripción es obligatoria para agentes que no puedan abrir imágenes:

- La pantalla ocupa prácticamente todo el espacio de trabajo del proyecto.
- Está dividida verticalmente en dos paneles principales, separados por un divisor claro.
- El panel izquierdo ocupa aproximadamente entre 40 % y 50 % del ancho.
- El panel derecho ocupa el espacio restante.
- En la parte superior existe una cabecera oscura con el nombre del proyecto, su estado y el total general.
- Debajo aparece una barra de navegación y acciones, pero **no es necesario copiar su complejidad ni todos sus botones**.

#### Panel izquierdo — presupuesto

- Presenta el presupuesto como una tabla compacta, parecida a una hoja Excel.
- Tiene encabezados como `Ítem`, `Descripción`, `Und.`, `Cantidad`, `P.U.` y `Parcial`.
- Los capítulos se muestran como filas destacadas y expandibles.
- Debajo aparecen los rubros con su código jerárquico, descripción, unidad, cantidad, precio unitario y total.
- Las filas tienen alta densidad de información, divisores finos y alineación numérica clara.
- El rubro seleccionado se resalta visualmente.
- La selección del rubro controla el contenido del panel derecho.
- Para la primera versión no se necesita edición compleja dentro de esta tabla ni copiar los botones adicionales del ejemplo.

#### Panel derecho — detalle por pestañas

- Arriba existe una barra horizontal de pestañas.
- En la referencia aparecen pestañas como `ACU`, `Insumos`, `Metrados`, `Especificaciones`, `Resumen` y `Memoria`.
- En nuestro dominio, `ACU` debe llamarse **APU**.
- La pestaña APU muestra de forma compacta las secciones y filas del análisis seleccionado.
- Las filas se agrupan por bloques como mano de obra, materiales, equipo y transporte.
- Cada fila puede mostrar descripción, unidad, cantidad o rendimiento, precio y parcial.
- Los totales aparecen en una franja inferior compacta.
- La pestaña de Insumos debe reutilizar el catálogo y selectores existentes cuando sea posible.
- La pestaña de Especificaciones técnicas debe permitir consultar y editar la ET del APU seleccionado mediante los endpoints reales.

### Alcance mínimo deseado

Al entrar a un proyecto debe existir una experiencia integrada con:

- presupuesto compacto a la izquierda;
- selección de capítulo/rubro/APU;
- panel derecho vinculado a la selección;
- pestaña `APU`;
- pestaña `Insumos`;
- pestaña `Especificaciones técnicas`.

Evalúa también, si aportan valor y el backend actual las soporta:

- `Resumen`;
- `Cronograma`;
- cronograma valorizado;
- curva S.

No es obligatorio entregar todas las pestañas en el primer plan. Divide la vista en unidades pequeñas:

1. shell y layout split;
2. presupuesto izquierdo;
3. selección y sincronización del rubro/APU;
4. pestaña APU;
5. pestaña Insumos;
6. pestaña Especificaciones;
7. vistas complementarias.

Decide explícitamente si esta experiencia:

- reemplaza `/proyectos/:id`;
- se crea como `/proyectos/:id/workspace`;
- o se introduce progresivamente manteniendo las rutas actuales.

Prefiere una migración progresiva que reutilice componentes, hooks y query keys existentes. No dupliques estado de TanStack Query ni lógica de negocio.

Respeta:

- shadcn/ui y Tailwind existentes;
- tema neutro y tokens semánticos;
- interfaz en español;
- accesibilidad por teclado;
- diseño denso pero legible;
- desktop como experiencia principal sin impedir una adaptación responsive futura;
- cero colores Tailwind crudos;
- cero aritmética monetaria en TypeScript.

## Fase 6 — Vistas del cronograma

Planifica el consumo real de:

`GET /cronogramas/{id}/vistas`

Considera:

- Gantt jerárquico;
- cronograma valorizado;
- curva S;
- estados vacío, loading, error y desactualizado;
- integración opcional con el workspace;
- prueba de contrato del hook;
- pruebas visuales y E2E.

No agregues una librería de gráficos sin justificarla. Evalúa primero SVG, CSS y componentes existentes.

## Fase 7 — Integración, E2E y documentación

El último plan debe cubrir:

- pruebas con backend real;
- actualización de MSW;
- E2E de los flujos críticos;
- accesibilidad;
- capturas;
- actualización del manual;
- actualización del baseline real;
- limpieza de planes y comentarios obsoletos;
- `graphify update .`.

## Formato obligatorio de cada plan

Cada plan nuevo o corregido debe incluir:

1. Estado inicial.
2. Objetivo medible.
3. Dependencias.
4. Fuentes canónicas.
5. Evidencia del problema actual.
6. Alcance incluido.
7. Fuera de alcance.
8. Archivos concretos candidatos.
9. Contratos request/response.
10. Estrategia TDD: RED, GREEN y REFACTOR.
11. Pasos secuenciales.
12. Criterios de aceptación.
13. Comandos de verificación.
14. STOP conditions.
15. Riesgos y rollback.
16. Handoff al siguiente plan.
17. Prohibición explícita de inventar endpoints o cálculos monetarios.

Los planes deben poder ser ejecutados por otra IA con contexto cero.

No hardcodees conteos futuros. Registra el baseline medido y exige reportar el delta real.

## Invariantes técnicas

- `src/api/` es la única capa que conoce HTTP.
- Ningún feature importa axios ni construye URLs.
- TanStack Query administra estado del servidor.
- Zustand se reserva para estado transversal del cliente.
- No implementar fórmulas del motor en TypeScript.
- `toFixed` y `parseFloat` solo pueden vivir en `src/lib/decimal.ts`.
- IDs públicos como UUIDv7 string.
- Verificar individualmente si cada valor decimal viaja como `number` o `string`.
- Paginación backend: `items`, `total`, `page`, `size`, `totalPaginas`.
- Algunas rutas devuelven listas directas; no convertirlas artificialmente en `Page`.
- Los errores reales usan `codigo` y `mensaje`; revisar las excepciones especiales.
- Solo existen los roles `USUARIO` y `SUPER_ADMIN`.
- Retirar `descuento-global` del frontend porque no existe en el backend consolidado.
- Retirar UI, hooks, DTOs y mocks de duplicación de proyecto o logos; no fabricar endpoints inexistentes.
- Usar `pnpm` exclusivamente.

## Política para posibles cambios en el backend

El frontend es el objetivo principal. Antes de tocar `../thesis-back-quarkus`, demuestra todas estas condiciones:

1. El endpoint o DTO actual contradice una decisión canónica vigente o impide un flujo requerido.
2. El problema no se resuelve correctamente adaptando el frontend al contrato real.
3. La corrección es mínima y no reabre `motor/`, `recalculo/`, migraciones aplicadas ni decisiones cerradas.
4. Existe o se escribe primero una prueba roja reproducible.
5. Se documenta el cambio tanto en el plan frontend como en un plan backend separado cuando corresponda.
6. Se ejecutan las regresiones backend exigidas por `../thesis-back-quarkus/CLAUDE.md`.

Si alguna condición no se cumple, no modifiques el backend: abre un STOP y documenta la decisión pendiente.

## Verificación documental final

Antes de terminar:

- comprueba que `plans/00.INDEX.md` existe;
- comprueba que cada plan tenga un único estado;
- comprueba que no haya dos planes nuevos dueños de la misma tarea;
- comprueba que las dependencias formen un DAG;
- comprueba que la numeración sea monotónica;
- comprueba que `038–045` y `047` no puedan confundirse con trabajo frontend pendiente;
- comprueba que 072 dependa de 074 si el bloqueo sigue vigente;
- ejecuta `git diff --check`;
- ejecuta `graphify update .` si modificaste documentación de planes;
- no hagas commit.

## Entrega esperada

Al finalizar responde con:

1. Resumen del estado real encontrado.
2. Baseline medido.
3. Planes conservados.
4. Planes corregidos.
5. Planes marcados `SUPERSEDED`.
6. Nuevos planes creados, en orden.
7. DAG final.
8. Primera tarea recomendada.
9. Decisiones humanas pendientes.
10. Posibles cambios backend detectados y su justificación, aunque ninguno se haya implementado.
11. Lista exacta de archivos modificados.

Recuerda: primero se completa la auditoría y la planificación. No empieces a implementar las funcionalidades del frontend durante esta sesión.
