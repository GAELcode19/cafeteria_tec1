import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Cafetería Tec", template: "%s · Cafetería Tec" },
  description: "Haz tu pedido en la cafetería del Tec y recógelo sin filas.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</div>
        <footer className="border-t border-border py-6 text-center text-sm text-muted">
          Cafetería Tec · Pago en caja al recoger tu pedido
        </footer>
      </body>
    </html>
  );
}
