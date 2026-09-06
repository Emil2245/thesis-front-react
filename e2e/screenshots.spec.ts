import { test } from "@playwright/test";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API = "**/api/v1";
const OUT = join(__dirname, "..", "screenshots");

const usuario = {
  id: 1,
  nombre: "Ana Torres",
  email: "ana@ejemplo.ec",
  rol: "USUARIO",
  emailVerificado: true,
};
const token = { accessToken: "tok", expiraEnSegundos: 3600, refreshToken: "rt-test", usuario };

const proyectos = [
  {
    id: 1,
    nombreProyecto: "Puente Ambato",
    codigo: "AMB-001",
    estado: "EN_PROCESO",
    updatedAt: "2026-01-15T00:00:00Z",
  },
  {
    id: 2,
    nombreProyecto: "Vía Quito Sur",
    codigo: "UIO-002",
    estado: "BORRADOR",
    updatedAt: "2026-03-20T00:00:00Z",
  },
  {
    id: 3,
    nombreProyecto: "Escuela Milagro",
    codigo: "MIL-003",
    estado: "FINALIZADO",
    updatedAt: "2026-05-10T00:00:00Z",
  },
];
const proyectoDetalle = {
  id: 1,
  nombreProyecto: "Puente Ambato",
  codigo: "AMB-001",
  estado: "EN_PROCESO",
  descripcion: "Construcción del puente Ambato",
  direccionInstitucional: "MTOP",
  subdireccionInstitucional: "Subdirección de Obra Pública",
  anio: 2026,
  fechaInicio: "2026-01-15",
  plazoEjecucion: 8,
  plazoUnidad: "MES",
  tieneLogo: false,
  updatedAt: "2026-01-15T00:00:00Z",
};
const firmantes = [
  { id: 1, nombre: "Ing. Juan Pérez", cargo: "Director de Obra", rol: "CONSOLIDADO", orden: 1 },
  { id: 2, nombre: "Arq. María López", cargo: "Supervisora", rol: "APROBADO", orden: 1 },
];
const parametros = {
  porcentajeHerramientaMenor: "0.050000",
  porcentajeIndirecto: "0.150000",
  iva: "0.120000",
  moneda: "USD",
  mostrarSeccionesVacias: false,
  sufijosSeccionActivos: true,
  mostrarSubtotalesSeccion: true,
  mostrarSubtotalesPie: false,
  mostrarNombreProyectoHeader: true,
  enumerarApus: false,
  mensajeFooter: "",
  modoCodigoRubro: "AUTOGENERADO",
};
const insumos = [
  {
    id: 10,
    codigo: "M-001",
    descripcion: "Cemento Portland Tipo I",
    tipo: "MATERIAL",
    unidad: "kg",
    precio: "12.500000",
    fechaActualizacion: "2026-03-15T00:00:00",
    desactualizado: false,
    fuente: "LOCAL",
  },
  {
    id: 11,
    codigo: "M-002",
    descripcion: "Arena fina",
    tipo: "MATERIAL",
    unidad: "m3",
    precio: "18.000000",
    fechaActualizacion: "2025-11-20T00:00:00",
    desactualizado: true,
    fuente: "LOCAL",
  },
  {
    id: 13,
    codigo: "MO-001",
    descripcion: "Albañil",
    tipo: "MANO_OBRA",
    unidad: "h",
    precio: "8.500000",
    jornal: "8.500000",
    fechaActualizacion: "2026-02-01T00:00:00",
    desactualizado: false,
    fuente: "LOCAL",
  },
  {
    id: 15,
    codigo: "EQ-001",
    descripcion: "Retroexcavadora",
    tipo: "EQUIPO",
    unidad: "h",
    precio: "45.000000",
    tarifa: "45.000000",
    fechaActualizacion: "2026-03-01T00:00:00",
    desactualizado: false,
    fuente: "LOCAL",
  },
];
const apusResumen = [
  {
    id: 1,
    codigo: "APU-001",
    descripcion: "Excavación a máquina",
    unidad: "m3",
    esAuxiliar: false,
    costoDirecto: "800.000000",
    costoTotal: "920.000000",
    vinculado: false,
  },
  {
    id: 2,
    codigo: "APU-002",
    descripcion: "Relleno compactado",
    unidad: "m3",
    esAuxiliar: false,
    costoDirecto: "450.000000",
    costoTotal: "517.500000",
    vinculado: true,
  },
  {
    id: 4,
    codigo: "APU-004",
    descripcion: "Hormigón simple",
    unidad: "m3",
    esAuxiliar: false,
    costoDirecto: "2100.000000",
    costoTotal: "2415.000000",
    vinculado: true,
  },
];
const apuDetalle = {
  id: 1,
  codigo: "APU-001",
  descripcion: "Excavación a máquina",
  unidad: "m3",
  esAuxiliar: false,
  costoDirecto: "800.000000",
  costoTotal: "920.000000",
  vinculado: false,
  porcentajeIndirecto: null,
  porcentajeIndirectoEfectivo: "0.150000",
  costoIndirecto: "120.000000",
  secciones: [
    {
      tipo: "EQUIPO",
      orden: 1,
      subtotal: "400.000000",
      detalles: [
        {
          id: 100,
          orden: 1,
          descripcion: "Retroexcavadora",
          esHerramientaMenor: false,
          insumoId: 15,
          apuAuxiliarId: null,
          cantidad: "1.000000",
          rendimiento: "0.050000",
          unidad: "h",
          precioEfectivo: "45.000000",
          precioHeredado: true,
          costoHora: "900.000000",
          costo: "400.000000",
        },
      ],
    },
    {
      tipo: "MANO_OBRA",
      orden: 2,
      subtotal: "400.000000",
      detalles: [
        {
          id: 101,
          orden: 1,
          descripcion: "Albañil",
          esHerramientaMenor: false,
          insumoId: 13,
          apuAuxiliarId: null,
          cantidad: "1.000000",
          rendimiento: "0.100000",
          unidad: "h",
          precioEfectivo: "8.500000",
          precioHeredado: true,
          costoHora: "85.000000",
          costo: "200.000000",
        },
        {
          id: 102,
          orden: 2,
          descripcion: "Peón",
          esHerramientaMenor: false,
          insumoId: 14,
          apuAuxiliarId: null,
          cantidad: "2.000000",
          rendimiento: "0.100000",
          unidad: "h",
          precioEfectivo: "4.250000",
          precioHeredado: true,
          costoHora: "42.500000",
          costo: "200.000000",
        },
      ],
    },
    { tipo: "MATERIAL", orden: 3, subtotal: "0.000000", detalles: [] },
    { tipo: "TRANSPORTE", orden: 4, subtotal: "0.000000", detalles: [] },
  ],
};
const versiones = [
  {
    id: 10,
    numero: 1,
    notas: "Versión inicial",
    vigente: false,
    totalGeneral: "18000.000000",
    fechaCreacion: "2026-06-01T00:00:00",
  },
  {
    id: 11,
    numero: 2,
    notas: "Corrección APU hormigón",
    vigente: true,
    totalGeneral: "18500.000000",
    fechaCreacion: "2026-07-01T00:00:00",
  },
];
const presupuesto = {
  id: 11,
  version: 2,
  totalGeneral: "18500.000000",
  capitulos: [
    {
      id: 10,
      item: "1",
      descripcion: "Preliminares",
      total: "4500.000000",
      subcapitulos: [
        {
          id: 11,
          item: "1.1",
          descripcion: "Instalación de campamento",
          total: "2500.000000",
          subcapitulos: [],
          rubros: [
            {
              id: 100,
              item: "1.1.1",
              codigo: "APU-001",
              descripcion: "Excavación a máquina",
              unidad: "m3",
              cantidad: "50.000000",
              precioUnitario: "40.000000",
              precioTotal: "2000.000000",
              apuId: 1,
              alertas: [],
            },
            {
              id: 101,
              item: "1.1.2",
              codigo: "APU-002",
              descripcion: "Relleno compactado",
              unidad: "m3",
              cantidad: "20.000000",
              precioUnitario: "25.000000",
              precioTotal: "500.000000",
              apuId: 2,
              alertas: ["PU_CERO"],
            },
          ],
        },
      ],
      rubros: [],
    },
    {
      id: 20,
      item: "2",
      descripcion: "Obra civil",
      total: "14000.000000",
      subcapitulos: [],
      rubros: [
        {
          id: 200,
          item: "2.1",
          codigo: "APU-004",
          descripcion: "Hormigón simple",
          unidad: "m3",
          cantidad: "10.000000",
          precioUnitario: "1400.000000",
          precioTotal: "14000.000000",
          apuId: 4,
          alertas: [],
        },
      ],
    },
  ],
};
const cronograma = {
  id: 1,
  presupuestoId: 11,
  unidadTiempo: "MES",
  numeroPeriodos: 4,
  totalGeneral: "18500.000000",
  totalGeneralRevisado: "18600.000000",
  fechaRevision: "2026-07-15T00:00:00",
  desactualizado: false,
  actividades: [
    {
      id: 100,
      rubroId: 100,
      item: "1.1.1",
      descripcion: "Excavación a máquina",
      precioTotal: "2000.000000",
      pesoPonderado: "0.1081",
      avancePorPeriodo: { "0": "500.000000", "1": "1000.000000", "2": "500.000000" },
      desviacion: "0.000000",
    },
    {
      id: 200,
      rubroId: 200,
      item: "2.1",
      descripcion: "Hormigón simple",
      precioTotal: "14000.000000",
      pesoPonderado: "0.7568",
      avancePorPeriodo: {
        "0": "3000.000000",
        "1": "5000.000000",
        "2": "4000.000000",
        "3": "2000.000000",
      },
      desviacion: "100.000000",
    },
  ],
  avancePorPeriodo: ["3750.000000", "6250.000000", "4500.000000", "2000.000000"],
  avanceAcumulado: ["3750.000000", "10000.000000", "14500.000000", "16500.000000"],
};

