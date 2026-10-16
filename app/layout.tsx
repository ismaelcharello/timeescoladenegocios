import type { Metadata } from "next";
import PwaRegister from "./pwa-register";
import "./globals.css";
import "./platform.css";

export const metadata: Metadata = {
  title: "TIME Escola de Negócios | Conhecimento que vira movimento",
  description:
    "Cursos, networking e experiências para transformar conhecimento em resultado.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/icons/time-180.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TIME",
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
