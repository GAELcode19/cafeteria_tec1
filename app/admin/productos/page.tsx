import type { Metadata } from "next";
import { Suspense } from "react";
import { requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getMenu } from "@/lib/menu";
import { formatMXN } from "@/lib/money";
import { NewProductForm } from "@/components/product-form";
import { setStockAction, toggleAvailabilityAction, updateProductAction } from "@/app/actions/admin";

export const metadata: Metadata = { title: "Productos" };

export default function AdminProductsPage() {
  return (
    <main>
      <h1 className="mb-4 text-2xl font-bold">Productos</h1>
      <Suspense fallback={<p className="text-muted">Cargando…</p>}>
        <Products />
      </Suspense>
    </main>
  );
}

async function Products() {
  const user = await requireRole("staff", "admin");
  const isAdmin = user.role === "admin";
  const db = await getDb();
  const menu = await getMenu(db, true);
  const categories = menu.map((g) => g.category); // con includeHidden vienen todas

  return (
    <div className="grid gap-6">
      {isAdmin && <NewProductForm categories={categories} />}
      {menu.map(({ category, products }) => (
        <section key={category.id}>
          <h2 className="mb-2 text-lg font-semibold">{category.name}</h2>
          <ul className="grid gap-2">
            {products.map((p) => (
              <li key={p.id} className="card grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className={p.available ? "font-semibold" : "font-semibold text-muted line-through"}>
                    {p.emoji} {p.name} · {formatMXN(p.price_cents)}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* cambiar stock */}
                    <form action={setStockAction} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={p.id} />
                      <label htmlFor={`stock-${p.id}`} className="text-sm text-muted">Stock</label>
                      <input
                        id={`stock-${p.id}`}
                        name="stock"
                        inputMode="numeric"
                        defaultValue={p.stock ?? ""}
                        placeholder="∞"
                        className="input !min-h-9 !w-20"
                      />
                      <button className="btn-ghost">Guardar</button>
                    </form>
                    {/* boton de ocultar o mostrar */}
                    <form action={toggleAvailabilityAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="btn-ghost">{p.available ? "Ocultar" : "Mostrar"}</button>
                    </form>
                  </div>
                </div>
                {/* editar detalles, solo admin */}
                {isAdmin && (
                  <details>
                    <summary className="cursor-pointer text-sm text-brand">Editar detalles</summary>
                    <form action={updateProductAction} className="mt-3 grid gap-3 sm:grid-cols-2">
                      <input type="hidden" name="id" value={p.id} />
                      <input name="name" defaultValue={p.name} className="input" aria-label="Nombre" required />
                      <select name="categoryId" defaultValue={p.category_id} className="input" aria-label="Categoría">
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <input name="price" defaultValue={(p.price_cents / 100).toFixed(2)} className="input" aria-label="Precio" required />
                      <input name="stock" defaultValue={p.stock ?? ""} className="input" aria-label="Stock" placeholder="Stock (vacío = ilimitado)" />
                      <input name="emoji" defaultValue={p.emoji} className="input" aria-label="Emoji" />
                      <input name="description" defaultValue={p.description} className="input" aria-label="Descripción" />
                      <button className="btn-primary sm:col-span-2">Guardar cambios</button>
                    </form>
                  </details>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
