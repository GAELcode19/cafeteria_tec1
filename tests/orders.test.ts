import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  canTransition,
  createOrder,
  getOrder,
  listActiveOrders,
  OrderError,
  salesReport,
  setOrderStatus,
} from "../lib/orders";
import { getMenu } from "../lib/menu";
import { one, run, type Pool } from "../lib/sql";
import { freshDb } from "./db-helper";

let db: Pool;
let userId: number;

type P = { id: number; stock: number | null; price_cents: number };
const productByName = async (name: string) =>
  (await one<P>(db, "SELECT * FROM products WHERE name = ?", [name]))!;

beforeEach(async () => {
  await db?.end();
  db = await freshDb();
  userId = (await run(db, "INSERT INTO users (name, email, password_hash) VALUES ('Ana', 'ana@tec.mx', 'x')")).insertId;
});
afterAll(async () => {
  await db?.end();
});

describe("menú", () => {
  it("se siembra con categorías y productos", async () => {
    const menu = await getMenu(db);
    expect(menu.length).toBeGreaterThanOrEqual(4);
    expect(menu.every((g) => g.products.length > 0)).toBe(true);
  });

  it("oculta productos no disponibles", async () => {
    const p = await productByName("Brownie");
    await run(db, "UPDATE products SET available = 0 WHERE id = ?", [p.id]);
    const names = (await getMenu(db)).flatMap((g) => g.products.map((x) => x.name));
    expect(names).not.toContain("Brownie");
    const all = (await getMenu(db, true)).flatMap((g) => g.products.map((x) => x.name));
    expect(all).toContain("Brownie");
  });
});

describe("createOrder", () => {
  it("calcula el total con precios de la base de datos y descuenta stock", async () => {
    const torta = await productByName("Torta de jamón");
    const cafe = await productByName("Café americano");
    const id = await createOrder(
      db,
      userId,
      [
        { productId: torta.id, quantity: 2 },
        { productId: cafe.id, quantity: 1 },
      ],
      "sin cebolla",
    );
    const { order, items } = (await getOrder(db, id))!;
    expect(order.total_cents).toBe(torta.price_cents * 2 + cafe.price_cents);
    expect(order.status).toBe("pendiente");
    expect(order.notes).toBe("sin cebolla");
    expect(items).toHaveLength(2);
    expect((await productByName("Torta de jamón")).stock).toBe(torta.stock! - 2);
    expect((await productByName("Café americano")).stock).toBeNull();
  });

  it("une líneas repetidas del mismo producto", async () => {
    const cafe = await productByName("Café americano");
    const id = await createOrder(
      db,
      userId,
      [
        { productId: cafe.id, quantity: 1 },
        { productId: cafe.id, quantity: 2 },
      ],
      "",
    );
    expect((await getOrder(db, id))!.items[0].quantity).toBe(3);
  });

  it("rechaza si no hay stock suficiente y no cambia nada (rollback)", async () => {
    const torta = await productByName("Torta de jamón");
    await run(db, "UPDATE products SET stock = 1 WHERE id = ?", [torta.id]);
    const cafe = await productByName("Café americano");
    await expect(
      createOrder(
        db,
        userId,
        [
          { productId: cafe.id, quantity: 1 },
          { productId: torta.id, quantity: 2 },
        ],
        "",
      ),
    ).rejects.toThrow(OrderError);
    expect((await productByName("Torta de jamón")).stock).toBe(1);
    expect(await listActiveOrders(db)).toHaveLength(0);
  });

  it("rechaza productos inexistentes o no disponibles", async () => {
    await expect(createOrder(db, userId, [{ productId: 99999, quantity: 1 }], "")).rejects.toThrow(OrderError);
    const p = await productByName("Brownie");
    await run(db, "UPDATE products SET available = 0 WHERE id = ?", [p.id]);
    await expect(createOrder(db, userId, [{ productId: p.id, quantity: 1 }], "")).rejects.toThrow(OrderError);
  });

  it("no vende de más cuando dos pedidos compiten por la última pieza", async () => {
    const torta = await productByName("Torta de jamón");
    await run(db, "UPDATE products SET stock = 1 WHERE id = ?", [torta.id]);
    const results = await Promise.allSettled([
      createOrder(db, userId, [{ productId: torta.id, quantity: 1 }], ""),
      createOrder(db, userId, [{ productId: torta.id, quantity: 1 }], ""),
      createOrder(db, userId, [{ productId: torta.id, quantity: 1 }], ""),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await productByName("Torta de jamón")).stock).toBe(0);
  });
});

