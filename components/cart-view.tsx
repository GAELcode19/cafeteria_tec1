"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { setQuantity, useCart } from "@/lib/cart-store";
import { formatMXN } from "@/lib/money";
import { placeOrderAction } from "@/app/actions/orders";

export function CartView() {
  const { items, totalCents } = useCart();
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <div className="card text-center">
        <p className="text-muted">Tu carrito está vacío.</p>
        <Link href="/" className="btn-primary mt-4">
          Ver menú
        </Link>
      </div>
    );
  }

  function submit() {
    setError(undefined);
    startTransition(async () => {
      const result = await placeOrderAction(
        items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        notes,
      );
      // si todo sale bien la accion redirige, aqui solo llegan errores
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="grid gap-4">
      <ul className="grid gap-3">
        {items.map((i) => (
          <li key={i.productId} className="card flex items-center gap-3">
            <span className="text-3xl" aria-hidden>
              {i.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{i.name}</p>
              <p className="text-sm text-muted">{formatMXN(i.priceCents)} c/u</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn-ghost !px-3"
                aria-label={`Quitar uno de ${i.name}`}
                onClick={() => setQuantity(i.productId, i.quantity - 1)}
              >
                −
              </button>
              <span className="w-6 text-center" aria-live="polite">
                {i.quantity}
              </span>
              <button
                className="btn-ghost !px-3"
                aria-label={`Agregar uno de ${i.name}`}
                disabled={i.quantity >= i.maxQty}
                onClick={() => setQuantity(i.productId, i.quantity + 1)}
              >
                +
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* notas, total y boton de confirmar */}
      <div className="card grid gap-3">
        <div>
          <label htmlFor="notes" className="label">
            Notas para la cafetería (opcional)
          </label>
          <textarea
            id="notes"
            className="input py-2"
            rows={2}
            maxLength={200}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Sin cebolla, poca azúcar…"
          />
        </div>
        <p className="flex justify-between text-lg font-semibold">
          <span>Total</span>
          <span>{formatMXN(totalCents)}</span>
        </p>
        <p className="text-sm text-muted">El pago se realiza en caja al recoger tu pedido.</p>
        {error && (
          <p role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        )}
        <button className="btn-primary" onClick={submit} disabled={pending}>
          {pending ? "Enviando…" : "Confirmar pedido"}
        </button>
      </div>
    </div>
  );
}
