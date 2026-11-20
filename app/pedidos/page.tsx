import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { listUserOrders } from "@/lib/orders";
import { formatMXN } from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";

export const metadata: Metadata = { title: "Mis pedidos" };

export default function MyOrdersPage() {
  return (
    <main className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">Mis pedidos</h1>
      <Suspense fallback={<p className="text-muted">Cargando…</p>}>
        <OrderList />
      </Suspense>
    </main>
  );
}

async function OrderList() {
  const user = await requireUser();
  const orders = await listUserOrders(await getDb(), user.id);
  if (orders.length === 0) {
    return (
      <div className="card text-center">
        <p className="text-muted">Aún no has hecho pedidos.</p>
        <Link href="/" className="btn-primary mt-4">
          Ver menú
        </Link>
      </div>
    );
  }
  return (
    <ul className="grid gap-3">
      {orders.map((o) => (
        <li key={o.id}>
          <Link href={`/pedidos/${o.id}`} className="card flex items-center justify-between gap-3 hover:bg-brand-soft">
            <div>
              <p className="font-semibold">Pedido #{o.id}</p>
              <p className="text-sm text-muted">{o.created_at} UTC</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">{formatMXN(o.total_cents)}</p>
              <StatusBadge status={o.status} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
