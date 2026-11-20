"use client";

import { useEffect } from "react";
import { clearCart } from "@/lib/cart-store";

// vacia el carrito despues de confirmar el pedido
export function ClearCart() {
  useEffect(() => {
    clearCart();
  }, []);
  return null;
}
