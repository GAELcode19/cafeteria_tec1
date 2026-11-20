import type { OrderStatus } from "@/lib/validation";

const STYLE: Record<OrderStatus, { label: string; cls: string }> = {
  pendiente: { label: "Pendiente", cls: "bg-warn/15 text-warn" },
  preparando: { label: "Preparando", cls: "bg-brand-soft text-brand" },
  listo: { label: "¡Listo para recoger!", cls: "bg-ok/15 text-ok" },
  entregado: { label: "Entregado", cls: "bg-border text-muted" },
  cancelado: { label: "Cancelado", cls: "bg-danger/15 text-danger" },
};

export function statusLabel(s: OrderStatus) {
  return STYLE[s].label;
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const s = STYLE[status];
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${s.cls}`}>{s.label}</span>
  );
}
