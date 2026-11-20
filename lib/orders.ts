import { all, one, run, transaction, type Db, type Pool } from "./sql";
import type { OrderStatus } from "./validation";

export class OrderError extends Error {}

export type CartLine = { productId: number; quantity: number };

export type OrderRow = {
  id: number;
  user_id: number;
  status: OrderStatus;
  total_cents: number;
  notes: string;
  pay_method: string;
  created_at: string;
  updated_at: string;
  customer_name?: string;
};

export type OrderItemRow = {
  id: number;
  order_id: number;
  product_id: number;
  name: string;
  unit_price_cents: number;
  quantity: number;
};

export const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  pendiente: ["preparando", "cancelado"],
  preparando: ["listo", "cancelado"],
  listo: ["entregado", "cancelado"],
  entregado: [],
  cancelado: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return NEXT_STATUS[from].includes(to);
}

type ProductRow = {
  id: number;
  name: string;
  price_cents: number;
  stock: number | null;
  available: number;
};

export async function createOrder(
  pool: Pool,
  userId: number,
  lines: CartLine[],
  notes: string,
): Promise<number> {
  // junta lineas repetidas del mismo producto
  const quantities = new Map<number, number>();
  for (const l of lines) quantities.set(l.productId, (quantities.get(l.productId) ?? 0) + l.quantity);
  const ids = [...quantities.keys()];

  return transaction(pool, async (conn) => {
    // una sola consulta, ordenada por id para evitar bloqueos cruzados
    const products = await all<ProductRow>(
      conn,
      "SELECT id, name, price_cents, stock, available FROM products WHERE id IN (?) ORDER BY id FOR UPDATE",
      [ids],
    );
    if (products.length !== ids.length || products.some((p) => !p.available)) {
      throw new OrderError("Un producto de tu carrito ya no está disponible.");
    }

    let total = 0;
    const resolved: { id: number; name: string; price: number; qty: number }[] = [];

    for (const p of products) {
      const qty = quantities.get(p.id)!;
      if (qty > 20) throw new OrderError(`Máximo 20 piezas de ${p.name}.`);
      if (p.stock !== null) {
        if (p.stock < qty) {
          throw new OrderError(
            p.stock === 0 ? `${p.name} está agotado.` : `Solo quedan ${p.stock} de ${p.name}.`,
          );
        }
        await run(conn, "UPDATE products SET stock = stock - ? WHERE id = ?", [qty, p.id]);
      }
      total += p.price_cents * qty;
      resolved.push({ id: p.id, name: p.name, price: p.price_cents, qty });
    }

    const { insertId } = await run(conn, "INSERT INTO orders (user_id, total_cents, notes) VALUES (?, ?, ?)", [
      userId,
      total,
      notes,
    ]);
    for (const r of resolved) {
      await run(
        conn,
        "INSERT INTO order_items (order_id, product_id, name, unit_price_cents, quantity) VALUES (?, ?, ?, ?, ?)",
        [insertId, r.id, r.name, r.price, r.qty],
      );
    }
    return insertId;
  });
}

// al cancelar se devuelve el stock
export async function setOrderStatus(pool: Pool, orderId: number, to: OrderStatus): Promise<void> {
  await transaction(pool, async (conn) => {
    const order = await one<{ status: OrderStatus }>(conn, "SELECT status FROM orders WHERE id = ? FOR UPDATE", [
      orderId,
    ]);
    if (!order) throw new OrderError("El pedido no existe.");
    if (!canTransition(order.status, to)) {
      throw new OrderError(`No se puede pasar de "${order.status}" a "${to}".`);
    }
    if (to === "cancelado") {
      await run(
        conn,
        `UPDATE products p JOIN order_items i ON i.product_id = p.id
         SET p.stock = p.stock + i.quantity
         WHERE i.order_id = ? AND p.stock IS NOT NULL`,
        [orderId],
      );
    }
    await run(conn, "UPDATE orders SET status = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?", [to, orderId]);
  });
}

export async function getOrder(db: Db, id: number) {
  const order = await one<OrderRow>(
    db,
    `SELECT o.*, u.name AS customer_name FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id = ?`,
    [id],
  );
  if (!order) return null;
  const items = await all<OrderItemRow>(db, "SELECT * FROM order_items WHERE order_id = ? ORDER BY id", [id]);
  return { order, items };
}

export function listUserOrders(db: Db, userId: number): Promise<OrderRow[]> {
  return all<OrderRow>(db, "SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 50", [userId]);
}

export async function listActiveOrders(db: Db) {
  const orders = await all<OrderRow>(
    db,
    `SELECT o.*, u.name AS customer_name FROM orders o JOIN users u ON u.id = o.user_id
     WHERE o.status IN ('pendiente','preparando','listo') ORDER BY o.id ASC`,
  );
  if (orders.length === 0) return [];
  const items = await all<OrderItemRow>(
    db,
    "SELECT * FROM order_items WHERE order_id IN (?) ORDER BY id",
    [orders.map((o) => o.id)],
  );
  return orders.map((order) => ({ order, items: items.filter((i) => i.order_id === order.id) }));
}

export async function salesReport(db: Db, days = 7) {
  const d = Math.max(1, Math.floor(days));
  // las tres consultas son independientes, se lanzan juntas
  const [totals, top, byDay] = await Promise.all([
    one<{ orders: number; revenue: number }>(
      db,
      `SELECT COUNT(*) AS orders, COALESCE(SUM(total_cents),0) AS revenue
       FROM orders WHERE status = 'entregado' AND created_at >= UTC_TIMESTAMP() - INTERVAL ? DAY`,
      [d],
    ),
    all<{ name: string; units: number; revenue: number }>(
      db,
      `SELECT i.name, SUM(i.quantity) AS units, SUM(i.quantity * i.unit_price_cents) AS revenue
       FROM order_items i JOIN orders o ON o.id = i.order_id
       WHERE o.status = 'entregado' AND o.created_at >= UTC_TIMESTAMP() - INTERVAL ? DAY
       GROUP BY i.product_id, i.name ORDER BY units DESC LIMIT 10`,
      [d],
    ),
    all<{ day: string; orders: number; revenue: number }>(
      db,
      `SELECT DATE(created_at) AS day, COUNT(*) AS orders, SUM(total_cents) AS revenue
       FROM orders WHERE status = 'entregado' AND created_at >= UTC_TIMESTAMP() - INTERVAL ? DAY
       GROUP BY DATE(created_at) ORDER BY day DESC`,
      [d],
    ),
  ]);
  return { totals: totals!, top, byDay };
}
