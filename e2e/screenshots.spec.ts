import { expect, test } from "@playwright/test";
import { APU_1, APU_2, APU_4 } from "../src/test/fixtures/apu";
import {
  ACTIVIDAD_1,
  ACTIVIDAD_2,
  ACTIVIDAD_3,
  ACTIVIDAD_4,
  CRONOGRAMA_ID,
} from "../src/test/fixtures/cronograma";
import { basesCentralesFixture } from "../src/test/fixtures/insumos";
import {
  CAPITULO_1,
  CAPITULO_1_1,
  CAPITULO_2,
  PRESUPUESTO_V1,
  PRESUPUESTO_V2,
  RUBRO_1_1_1,
  RUBRO_1_1_2,
  RUBRO_1_2_1,
  RUBRO_2_1,
  resumenComponentesFixture,
} from "../src/test/fixtures/presupuesto";
import {
  FIRMANTE_1,
  FIRMANTE_2,
  PROYECTO_1,
  PROYECTO_2,
  PROYECTO_3,
} from "../src/test/fixtures/proyectos";
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
    id: PROYECTO_1,
    nombreProyecto: "Puente Ambato",
    codigo: "AMB-001",
    estado: "EN_PROCESO",
    updatedAt: "2026-01-15T00:00:00Z",
  },
  {
    id: PROYECTO_2,
    nombreProyecto: "Vía Quito Sur",
    codigo: "UIO-002",
    estado: "BORRADOR",
    updatedAt: "2026-03-20T00:00:00Z",
  },
  {
    id: PROYECTO_3,
    nombreProyecto: "Escuela Milagro",
    codigo: "MIL-003",
    estado: "FINALIZADO",
    updatedAt: "2026-05-10T00:00:00Z",
  },
];
const proyectoDetalle = {
  id: PROYECTO_1,
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
  {
    id: FIRMANTE_1,
    nombre: "Ing. Juan Pérez",
    cargo: "Director de Obra",
    rol: "CONSOLIDADO",
    orden: 1,
  },
  { id: FIRMANTE_2, nombre: "Arq. María López", cargo: "Supervisora", rol: "APROBADO", orden: 1 },
];
const parametros = {
  porcentajeHerramientaMenor: 0.05,
  porcentajeIndirecto: 0.15,
  iva: 0.12,
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
    id: "10",
    codigo: "M-001",
    descripcion: "Cemento Portland Tipo I",
    tipo: "MATERIAL",
    unidad: "kg",
    precioUnitario: 12.5,
    fechaActualizacion: "2026-03-15T00:00:00",
    desactualizado: false,
  },
  {
    id: "11",
    codigo: "M-002",
    descripcion: "Arena fina",
    tipo: "MATERIAL",
    unidad: "m3",
    precioUnitario: 18.0,
    fechaActualizacion: "2025-11-20T00:00:00",
    desactualizado: true,
  },
  {
    id: "13",
    codigo: "MO-001",
    descripcion: "Albañil",
    tipo: "MANO_OBRA",
    unidad: "h",
    precioUnitario: 8.5,
    fechaActualizacion: "2026-02-01T00:00:00",
    desactualizado: false,
  },
  {
    id: "15",
    codigo: "EQ-001",
    descripcion: "Retroexcavadora",
    tipo: "EQUIPO",
    unidad: "h",
    precioUnitario: 45.0,
    fechaActualizacion: "2026-03-01T00:00:00",
    desactualizado: false,
  },
];
const apusResumen = [
  {
    id: APU_1,
    codigo: "APU-001",
    descripcion: "Excavación a máquina",
    unidad: "m3",
    costoDirecto: 800.0,
    costoTotal: 920.0,
    vinculado: false,
  },
  {
    id: APU_2,
    codigo: "APU-002",
    descripcion: "Relleno compactado",
    unidad: "m3",
    costoDirecto: 450.0,
    costoTotal: 517.5,
    vinculado: true,
  },
  {
    id: APU_4,
    codigo: "APU-004",
    descripcion: "Hormigón simple",
    unidad: "m3",
    costoDirecto: 2100.0,
    costoTotal: 2415.0,
    vinculado: true,
  },
];
const apuDetalle = {
  id: APU_1,
  codigo: "APU-001",
  descripcion: "Excavación a máquina",
  unidad: "m3",
  costoDirecto: 800,
  costoTotal: 920,
  porcentajeIndirectoEfectivo: 0.15,
  costoIndirecto: 120,
  secciones: [
    {
      tipo: "EQUIPO",
      orden: 1,
      subtotal: 400,
      detalles: [
        {
          id: "100",
          orden: 1,
          descripcion: "Retroexcavadora",
          esHerramientaMenor: false,
          insumoId: "15",
          apuAuxiliarId: null,
          cantidad: 1,
          rendimiento: 0.05,
          unidad: "h",
          precioEfectivo: 45,
          precioHeredado: true,
          costoHora: 900,
          costo: 400,
        },
      ],
    },
    {
      tipo: "MANO_OBRA",
      orden: 2,
      subtotal: 400,
      detalles: [
        {
          id: "101",
          orden: 1,
          descripcion: "Albañil",
          esHerramientaMenor: false,
          insumoId: "13",
          apuAuxiliarId: null,
          cantidad: 1,
          rendimiento: 0.1,
          unidad: "h",
          precioEfectivo: 8.5,
          precioHeredado: true,
          costoHora: 85,
          costo: 200,
        },
        {
          id: "102",
          orden: 2,
          descripcion: "Peón",
          esHerramientaMenor: false,
          insumoId: "14",
          apuAuxiliarId: null,
          cantidad: 2,
          rendimiento: 0.1,
          unidad: "h",
          precioEfectivo: 4.25,
          precioHeredado: true,
          costoHora: 42.5,
          costo: 200,
        },
      ],
    },
    { tipo: "MATERIAL", orden: 3, subtotal: 0, detalles: [] },
    { tipo: "TRANSPORTE", orden: 4, subtotal: 0, detalles: [] },
  ],
};
// `PresupuestoVersionResponse` es {presupuestoId, version, esVigente}: con
// {id, numero, vigente} `useVersionActiva` no encontraba ninguna vigente y
// TODAS las capturas con versión salían en el estado vacío («Sin versión
// seleccionada», «No hay cronograma»), incluida la del cronograma.
const versiones = [
  {
    presupuestoId: PRESUPUESTO_V1,
    version: 1,
    notas: "Versión inicial",
    esVigente: false,
    totalGeneral: "18000.000000",
    fechaCreacion: "2026-06-01T00:00:00",
  },
  {
    presupuestoId: PRESUPUESTO_V2,
    version: 2,
    notas: "Corrección APU hormigón",
    esVigente: true,
    totalGeneral: "18500.000000",
    fechaCreacion: "2026-07-01T00:00:00",
  },
];
const presupuesto = {
  presupuestoId: PRESUPUESTO_V2,
  version: 2,
  esVigente: true,
  totalGeneral: "18500.000000",
  capitulos: [
    {
      id: CAPITULO_1,
      item: "1",
      descripcion: "Preliminares",
      orden: 1,
      total: "4500.000000",
      subcapitulos: [
        {
          id: CAPITULO_1_1,
          item: "1.1",
          descripcion: "Instalación de campamento",
          orden: 1,
          total: "2500.000000",
          subcapitulos: [],
          rubros: [
            {
              id: RUBRO_1_1_1,
              item: "1.1.1",
              codigo: "APU-001",
              descripcion: "Excavación a máquina",
              unidad: "m3",
              cantidad: "50.000000",
              precioUnitario: "40.000000",
              precioTotal: "2000.000000",
              apuId: APU_1,
            },
            {
              id: RUBRO_1_1_2,
              item: "1.1.2",
              codigo: "APU-002",
              descripcion: "Relleno compactado",
              unidad: "m3",
              cantidad: "20.000000",
              precioUnitario: "25.000000",
              precioTotal: "500.000000",
              apuId: APU_2,
            },
          ],
        },
      ],
      rubros: [],
    },
    {
      id: CAPITULO_2,
      item: "2",
      descripcion: "Obra civil",
      orden: 2,
      total: "14000.000000",
      subcapitulos: [],
      rubros: [
        {
          id: RUBRO_2_1,
          item: "2.1",
          codigo: "APU-004",
          descripcion: "Hormigón simple",
          unidad: "m3",
          cantidad: "10.000000",
          precioUnitario: "1400.000000",
          precioTotal: "14000.000000",
          apuId: APU_4,
        },
      ],
    },
  ],
};
// Los avances son puntos de porcentaje escala 4 y las claves del mapa de
// actividad son 1-based; los arrays del cronograma son densos. Esta fixture
// tenía valores monetarios con claves 0-based, así que la captura enseñaba
// pesos de «7.567,57 %» (plan 055).
const cronograma = {
  id: CRONOGRAMA_ID,
  presupuestoId: PRESUPUESTO_V2,
  unidadTiempo: "MES",
  numeroPeriodos: 4,
  totalGeneral: "18500.000000",
  totalGeneralRevisado: "18500.000000",
  fechaRevision: "2026-07-15T00:00:00Z",
  estadoDistribucion: "COMPLETO",
  desactualizado: false,
  avanceFinal: "100.0000",
  actividades: [
    {
      id: ACTIVIDAD_1,
      rubroId: RUBRO_1_1_1,
      item: "1.1.1",
      codigo: "APU-001",
      descripcion: "Excavación a máquina",
      unidad: "m3",
      cantidad: "50.000000",
      precioUnitario: "40.000000",
      precioTotal: "2000.000000",
      pesoPonderado: "10.8108",
      avancePorPeriodo: { "1": "3.6036", "2": "3.6036", "3": "3.6036" },
      segmentos: [{ inicio: 1, fin: 3 }],
      desviacion: "0.0000",
    },
    {
      id: ACTIVIDAD_2,
      rubroId: RUBRO_1_1_2,
      item: "1.1.2",
      codigo: "APU-002",
      descripcion: "Relleno compactado",
      unidad: "m3",
      cantidad: "20.000000",
      precioUnitario: "25.000000",
      precioTotal: "500.000000",
      pesoPonderado: "2.7027",
      avancePorPeriodo: { "1": "1.3514", "2": "1.3513" },
      segmentos: [{ inicio: 1, fin: 2 }],
      desviacion: "0.0000",
    },
    {
      id: ACTIVIDAD_3,
      rubroId: RUBRO_1_2_1,
      item: "1.2.1",
      codigo: "APU-003",
      descripcion: "Transporte material",
      unidad: "m3-km",
      cantidad: "100.000000",
      precioUnitario: "20.000000",
      precioTotal: "2000.000000",
      pesoPonderado: "10.8108",
      avancePorPeriodo: { "2": "5.4054", "4": "5.4054" },
      segmentos: [
        { inicio: 2, fin: 2 },
        { inicio: 4, fin: 4 },
      ],
      desviacion: "0.0000",
    },
    {
      id: ACTIVIDAD_4,
      rubroId: RUBRO_2_1,
      item: "2.1",
      codigo: "APU-004",
      descripcion: "Hormigón simple",
      unidad: "m3",
      cantidad: "10.000000",
      precioUnitario: "1400.000000",
      precioTotal: "14000.000000",
      pesoPonderado: "75.6757",
      avancePorPeriodo: { "2": "25.2252", "3": "25.2252", "4": "25.2253" },
      segmentos: [{ inicio: 2, fin: 4 }],
      desviacion: "0.0000",
    },
  ],
  avancePorPeriodo: ["4.9550", "35.5855", "28.8288", "30.6307"],
  avanceAcumulado: ["4.9550", "40.5405", "69.3693", "100.0000"],
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
  // Una captura de una pantalla reventada es peor que ninguna: se commitea y el
  // gate la da por buena. 08-presupuesto lo estuvo desde 2026-09-05 (plan 064).
  // El texto está anclado por src/test/components/comunes/LimiteDeError.test.tsx.
  await expect(page.getByText("Algo salió mal en esta sección.")).toHaveCount(0);
  const buf = await page.screenshot({ fullPage: true });
  if (testInfo.project.name !== "chromium") return;
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, `${nombre}.png`), buf);
}

