import type { Metadata } from "next";
import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { listActiveOrders, NEXT_STATUS } from "@/lib/orders";
import { formatMXN } from "@/lib/money";
import { StatusBadge, statusLabel } from "@/components/status-badge";
import { AutoRefresh } from "@/components/auto-refresh";
import { updateOrderStatusAction } from "@/app/actions/orders";

export const metadata: Metadata = { title: "Pedidos activos" };

export default function AdminOrdersPage() {
  return (
    <main>
      <h1 className="mb-4 text-2xl font-bold">Pedidos activos</h1>
      <Suspense fallback={<p className="text-muted">Cargando…</p>}>
        <Board />
      </Suspense>
    </main>
  );
}

async function Board() {
  await requireRole("staff", "admin");
  const orders = await listActiveOrders(await getDb());
  return (
    <>
      <AutoRefresh seconds={8} />
      {orders.length === 0 ? (
        <p className="card text-center text-muted">No hay pedidos pendientes. 🎉</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {orders.map(({ order, items }) => (
            <li key={order.id} className="card grid gap-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold">
                  #{order.id} · {order.customer_name}
                </p>
                <StatusBadge status={order.status} />
              </div>
              <ul className="text-sm">
                {items.map((i) => (
                  <li key={i.id}>
                    {i.quantity} × {i.name}
                  </li>
                ))}
              </ul>
              {order.notes && <p className="text-sm text-warn">Nota: {order.notes}</p>}
              <p className="font-semibold">Cobrar en caja: {formatMXN(order.total_cents)}</p>
              <div className="flex flex-wrap gap-2">
                {NEXT_STATUS[order.status].map((to) => (
                  <form key={to} action={updateOrderStatusAction}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <input type="hidden" name="status" value={to} />
                    <button className={to === "cancelado" ? "btn-danger" : "btn-primary"}>
                      {to === "cancelado" ? "Cancelar" : `Marcar: ${statusLabel(to)}`}
                    </button>
                  </form>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
