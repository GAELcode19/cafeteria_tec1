import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { loginAction } from "@/app/actions/auth";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-sm">
      <h1 className="mb-4 text-2xl font-bold">Entrar</h1>
      <AuthForm action={loginAction} mode="login" />
      <p className="mt-4 text-center text-sm text-muted">
        ¿Primera vez?{" "}
        <Link href="/registro" className="font-medium text-brand underline">
          Crea tu cuenta
        </Link>
      </p>
    </main>
  );
}