const proyectosResponse = { items: proyectos, page: 0, size: 25, total: 3, totalPaginas: 1 };

const plantillasSistema = [
  {
    id: "1",
    nombre: "Excavación típica",
    descripcionRubro: "Plantilla base para excavaciones",
    tipo: "SISTEMA",
    createdAt: "2026-01-01T00:00:00",
    updatedAt: "2026-01-01T00:00:00",
  },
];

const plantillasPersonales = [
  {
    id: "2",
    nombre: "Mi plantilla",
    descripcionRubro: "Plantilla personal",
    tipo: "PERSONAL",
    createdAt: "2026-07-20T00:00:00",
    updatedAt: "2026-07-20T00:00:00",
  },
];

async function baseAutenticado(page: import("@playwright/test").Page) {
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("PAGE ERROR:", msg.text());
  });
  await page.route(`${API}/**`, (route) => route.fulfill(json({})));
  await page.route(`${API}/auth/refresh`, (route) => route.fulfill(json(token)));
  await page.route(`${API}/proyectos*`, (route) => route.fulfill(json(proyectosResponse)));
  await page.route(`${API}/proyectos/${PROYECTO_1}/presupuestos*`, (route) =>
    route.fulfill(json(versiones)),
  );
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
  await page.route(`${API}/proyectos/${PROYECTO_1}`, (route) =>
    route.fulfill(json(proyectoDetalle)),
  );
  await page.route(`${API}/proyectos/${PROYECTO_1}/firmantes*`, (route) =>
    route.fulfill(json(firmantes)),
  );
  await page.goto(`/proyectos/${PROYECTO_1}`, { waitUntil: "networkidle", timeout: 30000 });
  await capturar(page, "03-proyecto-detalle", testInfo);
});

