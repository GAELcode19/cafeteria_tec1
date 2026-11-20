import "server-only";
import { configFromEnv, createPool, ensureSchema, type Pool } from "./sql";
import { seed } from "./seed";

const g = globalThis as unknown as { __cafePool?: Promise<Pool> };

async function init(): Promise<Pool> {
  const config = configFromEnv();
  const pool = createPool(config);
  try {
    await ensureSchema(pool);
    await seed(pool);
  } catch (e) {
    await pool.end().catch(() => {});
    const reason = e instanceof Error ? e.message : String(e);
    throw new Error(
      `No se pudo usar MySQL en ${config.host}:${config.port} (base "${config.database}", usuario "${config.user}"): ${reason}. ` +
        "Revisa DB_HOST, DB_PORT, DB_USER, DB_PASSWORD y DB_NAME en .env.local, y que hayas ejecutado sql/setup.sql.",
    );
  }
  return pool;
}

// pool unico: crea tablas y siembra solo la primera vez
export function getDb(): Promise<Pool> {
  if (!g.__cafePool) {
    g.__cafePool = init().catch((e) => {
      g.__cafePool = undefined; // para reintentar si falla
      throw e;
    });
  }
  return g.__cafePool;
}
