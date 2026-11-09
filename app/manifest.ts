import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TIME Escola de Negócios",
    short_name: "TIME",
    description:
      "Cursos, networking e experiências para transformar conhecimento em resultado.",
    // `id` fixa a identidade do app: sem ele, mudar o start_url instalaria uma
    // SEGUNDA cópia em vez de atualizar a primeira.
    id: "/app",
    lang: "pt-BR",
    scope: "/",
    start_url: "/app",
    categories: ["education", "business", "productivity"],
    display: "standalone",
    background_color: "#f5f6fb",
    theme_color: "#3700f0",
    orientation: "portrait",
    // Atalhos ao segurar o ícone no Android: caminho curto para o que mais se usa.
    shortcuts: [
      { name: "Cursos", short_name: "Cursos", url: "/app/cursos" },
      { name: "Eventos e ingressos", short_name: "Eventos", url: "/app/eventos" },
      { name: "Comunidade", short_name: "Comunidade", url: "/app/comunidade" },
    ],
    icons: [
      {
        src: "/icons/time-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/time-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        // Versão com margem de segurança: o Android recorta o ícone adaptável em
        // círculo, e o mesmo arquivo do ícone normal cortava as pontas do logo.
        src: "/icons/time-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
