export const CURRENT_LEGAL_DOCUMENTS = {
  terms_of_use: {
    version: "2026-09-09",
    reference: "/termos",
    requiredForCheckout: true,
  },
  privacy_policy: {
    version: "2026-09-09",
    reference: "/privacidade",
    requiredForCheckout: true,
  },
} as const;

export type CheckoutDocumentType = keyof typeof CURRENT_LEGAL_DOCUMENTS;

export const CHECKOUT_DOCUMENT_TYPES = Object.keys(CURRENT_LEGAL_DOCUMENTS) as CheckoutDocumentType[];
