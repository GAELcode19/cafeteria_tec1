"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-2xl font-bold">Algo salió mal</h1>
      <p className="mt-2 text-muted">Intenta de nuevo en unos segundos.</p>
      <button className="btn-primary mt-6" onClick={reset}>
        Reintentar
      </button>
    </main>
  );
}
