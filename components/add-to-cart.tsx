"use client";

import { useState } from "react";
import { addToCart } from "@/lib/cart-store";

export function AddToCart(props: {
  productId: number;
  name: string;
  emoji: string;
  priceCents: number;
  maxQty: number;
}) {
  const [added, setAdded] = useState(false);
  return (
    <button
      type="button"
      className="btn-primary"
      onClick={() => {
        addToCart(props);
        setAdded(true);
        setTimeout(() => setAdded(false), 1200);
      }}
    >
      {added ? "✓ Agregado" : "Agregar"}
    </button>
  );
}
