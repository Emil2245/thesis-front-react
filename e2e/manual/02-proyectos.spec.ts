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

/**
 * Capturas del capítulo 02 del manual de usuario — Proyectos (P-05, P-06,
 * P-08, P-10, P-11). Mismo patrón que `e2e/screenshots.spec.ts`: `page.route()`
 * sobre la API y los fixtures compartidos de `src/test/fixtures/`, para que el
 * mundo del manual sea el mismo en todos los capítulos (Puente Ambato /
 * Ana Torres).
 *
 * Lección del plan 064: una captura puede estar en verde y estar fotografiando
 * la pantalla equivocada, o una vacía. Cada test **afirma antes de disparar**.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "**/api/v1";
const OUT = join(__dirname, "..", "..", "docs", "manual", "img", "02-proyectos");

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

/** Rellena el paso 1 del asistente con los cinco campos obligatorios. */
async function llenarDatosGenerales(page: import("@playwright/test").Page) {
  await page.getByLabel("Nombre", { exact: true }).fill("Puente Ambato");
  await page.getByLabel("Código").fill("AMB-001");
  await page.getByLabel("Año").fill("2026");
  await page.getByLabel("Plazo de ejecución").fill("8");
  await page.getByLabel("Dirección institucional", { exact: true }).fill("MTOP");
}

test("01-lista", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.goto("/proyectos", { waitUntil: "networkidle", timeout: 30000 });
  await expect(page.getByRole("heading", { name: "Proyectos" })).toBeVisible();
  await expect(page.getByText("Puente Ambato")).toBeVisible();
  await capturar(page, "01-lista", testInfo, true);
});

test("02-boton-nuevo", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.goto("/proyectos", { waitUntil: "networkidle", timeout: 30000 });
  const boton = page.getByRole("button", { name: "Nuevo proyecto" });
  await expect(boton).toBeVisible();
  await capturar(boton, "02-boton-nuevo", testInfo);
});

test("03-asistente-datos", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.goto("/proyectos", { waitUntil: "networkidle", timeout: 30000 });
  await page.getByRole("button", { name: "Nuevo proyecto" }).click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo.getByText("Paso 1 de 2 — Datos generales")).toBeVisible();
  await llenarDatosGenerales(page);
  await capturar(dialogo, "03-asistente-datos", testInfo);
});

test("04-asistente-confirmar", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.goto("/proyectos", { waitUntil: "networkidle", timeout: 30000 });
  await page.getByRole("button", { name: "Nuevo proyecto" }).click();
  await llenarDatosGenerales(page);
  await page.getByRole("button", { name: "Siguiente" }).click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo.getByText("Paso 2 de 2 — Confirmar")).toBeVisible();
  await capturar(dialogo, "04-asistente-confirmar", testInfo);
});

test("05-resumen", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.goto(`/proyectos/${PROYECTO_1}`, { waitUntil: "networkidle", timeout: 30000 });
  await expect(page.getByRole("heading", { name: "Puente Ambato" })).toBeVisible();
  await expect(page.getByText("Datos del proyecto")).toBeVisible();
  await capturar(page, "05-resumen", testInfo, true);
});

test("06-firmantes", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.goto(`/proyectos/${PROYECTO_1}`, { waitUntil: "networkidle", timeout: 30000 });
  const tarjeta = page.locator('[data-slot="card"]').filter({ hasText: "Firmantes" });
  await expect(page.getByText("Ing. Juan Pérez")).toBeVisible();
  await capturar(tarjeta, "06-firmantes", testInfo);
});

test("07-firmante-nuevo", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.goto(`/proyectos/${PROYECTO_1}`, { waitUntil: "networkidle", timeout: 30000 });
  await expect(page.getByText("Ing. Juan Pérez")).toBeVisible();
  await page.getByRole("button", { name: "Agregar" }).click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo.getByRole("heading", { name: "Firmante" })).toBeVisible();
  await capturar(dialogo, "07-firmante-nuevo", testInfo);
});

test("08-parametros", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.goto(`/proyectos/${PROYECTO_1}/parametros`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await expect(page.getByRole("heading", { name: "Parámetros del proyecto" })).toBeVisible();
  await expect(page.getByText("Cálculo")).toBeVisible();
  await capturar(page, "08-parametros", testInfo, true);
});

test("09-eliminar", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.goto(`/proyectos/${PROYECTO_1}`, { waitUntil: "networkidle", timeout: 30000 });
  await expect(page.getByRole("heading", { name: "Puente Ambato" })).toBeVisible();
  await page.getByRole("button", { name: "Más acciones" }).click();
  await page.getByRole("menuitem", { name: "Eliminar" }).click();
  const dialogo = page.getByRole("alertdialog");
  await expect(dialogo.getByRole("heading", { name: "Eliminar proyecto" })).toBeVisible();
  await capturar(dialogo, "09-eliminar", testInfo);
});
