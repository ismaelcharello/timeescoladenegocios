import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import CheckoutClient from "./checkout-client";

export const metadata: Metadata = {
  title: "Inscrição | TIME Escola de Negócios",
  description: "Faça sua inscrição na TIME Escola de Negócios com pagamento seguro.",
};

export default async function CheckoutPage() {
  await requireUser("/checkout");
  return <CheckoutClient />;
}
