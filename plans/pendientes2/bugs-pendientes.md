# Bugs pendientes

Lista simple de cosas que faltan o fallan. Por ítem: qué falla, en qué page/sección, cuál es el fallo y panorama corto (qué módulo se afectaría).

## 1. Parámetros de Presentación y Codificación no se guardan
- **Page/sección:** `/proyectos/:id/parametros` — tarjeta "Presentación" (6 switches + mensaje footer) y tarjeta "Codificación" (select Autogenerado/Manual).
- **Fallo:** al Guardar, el toast dice "Parámetros actualizados" pero esos 8 campos vuelven a su valor anterior al recargar. Solo la tarjeta "Cálculo" (3 % + moneda) persiste de verdad.
- **Panorama:** el DTO del PUT (`ParametrosProyectoEditarRequest`) solo acepta 4 campos y el servicio (`ParametrosProyectoService.actualizar`) ignora el resto; Quarkus descarta lo desconocido sin error, por eso el Guardar responde 200 aunque no guarda nada. Además hoy nada consume esos flags.
- **¿Afecta a exportación?** No. Ningún writer actual los lee (cronograma xlsx/pdf/mspdi y ET docx trabajan sobre cronograma y especificaciones, no sobre secciones de APU), y la exportación de presupuesto/APUs aún no existe en el servidor. Cablear el guardado no cambia ninguna salida existente.
- **Afecta:** backend (`proyecto` — DTO + servicio, sin migración, riesgo bajo) y textos de ayuda en frontend. Darles efecto visual real (qué cambia en pantalla/export con cada switch) es fase aparte con decisión de producto.

## 2. Falta dataset real de rubros/APUs (hoy solo excels sueltos)
- **Qué falta:** extraer, limpiar y vincular excels públicos de APUs/presupuestos en un dataset versionado: rubros ↔ APUs sin duplicados, más metadata extra por fila (fecha de extracción, fecha del APU si se conoce, URL fuente, etc.).
- **Panorama:** hoy el seed solo trae 93 insumos V003 + 2 plantillas y 12 APUs sintéticas; no hay fuente real para poblar catálogos. **Afecta:** en principio solo datos/scripts fuera del backend (nueva migración seed cuando esté listo). De este dataset salen el punto 3 (plantillas APU y plantilla de proyecto).
- **Decidir:** formato del dataset (CSV/JSON) y dónde vive (repo o carpeta aparte).

## 3. Seeds de ejemplo incompletos y poco realistas (verificar o reemplazar)
- **Qué falla:** los 2 proyectos sintéticos del seed (`BORRADOR` de Ana, `EN_PROCESO` de John) no sirven como caso real completo:
  - Presupuesto B: 12 rubros 1:1 con sus APUs (FK ok), pero 10 de los 12 APUs (`ST-001`…`ST-010`) son solo cabecera sin secciones ni detalle de insumos — rubros sin desglose de APU detrás.
  - Ningún APU del seed trae especificación técnica → la exportación de ET (DOCX) no se puede probar con seeds.
  - Cronograma B: las 12 actividades reparten avance plano (0.125 por periodo, sin dependencias ni lags) y los pesos son réplica del precio — distribución no creíble para demo/tesis.
  - Solo hay 1 plantilla APU SISTEMA + 1 PERSONAL y 1 plantilla de proyecto: muy poco para probar catálogos.
- **Panorama:** verificar si se completan los ejemplos actuales o se busca un proyecto real completo (APUs con detalle + presupuesto + cronograma) y corto para reemplazarlos. Con el dataset del punto 2 generar las plantillas de APUs y una plantilla de proyecto completa desde un proyecto real del dataset.
- **Afecta:** backend (nueva migración seed `V0XX`, más filas; sin cambio de código salvo que se detecte un bug al verificar relaciones) y docs del seed (`04-SEED-ESCENARIOS.md`).

## 4. Gantt de cronograma: UX de segmentos por rehacer
- **Page/sección:** `/proyectos/:id/cronograma` — Gantt jerárquico interactivo (`GanttJerarquicoInteractivo.tsx`).
- **Fallo / faltantes:**
  - Al crear un cronograma, las actividades nacen vacías (`{}`) y hay que programar fila por fila. Pedido: segmento por defecto en el primer periodo (mes/semana) al crear.
  - El `<details>` "Acciones de segmento" en la columna de peso sobra: todo debería hacerse por drag and drop. El click directo en un segmento abre el submenú; pedido: click = solo seleccionar/arrastrar, y las opciones (editar rubro/segmento, configurar, dividir en dos, eliminar segmento sin dejar la fila en cero segmentos) en un menú contextual con click derecho.
  - Hoy el drag es una operación a la vez con vista previa + botón Confirmar (`MOVER` o `REDIMENSIONAR` por separado). Pedido: edición fluida en una pasada — mover y redimensionar (por izquierda o derecha) sin confirmar entre acciones.
  - Columna item: toggles de capítulo desalineados respecto a los segmentos y sin diferenciar colores entre capítulos y subcapítulos.
  - Tabla poco compacta: reducir paddings/espaciados vertical y horizontal (no el tamaño de fuente).
