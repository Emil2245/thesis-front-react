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
  comparacionFixture,
  presupuestoFixture,
  resumenComponentesFixture,
  validacionFixture,
  versionesFixture,
} from "../../src/test/fixtures/presupuesto";
import { apuResumenFixture } from "../../src/test/fixtures/apu";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

/**
 * Capturas del capítulo 05 del manual de usuario — Presupuesto y versiones
 * (P-28, P-29, P-30, P-31, P-32). Mismo patrón que
 * `e2e/manual/02-proyectos.spec.ts`: `page.route()` sobre la API y los
 * fixtures compartidos de `src/test/fixtures/`, mundo Puente Ambato / Ana
 * Torres.
 *
 * Lección del plan 064: una captura puede estar en verde y estar fotografiando
 * la pantalla equivocada, o una vacía. Cada test **afirma antes de disparar**.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "**/api/v1";
const OUT = join(__dirname, "..", "..", "docs", "manual", "img", "05-presupuesto");

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

// Solo los APU sin vincular aparecen en el selector de "agregar rubro": el
// backend excluye los ya vinculados 1:1 por versión (D-09). APU-002 ya está
// vinculado en `presupuestoFixture` (rubro 1.1.2), así que no debe salir.
const apusDisponibles = {
  contenido: apuResumenFixture.filter((a) => !a.vinculado),
  page: 0,
  size: 25,
  totalElementos: apuResumenFixture.filter((a) => !a.vinculado).length,
  totalPaginas: 1,
};

const validacionLimpia = {
  ...validacionFixture,
  exportable: true,
  itemsPuCero: [],
  itemsCantidadCero: [],
  itemsSinActividad: [],
};

/** Mundo compartido del manual, más las rutas del presupuesto y sus versiones. */
async function baseAutenticado(
  page: import("@playwright/test").Page,
  { validacionExportable = true }: { validacionExportable?: boolean } = {},
) {
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
    route.fulfill(json(validacionExportable ? validacionLimpia : validacionFixture)),
  );
  await page.route(`${API}/presupuestos/${PRESUPUESTO_V2}/apus*`, (route) =>
    route.fulfill(json(apusDisponibles)),
  );
  await page.route(`${API}/presupuestos/*/comparar*`, (route) =>
    route.fulfill(json(comparacionFixture)),
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

test("01-presupuesto", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.goto(`/proyectos/${PROYECTO_1}/presupuesto`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await expect(page.getByRole("heading", { name: "Presupuesto" })).toBeVisible();
  await expect(page.getByText("Preliminares")).toBeVisible();
  await expect(page.getByText("Obra civil")).toBeVisible();
  await capturar(page, "01-presupuesto", testInfo, true);
});

test("02-nuevo-capitulo", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.goto(`/proyectos/${PROYECTO_1}/presupuesto`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await page.getByRole("button", { name: "Nuevo capítulo" }).click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo.getByRole("heading", { name: "Nuevo capítulo" })).toBeVisible();
  await dialogo.getByLabel("Descripción").fill("Cerramiento perimetral");
  await capturar(dialogo, "02-nuevo-capitulo", testInfo);
});

test("03-mover-capitulo", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.goto(`/proyectos/${PROYECTO_1}/presupuesto`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await page.getByTitle("Mover capítulo").first().click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo.getByRole("heading", { name: /Mover/ })).toBeVisible();
  await capturar(dialogo, "03-mover-capitulo", testInfo);
});

test("04-agregar-item", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.goto(`/proyectos/${PROYECTO_1}/presupuesto`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await page.getByTitle("Agregar rubro").first().click();
  const dialogo = page.getByRole("dialog");
  await expect(
    dialogo.getByRole("heading", { name: "Agregar rubro al presupuesto" }),
  ).toBeVisible();
  await dialogo.getByRole("button", { name: /APU-001/ }).click();
  await expect(dialogo.getByText("Cantidad (m3)")).toBeVisible();
  await capturar(dialogo, "04-agregar-item", testInfo);
});

test("05-alertas", async ({ page }, testInfo) => {
  await baseAutenticado(page, { validacionExportable: false });
  await page.goto(`/proyectos/${PROYECTO_1}/presupuesto`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByText(/no es exportable/)).toBeVisible();
  await expect(page.getByText("Preliminares")).toBeVisible();
  await capturar(page, "05-alertas", testInfo, true);
});

test("06-banner-integridad", async ({ page }, testInfo) => {
  await baseAutenticado(page, { validacionExportable: false });
  await page.goto(`/proyectos/${PROYECTO_1}/presupuesto`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  const banner = page.getByRole("alert");
  await expect(banner).toBeVisible();
  await expect(banner.getByText(/no es exportable \(3 incidencias\)/)).toBeVisible();
  await capturar(banner, "06-banner-integridad", testInfo);
});

test("07-resumen-componentes", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.goto(`/proyectos/${PROYECTO_1}/presupuesto`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await expect(page.getByText("Desglose por componente")).toBeVisible();
  const tarjeta = page.locator(".rounded-xl").filter({ hasText: "Desglose por componente" });
  await capturar(tarjeta, "07-resumen-componentes", testInfo);
});

test("08-versiones", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.goto(`/proyectos/${PROYECTO_1}/versiones`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await expect(page.getByRole("heading", { name: "Versiones del presupuesto" })).toBeVisible();
  await expect(page.getByText("Vigente", { exact: true })).toBeVisible();
  await capturar(page, "08-versiones", testInfo, true);
});

test("09-nueva-version", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.goto(`/proyectos/${PROYECTO_1}/versiones`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await page.getByRole("button", { name: "Nueva versión" }).click();
  const dialogo = page.getByRole("dialog");
  await expect(
    dialogo.getByRole("heading", { name: "Nueva versión del presupuesto" }),
  ).toBeVisible();
  await capturar(dialogo, "09-nueva-version", testInfo);
});

test("10-comparar", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.goto(`/proyectos/${PROYECTO_1}/versiones`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await page.getByRole("button", { name: "Comparar" }).first().click();
  await expect(page.getByText("Preliminares")).toBeVisible();
  await capturar(page, "10-comparar", testInfo, true);
});
