import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { registerAction } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegisterPage() {
  return (
    <main className="mx-auto max-w-sm">
      <h1 className="mb-4 text-2xl font-bold">Crear cuenta</h1>
      <AuthForm action={registerAction} mode="register" />
      <p className="mt-4 text-center text-sm text-muted">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-brand underline">
          Entra aquí
        </Link>
      </p>
    </main>
  );
}
