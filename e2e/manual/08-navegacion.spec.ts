import { expect, test } from "@playwright/test";
import {
  PROYECTO_1,
  firmantesFixture,
  parametrosFixture,
  proyectoDetalleFixture,
  proyectosFixture,
} from "../../src/test/fixtures/proyectos";
import {
  PRESUPUESTO_V2,
  presupuestoFixture,
  resumenComponentesFixture,
  versionesFixture,
} from "../../src/test/fixtures/presupuesto";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import type {
  PlantillaProyectoResponse,
  ValidacionPresupuestoResponse,
} from "../../src/api/contract";

/**
 * Capturas del capítulo 08 del manual de usuario — Moverse por la aplicación
 * (P-43, P-44, P-46). Mismo patrón que `e2e/manual/02-proyectos.spec.ts`:
 * `page.route()` sobre la API y los fixtures compartidos de `src/test/fixtures/`,
 * para que el mundo del manual sea el mismo en todos los capítulos (Puente
 * Ambato / Ana Torres).
 *
 * Lección del plan 064: una captura puede estar en verde y estar fotografiando
 * la pantalla equivocada, o una vacía. Cada test **afirma antes de disparar**.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "**/api/v1";
const OUT = join(__dirname, "..", "..", "docs", "manual", "img", "08-navegacion");

const json = (body: unknown) => ({
  status: 200,
  contentType: "application/json",
  body: JSON.stringify(body),
});

const usuario = {
  id: 1,
  nombre: "Ana Torres",
  email: "ana@ejemplo.ec",
  rol: "USUARIO",
  emailVerificado: true,
};
const token = { accessToken: "tok", expiraEnSegundos: 3600, refreshToken: "rt-test", usuario };

const listado = {
  items: proyectosFixture,
  page: 0,
  size: 25,
  total: proyectosFixture.length,
  totalPaginas: 1,
};

const validacionExportable: ValidacionPresupuestoResponse = {
  exportable: true,
  itemsPuCero: [],
  itemsCantidadCero: [],
  itemsSinActividad: [],
};

const PLANTILLA_1 = "01927f60-1a2b-7c3d-8e4f-000000000001";
const plantillasFixture: PlantillaProyectoResponse[] = [
  {
    id: PLANTILLA_1,
    nombre: "Puente tipo — vigas prefabricadas",
    descripcion: "Estructura de capítulos y APUs de un puente estándar",
    snapshotEstructura: {},
    fechaCreacion: "2026-07-01T00:00:00Z",
  },
];

async function baseAutenticado(page: import("@playwright/test").Page) {
  await page.route(`${API}/**`, (route) => route.fulfill(json({})));
  await page.route(`${API}/auth/refresh`, (route) => route.fulfill(json(token)));
  await page.route(`${API}/proyectos*`, (route) => route.fulfill(json(listado)));
  await page.route(`${API}/proyectos/${PROYECTO_1}`, (route) =>
    route.fulfill(json(proyectoDetalleFixture)),
  );
  await page.route(`${API}/proyectos/${PROYECTO_1}/parametros`, (route) =>
    route.fulfill(json(parametrosFixture)),
  );
  await page.route(`${API}/proyectos/${PROYECTO_1}/firmantes*`, (route) =>
    route.fulfill(json(firmantesFixture)),
  );
  await page.route(`${API}/proyectos/${PROYECTO_1}/presupuestos*`, (route) =>
    route.fulfill(json(versionesFixture)),
  );
  await page.route(`${API}/presupuestos/${PRESUPUESTO_V2}`, (route) =>
    route.fulfill(json(presupuestoFixture)),
  );
  await page.route(`${API}/presupuestos/${PRESUPUESTO_V2}/resumen`, (route) =>
    route.fulfill(json(resumenComponentesFixture)),
  );
  await page.route(`${API}/presupuestos/${PRESUPUESTO_V2}/validacion`, (route) =>
    route.fulfill(json(validacionExportable)),
  );
  await page.route(`${API}/plantillas-proyecto*`, (route) =>
    route.fulfill(json(plantillasFixture)),
  );
  await page.addInitScript(() => localStorage.setItem("apu.refresh", "rt-test"));
}

