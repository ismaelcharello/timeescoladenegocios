export const courseThumbnailLibrary = [
  { id: "welcome", label: "Boas-vindas", category: "Institucional", src: "/course-thumbnails/time-welcome.webp" },
  { id: "leadership", label: "Liderança", category: "Liderança", src: "/course-thumbnails/time-leadership.webp" },
  { id: "sales", label: "Vendas", category: "Vendas", src: "/course-thumbnails/time-sales.webp" },
  { id: "communication", label: "Comunicação", category: "Comunicação", src: "/course-thumbnails/time-communication.webp" },
  { id: "management", label: "Gestão", category: "Gestão", src: "/course-thumbnails/time-management.webp" },
  { id: "business", label: "Negócios", category: "Negócios", src: "/course-thumbnails/time-business.webp" },
  { id: "personal-development", label: "Desenvolvimento pessoal", category: "Desenvolvimento pessoal", src: "/course-thumbnails/time-personal-development.webp" },
  { id: "strategy", label: "Estratégia", category: "Estratégia", src: "/course-thumbnails/time-strategy.webp" },
  { id: "networking", label: "Networking", category: "Networking", src: "/course-thumbnails/time-networking.webp" },
  { id: "innovation", label: "Inovação", category: "Inovação", src: "/course-thumbnails/time-innovation.webp" },
] as const;

export function courseThumbnailForCategory(category: string) {
  const normalized = category.trim().toLocaleLowerCase("pt-BR");
  return courseThumbnailLibrary.find((item) => item.category.toLocaleLowerCase("pt-BR") === normalized)?.src
    ?? courseThumbnailLibrary.find((item) => normalized.includes(item.id.replace("-", " ")))?.src
    ?? courseThumbnailLibrary[0].src;
}