function json(data: unknown) {
  return {
    status: 200 as const,
    contentType: "application/json" as const,
    body: JSON.stringify(data),
  };
}

async function capturar(
  page: import("@playwright/test").Page,
  nombre: string,
  testInfo: import("@playwright/test").TestInfo,
) {
  await page.waitForTimeout(2000);
  const buf = await page.screenshot({ fullPage: true });
  if (testInfo.project.name !== "chromium") return;
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, `${nombre}.png`), buf);
}

const proyectosResponse = { items: proyectos, page: 0, size: 25, total: 3, totalPaginas: 1 };

const plantillasSistema = [
  {
    id: 1,
    nombre: "Excavación típica",
    descripcion: "Plantilla base para excavaciones",
    tipo: "SISTEMA",
    fechaCreacion: "2026-01-01T00:00:00",
  },
];

const plantillasPersonales = [
  {
    id: 2,
    nombre: "Mi plantilla",
    descripcion: "Plantilla personal",
    tipo: "PERSONAL",
    fechaCreacion: "2026-07-20T00:00:00",
  },
];

async function baseAutenticado(page: import("@playwright/test").Page) {
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("PAGE ERROR:", msg.text());
  });
  await page.route(`${API}/**`, (route) => route.fulfill(json({})));
  await page.route(`${API}/auth/refresh`, (route) => route.fulfill(json(token)));
  await page.route(`${API}/perfil`, (route) => route.fulfill(json(usuario)));
  await page.route(`${API}/proyectos*`, (route) => route.fulfill(json(proyectosResponse)));
  await page.route(`${API}/proyectos/1/presupuestos*`, (route) => route.fulfill(json(versiones)));
  await page.route(`${API}/plantillas-apu*`, (route) => {
    const url = new URL(route.request().url());
    const tipo = url.searchParams.get("tipo");
    if (tipo === "PERSONAL") return route.fulfill(json(plantillasPersonales));
    return route.fulfill(json(plantillasSistema));
  });
  await page.addInitScript(() => localStorage.setItem("apu.refresh", "rt-test"));
}

