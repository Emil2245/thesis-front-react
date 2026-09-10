import { asDecimal } from "@/lib/decimal";
import { http, HttpResponse } from "msw";
import type { DefaultBodyType, PathParams } from "msw";
import type {
  BloqueoExportDetalle,
  FormatoExportCronograma,
  ProyectoResponse,
  PresupuestoVersionResponse,
  PlantillaProyectoResponse,
  ProyectoDesdePlantillaResponse,
} from "@/api/contract";
import type { Problem } from "@/api/problem";
import { tokenFixture } from "./fixtures/auth";
import {
  proyectosFixture,
  proyectoDetalleFixture,
  parametrosFixture,
  firmantesFixture,
} from "./fixtures/proyectos";
import {
  insumosFixture,
  basesCentralesFixture,
  insumosBusquedaFixture,
  copiaBaseResultadoFixture,
  importResultadoFixture,
  insumoUsoFixture,
} from "./fixtures/insumos";
import {
  apuResumenFixture,
  apuDetalleFixture,
  apuConHmFixture,
  apuCalculoFixture,
  plantillaDetalleFixture,
} from "./fixtures/apu";
import {
  presupuestoFixture,
  validacionFixture,
  resumenComponentesFixture,
  comparacionFixture,
  PRESUPUESTO_V1,
  PRESUPUESTO_V2,
  PRESUPUESTO_V3,
} from "./fixtures/presupuesto";
import {
  cronogramaFixture,
  perdidasFixture,
  preflightBloqueadoFixture,
  preflightExportableFixture,
} from "./fixtures/cronograma";
import { parametrosSistemaFixture, basesCentralesFixtureAdmin } from "./fixtures/admin";

const API = "*/api/v1";

// Los ids de la fila de Herramienta Menor y del proyecto creado desde plantilla
// eran numéricos y ningún test podía ver que el seam los manda como UUID.
export const DETALLE_HM = "018f8a50-0000-7000-8000-000000000200";
// Estas dos ramas de 409 comparaban `Number(params.id)` contra 99 y 2: con
// UUIDs eso es NaN y nunca entraban. Eran handlers de error inalcanzables.
export const INSUMO_EN_USO = "018f8a20-0000-7000-8000-000000000099";
export const APU_REFERENCIADO = "018f8a40-0000-7000-8000-000000000099";
// Los dos presupuestos con los que la exportación del cronograma se sale del
// camino feliz: uno ajeno (404) y uno con bloqueos (preflight `exportable:
// false` y 409 en la descarga).
export const PRESUPUESTO_AJENO = "018f8a60-0000-7000-8000-0000000000404";
export const PRESUPUESTO_BLOQUEADO = "018f8a60-0000-7000-8000-0000000000409";
export const PROYECTO_DESDE_PLANTILLA = "018f8a10-0000-7000-8000-000000000099";

const CAMPOS_PROYECTO = [
  "nombreProyecto",
  "codigo",
  "descripcion",
  "anio",
  "fechaInicio",
  "plazoEjecucion",
  "plazoUnidad",
  "direccionInstitucional",
  "subdireccionInstitucional",
] as const;

const CAMPOS_FIRMANTE = ["nombre", "cargo", "rol", "orden"] as const;

/**
 * El cuerpo de error tal cual lo manda el backend: `ErrorPayload(codigo,
 * mensaje)` y `Content-Type: application/json`.
 *
 * Fabricaba RFC 7807 —otro Content-Type y otros campos—, un protocolo que el
 * backend no ha hablado nunca. Con 9 llamadas aquí dentro, la suite entera
 * validaba el frontend contra un servidor imaginario: verde en el gate y
 * muerto en producción. Mientras esto mienta, el gate vuelve a dar verde sobre
 * ese servidor, así que es el paso que hace permanente el arreglo del plan 063.
 */
export const problema = (
  status: number,
  codigo: string,
  mensaje: string,
  extra: Partial<Problem> = {},
) => HttpResponse.json<Problem>({ codigo, mensaje, ...extra }, { status });

// Los handlers aceptaban cualquier body, así que el seam no podía ver un campo
// de más ni uno mal nombrado: así pasaron `porcentajeIndirecto` en
// PATCH /apus/{id} y `descripcion` en PUT /plantillas-apu/{id} (plan 054), los
// dos descartados en silencio por Jackson con un 200 de vuelta. El arreglo de
// fondo es la validación Zod del plan 028; esto cierra los agujeros conocidos.
// ponytail: lista blanca por endpoint, sirve hasta que el 028 valide el seam entero.
const soloCampos = async (request: Request, ...permitidos: string[]) => {
  const cuerpo = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const sobran = Object.keys(cuerpo).filter((k) => !permitidos.includes(k));
  return sobran.length === 0
    ? null
    : problema(400, "campo-desconocido", `El backend no acepta: ${sobran.join(", ")}`);
};

// Era una copia de `problema()` que ya emitía `{codigo, mensaje}` porque el
// cronograma no podía fingir 7807: sus tres 409 se distinguen por `codigo`, y
// el de configuración añade `perdidas[]`. Ahora que `problema()` dice la
// verdad, las dos son la misma función.
const errorCronograma = problema;

/** `ArchivoGenerado` + el `switch` de `CronogramaDescargaService.generar`. */
const ARCHIVO_CRONOGRAMA: Record<
  FormatoExportCronograma,
  { mediaType: string; extension: string }
