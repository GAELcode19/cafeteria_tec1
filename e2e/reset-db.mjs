// vacia la base e2e (solo esa) antes de arrancar el servidor
import mysql from "mysql2/promise";

const DATABASE = "cafeteria_e2e";
const TABLES = ["order_items", "orders", "products", "categories", "sessions", "users"];

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: DATABASE,
  });
  await conn.query("SET FOREIGN_KEY_CHECKS = 0");
  for (const t of TABLES) await conn.query(`DROP TABLE IF EXISTS \`${t}\``);
  await conn.end();
  console.log(`[e2e] Base ${DATABASE} vaciada.`);
})().catch((e) => {
  console.error("[e2e] No se pudo preparar la base E2E:", e.message);
  console.error("¿Ejecutaste sql/setup.sql y configuraste DB_USER / DB_PASSWORD en .env.local?");
  process.exit(1);
});
