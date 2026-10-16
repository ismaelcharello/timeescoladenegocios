import type { Metadata } from "next";
import LegalPage from "../legal-page";
import "../legal.css";

export const metadata: Metadata = { title: "Termos de Uso | TIME Escola de Negócios" };

const sections = [
  {
    title: "A plataforma",
    paragraphs: [
      "A TIME reúne cursos, aulas, materiais, comunidade, eventos, avaliações e recursos de evolução profissional. As funcionalidades disponíveis dependem do plano contratado e podem evoluir ao longo do tempo.",
      "O acesso é pessoal e intransferível. O membro deve manter seus dados corretos, proteger suas credenciais e informar qualquer uso não autorizado.",
    ],
  },
  {
    title: "Inscrição, pagamento e recorrência",
    paragraphs: [
      "Preços, periodicidade, período de teste e benefícios são apresentados antes da compra. Os pagamentos são processados pela Stripe em ambiente criptografado; a TIME não armazena os dados completos do cartão.",
      "Nos planos recorrentes, a cobrança é renovada automaticamente na periodicidade escolhida até o cancelamento. Falhas de pagamento podem suspender temporariamente o acesso.",
    ],
  },
  {
    title: "Cancelamento e reembolso",
    paragraphs: [
      "O membro pode solicitar o cancelamento pelos canais oficiais ou pela área de gerenciamento da assinatura. O cancelamento impede novas renovações.",
      "Pedidos de reembolso e direito de arrependimento serão analisados conforme a oferta e a legislação aplicável.",
    ],
  },
  {
    title: "Uso da comunidade",
    items: [
      "Tratar os demais membros com respeito e não praticar assédio ou discriminação.",
      "Não publicar conteúdo ilícito, enganoso, confidencial ou que viole direitos de terceiros.",
      "Não realizar spam, coleta indevida de contatos ou abordagens comerciais abusivas.",
      "Não compartilhar aulas, materiais ou acessos fora dos limites autorizados.",
    ],
  },
  {
    title: "Conteúdo e propriedade intelectual",
    paragraphs: [
      "A contratação concede uma licença limitada de uso pessoal dos conteúdos durante o período de acesso. Marcas, aulas, vídeos, textos e materiais continuam pertencendo aos respectivos titulares.",
    ],
  },
  {
    title: "Disponibilidade e atendimento",
    paragraphs: [
      "A TIME busca manter a plataforma estável e segura, mas manutenções e serviços de terceiros podem causar indisponibilidades pontuais. Resultados de negócio dependem da aplicação individual e não são garantidos.",
      "Dúvidas sobre acesso, cobrança, cancelamento ou estes termos podem ser enviadas pelos canais oficiais exibidos no site.",
    ],
  },
];

export default function Terms() {
  return <LegalPage kicker="REGRAS DA EXPERIÊNCIA" title="Termos de Uso" introduction="Estes termos organizam o uso da plataforma TIME Escola de Negócios. Ao criar uma conta ou contratar um plano, você declara que leu e concorda com estas condições." sections={sections} />;
}
