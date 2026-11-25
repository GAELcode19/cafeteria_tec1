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
  image_at: number | null; // la foto se pide aparte, por /api/productos/[id]/imagen
};
export type Category = { id: number; name: string; sort: number };

// url de la foto del producto (null si no tiene); image_at cambia al subir otra y evita la cache vieja
export function productImageUrl(p: Pick<Product, "id" | "image_at">): string | null {
  return p.image_at ? `/api/productos/${p.id}/imagen?v=${p.image_at}` : null;
}

const PRODUCT_COLUMNS = "id, category_id, name, description, price_cents, emoji, stock, available, image_at";

export function getCategories(db: Db): Promise<Category[]> {
  return all<Category>(db, "SELECT * FROM categories ORDER BY sort, id");
}

export async function getMenu(db: Db, includeHidden = false) {
  const where = includeHidden ? "" : "WHERE available = 1";
  const products = await all<Product>(db, `SELECT ${PRODUCT_COLUMNS} FROM products ${where} ORDER BY category_id, id`);
  const categories = await getCategories(db);
  return categories
    .map((category) => ({ category, products: products.filter((p) => p.category_id === category.id) }))
    .filter((g) => includeHidden || g.products.length > 0);
}

export function isSoldOut(p: Pick<Product, "stock">): boolean {
  return p.stock !== null && p.stock <= 0;
}
