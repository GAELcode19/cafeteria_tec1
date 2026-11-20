import Link from "next/link";

const LINKS = [
  { href: "/admin", label: "Pedidos" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/reportes", label: "Reportes" },
  { href: "/admin/usuarios", label: "Usuarios" },
];

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div>
      <nav aria-label="Administración" className="mb-6 flex gap-2 overflow-x-auto">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="btn-ghost shrink-0">
            {l.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