> = {
  xlsx: {
    mediaType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    extension: "xlsx",
  },
  pdf: { mediaType: "application/pdf", extension: "pdf" },
  // MSPDI sale como XML, no como `.mspdi` ni `.mpp`.
  mspdi: { mediaType: "application/xml", extension: "xml" },
};

const FORMATO_NO_SOPORTADO = "Formato no soportado (permitidos: xlsx | pdf | mspdi)";

/** `null` cuando falta, está vacío o no es uno de los tres: el backend da 400. */
const leerFormatoCronograma = (request: Request): FormatoExportCronograma | null => {
  const formato = new URL(request.url).searchParams.get("formato");
  // `hasOwn` y no `in`: `in` casa además las heredadas (`?formato=constructor`
  // pasaría la guarda y luego reventaría al desestructurar).
  return formato !== null && Object.hasOwn(ARCHIVO_CRONOGRAMA, formato)
    ? (formato as FormatoExportCronograma)
    : null;
};

const leerCuerpo = async (request: Request) =>
  (await request
    .clone()
    .json()
    .catch(() => ({}))) as Record<string, unknown>;

const MAX_PERIODOS: Record<string, number> = { SEMANA: 520, MES: 120 };

/** `unidadTiempo` y `numeroPeriodos` son obligatorios en el POST y en el PUT. */
const validarConfiguracion = (cuerpo: Record<string, unknown>) => {
  const { unidadTiempo, numeroPeriodos } = cuerpo;
  if (typeof unidadTiempo !== "string" || !(unidadTiempo in MAX_PERIODOS)) {
    return errorCronograma(400, "validacion", "unidadTiempo solo admite SEMANA o MES");
  }
  if (!Number.isInteger(numeroPeriodos)) {
    return errorCronograma(400, "validacion", "numeroPeriodos es obligatorio y debe ser un entero");
  }
  const max = MAX_PERIODOS[unidadTiempo];
  return Number(numeroPeriodos) >= 1 && Number(numeroPeriodos) <= max
    ? null
    : errorCronograma(
        400,
        "validacion",
        `numeroPeriodos fuera del límite canónico para ${unidadTiempo}: 1..${max}`,
      );
};

/** Los arrays de avance son densos y de largo `numeroPeriodos`. */
const reconfigurado = (cuerpo: Record<string, unknown>, status: number) => {
  const n = Number(cuerpo.numeroPeriodos);
  const denso = (valores: readonly string[]) =>
    Array.from({ length: n }, (_, i) => valores[i] ?? "0.0000");
  return HttpResponse.json(
    {
      ...cronogramaFixture,
      unidadTiempo: cuerpo.unidadTiempo,
      numeroPeriodos: n,
      avancePorPeriodo: denso(cronogramaFixture.avancePorPeriodo),
      avanceAcumulado: denso(cronogramaFixture.avanceAcumulado),
    },
    { status },
  );
};

// El PATCH de actividad es una unión discriminada por `operacion` y el parser
// rechaza cualquier propiedad fuera de la lista de la suya.
const CAMPOS_OPERACION: Record<string, string[]> = {
  REEMPLAZAR_AVANCES: ["avancePorPeriodo"],
  DISTRIBUIR_UNIFORME: ["periodos"],
  MOVER_SEGMENTO: ["inicio", "fin", "delta"],
  REDIMENSIONAR_SEGMENTO: ["inicio", "fin", "nuevoInicio", "nuevoFin"],
};

const validarProgramacion = (cuerpo: Record<string, unknown>, actividadId: string) => {
  const n = cronogramaFixture.numeroPeriodos;
  const enRango = (p: unknown) => Number.isInteger(p) && Number(p) >= 1 && Number(p) <= n;

  if (cuerpo.operacion === "REEMPLAZAR_AVANCES") {
    const avances = cuerpo.avancePorPeriodo;
    if (typeof avances !== "object" || avances === null || Array.isArray(avances)) {
      return errorCronograma(400, "validacion", "avancePorPeriodo debe ser un objeto JSON");
    }
    for (const [clave, valor] of Object.entries(avances)) {
      if (!/^[0-9]+$/.test(clave) || !enRango(Number(clave))) {
        return errorCronograma(400, "validacion", `Clave de período fuera del rango 1..${n}`);
      }
      // Un número JSON aquí es un 400: el avance viaja como decimal string.
      if (typeof valor !== "string") {
        return errorCronograma(400, "validacion", "Valor de avance debe ser un decimal string");
      }
      if ((valor.split(".")[1] ?? "").length > 4) {
        return errorCronograma(400, "validacion", `Avance con escala mayor que 4: ${valor}`);
      }
      if (Number(valor) < 0) {
        return errorCronograma(
          400,
          "validacion",
          `Los avances no pueden ser negativos; clave=${clave}`,
        );
      }
    }
  }

  if (cuerpo.operacion === "DISTRIBUIR_UNIFORME") {
    const periodos = cuerpo.periodos;
    if (!Array.isArray(periodos) || periodos.length === 0) {
      return errorCronograma(400, "validacion", "periodos no puede ser vacío");
    }
    if (!periodos.every(enRango)) {
      return errorCronograma(400, "validacion", `Período fuera del rango 1..${n}`);
    }
    if (new Set(periodos).size !== periodos.length) {
      return errorCronograma(400, "validacion", "Períodos duplicados");
    }
  }

  if (cuerpo.operacion === "MOVER_SEGMENTO" || cuerpo.operacion === "REDIMENSIONAR_SEGMENTO") {
    const { inicio, fin } = cuerpo;
    if (!enRango(inicio) || !enRango(fin) || Number(fin) < Number(inicio)) {
      return errorCronograma(400, "validacion", "fin debe ser >= inicio y estar en rango");
    }
    const mover = cuerpo.operacion === "MOVER_SEGMENTO";
    if (mover && (!Number.isInteger(cuerpo.delta) || cuerpo.delta === 0)) {
      return errorCronograma(400, "validacion", "delta no puede ser cero");
    }
    const delta = Number(cuerpo.delta);
    const destinoIni = mover ? Number(inicio) + delta : Number(cuerpo.nuevoInicio);
    const destinoFin = mover ? Number(fin) + delta : Number(cuerpo.nuevoFin);
    if (!enRango(destinoIni) || !enRango(destinoFin) || destinoFin < destinoIni) {
      return errorCronograma(400, "validacion", `El destino sale del rango 1..${n}`);
    }
    // 409 sólo si el destino pisa OTRO segmento de la misma actividad.
    const segmentos = cronogramaFixture.actividades.find((a) => a.id === actividadId)?.segmentos;
    const ajenos = (segmentos ?? []).filter(
      (s) => s.inicio !== Number(inicio) || s.fin !== Number(fin),
    );
    if (ajenos.some((s) => destinoIni <= s.fin && destinoFin >= s.inicio)) {
      return errorCronograma(
        409,
        "segmento-solapado",
        "El destino colisiona con claves fuera del segmento fuente",
      );
    }
  }

  return HttpResponse.json(cronogramaFixture);
};

