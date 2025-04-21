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
      <body className={`${inter.className} bg-gradient-to-br from-green-400 to-blue-500 dark:from-blue-900 dark:to-purple-800 text-black dark:text-white`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
