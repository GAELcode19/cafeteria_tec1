const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

export function formatMXN(cents: number): string {
  return mxn.format(cents / 100);
}

// "35.50" o "35,5" a centavos, null si no es valido
export function parsePriceToCents(input: string): number | null {
  const n = Number(input.trim().replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > 100000) return null;
  return Math.round(n * 100);
}
