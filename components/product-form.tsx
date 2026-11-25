"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createProductAction } from "@/app/actions/admin";
import type { Category } from "@/lib/menu";
import { ImagePicker } from "./image-picker";

export function NewProductForm({ categories }: { categories: Category[] }) {
  const [state, action, pending] = useActionState(createProductAction, undefined);
  // al guardar bien, se limpia la foto elegida
  const [pickerKey, setPickerKey] = useState(0);
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) setPickerKey((k) => k + 1);
    wasPending.current = pending;
  }, [pending, state]);
  return (
    <form action={action} className="card grid gap-3 sm:grid-cols-2">
      <h2 className="text-lg font-semibold sm:col-span-2">Nuevo producto</h2>
      <div>
        <label htmlFor="np-name" className="label">Nombre</label>
        <input id="np-name" name="name" className="input" required minLength={2} maxLength={80} />
      </div>
      <div>
        <label htmlFor="np-cat" className="label">Categoría</label>
        <select id="np-cat" name="categoryId" className="input" required>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="np-price" className="label">Precio (MXN)</label>
        <input id="np-price" name="price" inputMode="decimal" className="input" required placeholder="35.00" />
      </div>
      <div>
        <label htmlFor="np-stock" className="label">Stock (vacío = ilimitado)</label>
        <input id="np-stock" name="stock" inputMode="numeric" className="input" placeholder="20" />
      </div>
      <div>
        <label htmlFor="np-emoji" className="label">Emoji</label>
        <input id="np-emoji" name="emoji" className="input" maxLength={8} placeholder="🥪" />
      </div>
      <div>
        <label htmlFor="np-desc" className="label">Descripción</label>
        <input id="np-desc" name="description" className="input" maxLength={200} />
      </div>
      <div className="sm:col-span-2">
        <ImagePicker key={pickerKey} />
      </div>
      {state?.error && (
        <p role="alert" className="text-sm font-medium text-danger sm:col-span-2">{state.error}</p>
      )}
      <button className="btn-primary sm:col-span-2" disabled={pending}>
        {pending ? "Guardando…" : "Agregar producto"}
      </button>
    </form>
  );
}
