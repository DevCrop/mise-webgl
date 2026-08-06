import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/docs",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: process.env.MISE_DOCS_BASE_URL ?? "http://127.0.0.1:4180",
    trace: "on-first-retry",
  },
  projects: [
    { name: "docs-desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "docs-mobile", use: { ...devices["Pixel 7"] } },
  ],
});
