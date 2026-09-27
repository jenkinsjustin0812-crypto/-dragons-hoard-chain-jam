import "./globals.css";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dragon's Hoard",
  description:
    "A dark-fantasy extraction casino game where players wager, descend into a dragon's vault, manage risk, and extract their winnings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <script
          async
          src="https://jam.chain.wtf/widget.js"
        ></script>

        {children}
      </body>
    </html>
  );
}
