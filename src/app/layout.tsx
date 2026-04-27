import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Studora",
  description: "Plataforma de estudos para concursos",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${plusJakartaSans.variable} ${jetBrainsMono.variable}`}>
      <body className="antialiased font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