- **Panorama:** el backend SÍ soporta tareas divididas — los segmentos son runs consecutivos derivados del mapa `avance_por_periodo`, y `REEMPLAZAR_AVANCES` acepta cualquier mapa (dividir = reemplazar con un hueco en medio; eliminar = reemplazar sin ese run). No hace falta endpoint nuevo, salvo que se quiera una operación `DIVIDIR` dedicada. El default al crear implicaría cambiar la autoimportación (`CronogramaService`, hoy `{}`) o un `DISTRIBUIR_UNIFORME` post-crear desde el frontend. **Afecta:** sobre todo frontend (Gantt + hooks `useCronograma`); backend solo si se cambia el default de creación o se agrega operación nueva. Riesgo medio: el drag fluido debe seguir emitiendo las 4 operaciones congeladas (`REEMPLAZAR/DISTRIBUIR/MOVER/REDIMENSIONAR`) y respetar el 409 `segmento-solapado`.
- **Preguntas abiertas:** ¿default = todo el peso en periodo 1 o reparto uniforme en el plazo? ¿Dividir con punto de corte elegido por click ("cuchilla") o mitad automática? ¿Eliminar el único segmento deja la fila en `{}` (borrador)?

## 5. Insumos: quitar tab de Bases centrales y nueva sección global en sidebar
- **Estado:** HECHO (2026-09-23) — ver `plans/BITACORA.md` y el plan 044 del backend.
- **Page/sección:** `/proyectos/:id/insumos` (tabs) y sidebar grupo "General".
- **Fallo / faltantes:**
  - Quitar el tab "Bases centrales" de `InsumosPage.tsx` (hoy `Insumos del proyecto` + `Bases centrales` vía `VistaBasesCentrales`): esa pantalla debe mostrar solo insumos del proyecto. Las centrales se verán en otro lado.
  - Agregar "Insumos" al grupo General del sidebar (`Sidebar.tsx`, junto a Plantillas APU y de proyecto): vista global que diferencie bases de sistema (solo lectura) y personales (editables por el dueño).
- **Panorama:** backend ya distingue `CENTRAL/PERSONAL/PROYECTO` (`TipoBase`) con seams separados: `GET /bases-centrales` (lectura, solo lista bases), `/bases-personales` (lista/crea/borra base, owner-scoped) y `/admin/bases-centrales` (CRUD total SUPER_ADMIN). Pero ojo: `/bases-personales` NO tiene CRUD de insumos (solo de la base) y el frontend nunca usa ese endpoint — "personales editables" exige endpoints nuevos (crear/editar/eliminar/importar insumo en base personal) + páginas nuevas. Además el tab a quitar es hoy la puerta de "copiar base central al proyecto" (`DialogoCopiarBase` → `POST .../insumos/copiar`): hay que reubicar esa acción o el usuario pierde cómo poblar su base.
- **Afecta:** frontend (quitar tab, nueva sección + rutas + badges sistema/personal) y backend (`insumo` — CRUD de insumos en base personal, riesgo medio: owner-scope RNF-05 + reutilizar validaciones del CRUD PROYECTO). Las centrales ya son solo-lectura para USUARIO, sin cambio.
- **Preguntas abiertas:** ¿dónde copia el usuario una central a su proyecto (desde la nueva sección global o desde la base del proyecto)? ¿La sección global de insumos también permite crear bases personales?

## 6. Plantillas sin distinción sistema/personal ni previsualización útil
- **Estado:** HECHO (2026-09-23) — ver `plans/BITACORA.md` y el plan 044 del backend.
- **Page/sección:** sidebar General → `/plantillas` (Mis plantillas) y `/plantillas-proyecto`.
- **Fallo / faltantes:**
  - `/plantillas` solo lista las PERSONALES (`usePlantillas("PERSONAL")`); las SISTEMA no se ven en ningún lado para el usuario normal (solo en el panel admin). Pedido: diferenciar tabs o badges sistema vs. personal, con las de sistema en solo lectura.
  - La "Vista previa" actual (`MisPlantillasPage`) solo muestra nombre/descripción/unidad. Pedido: previsualización simple o, si no es complejo, vista completa casi real de solo lectura.
  - `/plantillas-proyecto` no tiene ninguna previsualización (solo usar + eliminar).
  - `plantilla_proyecto` no tiene columna `tipo` (todo es personal por diseño, `usuario_id NOT NULL`): para listar por tipo hace falta agregarla (`SISTEMA`/`PERSONAL`) con migración + CRUD admin de plantillas sistema, igual que ya existe para APUs.
- **Panorama:** el backend ya devuelve `tipo` y detalle completo en ambos casos (`GET /plantillas-apu?tipo=`, `GET /plantillas-apu/{id}` con `snapshotSecciones`, `GET /plantillas-proyecto/{id}` con `snapshotEstructura`), así que no hace falta backend nuevo. Para APU ya existe el render de solo lectura reutilizable (`DetallePlantilla.tsx`, usado en el workspace: secciones M/N/O/P con líneas); para proyecto habría que dibujar el árbol del snapshot (capítulos + estructura + parámetros) en modo lectura.
- **Afecta:** frontend (tabs/badges + diálogo de preview; riesgo bajo) + backend solo por la columna `tipo` en `plantilla_proyecto` (migración + admin CRUD + filtro en listado; riesgo medio-bajo). Vocabulario: no renombrar `CENTRAL` en BD (churn sin ganancia); en UI las bases CENTRALES se etiquetan "Sistema", equivalente funcional a SISTEMA (mismo modelo: `usuario_id NULL`, gestiona SUPER_ADMIN, el usuario solo lee/copia).
- **Preguntas abiertas:** ¿la vista completa de plantilla APU debe mostrar precios/impacts o solo estructura (el snapshot es price-free)? ¿El preview de plantilla de proyecto incluye parámetros y cronograma o solo el árbol? ¿Se quiere catálogo semilla de plantillas de proyecto del sistema o basta con personales?
