import { Suspense } from "react";
import { connection } from "next/server";
import { getDb } from "@/lib/db";
import { getMenu, isSoldOut } from "@/lib/menu";
import { formatMXN } from "@/lib/money";
import { AddToCart } from "@/components/add-to-cart";

export default function Home() {
  return (
    <main>
      <section className="rounded-3xl bg-brand-soft p-6 sm:p-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Pide sin hacer fila</h1>
        <p className="mt-2 max-w-xl text-muted">
          Arma tu pedido desde tu celular, paga en caja y recógelo cuando esté listo.
        </p>
      </section>
      <Suspense fallback={<p className="mt-8 text-muted">Cargando menú…</p>}>
        <Menu />
      </Suspense>
    </main>
  );
}

async function Menu() {
  await connection(); // el menu cambia, se lee en cada visita
  const menu = await getMenu(await getDb());

  if (menu.length === 0) {
    return <p className="mt-8 text-muted">Por ahora no hay productos disponibles.</p>;
  }

  return (
    <>
      <nav aria-label="Categorías" className="sticky top-14 z-10 -mx-4 mt-6 flex gap-2 overflow-x-auto bg-background/90 px-4 py-2 backdrop-blur">
        {menu.map(({ category }) => (
          <a key={category.id} href={`#cat-${category.id}`} className="btn-ghost shrink-0">
            {category.name}
          </a>
        ))}
      </nav>
      {menu.map(({ category, products }) => (
        <section key={category.id} id={`cat-${category.id}`} className="mt-8 scroll-mt-28">
          <h2 className="mb-3 text-xl font-semibold">{category.name}</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {products.map((p) => {
              const soldOut = isSoldOut(p);
              return (
                <li key={p.id} className="card flex items-center gap-4">
                  <span className="text-4xl" aria-hidden>
                    {p.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{p.name}</h3>
                    <p className="text-sm text-muted">{p.description}</p>
                    <p className="mt-1 font-semibold text-brand">{formatMXN(p.price_cents)}</p>
                    {p.stock !== null && !soldOut && p.stock <= 5 && (
                      <p className="text-xs text-warn">Quedan {p.stock}</p>
                    )}
                  </div>
                  {soldOut ? (
                    <span className="text-sm font-medium text-danger">Agotado</span>
                  ) : (
                    <AddToCart
                      productId={p.id}
                      name={p.name}
                      emoji={p.emoji}
                      priceCents={p.price_cents}
                      maxQty={Math.min(20, p.stock ?? 20)}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
