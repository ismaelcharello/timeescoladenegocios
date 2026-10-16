import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TIME Escola de Negócios",
    short_name: "TIME",
    description:
      "Cursos, networking e experiências para transformar conhecimento em resultado.",
    start_url: "/app",
    display: "standalone",
    background_color: "#f5f6fb",
    theme_color: "#3700f0",
    orientation: "portrait",
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
        src: "/icons/time-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
