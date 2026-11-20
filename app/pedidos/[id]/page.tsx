import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getOrder } from "@/lib/orders";
import { formatMXN } from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";
import { AutoRefresh } from "@/components/auto-refresh";
import { ClearCart } from "@/components/clear-cart";
import { cancelMyOrderAction } from "@/app/actions/orders";

export const metadata: Metadata = { title: "Pedido" };

export default function OrderPage({ params, searchParams }: PageProps<"/pedidos/[id]">) {
  return (
    <main className="mx-auto max-w-2xl">
      <Suspense fallback={<p className="text-muted">Cargando pedido…</p>}>
        <OrderDetail params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function OrderDetail({
  params,
  searchParams,
}: {
  params: PageProps<"/pedidos/[id]">["params"];
  searchParams: PageProps<"/pedidos/[id]">["searchParams"];
}) {
  const user = await requireUser();
  const { id } = await params;
  const { nuevo } = await searchParams;
  const orderId = Number(id);
  const found = Number.isInteger(orderId) ? await getOrder(await getDb(), orderId) : null;
  // pedido ajeno se trata como si no existiera
  if (!found || (found.order.user_id !== user.id && user.role === "student")) notFound();
  const { order, items } = found;
  const active = ["pendiente", "preparando", "listo"].includes(order.status);

  return (
    <>
      {nuevo === "1" && <ClearCart />}
      {active && <AutoRefresh seconds={10} />}
      {nuevo === "1" && (
        <p role="status" className="mb-4 rounded-xl bg-ok/15 p-3 font-medium text-ok">
          ¡Pedido recibido! Te avisamos aquí cuando esté listo.
        </p>
      )}
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Pedido #{order.id}</h1>
        <StatusBadge status={order.status} />
      </div>
      <div className="card grid gap-3">
        <ul className="divide-y divide-border">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between py-2">
              <span>
                {i.quantity} × {i.name}
              </span>
              <span>{formatMXN(i.quantity * i.unit_price_cents)}</span>
            </li>
          ))}
        </ul>
        {order.notes && <p className="text-sm text-muted">Notas: {order.notes}</p>}
        <p className="flex justify-between text-lg font-semibold">
          <span>Total</span>
          <span>{formatMXN(order.total_cents)}</span>
        </p>
        <p className="text-sm text-muted">Pago en caja al recoger.</p>
        {/* boton de cancelar */}
        {order.status === "pendiente" && order.user_id === user.id && (
          <form action={cancelMyOrderAction}>
            <input type="hidden" name="orderId" value={order.id} />
            <button className="btn-danger">Cancelar pedido</button>
          </form>
        )}
      </div>
      <Link href="/pedidos" className="mt-4 inline-block text-sm text-brand underline">
        ← Todos mis pedidos
      </Link>
    </>
  );
}
