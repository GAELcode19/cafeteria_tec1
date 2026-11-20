import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { CartBadge } from "./cart-badge";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-brand">
          ☕ Cafetería Tec
        </Link>
        <div className="flex items-center gap-2">
          <CartBadge />
          <Suspense fallback={<span className="h-11 w-24" aria-hidden />}>
            <UserMenu />
          </Suspense>
        </div>
      </nav>
    </header>
  );
}

async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Link href="/login" className="btn-primary">
        Entrar
      </Link>
    );
  }
  return (
    <>
      {user.role !== "student" && (
        <Link href="/admin" className="btn-ghost">
          Panel
        </Link>
      )}
      <Link href="/pedidos" className="btn-ghost">
        Mis pedidos
      </Link>
      <form action={logoutAction}>
        <button className="btn-ghost" title={user.email}>
          Salir
        </button>
      </form>
    </>
  );
}
