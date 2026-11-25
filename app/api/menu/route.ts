import { connection } from "next/server";
import { getDb } from "@/lib/db";
import { getMenu, isSoldOut, productImageUrl } from "@/lib/menu";

// menu publico en json, solo productos visibles
export async function GET() {
  await connection();
  const menu = (await getMenu(await getDb())).map(({ category, products }) => ({
    id: category.id,
    name: category.name,
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      priceCents: p.price_cents,
      emoji: p.emoji,
      imageUrl: productImageUrl(p),
      soldOut: isSoldOut(p),
    })),
  }));
  return Response.json({ categories: menu });
}
