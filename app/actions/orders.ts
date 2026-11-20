"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { getCurrentUser, requireRole } from "@/lib/auth";
import {
  canTransition,
  createOrder,
  getOrder,
  OrderError,
  setOrderStatus,
} from "@/lib/orders";
import { cartSchema, ORDER_STATUSES, orderNotesSchema, type OrderStatus } from "@/lib/validation";

export type PlaceOrderState = { error?: string } | undefined;

// del cliente solo llegan id y cantidad, el precio sale de la bd
export async function placeOrderAction(
  lines: { productId: number; quantity: number }[],
  notes: string,
): Promise<PlaceOrderState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const cart = cartSchema.safeParse(lines);
  if (!cart.success) return { error: cart.error.issues[0].message };
  const note = orderNotesSchema.safeParse(notes);
  if (!note.success) return { error: "Las notas son muy largas (máx. 200)." };

  let orderId: number;
  try {
    orderId = await createOrder(await getDb(), user.id, cart.data, note.data);
  } catch (e) {
    if (e instanceof OrderError) return { error: e.message };
    throw e;
  }
  revalidatePath("/", "layout");
  redirect(`/pedidos/${orderId}?nuevo=1`);
}

// el cliente solo cancela sus pedidos pendientes
export async function cancelMyOrderAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const id = Number(formData.get("orderId"));
  const db = await getDb();
  const found = Number.isInteger(id) ? await getOrder(db, id) : null;
  if (!found || found.order.user_id !== user.id || found.order.status !== "pendiente") return;
  try {
    await setOrderStatus(db, id, "cancelado");
  } catch (e) {
    if (!(e instanceof OrderError)) throw e; // ya lo estaban preparando
  }
  revalidatePath("/", "layout");
}

// staff avanza o cancela un pedido
export async function updateOrderStatusAction(formData: FormData): Promise<void> {
  await requireRole("staff", "admin");
  const id = Number(formData.get("orderId"));
  const to = String(formData.get("status")) as OrderStatus;
  if (!Number.isInteger(id) || !ORDER_STATUSES.includes(to)) return;
  const db = await getDb();
  const found = await getOrder(db, id);
  if (!found || !canTransition(found.order.status, to)) return;
  try {
    await setOrderStatus(db, id, to);
  } catch (e) {
    if (!(e instanceof OrderError)) throw e; // otro empleado ya lo cambio
  }
  revalidatePath("/", "layout");
}
