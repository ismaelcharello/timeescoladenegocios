const supportWhatsappNumber = (process.env.NEXT_PUBLIC_TIME_SUPPORT_WHATSAPP ?? "").replace(/\D/g, "");

export function getSupportWhatsappHref(message?: string) {
  if (supportWhatsappNumber.length < 10) return null;
  const query = message?.trim() ? `?text=${encodeURIComponent(message.trim())}` : "";
  return `https://wa.me/${supportWhatsappNumber}${query}`;
}
