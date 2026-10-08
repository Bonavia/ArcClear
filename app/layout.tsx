import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ArcClear — USDC Net Settlement",
  description: "Clear shared obligations with less USDC funding and atomic settlement on Arc.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
