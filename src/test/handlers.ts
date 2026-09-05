import { http, HttpResponse } from "msw";
import type { ProyectoResponse, PresupuestoVersionResponse } from "@/api/contract";
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
  plantillaDetalleFixture,
} from "./fixtures/apu";
import {
  presupuestoFixture,
  validacionFixture,
  resumenComponentesFixture,
  comparacionFixture,
} from "./fixtures/presupuesto";
import { cronogramaFixture } from "./fixtures/cronograma";
import {
  usuariosAdminFixture,
  parametrosSistemaFixture,
  valoresReferenciaFixture,
  logsFixture,
  basesCentralesFixtureAdmin,
  plantillasSistemaFixture,
} from "./fixtures/admin";

const API = "*/api/v1";

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

export const pagina = <T>(items: T[]) => ({
  items,
  page: 0,
  size: 25,
  total: items.length,
  totalPaginas: 1,
});

const versionesStub: PresupuestoVersionResponse[] = [
  {
    presupuestoId: 10,
    version: 1,
    esVigente: false,
    origenId: 0,
    notas: "Primera versión",
    totalGeneral: "1000.000000" as never,
    fechaCreacion: "2026-02-01T00:00:00",
  },
  {
    presupuestoId: 11,
    version: 2,
    esVigente: true,
    origenId: 10,
    notas: "Segunda versión",
    totalGeneral: "1200.000000" as never,
    fechaCreacion: "2026-03-01T00:00:00",
  },
];

