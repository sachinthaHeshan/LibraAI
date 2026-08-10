import type { Metadata } from "next";
import { Manrope } from "next/font/google";

import { ChatProvider } from "@/components/ChatProvider";
import { readServerApiBaseUrl } from "@/lib/api-base-url";
import "./globals.css";

const display = Manrope({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "LibraAI | Library Management",
  description: "LibraAI library management system — catalogue, members, and loans.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const apiBaseUrl = readServerApiBaseUrl();
  const runtimeEnv = JSON.stringify({ NEXT_PUBLIC_API_URL: apiBaseUrl });

  return (
    <html lang="en" className={`${display.variable} h-full antialiased`}>
      <body className="min-h-full font-sans text-ink">
        <script
          // Dokploy runtime env → window.__ENV__ (NEXT_PUBLIC_* alone is build-time only)
          dangerouslySetInnerHTML={{
            __html: `window.__ENV__=${runtimeEnv};`,
          }}
        />
        <ChatProvider>{children}</ChatProvider>
      </body>
    </html>
  );
}