/** Guarda la captura. `objetivo` puede ser la página entera o un elemento. */
async function capturar(
  objetivo: { screenshot: (o?: object) => Promise<Buffer> },
  nombre: string,
  testInfo: import("@playwright/test").TestInfo,
  pagina = false,
) {
  const buf = await objetivo.screenshot(pagina ? { fullPage: true } : {});
  if (testInfo.project.name !== "chromium") return;
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, `${nombre}.png`), buf);
}

test("01-shell", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.goto(`/proyectos/${PROYECTO_1}`, { waitUntil: "networkidle", timeout: 30000 });
  await expect(page.getByRole("heading", { name: "Puente Ambato" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Insumos" })).toBeVisible();
  await capturar(page, "01-shell", testInfo, true);
});

test("02-menu-lateral", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.goto(`/proyectos/${PROYECTO_1}`, { waitUntil: "networkidle", timeout: 30000 });
  const sidebar = page.locator('[data-slot="sidebar"]');
  await expect(sidebar.getByRole("link", { name: "Proyectos" })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Cronograma" })).toBeVisible();
  await capturar(sidebar, "02-menu-lateral", testInfo);
});

test("03-selector-proyecto", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.goto(`/proyectos/${PROYECTO_1}`, { waitUntil: "networkidle", timeout: 30000 });
  await page.getByRole("button", { name: "Seleccionar proyecto" }).click();
  const menu = page.getByRole("menu");
  await expect(menu.getByText("Vía Quito Sur")).toBeVisible();
  await capturar(menu, "03-selector-proyecto", testInfo);
});

test("04-selector-version", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.goto(`/proyectos/${PROYECTO_1}/presupuesto`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await expect(page.getByRole("heading", { name: "Presupuesto" })).toBeVisible();
  await page.getByRole("combobox", { name: "Seleccionar versión" }).click();
  const listbox = page.getByRole("listbox");
  await expect(listbox.getByText("Versión 2 (vigente)")).toBeVisible();
  await expect(listbox.getByText("Versión 1", { exact: true })).toBeVisible();
  await capturar(listbox, "04-selector-version", testInfo);
});

test("05-breadcrumb", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.goto(`/proyectos/${PROYECTO_1}/parametros`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await expect(page.getByRole("heading", { name: "Parámetros del proyecto" })).toBeVisible();
  const breadcrumb = page.locator('nav[aria-label="breadcrumb"]');
  await expect(breadcrumb.getByText("Puente Ambato")).toBeVisible();
  await expect(breadcrumb.getByText("Parámetros")).toBeVisible();
  await capturar(breadcrumb, "05-breadcrumb", testInfo);
});

test("06-no-encontrada", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.goto("/esta-ruta-no-existe", { waitUntil: "networkidle", timeout: 30000 });
  await expect(page.getByText("404")).toBeVisible();
  await expect(page.getByText("No encontramos esta página.")).toBeVisible();
  await capturar(page, "06-no-encontrada", testInfo, true);
});

test("07-sin-permiso", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.goto("/403", { waitUntil: "networkidle", timeout: 30000 });
  await expect(page.getByText("403")).toBeVisible();
  await expect(page.getByText("No tienes permiso para acceder a esta página.")).toBeVisible();
  await capturar(page, "07-sin-permiso", testInfo, true);
});

test("08-plantillas-proyecto", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.goto("/plantillas-proyecto", { waitUntil: "networkidle", timeout: 30000 });
  await expect(page.getByRole("heading", { name: "Plantillas de proyecto" })).toBeVisible();
  await expect(page.getByText("Puente tipo — vigas prefabricadas")).toBeVisible();
  await capturar(page, "08-plantillas-proyecto", testInfo, true);
});

test("09-guardar-plantilla", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.goto(`/proyectos/${PROYECTO_1}`, { waitUntil: "networkidle", timeout: 30000 });
  await expect(page.getByRole("heading", { name: "Puente Ambato" })).toBeVisible();
  await page.getByRole("button", { name: "Más acciones" }).click();
  await page.getByRole("menuitem", { name: "Guardar como plantilla" }).click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo.getByRole("heading", { name: "Guardar como plantilla" })).toBeVisible();
  await capturar(dialogo, "09-guardar-plantilla", testInfo);
});