test("04-parametros", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.route(`${API}/proyectos/${PROYECTO_1}`, (route) =>
    route.fulfill(json(proyectoDetalle)),
  );
  await page.route(`${API}/proyectos/${PROYECTO_1}/parametros`, (route) =>
    route.fulfill(json(parametros)),
  );
  await page.goto(`/proyectos/${PROYECTO_1}/parametros`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await capturar(page, "04-parametros", testInfo);
});

test("05-insumos", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.route(`${API}/proyectos/${PROYECTO_1}`, (route) =>
    route.fulfill(json(proyectoDetalle)),
  );
  await page.route(`${API}/proyectos/${PROYECTO_1}/insumos*`, (route) =>
    route.fulfill(
      json({ contenido: insumos, page: 0, size: 25, totalElementos: 4, totalPaginas: 1 }),
    ),
  );
  await page.route(`${API}/bases-centrales*`, (route) =>
    route.fulfill(json(basesCentralesFixture.filter((b) => !b.archivada))),
  );
  await page.goto(`/proyectos/${PROYECTO_1}/insumos`, { waitUntil: "networkidle", timeout: 30000 });
  await capturar(page, "05-insumos", testInfo);
});

test("06-apus", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.route(`${API}/proyectos/${PROYECTO_1}`, (route) =>
    route.fulfill(json(proyectoDetalle)),
  );
  await page.route(`${API}/presupuestos/*/apus*`, (route) =>
    route.fulfill(json({ items: apusResumen, total: 3, page: 0, size: 25, totalPaginas: 1 })),
  );
  await page.goto(`/proyectos/${PROYECTO_1}/apus`, { waitUntil: "networkidle", timeout: 30000 });
  await capturar(page, "06-apus", testInfo);
});

