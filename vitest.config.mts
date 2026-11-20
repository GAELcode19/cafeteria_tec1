import { defineConfig } from "vitest/config";
import path from "node:path";

const root = import.meta.dirname;

// lee .env.local sin pisar variables que ya existan
try {
  process.loadEnvFile(path.resolve(root, ".env.local"));
} catch {
  // sin .env.local se usan las variables del sistema
}

// solo las variables de la app, se pasan a los workers
const env = Object.fromEntries(
  Object.entries(process.env).filter(([k, v]) => /^(DB_|ADMIN_|ALLOWED_)/.test(k) && v !== undefined),
) as Record<string, string>;

export default defineConfig({
  resolve: {
    alias: {
      "server-only": path.resolve(root, "tests/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env,
    // los archivos comparten la misma base de pruebas, no van en paralelo
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
