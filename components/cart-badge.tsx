"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-store";

export function CartBadge() {
  const { count } = useCart();
  return (
    <Link href="/carrito" className="btn-ghost relative" aria-label={`Carrito, ${count} productos`}>
      🛒
      {count > 0 && (
        <span className="rounded-full bg-brand px-2 py-0.5 text-xs text-brand-fg">{count}</span>
      )}
    </Link>
  );
}