describe("estados", () => {
  it("solo permite transiciones válidas", () => {
    expect(canTransition("pendiente", "preparando")).toBe(true);
    expect(canTransition("pendiente", "entregado")).toBe(false);
    expect(canTransition("entregado", "cancelado")).toBe(false);
  });

  it("recorre el flujo completo", async () => {
    const cafe = await productByName("Café americano");
    const id = await createOrder(db, userId, [{ productId: cafe.id, quantity: 1 }], "");
    await setOrderStatus(db, id, "preparando");
    await setOrderStatus(db, id, "listo");
    await setOrderStatus(db, id, "entregado");
    expect((await getOrder(db, id))!.order.status).toBe("entregado");
    await expect(setOrderStatus(db, id, "preparando")).rejects.toThrow(OrderError);
  });

  it("al cancelar devuelve el stock", async () => {
    const torta = await productByName("Torta de jamón");
    const id = await createOrder(db, userId, [{ productId: torta.id, quantity: 3 }], "");
    expect((await productByName("Torta de jamón")).stock).toBe(torta.stock! - 3);
    await setOrderStatus(db, id, "cancelado");
    expect((await productByName("Torta de jamón")).stock).toBe(torta.stock);
  });

  it("no se puede cancelar dos veces (el stock no se devuelve doble)", async () => {
    const torta = await productByName("Torta de jamón");
    const id = await createOrder(db, userId, [{ productId: torta.id, quantity: 2 }], "");
    await setOrderStatus(db, id, "cancelado");
    await expect(setOrderStatus(db, id, "cancelado")).rejects.toThrow(OrderError);
    expect((await productByName("Torta de jamón")).stock).toBe(torta.stock);
  });
});

describe("listas y reporte", () => {
  it("lista pedidos activos con sus productos", async () => {
    const cafe = await productByName("Café americano");
    const torta = await productByName("Torta de jamón");
    const a = await createOrder(db, userId, [{ productId: cafe.id, quantity: 1 }], "");
    await createOrder(db, userId, [{ productId: torta.id, quantity: 1 }], "");
    await setOrderStatus(db, a, "cancelado");
    const active = await listActiveOrders(db);
    expect(active).toHaveLength(1);
    expect(active[0].items[0].name).toBe("Torta de jamón");
    expect(active[0].order.customer_name).toBe("Ana");
  });

  it("el reporte solo cuenta pedidos entregados", async () => {
    const cafe = await productByName("Café americano");
    const a = await createOrder(db, userId, [{ productId: cafe.id, quantity: 2 }], "");
    await createOrder(db, userId, [{ productId: cafe.id, quantity: 5 }], "");
    await setOrderStatus(db, a, "preparando");
    await setOrderStatus(db, a, "listo");
    await setOrderStatus(db, a, "entregado");
    const r = await salesReport(db, 7);
    expect(r.totals.orders).toBe(1);
    expect(r.totals.revenue).toBe(cafe.price_cents * 2);
    expect(r.top[0].name).toBe("Café americano");
    expect(r.top[0].units).toBe(2);
    expect(r.byDay).toHaveLength(1);
    expect(r.byDay[0].revenue).toBe(cafe.price_cents * 2);
    expect(typeof r.byDay[0].day).toBe("string");
  });
});
