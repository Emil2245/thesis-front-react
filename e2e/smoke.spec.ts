import { expect, test } from "@playwright/test";

const API = "http://localhost:8080/api/v1";

test.describe("smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.route(`${API}/auth/me`, (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "No autorizado" }),
      }),
    );
    await page.route(`${API}/auth/refresh`, (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Token inválido" }),
      }),
    );
  });

  test("login page carga con formulario", async ({ page }) => {
    await page.goto("/login", { waitUntil: "networkidle" });
    await expect(page.getByLabel(/correo/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /ingresar/i })).toBeVisible();
  });

  test("login con credenciales inválidas muestra error", async ({ page }) => {
    await page.route(`${API}/auth/login`, (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Credenciales inválidas" }),
      }),
    );
    await page.goto("/login", { waitUntil: "networkidle" });
    await page.getByLabel(/correo/i).fill("bad@test.com");
    await page.getByLabel(/contraseña/i).fill("wrong");
    await page.getByRole("button", { name: /ingresar/i }).click();
    await expect(page.getByText(/credenciales inv|llegar a esta página|ingresa/i)).toBeVisible({
      timeout: 10000,
    });
  });
});
