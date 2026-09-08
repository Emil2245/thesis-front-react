import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["html"], ["github"]] : [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    trace: "on-first-retry",
    video: "retain-on-failure",
    locale: "es-EC",
  },
  // Las capturas —las de `screenshots/` y las del manual— son de escritorio:
  // se generan y se comparan en chromium. Correrlas en firefox y móvil no
  // documenta nada y el asistente de proyecto ni siquiera es clicable en Pixel 7.
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "firefox",
      testIgnore: [/screenshots\.spec\.ts/, /manual\//],
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "mobile-chrome",
      testIgnore: [/screenshots\.spec\.ts/, /manual\//],
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: process.env.CI ? "pnpm run build && pnpm run preview -- --port 5173" : "pnpm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
