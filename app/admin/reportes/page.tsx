import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { salesReport } from "@/lib/orders";
import { formatMXN } from "@/lib/money";

export const metadata: Metadata = { title: "Reportes" };

export default function ReportsPage({ searchParams }: PageProps<"/admin/reportes">) {
  return (
    <main>
      <h1 className="mb-4 text-2xl font-bold">Reporte de ventas</h1>
      <Suspense fallback={<p className="text-muted">Cargando…</p>}>
        <Report searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Report({ searchParams }: { searchParams: PageProps<"/admin/reportes">["searchParams"] }) {
  await requireRole("admin");
  const { dias } = await searchParams;
  const raw = Number(Array.isArray(dias) ? dias[0] : dias);
  const days = [1, 7, 30, 90].includes(raw) ? raw : 7;
  const { totals, top, byDay } = await salesReport(await getDb(), days);

  return (
    <div className="grid gap-6">
      <div className="flex gap-2">
        {[1, 7, 30, 90].map((d) => (
          <Link
            key={d}
            href={`/admin/reportes?dias=${d}`}
            className={d === days ? "btn-primary" : "btn-ghost"}
            aria-current={d === days ? "page" : undefined}
          >
            {d === 1 ? "24 h" : `${d} días`}
          </Link>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-muted">Ventas (entregados)</p>
          <p className="text-2xl font-bold">{formatMXN(totals.revenue)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-muted">Pedidos</p>
          <p className="text-2xl font-bold">{totals.orders}</p>
        </div>
        <div className="card">
          <p className="text-sm text-muted">Ticket promedio</p>
          <p className="text-2xl font-bold">
            {formatMXN(totals.orders ? Math.round(totals.revenue / totals.orders) : 0)}
          </p>
        </div>
      </div>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Más vendidos</h2>
        {top.length === 0 ? (
          <p className="text-muted">Sin ventas en este periodo.</p>
        ) : (
          <table className="card w-full text-left text-sm">
            <thead>
              <tr className="text-muted">
                <th className="py-1">Producto</th>
                <th className="py-1 text-right">Unidades</th>
                <th className="py-1 text-right">Ingresos</th>
              </tr>
            </thead>
            <tbody>
              {top.map((t) => (
                <tr key={t.name} className="border-t border-border">
                  <td className="py-2">{t.name}</td>
                  <td className="py-2 text-right">{t.units}</td>
                  <td className="py-2 text-right">{formatMXN(t.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Por día</h2>
        {byDay.length === 0 ? (
          <p className="text-muted">Sin ventas en este periodo.</p>
        ) : (
          <table className="card w-full text-left text-sm">
            <thead>
              <tr className="text-muted">
                <th className="py-1">Día (UTC)</th>
                <th className="py-1 text-right">Pedidos</th>
                <th className="py-1 text-right">Ventas</th>
              </tr>
            </thead>
            <tbody>
              {byDay.map((d) => (
                <tr key={d.day} className="border-t border-border">
                  <td className="py-2">{d.day}</td>
                  <td className="py-2 text-right">{d.orders}</td>
                  <td className="py-2 text-right">{formatMXN(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
