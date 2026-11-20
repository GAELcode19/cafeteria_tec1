import { configFromEnv, createPool, ensureSchema, TABLES_DROP_ORDER, type Pool } from "../lib/sql";
import { seed } from "../lib/seed";

// base de pruebas con tablas nuevas y menu sembrado
export async function freshDb(options: { seedData?: boolean } = {}): Promise<Pool> {
  const database = process.env.DB_TEST_NAME || "cafeteria_test";
  // estas pruebas borran tablas, nunca deben apuntar a la base real
  if (!/(test|e2e)/i.test(database)) {
    throw new Error(`DB_TEST_NAME="${database}" no parece una base de pruebas (debe contener "test" o "e2e").`);
  }
  const pool = createPool(configFromEnv(process.env, database), { connectionLimit: 5 });
  try {
    const conn = await pool.getConnection(); // foreign_key_checks es por conexion
    try {
      await conn.query("SET FOREIGN_KEY_CHECKS = 0");
      for (const t of TABLES_DROP_ORDER) await conn.query(`DROP TABLE IF EXISTS \`${t}\``);
      await conn.query("SET FOREIGN_KEY_CHECKS = 1");
    } finally {
      conn.release();
    }
    await ensureSchema(pool);
    if (options.seedData !== false) await seed(pool);
  } catch (e) {
    await pool.end().catch(() => {});
    const reason = e instanceof Error ? e.message : String(e);
    throw new Error(
      `No se pudo preparar MySQL para las pruebas (${database}): ${reason}\n` +
        "¿Ejecutaste sql/setup.sql y configuraste DB_USER / DB_PASSWORD en .env.local?",
    );
  }
  return pool;
}