test("07-apu-editor", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.route(`${API}/proyectos/${PROYECTO_1}`, (route) =>
    route.fulfill(json(proyectoDetalle)),
  );
  await page.route(`${API}/apus/${APU_1}`, (route) => route.fulfill(json(apuDetalle)));
  await page.goto(`/proyectos/${PROYECTO_1}/apus/${APU_1}`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await capturar(page, "07-apu-editor", testInfo);
});

test("08-presupuesto", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.route(`${API}/proyectos/${PROYECTO_1}`, (route) =>
    route.fulfill(json(proyectoDetalle)),
  );
  await page.route(`${API}/proyectos/${PROYECTO_1}/presupuestos*`, (route) =>
    route.fulfill(json(versiones)),
  );
  await page.route(`${API}/presupuestos/${PRESUPUESTO_V2}`, (route) =>
    route.fulfill(json(presupuesto)),
  );
  await page.route(`${API}/presupuestos/${PRESUPUESTO_V2}/resumen`, (route) =>
    // La forma plana de antes (equipo/manoObra/... sin `porComponente`) nunca
    // existió en el contrato y tumbaba la pantalla entera. Reusamos la fixture
    // tipada como `ResumenComponentesResponse` para que no pueda volver a
    // divergir sin que `typecheck` lo vea (plan 064).
    route.fulfill(json(resumenComponentesFixture)),
  );
  await page.route(`${API}/presupuestos/${PRESUPUESTO_V2}/validacion`, (route) =>
    route.fulfill(
      json({
        exportable: false,
        itemsPuCero: [
          {
            id: RUBRO_1_1_2,
            item: "1.1.2",
            codigo: "APU-002",
            descripcion: "Relleno compactado",
          },
        ],
        itemsCantidadCero: [
          {
            id: RUBRO_1_2_1,
            item: "1.2.1",
            codigo: "APU-003",
            descripcion: "Transporte material",
          },
        ],
        itemsSinActividad: [
          {
            id: RUBRO_1_1_1,
            item: "1.1.1",
            codigo: "APU-001",
            descripcion: "Excavación a máquina",
          },
        ],
      }),
    ),
  );
  await page.goto(`/proyectos/${PROYECTO_1}/presupuesto`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await capturar(page, "08-presupuesto", testInfo);
});

