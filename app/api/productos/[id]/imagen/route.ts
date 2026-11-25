import { connection } from "next/server";
import { getDb } from "@/lib/db";
import { one } from "@/lib/sql";

// foto de un producto guardada en la base de datos (la url lleva ?v=, asi que se puede cachear)
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await connection();
  const { id: raw } = await ctx.params;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return new Response("No encontrada", { status: 404 });

  const row = await one<{ image_data: string | null }>(await getDb(), "SELECT image_data FROM products WHERE id = ?", [id]);
  const m = row?.image_data?.match(/^data:(image\/(?:jpeg|png|webp));base64,([\s\S]+)$/);
  if (!m) return new Response("No encontrada", { status: 404 });

  return new Response(new Uint8Array(Buffer.from(m[2], "base64")), {
    headers: {
      "Content-Type": m[1],
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
