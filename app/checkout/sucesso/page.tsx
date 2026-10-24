import type { Metadata } from "next";
import { Suspense } from "react";
import SuccessClient from "./success-client";

export const metadata: Metadata = { title: "Inscrição confirmada | TIME Escola de Negócios" };

export default function CheckoutSuccess() {
  return (
    <main className="checkout-page checkout-success dark-lock">
      <div className="checkout-grid" aria-hidden="true" />
      <Suspense fallback={<div className="checkout-loading"><span />Confirmando sua inscrição…</div>}>
        <SuccessClient />
      </Suspense>
    </main>
  );
}
