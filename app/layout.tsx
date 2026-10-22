import type { Metadata, Viewport } from "next";
import PwaRegister from "./pwa-register";
import "./design-tokens.css";
import "./globals.css";
import "./platform.css";
import "./landing-refine.css";
import "./member-refine.css";
import "./app/member-frame.css";

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

// Resolve o tema (claro, escuro ou automático) antes da primeira pintura: sem flash.
// data-theme só existe com preferência explícita; data-resolved é sempre light|dark.
const themeScript = `try{var d=document.documentElement,m=matchMedia("(prefers-color-scheme: dark)"),a=function(){var p=localStorage.getItem("time-theme");if(p==="light"||p==="dark"){d.setAttribute("data-theme",p);d.setAttribute("data-resolved",p)}else{d.removeAttribute("data-theme");d.setAttribute("data-resolved",m.matches?"dark":"light")}};a();m.addEventListener("change",a);addEventListener("storage",a);addEventListener("time-theme-change",a)}catch(e){}`;

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