export const pagina = <T>(items: T[]) => ({
  items,
  page: 0,
  size: 25,
  total: items.length,
  totalPaginas: 1,
});

const versionesStub: PresupuestoVersionResponse[] = [
  {
    presupuestoId: PRESUPUESTO_V1,
    version: 1,
    esVigente: false,
    notas: "Primera versión",
    totalGeneral: asDecimal("1000.000000"),
    fechaCreacion: "2026-02-01T00:00:00",
  },
  {
    presupuestoId: PRESUPUESTO_V2,
    version: 2,
    esVigente: true,
    origenId: PRESUPUESTO_V1,
    notas: "Segunda versión",
    totalGeneral: asDecimal("1200.000000"),
    fechaCreacion: "2026-03-01T00:00:00",
  },
];

export const handlers = [
  // El backend expone lectura y escritura en /proyectos/parametros-sistema,
  // fuera de /admin: la lectura sin rol, el PUT como SUPER_ADMIN.
  //
  // Va ANTES que `/proyectos/:id`: MSW casa por orden, así que la ruta con
  // parámetro se tragaba ésta y devolvía el 404 de «proyecto no encontrado».
  // La página caía a sus valores por defecto y el test la veía «funcionando».
  http.get(`${API}/proyectos/parametros-sistema`, () =>
    HttpResponse.json(parametrosSistemaFixture),
  ),
  http.put(
    `${API}/proyectos/parametros-sistema`,
    async ({ request }) =>
      (await soloCampos(
        request,
        "porcentajeHerramientaMenor",
        "porcentajeIndirecto",
        "iva",
        "rangoHmMin",
        "rangoHmMax",
        "rangoCiMin",
        "rangoCiMax",
        "rangoDescuentoMin",
        "rangoDescuentoMax",
        "rangoIvaMin",
        "rangoIvaMax",
        "moneda",
      )) ?? HttpResponse.json(parametrosSistemaFixture),
  ),

  // ———— Proyectos ————
  http.get(`${API}/proyectos`, ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.toLowerCase() ?? "";
    const estado = url.searchParams.get("estado") ?? "";
    const filtrados = proyectosFixture.filter(
      (p) =>
        (!q || p.nombreProyecto.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)) &&
        (!estado || p.estado === estado),
    );
    return HttpResponse.json(pagina<ProyectoResponse>(filtrados));
  }),
  http.get(`${API}/proyectos/:id`, ({ params }) => {
    const p = proyectosFixture.find((x) => x.id === params.id);
    if (!p) return HttpResponse.json(null, { status: 404 });
    return HttpResponse.json({ ...proyectoDetalleFixture, ...p });
  }),
  http.post(
    `${API}/proyectos`,
    async ({ request }) =>
      (await soloCampos(request, ...CAMPOS_PROYECTO)) ??
      HttpResponse.json(proyectoDetalleFixture, { status: 201 }),
  ),
  http.put(
    `${API}/proyectos/:id`,
    async ({ request }) =>
      (await soloCampos(request, ...CAMPOS_PROYECTO)) ?? HttpResponse.json(proyectoDetalleFixture),
  ),
  http.delete(`${API}/proyectos/:id`, () => HttpResponse.json(null, { status: 204 })),

  // ———— Plantillas de proyecto (plan 049) ————
  // `snapshotEstructura` es un JsonNode opaco y va en la respuesta de main; es
  // lo que necesita el preview del snapshot (S-36/S-40).
  http.get(`${API}/plantillas-proyecto`, () =>
    HttpResponse.json<PlantillaProyectoResponse[]>([
      {
        id: "018f8a60-0000-7000-8000-000000000001",
        nombre: "Plantilla proyecto",
        descripcion: "Plantilla de prueba",
        snapshotEstructura: { capitulos: [{ item: "1", descripcion: "Preliminares" }] },
        fechaCreacion: "2026-01-01T00:00:00Z",
      },
    ]),
  ),
  // El snapshot lo construye el backend: `proyectoId` va en la ruta y el cuerpo
  // solo lleva `nombre` y `descripcion?` (PlantillaProyectoGuardarResource).
  http.post(
    `${API}/proyectos/:proyectoId/guardar-plantilla`,
    async ({ request }) =>
      (await soloCampos(request, "nombre", "descripcion")) ??
      HttpResponse.json(
        {
          id: "018f8a60-0000-7000-8000-000000000002",
          nombre: "Nueva plantilla",
          snapshotEstructura: { capitulos: [] },
          fechaCreacion: "2026-01-02T00:00:00Z",
        } satisfies PlantillaProyectoResponse,
        { status: 201 },
      ),
  ),
  http.delete(`${API}/plantillas-proyecto/:id`, () => HttpResponse.json(null, { status: 204 })),
  // 201 sin advertencias / 200 con ellas, y siempre el envoltorio
  // `ProyectoDesdePlantillaResponse{proyecto, advertencias?}`, no el proyecto a secas.
  http.post(
    `${API}/proyectos/desde-plantilla/:id`,
    async ({ request }) =>
      (await soloCampos(request, "nombre")) ??
      HttpResponse.json(
        {
          proyecto: {
            ...proyectoDetalleFixture,
            id: PROYECTO_DESDE_PLANTILLA,
            nombreProyecto: "Nuevo desde plantilla",
          },
        } satisfies ProyectoDesdePlantillaResponse,
        { status: 201 },
      ),
  ),

  http.get(`${API}/proyectos/:id/firmantes`, () => HttpResponse.json(firmantesFixture)),
  http.post(
    `${API}/proyectos/:id/firmantes`,
    async ({ request }) =>
      (await soloCampos(request, ...CAMPOS_FIRMANTE)) ??
      HttpResponse.json(firmantesFixture[0], { status: 201 }),
  ),
  http.put(
    `${API}/proyectos/:id/firmantes/:fid`,
    async ({ request }) =>
      (await soloCampos(request, ...CAMPOS_FIRMANTE)) ?? HttpResponse.json(firmantesFixture[0]),
  ),
  http.delete(`${API}/proyectos/:id/firmantes/:fid`, () =>
    HttpResponse.json(null, { status: 204 }),
  ),

  http.get(`${API}/proyectos/:id/parametros`, () => HttpResponse.json(parametrosFixture)),
  http.put(
    `${API}/proyectos/:id/parametros`,
    async ({ request }) =>
      (await soloCampos(
        request,
        "porcentajeHerramientaMenor",
        "porcentajeIndirecto",
        "iva",
        "moneda",
      )) ?? HttpResponse.json(parametrosFixture),
  ),

  http.get(`${API}/proyectos/:id/presupuestos`, () => HttpResponse.json(versionesStub)),

  // ———— Auth ————
  http.post(
    `${API}/auth/login`,
    async ({ request }) =>
      (await soloCampos(request, "email", "password", "recordarSesion")) ??
      HttpResponse.json(tokenFixture),
  ),
  http.post(
    `${API}/auth/refresh`,
    async ({ request }) =>
      (await soloCampos(request, "refreshToken")) ?? HttpResponse.json(tokenFixture),
  ),
  http.post(
    `${API}/auth/registro`,
    async ({ request }) =>
      (await soloCampos(request, "nombre", "email", "password", "passwordConfirmacion")) ??
      HttpResponse.json(null, { status: 201 }),
  ),
  http.post(
    `${API}/auth/verificar-email`,
    async ({ request }) =>
      (await soloCampos(request, "token")) ?? HttpResponse.json(null, { status: 204 }),
  ),
  http.post(
    `${API}/auth/reenviar-verificacion`,
    async ({ request }) =>
      (await soloCampos(request, "email")) ?? HttpResponse.json(null, { status: 202 }),
  ),
  http.post(
    `${API}/auth/recuperar`,
    async ({ request }) =>
      (await soloCampos(request, "email")) ?? HttpResponse.json(null, { status: 202 }),
  ),
  http.post(
    `${API}/auth/restablecer`,
    async ({ request }) =>
      (await soloCampos(request, "token", "password", "passwordConfirmacion")) ??
      HttpResponse.json(null, { status: 204 }),
  ),
  http.post(
    `${API}/auth/logout`,
    async ({ request }) =>
      (await soloCampos(request, "refreshToken")) ?? HttpResponse.json(null, { status: 204 }),
  ),
  http.get(`${API}/perfil`, () => HttpResponse.json(tokenFixture.usuario)),
  http.put(
    `${API}/perfil`,
    async ({ request }) =>
      (await soloCampos(request, "nombre", "email")) ?? HttpResponse.json(tokenFixture.usuario),
  ),
  http.put(
    `${API}/perfil/password`,
    async ({ request }) =>
      (await soloCampos(request, "passwordActual", "passwordNueva", "passwordConfirmacion")) ??
      HttpResponse.json(null, { status: 204 }),
  ),

  // ———— Insumos (Plan 008) ————
  http.get(`${API}/proyectos/:id/insumos`, () => HttpResponse.json(pagina(insumosFixture))),
  http.post(
    `${API}/proyectos/:id/insumos`,
    async ({ request }) =>
      (await soloCampos(request, "codigo", "tipo", "descripcion", "unidad", "precioUnitario")) ??
      HttpResponse.json(insumosFixture[0], { status: 201 }),
  ),
  http.put(
    `${API}/proyectos/:id/insumos/:iid`,
    async ({ request }) =>
      (await soloCampos(request, "descripcion", "unidad", "precioUnitario")) ??
      HttpResponse.json(insumosFixture[0]),
  ),
  http.delete(`${API}/proyectos/:id/insumos/:iid`, ({ params }) => {
    if (params.iid === INSUMO_EN_USO) {
      // `InsumoCrudService.eliminar` rechaza el borrado con
      // `ProblemaException.validacion(...)`: 400 y código `validacion`, con el
      // conteo dentro del mensaje. No existe ningún `insumo-en-uso` (cero
      // apariciones en el backend) ni 409, y `ErrorPayload` no puede llevar la
      // lista de usos: son dos strings.
      return problema(
        400,
        "validacion",
        "No se puede eliminar el insumo: está referenciado en 2 parte(s) de APU",
      );
    }
    return HttpResponse.json(null, { status: 204 });
  }),
  // La ruta del backend es `/usos` en plural; el frontend pedía `/uso`.
  http.get(`${API}/proyectos/:id/insumos/:iid/usos`, () => HttpResponse.json(insumoUsoFixture)),
  http.post(`${API}/proyectos/:id/insumos/importar`, () =>
    HttpResponse.json(importResultadoFixture),
  ),
  http.post(
    `${API}/proyectos/:id/insumos/copiar`,
    async ({ request }) =>
      (await soloCampos(request, "fuenteTipo", "baseId", "proyectoId")) ??
      HttpResponse.json(copiaBaseResultadoFixture),
  ),
  http.get(`${API}/proyectos/:id/insumos/selector`, () =>
    HttpResponse.json(pagina(insumosBusquedaFixture)),
  ),
  http.get(`${API}/bases-centrales`, () => HttpResponse.json(basesCentralesFixture)),

  // ———— APU editor (Plan 009) ————
  http.post(
    `${API}/presupuestos/:id/apus`,
    async ({ request }) =>
      (await soloCampos(request, "codigo", "descripcion", "unidad", "plantillaId")) ??
      HttpResponse.json(apuDetalleFixture, { status: 201 }),
  ),
  http.get(`${API}/apus/:id`, () => HttpResponse.json(apuConHmFixture)),
  // ApuPatchRequest del backend es (codigo, descripcion, unidad) y nada más.
  http.patch(
    `${API}/apus/:id`,
    async ({ request }) =>
      (await soloCampos(request, "codigo", "descripcion", "unidad")) ??
      HttpResponse.json(apuConHmFixture),
  ),
  // El %CI tiene endpoint propio y recibe un BigDecimal crudo, no un objeto.
  // El body es el decimal desnudo. Mandar `{ porcentajeIndirecto: … }` era el
  // bug del plan 054: Jackson lo rechaza, no lo desenvuelve.
  http.patch(`${API}/apus/:id/porcentaje-indirecto`, async ({ request }) => {
    const cuerpo = await request.json().catch(() => null);
    if (cuerpo !== null && typeof cuerpo === "object") {
      return problema(400, "cuerpo-invalido", "Se espera un decimal, no un objeto");
    }
    return HttpResponse.json(apuConHmFixture);
  }),
  // La ET tiene su propio GET; no viaja dentro de ApuResponse.
  http.get(`${API}/apus/:id/especificacion-tecnica`, ({ params }) =>
    HttpResponse.json({ apuId: params.id, contenido: null }),
  ),
  http.put(
    `${API}/apus/:id/especificacion-tecnica`,
    async ({ request }) =>
      (await soloCampos(request, "texto")) ?? HttpResponse.json(apuDetalleFixture),
  ),
  http.delete(`${API}/apus/:id`, ({ params }) => {
    if (params.id === APU_REFERENCIADO) {
      return problema(409, "apu-referenciado", "El APU está referenciado por otros elementos");
    }
    return HttpResponse.json(null, { status: 204 });
  }),
  http.post(
    `${API}/apus/:id/duplicar`,
    async ({ request }) =>
      (await soloCampos(request, "copiarET")) ??
      HttpResponse.json(apuDetalleFixture, { status: 201 }),
  ),
  // ApuDetalleCrearRequest: seccionTipo, insumoId y cantidad son @NotNull. Sin
  // ellos el backend devuelve 400, que es lo que pasaba al añadir una línea.
  http.post(`${API}/apus/:id/detalles`, async ({ request }) => {
    const cuerpo = (await request
      .clone()
      .json()
      .catch(() => ({}))) as Record<string, unknown>;
    const faltan = ["seccionTipo", "insumoId", "cantidad"].filter((c) => cuerpo[c] == null);
    return (
      (await soloCampos(request, "seccionTipo", "insumoId", "cantidad", "rendimiento")) ??
      (faltan.length
        ? problema(400, "campo-requerido", `Campos obligatorios: ${faltan.join(", ")}`)
        : HttpResponse.json(apuConHmFixture, { status: 201 }))
    );
  }),
  http.patch(`${API}/apus/:id/detalles/:did`, async ({ params, request }) => {
    const sobra = await soloCampos(request, "cantidad", "rendimiento", "precioOverride", "orden");
    if (sobra) return sobra;
    if (params.did === DETALLE_HM) {
      return problema(
        409,
        "fila-protegida",
        "La fila de Herramienta Menor se calcula automáticamente",
      );
    }
    return HttpResponse.json(apuConHmFixture);
  }),
  http.delete(`${API}/apus/:id/detalles/:did`, ({ params }) => {
    if (params.did === DETALLE_HM) {
      return problema(
        409,
        "fila-protegida",
        "La fila de Herramienta Menor se calcula automáticamente",
      );
    }
    return HttpResponse.json(apuConHmFixture);
  }),
  // ———— APU cálculo (Plan 010) ————
  http.get(`${API}/apus/:id/calculo`, () => HttpResponse.json(apuCalculoFixture)),
  http.post(
    `${API}/apus/:id/guardar-plantilla`,
    async ({ request }) =>
      (await soloCampos(request, "nombre", "descripcionRubro")) ??
      HttpResponse.json(
        {
          id: "018f8a1e-0000-7000-8000-000000000099",
          nombre: "Mi plantilla",
          tipo: "PERSONAL",
          createdAt: "2026-07-23T00:00:00",
          updatedAt: "2026-07-23T00:00:00",
        },
        { status: 201 },
      ),
  ),
  // ———— Plantillas ————
  http.get(`${API}/plantillas-apu`, ({ request }) => {
    const url = new URL(request.url);
    const tipo = url.searchParams.get("tipo");
    if (tipo === "PERSONAL") {
      return HttpResponse.json([
        {
          id: "018f8a1e-0000-7000-8000-000000000002",
          nombre: "Mi plantilla",
          descripcionRubro: "Plantilla personal",
          tipo: "PERSONAL",
          createdAt: "2026-07-20T00:00:00",
          updatedAt: "2026-07-20T00:00:00",
        },
      ]);
    }
    return HttpResponse.json([
      {
        id: plantillaDetalleFixture.id,
        nombre: plantillaDetalleFixture.nombre,
        descripcionRubro: plantillaDetalleFixture.descripcionRubro,
        unidad: plantillaDetalleFixture.unidad,
        tipo: plantillaDetalleFixture.tipo,
        createdAt: "2026-07-01T00:00:00",
        updatedAt: "2026-07-01T00:00:00",
      },
    ]);
  }),
  http.get(`${API}/plantillas-apu/:id`, () => HttpResponse.json(plantillaDetalleFixture)),
  http.put(
    `${API}/plantillas-apu/:id`,
    async ({ request }) =>
      (await soloCampos(request, "nombre", "descripcionRubro")) ??
      HttpResponse.json({
        id: "018f8a1e-0000-7000-8000-000000000002",
        nombre: "Renombrada",
        tipo: "PERSONAL",
        createdAt: "2026-07-20T00:00:00",
        updatedAt: "2026-07-20T00:00:00",
      }),
  ),
  http.delete(`${API}/plantillas-apu/:id`, () => HttpResponse.json(null, { status: 204 })),

  // ———— Presupuesto (Plan 011) ————
  http.post(
    `${API}/proyectos/:id/presupuestos`,
    async ({ request }) =>
      (await soloCampos(request, "origenId", "notas")) ??
      HttpResponse.json(
        {
          presupuestoId: PRESUPUESTO_V3,
          version: 3,
          esVigente: false,
          origenId: PRESUPUESTO_V2,
          notas: "Nueva versión",
          totalGeneral: asDecimal("18500.000000"),
          fechaCreacion: "2026-07-23T00:00:00",
        },
        { status: 201 },
      ),
  ),
  http.post(`${API}/presupuestos/:id/vigente`, () =>
    HttpResponse.json({
      presupuestoId: PRESUPUESTO_V2,
      version: 2,
      esVigente: true,
      origenId: PRESUPUESTO_V1,
      notas: "Corrección APU hormigón",
      totalGeneral: asDecimal("18500.000000"),
      fechaCreacion: "2026-07-01T00:00:00",
    }),
  ),
  http.delete(`${API}/presupuestos/:id`, ({ params }) => {
    if (params.id === PRESUPUESTO_V2) {
      return problema(409, "version-vigente-protegida", "No se puede eliminar la versión vigente");
    }
    return HttpResponse.json(null, { status: 204 });
  }),
  http.get(`${API}/presupuestos/:id/apus`, ({ params, request }) => {
    if (params.id !== PRESUPUESTO_V1 && params.id !== PRESUPUESTO_V2) {
      return HttpResponse.json({ title: "No encontrado" }, { status: 404 });
    }
    const q = new URL(request.url).searchParams.get("q")?.toLowerCase();
    const lista = q
      ? apuResumenFixture.filter(
          (a) => a.codigo.toLowerCase().includes(q) || a.descripcion.toLowerCase().includes(q),
        )
      : apuResumenFixture;
    // Este handler devolvía un array pelado al buscar y `{contenido, total,
    // pagina, tamano}` sin buscar: dos formas, y ninguna era `Page<T>`. La
    // primera reproducía tal cual el bug del plan 021 (`data.contenido` es
    // undefined) y ningún test podía verlo. La validación Zod del 028 lo cazó.
    return HttpResponse.json(pagina(lista));
  }),
  http.get(`${API}/presupuestos/:id`, () => HttpResponse.json(presupuestoFixture)),
  http.get(`${API}/presupuestos/:id/resumen`, () => HttpResponse.json(resumenComponentesFixture)),
  http.get(`${API}/presupuestos/:id/comparar`, () => HttpResponse.json(comparacionFixture)),
  http.get(`${API}/presupuestos/:id/validacion`, () => HttpResponse.json(validacionFixture)),
  http.post(
    `${API}/presupuestos/:id/capitulos`,
    async ({ request }) =>
      (await soloCampos(request, "descripcion", "parentId", "orden")) ??
      HttpResponse.json(presupuestoFixture, { status: 201 }),
  ),
  http.put(
    `${API}/presupuestos/:id/capitulos/:cid`,
    async ({ request }) =>
      (await soloCampos(request, "descripcion")) ?? HttpResponse.json(presupuestoFixture),
  ),
  http.patch(
    `${API}/presupuestos/:id/capitulos/:cid/mover`,
    async ({ request }) =>
      (await soloCampos(request, "parentId", "orden")) ?? HttpResponse.json(presupuestoFixture),
  ),
  http.delete(`${API}/presupuestos/:id/capitulos/:cid`, () =>
    HttpResponse.json(presupuestoFixture),
  ),
  http.post(
    `${API}/presupuestos/:id/capitulos/:cid/rubros`,
    async ({ request }) =>
      (await soloCampos(request, "apuId", "cantidad")) ??
      HttpResponse.json(presupuestoFixture, { status: 201 }),
  ),
  http.patch(
    `${API}/presupuestos/:id/capitulos/:cid/rubros/:rid`,
    async ({ request }) =>
      (await soloCampos(request, "cantidad")) ?? HttpResponse.json(presupuestoFixture),
  ),
  http.delete(`${API}/presupuestos/:id/capitulos/:cid/rubros/:rid`, () =>
    HttpResponse.json(presupuestoFixture),
  ),

  // ———— Display config ————
  http.get(`${API}/config/display`, () =>
    HttpResponse.json({ precisionDinero: 2, precisionPorcentaje: 4 }),
  ),

  // ———— Cronograma (plan 055, contrato de `origin/main` c337950) ————
  http.get(`${API}/presupuestos/:id/cronograma`, ({ params }) =>
    params.id === cronogramaFixture.presupuestoId
      ? HttpResponse.json(cronogramaFixture)
      : errorCronograma(404, "no-encontrado", "El presupuesto no tiene cronograma"),
  ),
  http.post(`${API}/presupuestos/:id/cronograma`, async ({ request }) => {
    const cuerpo = await leerCuerpo(request);
    const sobra = await soloCampos(request, "unidadTiempo", "numeroPeriodos");
    return sobra ?? validarConfiguracion(cuerpo) ?? reconfigurado(cuerpo, 201);
  }),
  http.put(`${API}/cronogramas/:id/configuracion`, async ({ request }) => {
    const cuerpo = await leerCuerpo(request);
    const sobra = await soloCampos(request, "unidadTiempo", "numeroPeriodos", "confirmarPerdida");
    if (sobra) return sobra;
    const invalido = validarConfiguracion(cuerpo);
    if (invalido) return invalido;
    // Reducir períodos o cambiar la unidad borra avances: el backend exige
    // confirmación explícita y devuelve la lista de lo que se va a perder.
    const pierde =
      Number(cuerpo.numeroPeriodos) < cronogramaFixture.numeroPeriodos ||
      cuerpo.unidadTiempo !== cronogramaFixture.unidadTiempo;
    if (pierde && cuerpo.confirmarPerdida !== true) {
      return errorCronograma(
        409,
        "configuracion-cronograma-requiere-confirmacion",
        "La reconfiguración requiere confirmación explícita antes de perder datos o cambiar la unidad de tiempo",
        { perdidas: perdidasFixture },
      );
    }
    return reconfigurado(cuerpo, 200);
  }),
  http.patch(`${API}/cronogramas/:id/actividades/:actId`, async ({ request, params }) => {
    const cuerpo = await leerCuerpo(request);
    const campos = CAMPOS_OPERACION[String(cuerpo.operacion)];
    if (!campos) {
      return errorCronograma(
        400,
        "validacion",
        `operacion debe ser una de: ${Object.keys(CAMPOS_OPERACION).join(", ")}`,
      );
    }
    const sobra = await soloCampos(request, "operacion", ...campos);
    return sobra ?? validarProgramacion(cuerpo, String(params.actId));
  }),
  http.post(`${API}/cronogramas/:id/revisado`, () =>
    HttpResponse.json({
      ...cronogramaFixture,
      totalGeneralRevisado: cronogramaFixture.totalGeneral,
      fechaRevision: "2026-09-06T12:00:00Z",
    }),
  ),

  // ———— Exportar (Plan 051) ————
  // El único endpoint de documentos que existe en origin/main. `formato` es
  // opcional y solo admite `docx`; cualquier otro valor es 400 `validacion`.
  http.get<PathParams, DefaultBodyType, Problem | ArrayBuffer>(
    `${API}/documentos/especificaciones-tecnicas/:id`,
    ({ request }) => {
      const formato = new URL(request.url).searchParams.get("formato");
      if (formato !== null && formato !== "docx")
        return problema(
          400,
          "validacion",
          `Formato no soportado: ${formato} (solo DOCX en esta iteración)`,
        );
      return HttpResponse.arrayBuffer(new ArrayBuffer(8), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": 'attachment; filename="especificaciones-tecnicas.docx"',
        },
      });
    },
  ),

  // ———— Exportación del cronograma (plan 031 del backend, @ 5673615) ————
  // `formato` es OBLIGATORIO y solo admite `xlsx|pdf|mspdi`: el backend
  // responde 400 `validacion` a cualquier otra cosa, así que estos handlers lo
  // rechazan también. Un mock permisivo es un test que no prueba nada.
  http.get(`${API}/documentos/cronograma/:id/preflight`, ({ request, params }) => {
    const formato = leerFormatoCronograma(request);
    if (formato === null) return problema(400, "validacion", FORMATO_NO_SOPORTADO);
    if (params.id === PRESUPUESTO_AJENO)
      return problema(404, "no-encontrado", "Presupuesto no encontrado");
    const base =
      params.id === PRESUPUESTO_BLOQUEADO ? preflightBloqueadoFixture : preflightExportableFixture;
    // El backend devuelve el formato PEDIDO (`formato.token()`), no uno fijo.
    return HttpResponse.json({ ...base, formato });
  }),

  http.get<PathParams, DefaultBodyType, Problem | BloqueoExportDetalle | ArrayBuffer>(
    `${API}/documentos/cronograma/:id`,
    ({ request, params }) => {
      const formato = leerFormatoCronograma(request);
      if (formato === null) return problema(400, "validacion", FORMATO_NO_SOPORTADO);
      if (params.id === PRESUPUESTO_AJENO)
        return problema(404, "no-encontrado", "Presupuesto no encontrado");
      if (params.id === PRESUPUESTO_BLOQUEADO)
        return HttpResponse.json<BloqueoExportDetalle>(
          {
            presupuestoId: String(params.id),
            formato,
            codigo: "export-bloqueado",
            mensaje: `Exportación bloqueada: ${preflightBloqueadoFixture.bloqueos.length} bloqueo(s)`,
            bloqueos: preflightBloqueadoFixture.bloqueos,
            warnings: preflightBloqueadoFixture.warnings,
          },
          { status: 409, headers: { "X-Cronograma-Desactualizado": "false" } },
        );
      const { mediaType, extension } = ARCHIVO_CRONOGRAMA[formato];
      return HttpResponse.arrayBuffer(new ArrayBuffer(8), {
        status: 200,
        headers: {
          "Content-Type": mediaType,
          "Content-Disposition": `attachment; filename="PROY-A-Edificio_Principal-v2.${extension}"`,
          "X-Cronograma-Desactualizado": "false",
        },
      });
    },
  ),

  // ———— Admin (Plan 014) ————
  // El mock reproduce la Page del backend. El interceptor es el único lugar que
  // traduce `items/total` a `contenido/totalElementos`.
  http.get(`${API}/admin/bases-centrales`, ({ request }) => {
    const params = new URL(request.url).searchParams;
    const incluirArchivadas = params.get("incluirArchivadas") === "true";
    const page = Number(params.get("page") ?? 0);
    const size = Number(params.get("size") ?? 25);
    const todos = incluirArchivadas
      ? basesCentralesFixtureAdmin
      : basesCentralesFixtureAdmin.filter((b) => !b.archivada);
    const items = todos.slice(page * size, (page + 1) * size);
    return HttpResponse.json({
      items,
      total: todos.length,
      page,
      size,
      totalPaginas: todos.length === 0 ? 0 : Math.ceil(todos.length / size),
    });
  }),

  http.post(
    `${API}/admin/bases-centrales`,
    async ({ request }) =>
      (await soloCampos(request, "nombre")) ??
      HttpResponse.json(basesCentralesFixtureAdmin[0], { status: 201 }),
  ),
  http.put(
    `${API}/admin/bases-centrales/:id`,
    async ({ request }) =>
      (await soloCampos(request, "nombre")) ?? HttpResponse.json(basesCentralesFixtureAdmin[0]),
  ),
  http.delete(`${API}/admin/bases-centrales/:id`, () => HttpResponse.json(null, { status: 204 })),
  // Insumos bajo la base central: mismos DTOs que el catálogo de proyecto.
  // Ojo a `/import` (admin) frente a `/importar` (proyecto).
  http.post(
    `${API}/admin/bases-centrales/:id/insumos`,
    async ({ request }) =>
      (await soloCampos(request, "codigo", "tipo", "descripcion", "unidad", "precioUnitario")) ??
      HttpResponse.json(insumosFixture[0], { status: 201 }),
  ),
  http.put(
    `${API}/admin/bases-centrales/:id/insumos/:iid`,
    async ({ request }) =>
      (await soloCampos(request, "descripcion", "unidad", "precioUnitario")) ??
      HttpResponse.json(insumosFixture[0]),
  ),
  http.delete(`${API}/admin/bases-centrales/:id/insumos/:iid`, () =>
    HttpResponse.json(null, { status: 204 }),
  ),
  http.post(`${API}/admin/bases-centrales/:id/insumos/import`, () =>
    HttpResponse.json(importResultadoFixture),
  ),
  http.post(`${API}/admin/bases-centrales/:id/archivar`, ({ params }) =>
    HttpResponse.json({
      ...basesCentralesFixtureAdmin[0],
      id: String(params.id),
      archivada: true,
    }),
  ),
];
