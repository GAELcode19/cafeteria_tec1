import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md py-16 text-center">
      <p className="text-5xl" aria-hidden>☕</p>
      <h1 className="mt-4 text-2xl font-bold">No encontramos esa página</h1>
      <Link href="/" className="btn-primary mt-6">
        Volver al menú
      </Link>
    </main>
  );
}
