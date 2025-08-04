import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";

// Google font
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Leafs - Plant Disease Identifier",
  description: "Upload leaf images to identify plant diseases and pests. Powered by AI!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen gradient-mesh`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <div className="min-h-screen bg-gradient-to-br from-slate-50/90 via-blue-50/80 to-indigo-100/90 dark:from-slate-900/90 dark:via-slate-800/80 dark:to-slate-900/90">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
