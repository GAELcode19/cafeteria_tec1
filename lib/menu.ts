import { all, type Db } from "./sql";

export type Product = {
  id: number;
  category_id: number;
  name: string;
  description: string;
  price_cents: number;
  emoji: string;
  stock: number | null;
  available: number;
};
export type Category = { id: number; name: string; sort: number };

export function getCategories(db: Db): Promise<Category[]> {
  return all<Category>(db, "SELECT * FROM categories ORDER BY sort, id");
}

export async function getMenu(db: Db, includeHidden = false) {
  const where = includeHidden ? "" : "WHERE available = 1";
  const products = await all<Product>(db, `SELECT * FROM products ${where} ORDER BY category_id, id`);
  const categories = await getCategories(db);
  return categories
    .map((category) => ({ category, products: products.filter((p) => p.category_id === category.id) }))
    .filter((g) => includeHidden || g.products.length > 0);
}

export function isSoldOut(p: Pick<Product, "stock">): boolean {
  return p.stock !== null && p.stock <= 0;
}
