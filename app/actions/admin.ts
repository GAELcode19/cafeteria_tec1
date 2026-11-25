"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { parsePriceToCents } from "@/lib/money";
import { one, run } from "@/lib/sql";
import { parseImageData, productSchema } from "@/lib/validation";
import type { FormState } from "./auth";

function parseProduct(formData: FormData) {
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    categoryId: formData.get("categoryId"),
    emoji: formData.get("emoji") || "🍽️",
    stock: String(formData.get("stock") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message } as const;
  const price = parsePriceToCents(String(formData.get("price") ?? ""));
  if (price === null) return { error: "Precio no válido." } as const;
  const img = parseImageData(formData.get("imageData"));
  if (!img.ok) return { error: img.error } as const;
  const removeImage = formData.get("removeImage") === "1";
  return { data: parsed.data, price, image: img.value, removeImage } as const;
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

export async function createProductAction(_: FormState, formData: FormData): Promise<FormState> {
  await requireRole("admin");
  const r = parseProduct(formData);
  if ("error" in r) return { error: r.error };
  const db = await getDb();
  if (!(await one(db, "SELECT 1 AS ok FROM categories WHERE id = ?", [r.data.categoryId]))) {
    return { error: "Categoría no válida." };
  }
  await run(
    db,
    "INSERT INTO products (category_id, name, description, price_cents, emoji, stock, image_data, image_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      r.data.categoryId,
      r.data.name,
      r.data.description,
      r.price,
      r.data.emoji,
      r.data.stock,
      r.image,
      r.image ? nowSeconds() : null,
    ],
  );
  revalidatePath("/", "layout");
  return undefined;
}

export async function updateProductAction(formData: FormData): Promise<void> {
  await requireRole("admin");
  const id = Number(formData.get("id"));
  const r = parseProduct(formData);
  if (!Number.isInteger(id) || "error" in r) return;
  // foto nueva la reemplaza, "quitar" la borra y sin cambios se conserva la actual
  let imageSql = "";
  const imageParams: unknown[] = [];
  if (r.image) {
    imageSql = ", image_data=?, image_at=?";
    imageParams.push(r.image, nowSeconds());
  } else if (r.removeImage) {
    imageSql = ", image_data=NULL, image_at=NULL";
  }
  await run(
    await getDb(),
    `UPDATE products SET category_id=?, name=?, description=?, price_cents=?, emoji=?, stock=?${imageSql} WHERE id=?`,
    [r.data.categoryId, r.data.name, r.data.description, r.price, r.data.emoji, r.data.stock, ...imageParams, id],
  );
  revalidatePath("/", "layout");
}

// staff y admin pueden ocultar productos y cambiar stock
export async function toggleAvailabilityAction(formData: FormData): Promise<void> {
  await requireRole("staff", "admin");
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await run(await getDb(), "UPDATE products SET available = 1 - available WHERE id = ?", [id]);
  revalidatePath("/", "layout");
}

export async function setStockAction(formData: FormData): Promise<void> {
  await requireRole("staff", "admin");
  const id = Number(formData.get("id"));
  const raw = String(formData.get("stock") ?? "").trim();
  const stock = raw === "" ? null : Number(raw);
  if (!Number.isInteger(id)) return;
  if (stock !== null && (!Number.isInteger(stock) || stock < 0)) return;
  await run(await getDb(), "UPDATE products SET stock = ? WHERE id = ?", [stock, id]);
  revalidatePath("/", "layout");
}

export async function setRoleAction(formData: FormData): Promise<void> {
  const me = await requireRole("admin");
  const id = Number(formData.get("id"));
  const role = String(formData.get("role"));
  if (!Number.isInteger(id) || id === me.id) return; // nadie se cambia su propio rol
  if (!["student", "staff", "admin"].includes(role)) return;
  await run(await getDb(), "UPDATE users SET role = ? WHERE id = ?", [role, id]);
  revalidatePath("/admin/usuarios");
}
