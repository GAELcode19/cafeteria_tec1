"use client";

import { useSyncExternalStore } from "react";

export type CartItem = {
  productId: number;
  name: string;
  emoji: string;
  priceCents: number;
  quantity: number;
  maxQty: number; // tope por stock o 20
};

const KEY = "cafeteria_cart_v1";
const EMPTY: CartItem[] = [];
let cache: { raw: string | null; items: CartItem[] } = { raw: null, items: EMPTY };
const listeners = new Set<() => void>();

function read(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === cache.raw) return cache.items;
    const parsed = raw ? (JSON.parse(raw) as CartItem[]) : EMPTY;
    cache = { raw, items: Array.isArray(parsed) ? parsed : EMPTY };
    return cache.items;
  } catch {
    return EMPTY;
  }
}

function write(items: CartItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // sin localStorage, el carrito solo vive en memoria
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export function useCart() {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);
  return {
    items,
    count: items.reduce((n, i) => n + i.quantity, 0),
    totalCents: items.reduce((n, i) => n + i.quantity * i.priceCents, 0),
  };
}

export function addToCart(item: Omit<CartItem, "quantity">) {
  const items = read();
  const found = items.find((i) => i.productId === item.productId);
  if (found) {
    write(
      items.map((i) =>
        i.productId === item.productId
          ? { ...i, ...item, quantity: Math.min(i.quantity + 1, item.maxQty) }
          : i,
      ),
    );
  } else {
    write([...items, { ...item, quantity: 1 }]);
  }
}

export function setQuantity(productId: number, quantity: number) {
  const items = read();
  if (quantity <= 0) return write(items.filter((i) => i.productId !== productId));
  write(items.map((i) => (i.productId === productId ? { ...i, quantity: Math.min(quantity, i.maxQty) } : i)));
}

export function clearCart() {
  write(EMPTY);
}
