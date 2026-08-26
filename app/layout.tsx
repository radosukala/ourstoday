
import type { Metadata } from "next";
import "./globals.css";
import { LOCK_LINE } from "@/legal/documents";

export const metadata: Metadata = {
  title: "OURS TODAY \u00b7 Day 1",
  description:
    "OURS is forming toward member ownership and builds its software in public. Legal membership is not yet issued.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000"),
  openGraph: {
    type: "website",
    title: LOCK_LINE,
    description: "Forming toward member ownership and building its software in public.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "OURS TODAY. The network is ours. Everything else can be built." }],
  },
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23111111'/%3E%3Ctext x='16' y='22' font-family='monospace' font-size='17' fill='%23f3f0e8' text-anchor='middle'%3EO%3C/text%3E%3C/svg%3E",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

