import { expect, test } from "@playwright/test";
import { tokenFixture, usuarioFixture } from "../../src/test/fixtures/auth";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

/**
 * Capturas del capítulo 01 del manual de usuario — Cuenta y acceso (P-01,
 * P-02, P-03, P-04). Mismo patrón que `e2e/manual/02-proyectos.spec.ts`:
 * `page.route()` sobre la API y los fixtures compartidos de
 * `src/test/fixtures/`, para que el mundo del manual sea el mismo en todos
 * los capítulos (Ana Torres).
 *
 * Login, registro, recuperar, restablecer y verificar-email son pantallas
 * públicas: basta con vaciar el storage y devolver 401 en `auth/refresh`. Solo
 * `/perfil` necesita sesión iniciada.
 *
 * Lección del plan 064: una captura puede estar en verde y estar fotografiando
 * la pantalla equivocada, o una vacía. Cada test **afirma antes de disparar**.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "**/api/v1";
const OUT = join(__dirname, "..", "..", "docs", "manual", "img", "01-cuenta");

const json = (body: unknown) => ({
  status: 200,
  contentType: "application/json",
  body: JSON.stringify(body),
});

async function sinSesion(page: import("@playwright/test").Page) {
  await page.route(`${API}/auth/refresh`, (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: "{}" }),
  );
  await page.addInitScript(() => localStorage.clear());
}

async function baseAutenticado(page: import("@playwright/test").Page) {
  await page.route(`${API}/**`, (route) => route.fulfill(json({})));
  await page.route(`${API}/auth/refresh`, (route) => route.fulfill(json(tokenFixture)));
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

test("01-login", async ({ page }, testInfo) => {
  await sinSesion(page);
  await page.goto("/login", { waitUntil: "networkidle", timeout: 30000 });
  await expect(page.getByText("Sistema APU")).toBeVisible();
  await expect(page.getByLabel("Correo electrónico")).toBeVisible();
  await capturar(page, "01-login", testInfo, true);
});

test("02-registro", async ({ page }, testInfo) => {
  await sinSesion(page);
  await page.goto("/registro", { waitUntil: "networkidle", timeout: 30000 });
  await expect(page.locator('[data-slot="card-title"]', { hasText: "Crear cuenta" })).toBeVisible();
  await page.getByLabel("Nombre").fill("Ana Torres");
  await page.getByLabel("Correo electrónico").fill("ana@ejemplo.ec");
  await page.getByLabel("Contraseña", { exact: true }).fill("Clave1234");
  await page.getByLabel("Confirmar contraseña").fill("Clave1234");
  await capturar(page, "02-registro", testInfo, true);
});

test("03-registro-password-invalida", async ({ page }, testInfo) => {
  await sinSesion(page);
  await page.goto("/registro", { waitUntil: "networkidle", timeout: 30000 });
  await page.getByLabel("Nombre").fill("Ana Torres");
  await page.getByLabel("Correo electrónico").fill("ana@ejemplo.ec");
  const password = page.getByLabel("Contraseña", { exact: true });
  await password.fill("abcdefgh");
  await page.getByLabel("Confirmar contraseña").fill("abcdefgh");
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  const campo = page.locator("form > div").filter({ has: password });
  await expect(page.getByText("La contraseña debe incluir al menos un número")).toBeVisible();
  await capturar(campo, "03-registro-password-invalida", testInfo);
});

test("04-verificar-email", async ({ page }, testInfo) => {
  await sinSesion(page);
  await page.goto("/verificar-email?email=ana@ejemplo.ec", {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await expect(page.getByText("Verificar correo")).toBeVisible();
  await expect(page.getByText("ana@ejemplo.ec")).toBeVisible();
  await capturar(page, "04-verificar-email", testInfo, true);
});

test("05-recuperar", async ({ page }, testInfo) => {
  await sinSesion(page);
  await page.goto("/recuperar", { waitUntil: "networkidle", timeout: 30000 });
  await expect(page.getByText("Recuperar contraseña")).toBeVisible();
  await page.getByLabel("Correo electrónico").fill("ana@ejemplo.ec");
  await capturar(page, "05-recuperar", testInfo, true);
});

test("06-restablecer", async ({ page }, testInfo) => {
  await sinSesion(page);
  await page.goto("/restablecer/tok-reset-123", { waitUntil: "networkidle", timeout: 30000 });
  await expect(page.getByText("Restablecer contraseña")).toBeVisible();
  await page.getByLabel("Nueva contraseña").fill("Clave1234");
  await page.getByLabel("Confirmar contraseña").fill("Clave1234");
  await capturar(page, "06-restablecer", testInfo, true);
});

test("07-perfil", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.goto("/perfil", { waitUntil: "networkidle", timeout: 30000 });
  await expect(page.getByText("Mi perfil")).toBeVisible();
  await expect(page.getByLabel("Nombre")).toHaveValue(usuarioFixture.nombre);
  await expect(page.getByLabel("Correo electrónico")).toHaveValue(usuarioFixture.email);
  await capturar(page, "07-perfil", testInfo, true);
});

test("08-cambiar-password", async ({ page }, testInfo) => {
  await baseAutenticado(page);
  await page.goto("/perfil", { waitUntil: "networkidle", timeout: 30000 });
  const tarjeta = page.locator('[data-slot="card"]').filter({ hasText: "Cambiar contraseña" });
  await expect(tarjeta.getByLabel("Contraseña actual")).toBeVisible();
  await capturar(tarjeta, "08-cambiar-password", testInfo);
});
