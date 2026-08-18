import type { Metadata } from "next";
import { Manrope } from "next/font/google";

import { ChatProvider } from "@/components/ChatProvider";
import "./globals.css";

const display = Manrope({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "LibraAI | AI Library Management",
  description:
    "Run your library desk with AI — catalogue, members, loans, and plans from LKR 3,000/mo.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} h-full antialiased`}>
      <body className="min-h-full font-sans text-ink">
        <ChatProvider>{children}</ChatProvider>
      </body>
    </html>
  );
}
