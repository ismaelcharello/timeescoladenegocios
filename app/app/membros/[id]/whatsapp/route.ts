import { redirect } from "next/navigation";
import { requireNetworkingAccess } from "@/lib/networking-access";
import { createAuthorizedDirectoryClient } from "@/lib/supabase/directory";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/app/membros");
  await requireNetworkingAccess(`/app/membros/${id}/whatsapp`);
  const supabase = await createAuthorizedDirectoryClient();
  if (!supabase) redirect(`/app/membros/${id}`);
  const { data: whatsapp } = await supabase.rpc("get_member_whatsapp", { target_user_id: id });
  const phone = (whatsapp ?? "").replace(/\D/g, "");
  if (!phone) redirect(`/app/membros/${id}?contato=indisponivel`);

  const message = encodeURIComponent("Olá, encontrei seu perfil na comunidade da TIME Escola de Negócios e gostaria de conversar.");
  return new Response(null, { status: 303, headers: { Location: `https://wa.me/${phone}?text=${message}`, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
}
