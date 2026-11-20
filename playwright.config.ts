import { defineConfig } from "@playwright/test";

// lee .env.local sin pisar variables que ya existan
try {
  process.loadEnvFile(".env.local");
} catch {
  // sin .env.local se usan las variables del sistema
}

const PORT = 3111;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: "msedge", // usa Edge instalado; sin descargar navegadores
    locale: "es-MX",
  },
  webServer: {
    command: `node e2e/reset-db.mjs && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      DB_NAME: "cafeteria_e2e", // base aparte: nunca la real
      ADMIN_EMAIL: "admin@cafeteria.local",
      ADMIN_PASSWORD: "e2e-admin-123",
    },
  },
});



