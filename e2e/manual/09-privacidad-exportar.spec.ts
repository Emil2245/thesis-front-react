import { expect, test } from "@playwright/test";
import { tokenFixture } from "../../src/test/fixtures/auth";
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
  validacionFixture,
  versionesFixture,
} from "../../src/test/fixtures/presupuesto";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

/**
 * Capturas del manual de usuario para el plan 038: registro con el
 * consentimiento de privacidad, la página `/privacidad` y la pantalla
 * Documentos con las tarjetas de APU, presupuesto y cronograma. Mismo patrón
 * que `e2e/manual/01-cuenta.spec.ts`: `page.route()` y fixtures compartidos.
 * Cada test afirma antes de capturar.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "**/api/v1";
const OUT = join(__dirname, "..", "..", "docs", "manual", "img", "09-privacidad-exportar");

test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

const json = (body: unknown) => ({
  status: 200,
  contentType: "application/json",
  body: JSON.stringify(body),
});

async function capturar(
  page: import("@playwright/test").Page,
  nombre: string,
  testInfo: import("@playwright/test").TestInfo,
) {
  const buf = await page.screenshot();
  if (testInfo.project.name !== "chromium") return;
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, `${nombre}.png`), buf);
}

async function sinSesion(page: import("@playwright/test").Page) {
  await page.route(`${API}/auth/refresh`, (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: "{}" }),
  );
  await page.addInitScript(() => localStorage.clear());
}

test("02-registro", async ({ page }, testInfo) => {
  await sinSesion(page);
  await page.goto("/registro", { waitUntil: "networkidle", timeout: 30000 });
  await expect(page.locator('[data-slot="card-title"]', { hasText: "Crear cuenta" })).toBeVisible();
  await page.getByLabel("Nombre").fill("Ana Torres");
  await page.getByLabel("Correo electrónico").fill("ana@ejemplo.ec");
  await page.getByLabel("Contraseña", { exact: true }).fill("Clave1234");
  await page.getByLabel("Confirmar contraseña").fill("Clave1234");
  await page.getByLabel(/acepto la/i).click();
  await expect(page.getByLabel(/acepto la/i)).toBeChecked();
  await expect(page.getByRole("button", { name: "Crear cuenta" })).toBeEnabled();
  await capturar(page, "02-registro", testInfo);
});

test("39-privacidad", async ({ page }, testInfo) => {
  await sinSesion(page);
  await page.goto("/privacidad", { waitUntil: "networkidle", timeout: 30000 });
  await expect(page.getByRole("heading", { name: "Tus derechos" })).toBeVisible();
  await expect(page.getByText("LOPDP, arts. 12 a 24")).toBeVisible();
  await capturar(page, "39-privacidad", testInfo);
});

test("35-documentos", async ({ page }, testInfo) => {
  const validacionLimpia = {
    ...validacionFixture,
    exportable: true,
    itemsPuCero: [],
    itemsCantidadCero: [],
    itemsSinActividad: [],
  };
  await page.route(`${API}/**`, (route) => route.fulfill(json({})));
  await page.route(`${API}/auth/refresh`, (route) => route.fulfill(json(tokenFixture)));
  await page.route(`${API}/proyectos*`, (route) =>
    route.fulfill(
      json({
        items: proyectosFixture,
        page: 0,
        size: 25,
        total: proyectosFixture.length,
        totalPaginas: 1,
      }),
    ),
  );
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
    route.fulfill(json(validacionLimpia)),
  );
  // Preflight de presupuesto y APU: el cuerpo repite documento y opciones de la consulta.
  await page.route(`${API}/documentos/presupuesto/${PRESUPUESTO_V2}/preflight*`, (route) =>
    route.fulfill(
      json({
        presupuestoId: PRESUPUESTO_V2,
        version: 2,
        documento: "presupuesto",
        formato: "xlsx",
        opciones: {},
        exportable: true,
        bloqueos: [],
        warnings: [],
      }),
    ),
  );
  await page.route(`${API}/documentos/apus/${PRESUPUESTO_V2}/preflight*`, (route) =>
    route.fulfill(
      json({
        presupuestoId: PRESUPUESTO_V2,
        version: 2,
        documento: "apus",
        formato: "xlsx",
        opciones: { layout: "pestanas" },
        exportable: true,
        bloqueos: [],
        warnings: [],
      }),
    ),
  );
  await page.route(`${API}/documentos/cronograma/${PRESUPUESTO_V2}/preflight*`, (route) =>
    route.fulfill(json({ exportable: true, formato: "xlsx", bloqueos: [], warnings: [] })),
  );
  await page.addInitScript(() => localStorage.setItem("apu.refresh", "rt-test"));
  await page.goto(`/proyectos/${PROYECTO_1}/documentos?v=${PRESUPUESTO_V2}`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await expect(page.getByText("APUs referenciados")).toBeVisible();
  await expect(page.getByText("Cronograma valorizado")).toBeVisible();
  await expect(page.getByRole("button", { name: "Descargar presupuesto" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Descargar APUs" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Descargar cronograma" })).toBeEnabled();
  // Tres tarjetas de exportación: se agranda el viewport para que entren juntas.
  await page.setViewportSize({ width: 1440, height: 1500 });
  await expect(page.getByRole("button", { name: "Descargar cronograma" })).toBeInViewport();
  await capturar(page, "35-documentos", testInfo);
});
