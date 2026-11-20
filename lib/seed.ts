import { hashPassword } from "./password";
import { one, run, transaction, type Pool } from "./sql";

const MENU: { category: string; items: [string, string, number, string, number | null][] }[] = [
  {
    category: "Bebidas calientes",
    items: [
      ["Café americano", "Café de grano recién molido.", 2500, "☕", null],
      ["Capuchino", "Espresso con leche vaporizada y espuma.", 3500, "☕", null],
      ["Latte", "Suave y cremoso.", 3800, "🥛", null],
      ["Chocolate caliente", "Con leche y chocolate semiamargo.", 3200, "🍫", null],
    ],
  },
  {
    category: "Bebidas frías",
    items: [
      ["Frappé de moka", "Café, chocolate y hielo.", 4500, "🧋", null],
      ["Té helado", "Limón o durazno.", 2800, "🧊", null],
      ["Agua de sabor", "Jamaica, horchata o limón (500 ml).", 2200, "🥤", null],
      ["Refresco", "Lata 355 ml.", 2000, "🥫", 60],
    ],
  },
  {
    category: "Alimentos",
    items: [
      ["Torta de jamón", "Con aguacate, jitomate y frijoles.", 5500, "🥪", 25],
      ["Sándwich de pollo", "Pan artesanal, pollo y queso.", 6000, "🥪", 20],
      ["Chilaquiles", "Verdes o rojos, con pollo y crema.", 6500, "🍳", 20],
      ["Ensalada fresca", "Lechuga, pepino, zanahoria y aderezo.", 5200, "🥗", 15],
    ],
  },
  {
    category: "Postres y snacks",
    items: [
      ["Pan dulce", "Concha, oreja o cuernito.", 1800, "🥐", 40],
      ["Galleta de chispas", "Horneada hoy.", 2200, "🍪", 35],
      ["Brownie", "Con nuez.", 3000, "🍰", 20],
      ["Fruta picada", "Con chile y limón.", 3000, "🍉", 20],
    ],
  },
];

export async function seed(pool: Pool): Promise<void> {
  const cats = await one<{ n: number }>(pool, "SELECT COUNT(*) AS n FROM categories");
  if (cats!.n === 0) {
    await transaction(pool, async (conn) => {
      for (const [i, cat] of MENU.entries()) {
        const { insertId } = await run(conn, "INSERT INTO categories (name, sort) VALUES (?, ?)", [cat.category, i]);
        for (const [name, desc, price, emoji, stock] of cat.items) {
          await run(
            conn,
            "INSERT INTO products (category_id, name, description, price_cents, emoji, stock) VALUES (?, ?, ?, ?, ?, ?)",
            [insertId, name, desc, price, emoji, stock],
          );
        }
      }
    });
  }

  const admins = await one<{ n: number }>(pool, "SELECT COUNT(*) AS n FROM users WHERE role = 'admin'");
  if (admins!.n === 0) {
    const email = (process.env.ADMIN_EMAIL ?? "admin@cafeteria.local").toLowerCase();
    let password = process.env.ADMIN_PASSWORD;
    const production = process.env.NODE_ENV === "production";
    if (!password) {
      if (production) {
        console.warn("[seed] ADMIN_PASSWORD no definido: no se crea el administrador inicial.");
        return;
      }
      password = "admin1234";
      console.warn(`[seed] Administrador de desarrollo creado: ${email} / ${password}`);
    } else if (production && password.length < 8) {
      console.warn("[seed] ADMIN_PASSWORD debe tener al menos 8 caracteres en producción: no se crea el administrador.");
      return;
    }
    await run(pool, "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')", [
      "Administrador",
      email,
      hashPassword(password),
    ]);
  }
}