test("09-versiones", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.route(`${API}/proyectos/${PROYECTO_1}`, (route) =>
    route.fulfill(json(proyectoDetalle)),
  );
  await page.route(`${API}/proyectos/${PROYECTO_1}/presupuestos*`, (route) =>
    route.fulfill(json(versiones)),
  );
  await page.route(`${API}/presupuestos/${PRESUPUESTO_V2}`, (route) =>
    route.fulfill(json(presupuesto)),
  );
  await page.goto(`/proyectos/${PROYECTO_1}/versiones`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await capturar(page, "09-versiones", testInfo);
});

test("10-cronograma", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.route(`${API}/proyectos/${PROYECTO_1}`, (route) =>
    route.fulfill(json(proyectoDetalle)),
  );
  await page.route(`${API}/proyectos/${PROYECTO_1}/presupuestos*`, (route) =>
    route.fulfill(json(versiones)),
  );
  await page.route(`${API}/presupuestos/${PRESUPUESTO_V2}/cronograma`, (route) =>
    route.fulfill(json(cronograma)),
  );
  await page.goto(`/proyectos/${PROYECTO_1}/cronograma`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await capturar(page, "10-cronograma", testInfo);
});

test("11-documentos", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.route(`${API}/proyectos/${PROYECTO_1}`, (route) =>
    route.fulfill(json(proyectoDetalle)),
  );
  await page.route(`${API}/proyectos/${PROYECTO_1}/presupuestos*`, (route) =>
    route.fulfill(json(versiones)),
  );
  // La página saca el presupuesto de `?v=`; sin él las dos queries quedan
  // desactivadas por su guarda y la tarjeta del cronograma sale vacía.
  await page.route(`${API}/presupuestos/${PRESUPUESTO_V2}/validacion`, (route) =>
    route.fulfill(
      json({
        exportable: true,
        itemsPuCero: [],
        itemsCantidadCero: [],
        itemsSinActividad: [],
      }),
    ),
  );
  // `*` al final: la ruta lleva `?formato=xlsx`. Sin este mock la tarjeta sale
  // en la captura en estado de carga y `capturar()` no lo detecta.
  await page.route(`${API}/documentos/cronograma/${PRESUPUESTO_V2}/preflight*`, (route) =>
    route.fulfill(json({ exportable: true, formato: "xlsx", bloqueos: [], warnings: [] })),
  );
  await page.goto(`/proyectos/${PROYECTO_1}/documentos?v=${PRESUPUESTO_V2}`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  // Patrón D de docs/bugs.md: una captura sin aserción fotografía una pantalla
  // caída sin quejarse.
  await expect(page.getByText("Cronograma valorizado")).toBeVisible();
  await expect(page.getByRole("button", { name: "Descargar cronograma" })).toBeEnabled();
  await capturar(page, "11-documentos", testInfo);
});
