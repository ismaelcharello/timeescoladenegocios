export function normalizeMaterialUrl(value: string) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function materialDeliveryUrl(material: {
  kind: "file" | "link";
  storageKey: string | null;
  externalUrl: string | null;
}) {
  if (material.kind === "file" && material.storageKey?.startsWith("materials/")) {
    return `/api/uploads?key=${encodeURIComponent(material.storageKey)}&download=1`;
  }
  return material.kind === "link" && material.externalUrl
    ? normalizeMaterialUrl(material.externalUrl) ?? ""
    : "";
}
