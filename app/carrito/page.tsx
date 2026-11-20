import type { Metadata } from "next";
import { CartView } from "@/components/cart-view";

export const metadata: Metadata = { title: "Carrito" };

export default function CartPage() {
  return (
    <main className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">Tu carrito</h1>
      <CartView />
    </main>
  );
}
