/// <reference types="node" />
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  use: {
    headless: true,
    baseURL: process.env.E2E_BASE_URL || "http://localhost:5173",
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
  webServer: {
    command: "npm run dev",
    url: process.env.E2E_BASE_URL || "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
