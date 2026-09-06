import { http, HttpResponse } from "msw";
import type {
  ProyectoResponse,
  PresupuestoVersionResponse,
  PlantillaProyectoResponse,
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
import { cronogramaFixture } from "./fixtures/cronograma";
import { parametrosSistemaFixture, basesCentralesFixtureAdmin } from "./fixtures/admin";

const API = "*/api/v1";

// Los ids de la fila de Herramienta Menor y del proyecto creado desde plantilla
// eran numéricos y ningún test podía ver que el seam los manda como UUID.
export const DETALLE_HM = "018f8a50-0000-7000-8000-000000000200";
// Estas dos ramas de 409 comparaban `Number(params.id)` contra 99 y 2: con
// UUIDs eso es NaN y nunca entraban. Eran handlers de error inalcanzables.
export const INSUMO_EN_USO = "018f8a20-0000-7000-8000-000000000099";
export const APU_REFERENCIADO = "018f8a40-0000-7000-8000-000000000099";
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

export const problema = (
  status: number,
  type: string,
  title: string,
  extra: Partial<Problem> = {},
) =>
  HttpResponse.json<Problem>(
    { type: `/problemas/${type}`, title, status, ...extra },
    { status, headers: { "Content-Type": "application/problem+json" } },
  );

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
    totalGeneral: "1000.000000" as never,
    fechaCreacion: "2026-02-01T00:00:00",
  },
  {
    presupuestoId: PRESUPUESTO_V2,
    version: 2,
    esVigente: true,
    origenId: PRESUPUESTO_V1,
    notas: "Segunda versión",
    totalGeneral: "1200.000000" as never,
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
  http.post(
    `${API}/proyectos/:id/duplicar`,
    async ({ request }) =>
      (await soloCampos(request, "nombre", "codigo")) ??
      HttpResponse.json(proyectoDetalleFixture, { status: 201 }),
  ),
  http.delete(`${API}/proyectos/:id`, () => HttpResponse.json(null, { status: 204 })),
  http.put(`${API}/proyectos/:id/logo`, () => HttpResponse.json(null, { status: 204 })),

  // ———— Plantillas de proyecto (plan 035, sin backend real) ————
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
  http.post(
    `${API}/plantillas-proyecto`,
    async ({ request }) =>
      (await soloCampos(request, "nombre", "descripcion", "proyectoId")) ??
      HttpResponse.json(
        {
          id: "018f8a60-0000-7000-8000-000000000002",
          nombre: "Nueva plantilla",
          snapshotEstructura: { capitulos: [] },
          fechaCreacion: "2026-01-02T00:00:00Z",
        },
        { status: 201 },
      ),
  ),
  http.delete(`${API}/plantillas-proyecto/:id`, () => HttpResponse.json(null, { status: 204 })),
  http.post(
    `${API}/proyectos/desde-plantilla/:id`,
    async ({ request }) =>
      (await soloCampos(request, "nombre")) ??
      HttpResponse.json(
        {
          ...proyectoDetalleFixture,
          id: PROYECTO_DESDE_PLANTILLA,
          nombreProyecto: "Nuevo desde plantilla",
        },
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

  // ———— Descuento global ————
  http.get(`${API}/presupuestos/:id/descuento-global/preview`, () =>
    HttpResponse.json({
      porcentaje: "0.0500" as never,
      porApu: [
        {
          apuId: "018f8a40-0000-7000-8000-000000000001",
          codigo: "APU-001",
          cdAntes: "100.000000" as never,
          cd: "95.000000" as never,
          ci: "15.000000" as never,
          ct: "110.000000" as never,
        },
      ],
      totalGeneralActual: "1000.000000" as never,
      totalGeneralProyectado: "950.000000" as never,
    }),
  ),
  http.post(
    `${API}/presupuestos/:id/descuento-global`,
    async ({ request }) =>
      (await soloCampos(request, "porcentaje")) ?? HttpResponse.json(null, { status: 200 }),
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
      return problema(409, "insumo-en-uso", "El insumo está en uso", { usos: insumoUsoFixture });
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
          totalGeneral: "18500.000000" as never,
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
      totalGeneral: "18500.000000" as never,
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

  // ———— Cronograma (Plan 012) ————
  http.get(`${API}/presupuestos/:id/cronograma`, ({ params }) => {
    if (params.id !== cronogramaFixture.presupuestoId) {
      return HttpResponse.json(null, { status: 404 });
    }
    return HttpResponse.json(cronogramaFixture);
  }),
  http.post(
    `${API}/presupuestos/:id/cronograma`,
    async ({ request }) =>
      (await soloCampos(request, "unidadTiempo", "numeroPeriodos")) ??
      HttpResponse.json(cronogramaFixture, { status: 201 }),
  ),
  // ponytail: ruta actual del frontend. El plan 055 la mueve a
  // `/cronogramas/{id}/configuracion`, que es la del backend; cuando lo haga,
  // este handler y su test se mueven con ella.
  http.put(
    `${API}/cronogramas/:id`,
    async ({ request }) =>
      (await soloCampos(request, "unidadTiempo", "numeroPeriodos", "confirmarPerdida")) ??
      HttpResponse.json({ ...cronogramaFixture, desactualizado: false }),
  ),
  http.patch(
    `${API}/cronogramas/:id/actividades/:actId`,
    async ({ request }) =>
      (await soloCampos(request, "avancePorPeriodo")) ?? HttpResponse.json(cronogramaFixture),
  ),
  http.post(`${API}/cronogramas/:id/revisado`, () => {
    const revisado = Date.now().toString();
    return HttpResponse.json({
      ...cronogramaFixture,
      totalGeneralRevisado: cronogramaFixture.totalGeneral,
      fechaRevision: revisado,
    });
  }),

  // ———— Exportar (Plan 013) ————
  http.get(`${API}/presupuestos/:id/exportar/pdf`, () => {
    return HttpResponse.arrayBuffer(new ArrayBuffer(8), {
      status: 200,
      headers: { "Content-Type": "application/pdf" },
    });
  }),
  http.get(`${API}/presupuestos/:id/exportar/excel`, () => {
    return HttpResponse.arrayBuffer(new ArrayBuffer(8), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  }),
  http.get(`${API}/presupuestos/:id/apus/exportar`, () => {
    return HttpResponse.arrayBuffer(new ArrayBuffer(8), {
      status: 200,
      headers: { "Content-Type": "application/pdf" },
    });
  }),
  http.get(`${API}/presupuestos/:id/cronograma/exportar`, () => {
    return HttpResponse.arrayBuffer(new ArrayBuffer(8), {
      status: 200,
      headers: { "Content-Type": "application/pdf" },
    });
  }),

  // ———— Admin (Plan 014) ————
  // `AdminBaseCentralResource` sirve una `List<T>` pelada, no una `Page<T>`:
  // envolverla en `pagina()` es justo el mock inventado que dejaba pasar en
  // verde una página que revienta contra el backend real.
  http.get(`${API}/admin/bases-centrales`, ({ request }) => {
    const incluirArchivadas = new URL(request.url).searchParams.get("incluirArchivadas") === "true";
    return HttpResponse.json(
      incluirArchivadas
        ? basesCentralesFixtureAdmin
        : basesCentralesFixtureAdmin.filter((b) => !b.archivada),
    );
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