test("01-login", async ({ page }, testInfo) => {
  await page.route(`${API}/auth/refresh`, (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "No autorizado" }),
    }),
  );
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/login", { waitUntil: "networkidle", timeout: 30000 });
  await capturar(page, "01-login", testInfo);
});

test("02-proyectos", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.goto("/proyectos", { waitUntil: "networkidle", timeout: 30000 });
  await capturar(page, "02-proyectos", testInfo);
});

test("03-proyecto-detalle", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.route(`${API}/proyectos/1`, (route) => route.fulfill(json(proyectoDetalle)));
  await page.route(`${API}/proyectos/1/firmantes*`, (route) => route.fulfill(json(firmantes)));
  await page.goto("/proyectos/1", { waitUntil: "networkidle", timeout: 30000 });
  await capturar(page, "03-proyecto-detalle", testInfo);
});

test("04-parametros", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.route(`${API}/proyectos/1`, (route) => route.fulfill(json(proyectoDetalle)));
  await page.route(`${API}/proyectos/1/parametros`, (route) => route.fulfill(json(parametros)));
  await page.goto("/proyectos/1/parametros", { waitUntil: "networkidle", timeout: 30000 });
  await capturar(page, "04-parametros", testInfo);
});

test("05-insumos", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.route(`${API}/proyectos/1`, (route) => route.fulfill(json(proyectoDetalle)));
  await page.route(`${API}/proyectos/1/insumos*`, (route) =>
    route.fulfill(
      json({ contenido: insumos, page: 0, size: 25, totalElementos: 4, totalPaginas: 1 }),
    ),
  );
  await page.route(`${API}/bases-centrales*`, (route) =>
    route.fulfill(
      json([
        { id: 1, nombre: "Base IESS 2026", archivada: false, insumoCount: 93 },
        { id: 2, nombre: "Base MTOP 2025", archivada: false, insumoCount: 45 },
      ]),
    ),
  );
  await page.goto("/proyectos/1/insumos", { waitUntil: "networkidle", timeout: 30000 });
  await capturar(page, "05-insumos", testInfo);
});

