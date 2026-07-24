import { expect, test } from "@playwright/test";

test("la aplicación carga", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Sistema APU/i);
});
