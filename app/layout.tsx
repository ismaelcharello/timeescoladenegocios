import type { Metadata, Viewport } from "next";
import PwaRegister from "./pwa-register";
import "./design-tokens.css";
import "./globals.css";
import "./platform.css";
import "./landing-refine.css";

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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#050829" },
  ],
};

// Aplica o tema salvo antes da primeira pintura, evitando o flash de tema errado.
const themeScript = `try{var t=localStorage.getItem("time-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
