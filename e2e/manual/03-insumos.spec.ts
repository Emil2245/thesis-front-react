import { expect, test } from "@playwright/test";
import {
  PROYECTO_1,
  firmantesFixture,
  parametrosFixture,
  proyectoDetalleFixture,
} from "../../src/test/fixtures/proyectos";
import {
  PRESUPUESTO_V2,
  presupuestoFixture,
  resumenComponentesFixture,
  versionesFixture,
} from "../../src/test/fixtures/presupuesto";
import {
  insumosFixture,
  basesCentralesFixture,
  importResultadoFixture,
  importResultadoConErroresFixture,
  copiaBaseResultadoFixture,
} from "../../src/test/fixtures/insumos";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

/**
 * Capturas del capítulo 03 del manual de usuario — Insumos (P-13 a P-18).
 * Mismo patrón que `e2e/manual/02-proyectos.spec.ts`: `page.route()` sobre la
 * API y los fixtures compartidos de `src/test/fixtures/`, con el mismo mundo
 * (Puente Ambato / Ana Torres) que el resto del manual.
 *
 * P-18 (ver uso de un insumo) no tiene captura: el ítem "Ver uso" del menú de
 * la fila está deshabilitado en `TablaInsumos.tsx` (`disabled` fijo, no
 * condicionado por `MODULOS_SIN_BACKEND`), así que no hay manera de llegar al
 * diálogo desde la interfaz. Ver el informe del ejecutor.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "**/api/v1";
const OUT = join(__dirname, "..", "..", "docs", "manual", "img", "03-insumos");

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

// El backend pagina con `{items,total}`; el interceptor de `client.ts` lo
// normaliza a `{contenido,totalElementos}` antes de que la UI lo lea, así que
// el mock manda la forma cruda, igual que hace `02-proyectos.spec.ts`.
const listadoInsumos = {
  items: insumosFixture,
  page: 0,
  size: 25,
  total: insumosFixture.length,
  totalPaginas: 1,
};

async function baseAutenticado(page: import("@playwright/test").Page) {
  await page.route(`${API}/**`, (route) => route.fulfill(json({})));
  await page.route(`${API}/auth/refresh`, (route) => route.fulfill(json(token)));
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

  // ———— Insumos ————
  // `insumos*` casa `/insumos` (POST) y `/insumos?filtros...` (GET); no casa
  // `/insumos/importar` ni `/insumos/copiar` porque `*` no cruza `/`.
  await page.route(`${API}/proyectos/${PROYECTO_1}/insumos*`, (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill(json(insumosFixture[0]));
    }
    return route.fulfill(json(listadoInsumos));
  });
  await page.route(`${API}/proyectos/${PROYECTO_1}/insumos/importar`, (route) =>
    route.fulfill(json(importResultadoFixture)),
  );
  await page.route(`${API}/proyectos/${PROYECTO_1}/insumos/copiar`, (route) =>
    route.fulfill(json(copiaBaseResultadoFixture)),
  );
  await page.route(`${API}/bases-centrales`, (route) => route.fulfill(json(basesCentralesFixture)));
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

test("01-lista", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.goto(`/proyectos/${PROYECTO_1}/insumos`, { waitUntil: "networkidle", timeout: 30000 });
  await expect(page.getByRole("heading", { name: "Insumos" })).toBeVisible();
  await expect(page.getByText("Cemento Portland Tipo I")).toBeVisible();
  await capturar(page, "01-lista", testInfo, true);
});

test("02-nuevo-insumo", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.goto(`/proyectos/${PROYECTO_1}/insumos`, { waitUntil: "networkidle", timeout: 30000 });
  await page.getByRole("button", { name: "Nuevo" }).click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo.getByRole("heading", { name: "Nuevo insumo" })).toBeVisible();
  await capturar(dialogo, "02-nuevo-insumo", testInfo);
});

