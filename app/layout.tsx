import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "thelist.cl — The list is short.",
  description:
    "Experiencias curadas en Chile. Acceso, criterio y cupos reales. Sin catálogos, sin ruido.",
  openGraph: {
    title: "thelist.cl",
    description: "The list is short. Experiencias curadas en Chile.",
    type: "website",
    locale: "es_CL",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
