"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";

export function AuthForm({
  action,
  mode,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  mode: "login" | "register";
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const register = mode === "register";
  return (
    <form action={formAction} className="card grid gap-4">
      {register && (
        <div>
          <label htmlFor="name" className="label">
            Nombre
          </label>
          <input id="name" name="name" className="input" autoComplete="name" required minLength={2} />
        </div>
      )}
      <div>
        <label htmlFor="email" className="label">
          Correo
        </label>
        <input id="email" name="email" type="email" className="input" autoComplete="email" required />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          autoComplete={register ? "new-password" : "current-password"}
          required
          minLength={register ? 8 : 1}
        />
        {register && <p className="mt-1 text-xs text-muted">Mínimo 8 caracteres.</p>}
      </div>
      {state?.error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {state.error}
        </p>
      )}
      <button className="btn-primary" disabled={pending}>
        {pending ? "Un momento…" : register ? "Crear cuenta" : "Entrar"}
      </button>
    </form>
  );
}
