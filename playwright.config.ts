import { defineConfig, devices } from "@playwright/test";

// El puerto es parametrizable porque los capítulos del manual se escriben en
// worktrees paralelos, y tres Playwright compartiendo 5173 con
// `reuseExistingServer` se roban las capturas entre sí: cada uno fotografía el
// árbol de otro y el gate sale verde igual.
const PORT = Number(process.env.E2E_PORT ?? 5173);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["html"], ["github"]] : [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`,
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
    // `pnpm exec`, no `pnpm run … -- --port`: pnpm reenvía ese `--` a vite, que
    // lo trata como argumento y arranca en el puerto por defecto igualmente.
    command: process.env.CI
      ? `pnpm run build && pnpm exec vite preview --port ${PORT}`
      : `pnpm exec vite --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