test("06-apus", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.route(`${API}/proyectos/1`, (route) => route.fulfill(json(proyectoDetalle)));
  await page.route(`${API}/presupuestos/*/apus*`, (route) =>
    route.fulfill(json({ contenido: apusResumen, total: 3, pagina: 0, tamano: 20 })),
  );
  await page.goto("/proyectos/1/apus", { waitUntil: "networkidle", timeout: 30000 });
  await capturar(page, "06-apus", testInfo);
});

test("07-apu-editor", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.route(`${API}/proyectos/1`, (route) => route.fulfill(json(proyectoDetalle)));
  await page.route(`${API}/apus/1`, (route) => route.fulfill(json(apuDetalle)));
  await page.goto("/proyectos/1/apus/1", { waitUntil: "networkidle", timeout: 30000 });
  await capturar(page, "07-apu-editor", testInfo);
});

test("08-presupuesto", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.route(`${API}/proyectos/1`, (route) => route.fulfill(json(proyectoDetalle)));
  await page.route(`${API}/proyectos/1/presupuestos*`, (route) => route.fulfill(json(versiones)));
  await page.route(`${API}/presupuestos/11`, (route) => route.fulfill(json(presupuesto)));
  await page.route(`${API}/presupuestos/11/resumen`, (route) =>
    route.fulfill(
      json({
        equipo: { total: "4000.000000", porcentaje: "0.2830" },
        manoObra: { total: "6000.000000", porcentaje: "0.4250" },
        material: { total: "3000.000000", porcentaje: "0.2120" },
        transporte: { total: "1000.000000", porcentaje: "0.0800" },
        totalGeneral: "14000.000000",
      }),
    ),
  );
  await page.route(`${API}/presupuestos/11/validacion`, (route) =>
    route.fulfill(
      json({
        exportable: false,
        itemsPuCero: [
          { rubroId: 101, item: "1.1.2", codigo: "APU-002", descripcion: "Relleno compactado" },
        ],
        itemsCantidadCero: [
          { rubroId: 102, item: "1.2.1", codigo: "APU-003", descripcion: "Transporte material" },
        ],
        itemsSinActividad: [
          { rubroId: 100, item: "1.1.1", codigo: "APU-001", descripcion: "Excavación a máquina" },
        ],
      }),
    ),
  );
  await page.goto("/proyectos/1/presupuesto", { waitUntil: "networkidle", timeout: 30000 });
  await capturar(page, "08-presupuesto", testInfo);
});

test("09-versiones", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.route(`${API}/proyectos/1`, (route) => route.fulfill(json(proyectoDetalle)));
  await page.route(`${API}/proyectos/1/presupuestos*`, (route) => route.fulfill(json(versiones)));
  await page.route(`${API}/presupuestos/11`, (route) => route.fulfill(json(presupuesto)));
  await page.goto("/proyectos/1/versiones", { waitUntil: "networkidle", timeout: 30000 });
  await capturar(page, "09-versiones", testInfo);
});

test("10-cronograma", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.route(`${API}/proyectos/1`, (route) => route.fulfill(json(proyectoDetalle)));
  await page.route(`${API}/proyectos/1/presupuestos*`, (route) => route.fulfill(json(versiones)));
  await page.route(`${API}/presupuestos/11/cronograma`, (route) => route.fulfill(json(cronograma)));
  await page.goto("/proyectos/1/cronograma", { waitUntil: "networkidle", timeout: 30000 });
  await capturar(page, "10-cronograma", testInfo);
});

test("11-documentos", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.route(`${API}/proyectos/1`, (route) => route.fulfill(json(proyectoDetalle)));
  await page.route(`${API}/proyectos/1/presupuestos*`, (route) => route.fulfill(json(versiones)));
  await page.goto("/proyectos/1/documentos", { waitUntil: "networkidle", timeout: 30000 });
  await capturar(page, "11-documentos", testInfo);
});
