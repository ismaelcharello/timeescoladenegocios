import type { Metadata } from "next";
import LegalPage from "../legal-page";
import "../legal.css";

export const metadata: Metadata = { title: "Política de Privacidade | TIME Escola de Negócios" };

const sections = [
  {
    title: "Dados que tratamos",
    items: [
      "Dados de cadastro, como nome, e-mail, telefone e informações de perfil.",
      "Dados da assinatura e do pagamento, como plano, situação da cobrança e identificadores da Stripe.",
      "Dados de uso, como aulas assistidas, progresso, avaliações, conquistas e tempo de permanência.",
      "Conteúdo publicado na comunidade e dados técnicos necessários à segurança.",
    ],
  },
  {
    title: "Por que usamos esses dados",
    paragraphs: [
      "Tratamos dados para criar e proteger a conta, processar a contratação, liberar conteúdos, registrar o progresso, personalizar recomendações, operar a comunidade, prestar suporte e enviar comunicações relacionadas ao serviço.",
    ],
  },
  {
    title: "Pagamento e fornecedores",
    paragraphs: [
      "Os dados completos do cartão são enviados diretamente à Stripe. A TIME recebe apenas informações necessárias para conciliar a compra, administrar a assinatura e controlar o acesso.",
      "Fornecedores de hospedagem, autenticação, armazenamento e comunicação recebem somente os dados necessários à função contratada.",
    ],
  },
  {
    title: "Comunidade e visibilidade",
    paragraphs: [
      "Nome, foto, biografia e conteúdo publicado podem ser exibidos a outros membros. Informações de pagamento e dados privados de conta não são exibidos publicamente.",
    ],
  },
  {
    title: "Segurança e conservação",
    paragraphs: [
      "Adotamos controles técnicos e organizacionais compatíveis com as informações tratadas. Os dados são mantidos pelo tempo necessário para prestar o serviço, cumprir obrigações e exercer direitos.",
    ],
  },
  {
    title: "Seus direitos",
    paragraphs: [
      "Você pode solicitar confirmação e acesso, correção, informações sobre compartilhamento, portabilidade quando aplicável, oposição e exclusão ou anonimização nos casos previstos em lei.",
    ],
  },
  {
    title: "Contato e atualizações",
    paragraphs: [
      "Solicitações de privacidade podem ser feitas pelos canais oficiais da TIME. Esta política poderá ser atualizada quando houver mudanças na operação, nos fornecedores ou na legislação.",
    ],
  },
];

export default function Privacy() {
  return <LegalPage kicker="DADOS E TRANSPARÊNCIA" title="Política de Privacidade" introduction="Esta política explica quais dados pessoais são tratados na experiência TIME, para quais finalidades e como você pode exercer seus direitos." sections={sections} />;
}
