import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre").max(80),
  email: z.string().trim().toLowerCase().email("Correo no válido").max(120),
  password: z.string().min(8, "Mínimo 8 caracteres").max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo no válido"),
  password: z.string().min(1, "Escribe tu contraseña").max(100),
});

export const cartSchema = z
  .array(
    z.object({
      productId: z.number().int().positive(),
      quantity: z.number().int().min(1).max(20),
    }),
  )
  .min(1, "Tu carrito está vacío")
  .max(40);

export const orderNotesSchema = z.string().trim().max(200).default("");

export const productSchema = z.object({
  name: z.string().trim().min(2, "Nombre muy corto").max(80),
  description: z.string().trim().max(200).default(""),
  categoryId: z.coerce.number().int().positive(),
  emoji: z.string().trim().min(1).max(8).default("🍽️"),
  stock: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 0), "Stock inválido"),
});

// foto del producto: llega ya reducida desde el navegador como data URL
export const MAX_IMAGE_CHARS = 700_000;
const IMAGE_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export function parseImageData(raw: unknown): { ok: true; value: string | null } | { ok: false; error: string } {
  const v = typeof raw === "string" ? raw.trim() : "";
  if (v === "") return { ok: true, value: null };
  if (v.length > MAX_IMAGE_CHARS) return { ok: false, error: "La imagen es demasiado grande." };
  if (!IMAGE_RE.test(v)) return { ok: false, error: "Formato de imagen no válido." };
  return { ok: true, value: v };
}

export const ORDER_STATUSES = ["pendiente", "preparando", "listo", "entregado", "cancelado"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type Role = "student" | "staff" | "admin";