test("03-insumo-material", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.goto(`/proyectos/${PROYECTO_1}/insumos`, { waitUntil: "networkidle", timeout: 30000 });
  await page.getByRole("button", { name: "Nuevo" }).click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo.getByRole("heading", { name: "Nuevo insumo" })).toBeVisible();

  await dialogo.getByLabel("Código").fill("M-010");
  await dialogo.getByLabel("Descripción").fill("Cemento Portland Tipo II");
  // La unidad de un material se elige entre los botones rápidos del
  // combobox: su input de texto libre no tiene `id`, así que la etiqueta
  // "Unidad" no está conectada a ningún control (ver informe del ejecutor).
  await dialogo.getByRole("button", { name: "kg", exact: true }).click();
  await dialogo.getByLabel("Precio unitario").fill("15.75");

  await expect(dialogo.getByLabel("Código")).toHaveValue("M-010");
  await capturar(dialogo, "03-insumo-material", testInfo);
});

test("04-desactualizado", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.goto(`/proyectos/${PROYECTO_1}/insumos`, { waitUntil: "networkidle", timeout: 30000 });
  const fila = page.getByRole("row", { name: /Arena fina/ });
  await expect(fila.getByText("Desactualizado")).toBeVisible();
  await capturar(fila, "04-desactualizado", testInfo);
});

test("05-import-paso1", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.goto(`/proyectos/${PROYECTO_1}/insumos`, { waitUntil: "networkidle", timeout: 30000 });
  await page.getByRole("button", { name: "Importar CSV" }).click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo.getByRole("heading", { name: "Importar insumos desde CSV" })).toBeVisible();
  await expect(dialogo.getByText("Paso 1 de 2 — Seleccionar archivo")).toBeVisible();
  await capturar(dialogo, "05-import-paso1", testInfo);
});

test("06-import-errores", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  // Sobrescribe la respuesta de importación con errores fila por fila: la
  // última ruta registrada que casa es la que gana.
  await page.route(`${API}/proyectos/${PROYECTO_1}/insumos/importar`, (route) =>
    route.fulfill(json(importResultadoConErroresFixture)),
  );
  await page.goto(`/proyectos/${PROYECTO_1}/insumos`, { waitUntil: "networkidle", timeout: 30000 });
  await page.getByRole("button", { name: "Importar CSV" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByLabel("Archivo CSV").setInputFiles({
    name: "insumos.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("codigo,descripcion,unidad,precio\nM-010,Cemento,kg,10\n"),
  });
  await dialogo.getByRole("button", { name: "Importar" }).click();
  await expect(dialogo.getByText("Paso 2 de 2 — Importar")).toBeVisible();
  await expect(dialogo.getByText("Fila 3: El precio debe ser mayor que 0")).toBeVisible();
  await expect(dialogo.getByText("Fila 7: Código duplicado: M-001")).toBeVisible();
  await capturar(dialogo, "06-import-errores", testInfo);
});

test("07-bases-centrales", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.goto(`/proyectos/${PROYECTO_1}/insumos`, { waitUntil: "networkidle", timeout: 30000 });
  await page.getByRole("tab", { name: "Bases centrales" }).click();
  await expect(page.getByText("Base IESS 2026")).toBeVisible();
  await expect(page.getByText("Base MTOP 2025")).toBeVisible();
  await capturar(page, "07-bases-centrales", testInfo, true);
});

test("08-copiar-base", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.goto(`/proyectos/${PROYECTO_1}/insumos`, { waitUntil: "networkidle", timeout: 30000 });
  await page.getByRole("button", { name: "Copiar base" }).click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo.getByRole("heading", { name: "Copiar base de insumos" })).toBeVisible();
  // El selector de base no tiene nombre accesible: el `Label` de
  // "Base central" declara `htmlFor="cb-base"` pero el `SelectTrigger` no
  // recibe ese `id` (ver informe del ejecutor), así que se abre por rol.
  await dialogo.getByRole("combobox").click();
  await page.getByRole("option", { name: /Base IESS 2026/ }).click();
  await expect(dialogo.getByRole("button", { name: "Copiar" })).toBeEnabled();
  await capturar(dialogo, "08-copiar-base", testInfo);
});
