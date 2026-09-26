import "./globals.css";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dragon's Hoard",
  description:
    "A dark-fantasy extraction casino game on Chain.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}