export const handlers = [
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
    const p = proyectosFixture.find((x) => x.id === Number(params.id));
    if (!p) return HttpResponse.json(null, { status: 404 });
    return HttpResponse.json({ ...proyectoDetalleFixture, ...p });
  }),
  http.post(`${API}/proyectos`, () => HttpResponse.json(proyectoDetalleFixture, { status: 201 })),
  http.put(`${API}/proyectos/:id`, () => HttpResponse.json(proyectoDetalleFixture)),
  http.post(`${API}/proyectos/:id/duplicar`, () =>
    HttpResponse.json(proyectoDetalleFixture, { status: 201 }),
  ),
  http.delete(`${API}/proyectos/:id`, () => HttpResponse.json(null, { status: 204 })),
  http.put(`${API}/proyectos/:id/logo`, () => HttpResponse.json(null, { status: 204 })),

  // ———— Plantillas de proyecto (plan 035, sin backend real) ————
  http.get(`${API}/plantillas-proyecto`, () =>
    HttpResponse.json([
      {
        id: 1,
        nombre: "Plantilla proyecto",
        descripcion: "Plantilla de prueba",
        fechaCreacion: "2026-01-01T00:00:00Z",
      },
    ]),
  ),
  http.post(`${API}/plantillas-proyecto`, () =>
    HttpResponse.json(
      { id: 2, nombre: "Nueva plantilla", fechaCreacion: "2026-01-02T00:00:00Z" },
      { status: 201 },
    ),
  ),
  http.delete(`${API}/plantillas-proyecto/:id`, () => HttpResponse.json(null, { status: 204 })),
  http.post(`${API}/proyectos/desde-plantilla/:id`, () =>
    HttpResponse.json(
      { ...proyectoDetalleFixture, id: 99, nombreProyecto: "Nuevo desde plantilla" },
      { status: 201 },
    ),
  ),

  http.get(`${API}/proyectos/:id/firmantes`, () => HttpResponse.json(firmantesFixture)),
  http.post(`${API}/proyectos/:id/firmantes`, () =>
    HttpResponse.json(firmantesFixture[0], { status: 201 }),
  ),
  http.put(`${API}/proyectos/:id/firmantes/:fid`, () => HttpResponse.json(firmantesFixture[0])),
  http.delete(`${API}/proyectos/:id/firmantes/:fid`, () =>
    HttpResponse.json(null, { status: 204 }),
  ),

  http.get(`${API}/proyectos/:id/parametros`, () => HttpResponse.json(parametrosFixture)),
  http.put(`${API}/proyectos/:id/parametros`, () => HttpResponse.json(parametrosFixture)),

  // ———— Descuento global ————
  http.get(`${API}/presupuestos/:id/descuento-global/preview`, () =>
    HttpResponse.json({
      porcentaje: "0.0500" as never,
      porApu: [
        {
          apuId: 1,
          codigo: "APU-001",
          cd: "100.000000" as never,
          cdAjustado: "95.000000" as never,
          ci: "15.000000" as never,
          ct: "110.000000" as never,
        },
      ],
      totalGeneralActual: "1000.000000" as never,
      totalGeneralProyectado: "950.000000" as never,
    }),
  ),
  http.post(`${API}/presupuestos/:id/descuento-global`, () =>
    HttpResponse.json(null, { status: 200 }),
  ),

  http.get(`${API}/proyectos/:id/presupuestos`, () => HttpResponse.json(versionesStub)),

  // ———— Auth ————
  http.post(`${API}/auth/login`, () => HttpResponse.json(tokenFixture)),
  http.post(`${API}/auth/refresh`, () => HttpResponse.json(tokenFixture)),
  http.post(`${API}/auth/registro`, () => HttpResponse.json(null, { status: 201 })),
  http.post(`${API}/auth/verificar-email`, () => HttpResponse.json(null, { status: 204 })),
  http.post(`${API}/auth/reenviar-verificacion`, () => HttpResponse.json(null, { status: 202 })),
  http.post(`${API}/auth/recuperar`, () => HttpResponse.json(null, { status: 202 })),
  http.post(`${API}/auth/restablecer`, () => HttpResponse.json(null, { status: 204 })),
  http.post(`${API}/auth/logout`, () => HttpResponse.json(null, { status: 204 })),
  http.get(`${API}/perfil`, () => HttpResponse.json(tokenFixture.usuario)),
  http.put(`${API}/perfil`, () => HttpResponse.json(tokenFixture.usuario)),
  http.put(`${API}/perfil/password`, () => HttpResponse.json(null, { status: 204 })),

  // ———— Insumos (Plan 008) ————
  http.get(`${API}/proyectos/:id/insumos`, () => HttpResponse.json(pagina(insumosFixture))),
  http.post(`${API}/proyectos/:id/insumos`, () =>
    HttpResponse.json(insumosFixture[0], { status: 201 }),
  ),
  http.put(`${API}/proyectos/:id/insumos/:iid`, () => HttpResponse.json(insumosFixture[0])),
  http.delete(`${API}/proyectos/:id/insumos/:iid`, ({ params }) => {
    if (Number(params.iid) === 99) {
      return problema(409, "insumo-en-uso", "El insumo está en uso", { usos: insumoUsoFixture });
    }
    return HttpResponse.json(null, { status: 204 });
  }),
  http.get(`${API}/proyectos/:id/insumos/:iid/uso`, () => HttpResponse.json(insumoUsoFixture)),
  http.post(`${API}/proyectos/:id/insumos/importar`, () =>
    HttpResponse.json(importResultadoFixture),
  ),
  http.post(`${API}/proyectos/:id/insumos/copiar`, () =>
    HttpResponse.json(copiaBaseResultadoFixture),
  ),
  http.get(`${API}/proyectos/:id/insumos/selector`, () =>
    HttpResponse.json(pagina(insumosBusquedaFixture)),
  ),
  http.get(`${API}/bases-centrales`, () => HttpResponse.json(basesCentralesFixture)),

  // ———— APU editor (Plan 009) ————
  http.post(`${API}/presupuestos/:id/apus`, () =>
    HttpResponse.json(apuDetalleFixture, { status: 201 }),
  ),
  http.get(`${API}/apus/:id`, () => HttpResponse.json(apuConHmFixture)),
  http.patch(`${API}/apus/:id`, () => HttpResponse.json(apuConHmFixture)),
  http.put(`${API}/apus/:id/especificacion-tecnica`, () => HttpResponse.json(apuDetalleFixture)),
  http.delete(`${API}/apus/:id`, ({ params }) => {
    if (Number(params.id) === 2) {
      return problema(409, "apu-referenciado", "El APU está referenciado por otros elementos");
    }
    return HttpResponse.json(null, { status: 204 });
  }),
  http.post(`${API}/apus/:id/duplicar`, () =>
    HttpResponse.json(apuDetalleFixture, { status: 201 }),
  ),
  http.post(`${API}/apus/:id/detalles`, () => HttpResponse.json(apuConHmFixture, { status: 201 })),
  http.patch(`${API}/apus/:id/detalles/:did`, ({ params }) => {
    if (Number(params.did) === 200) {
      return problema(
        409,
        "fila-protegida",
        "La fila de Herramienta Menor se calcula automáticamente",
      );
    }
    return HttpResponse.json(apuConHmFixture);
  }),
  http.delete(`${API}/apus/:id/detalles/:did`, ({ params }) => {
    if (Number(params.did) === 200) {
      return problema(
        409,
        "fila-protegida",
        "La fila de Herramienta Menor se calcula automáticamente",
      );
    }
    return HttpResponse.json(apuConHmFixture);
  }),
  // ———— APU descuento y cálculo (Plan 010) ————
  http.post(`${API}/apus/:id/descuento`, () => HttpResponse.json(apuConHmFixture)),
  http.get(`${API}/apus/:id/calculo`, () =>
    HttpResponse.json({
      formulas: [
        { concepto: "HM", formula: "5% × 8.99", resultado: "0.45" },
        { concepto: "CD", formula: "Suma M+N+O+P", resultado: "800.00" },
      ],
      subtotales: { M: "400.00", N: "400.00", O: "0.00", P: "0.00" },
      cd: "800.00",
      cdAjustado: "800.00",
      ci: "120.00",
      ct: "920.00",
    }),
  ),
  http.post(`${API}/apus/:id/guardar-plantilla`, () =>
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
  http.put(`${API}/plantillas-apu/:id`, () =>
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
  http.post(`${API}/proyectos/:id/presupuestos`, () =>
    HttpResponse.json(
      {
        presupuestoId: 12,
        version: 3,
        esVigente: false,
        origenId: 11,
        notas: "Nueva versión",
        totalGeneral: "18500.000000" as never,
        fechaCreacion: "2026-07-23T00:00:00",
      },
      { status: 201 },
    ),
  ),
  http.post(`${API}/presupuestos/:id/vigente`, () =>
    HttpResponse.json({
      presupuestoId: 11,
      version: 2,
      esVigente: true,
      origenId: 10,
      notas: "Corrección APU hormigón",
      totalGeneral: "18500.000000" as never,
      fechaCreacion: "2026-07-01T00:00:00",
    }),
  ),
  http.delete(`${API}/presupuestos/:id`, ({ params }) => {
    if (Number(params.id) === 11) {
      return problema(409, "version-vigente-protegida", "No se puede eliminar la versión vigente");
    }
    return HttpResponse.json(null, { status: 204 });
  }),
  http.get(`${API}/presupuestos/:id/apus`, ({ params, request }) => {
    const id = Number(params.id);
    if (id !== 10 && id !== 11) {
      return HttpResponse.json({ title: "No encontrado" }, { status: 404 });
    }
    const url = new URL(request.url);
    const qParam = url.searchParams.get("q");
    const q = qParam?.toLowerCase();
    const lista = q
      ? apuResumenFixture.filter(
          (a) => a.codigo.toLowerCase().includes(q) || a.descripcion.toLowerCase().includes(q),
        )
      : apuResumenFixture;
    if (qParam !== null) {
      return HttpResponse.json(lista);
    }
    return HttpResponse.json({ contenido: lista, total: lista.length, pagina: 0, tamano: 20 });
  }),
  http.get(`${API}/presupuestos/:id`, () => HttpResponse.json(presupuestoFixture)),
  http.get(`${API}/presupuestos/:id/resumen`, () => HttpResponse.json(resumenComponentesFixture)),
  http.get(`${API}/presupuestos/:id/comparar`, () => HttpResponse.json(comparacionFixture)),
  http.get(`${API}/presupuestos/:id/validacion`, () => HttpResponse.json(validacionFixture)),
  http.post(`${API}/presupuestos/:id/capitulos`, () =>
    HttpResponse.json(presupuestoFixture, { status: 201 }),
  ),
  http.put(`${API}/presupuestos/:id/capitulos/:cid`, () => HttpResponse.json(presupuestoFixture)),
  http.patch(`${API}/presupuestos/:id/capitulos/:cid/mover`, () =>
    HttpResponse.json(presupuestoFixture),
  ),
  http.delete(`${API}/presupuestos/:id/capitulos/:cid`, () =>
    HttpResponse.json(presupuestoFixture),
  ),
  http.post(`${API}/presupuestos/:id/capitulos/:cid/rubros`, () =>
    HttpResponse.json(presupuestoFixture, { status: 201 }),
  ),
  http.patch(`${API}/presupuestos/:id/capitulos/:cid/rubros/:rid`, () =>
    HttpResponse.json(presupuestoFixture),
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
    if (Number(params.id) !== cronogramaFixture.presupuestoId) {
      return HttpResponse.json(null, { status: 404 });
    }
    return HttpResponse.json(cronogramaFixture);
  }),
  http.post(`${API}/presupuestos/:id/cronograma`, () =>
    HttpResponse.json(cronogramaFixture, { status: 201 }),
  ),
  http.put(`${API}/cronogramas/:id`, () =>
    HttpResponse.json({ ...cronogramaFixture, desactualizado: false }),
  ),
  http.patch(`${API}/cronogramas/:id/actividades/:actId`, () =>
    HttpResponse.json(cronogramaFixture),
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
  http.get(`${API}/admin/usuarios`, ({ request }) => {
    const url = new URL(request.url);
    const activo = url.searchParams.get("activo");
    const rol = url.searchParams.get("rol");
    let result = usuariosAdminFixture;
    if (activo !== null) result = result.filter((u) => u.activo === (activo === "true"));
    if (rol) result = result.filter((u) => u.rol === rol);
    return HttpResponse.json({ contenido: result, total: result.length, pagina: 0, tamano: 20 });
  }),
  http.post(`${API}/admin/usuarios/invitar`, () => HttpResponse.json(null, { status: 204 })),
  http.patch(`${API}/admin/usuarios/:id`, ({ params }) => {
    const user = usuariosAdminFixture.find((u) => u.id === Number(params.id));
    return HttpResponse.json(user ?? { ...usuariosAdminFixture[0] });
  }),
  http.delete(`${API}/admin/usuarios/:id`, () => HttpResponse.json(null, { status: 204 })),
  http.post(`${API}/admin/usuarios/:id/restaurar`, () => HttpResponse.json(null, { status: 204 })),

  http.get(`${API}/admin/bases`, () =>
    HttpResponse.json({
      contenido: basesCentralesFixtureAdmin,
      total: basesCentralesFixtureAdmin.length,
      pagina: 0,
      tamano: 20,
    }),
  ),
  http.post(`${API}/admin/bases`, () =>
    HttpResponse.json(basesCentralesFixtureAdmin[0], { status: 201 }),
  ),
  http.get(`${API}/admin/bases/:id`, () => HttpResponse.json(basesCentralesFixtureAdmin[0])),
  http.put(`${API}/admin/bases/:id`, () => HttpResponse.json(basesCentralesFixtureAdmin[0])),
  http.delete(`${API}/admin/bases/:id`, () => HttpResponse.json(null, { status: 204 })),
  http.post(`${API}/admin/bases/:id/archivar`, ({ params }) =>
    HttpResponse.json({
      id: Number(params.id),
      nombre: "Base test",
      tipo: "CENTRAL",
      archivada: true,
      totalInsumos: 10,
    }),
  ),

  http.get(`${API}/admin/plantillas`, () => HttpResponse.json(plantillasSistemaFixture)),
  http.post(`${API}/admin/plantillas`, () =>
    HttpResponse.json(plantillasSistemaFixture[0], { status: 201 }),
  ),
  http.delete(`${API}/admin/plantillas/:id`, () => HttpResponse.json(null, { status: 204 })),

  // El backend expone esta lectura en /proyectos/parametros-sistema, sin rol
  // de admin (plan 027); la escritura no existe todavía y AdminParametrosPage
  // la mantiene deshabilitada.
  http.get(`${API}/proyectos/parametros-sistema`, () =>
    HttpResponse.json(parametrosSistemaFixture),
  ),
  http.put(`${API}/proyectos/parametros-sistema`, () =>
    HttpResponse.json(parametrosSistemaFixture),
  ),

  http.get(`${API}/admin/valores-referencia`, () => HttpResponse.json(valoresReferenciaFixture)),
  http.put(`${API}/admin/valores-referencia/:clave`, () =>
    HttpResponse.json(valoresReferenciaFixture[0]),
  ),

  http.get(`${API}/admin/logs`, ({ request }) => {
    const url = new URL(request.url);
    const evento = url.searchParams.get("evento");
    let result = logsFixture;
    if (evento) result = result.filter((l) => l.evento.includes(evento));
    return HttpResponse.json({ contenido: result, total: result.length, pagina: 0, tamano: 20 });
  }),
];
