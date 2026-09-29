"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

// Draft text. Must be reviewed by a lawyer before being treated as final.
const updatedAt = "29 de setembro de 2026";

const sections: { id: string; title: string; paragraphs: string[] }[] = [
  {
    id: "termos",
    title: "Termos de uso",
    paragraphs: [
      "O Evolink é uma plataforma que conecta profissionais de educação física e nutrição aos seus alunos para prescrição e acompanhamento de treino, dieta, cardio, hábitos e evolução física.",
      "Ao criar uma conta você declara ter pelo menos 18 anos, ou autorização de um responsável legal, e que as informações fornecidas são verdadeiras.",
      "O Evolink é uma ferramenta de apoio. Treinos, dietas e orientações são de responsabilidade exclusiva do profissional que os prescreve. Procure um médico antes de iniciar qualquer programa de exercícios ou alimentação.",
      "Profissionais se comprometem a atuar dentro das normas de seus conselhos (CREF, CRN) e a usar os dados dos alunos apenas para o acompanhamento contratado.",
      "É proibido publicar conteúdo ofensivo, discriminatório, ilegal, que viole direitos de terceiros ou que exponha outras pessoas sem consentimento. Conteúdos que violem estes termos podem ser removidos e a conta suspensa.",
      "Valores, cobranças e prazos combinados entre profissional e aluno são de responsabilidade das partes. O Evolink pode suspender o acesso do aluno quando o profissional assim configurar em caso de inadimplência.",
      "Eventos são cadastrados por profissionais. Datas, regulamentos e inscrições são responsabilidade da organização de cada evento; confirme sempre com ela.",
      "Caronas: o Evolink apenas conecta pessoas que vão ao mesmo evento. Não intermediamos pagamentos nem transporte; os combinados, inclusive a divisão de combustível, são de responsabilidade dos participantes.",
      "Avaliações de eventos são anônimas para o público, mas ficam vinculadas à conta de quem avaliou para evitar abusos. É proibido publicar ofensas, acusações sem fundamento ou dados pessoais de terceiros; avaliações assim podem ser removidas e a conta suspensa.",
      "Podemos atualizar estes termos. Mudanças relevantes serão comunicadas no aplicativo antes de entrarem em vigor.",
    ],
  },
  {
    id: "privacidade",
    title: "Política de privacidade",
    paragraphs: [
      "Tratamos seus dados conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).",
      "Coletamos dados de cadastro (nome, e-mail, telefone), dados de acompanhamento (peso, medidas, fotos de evolução, check-ins, treinos, refeições, cardio e hábitos) e dados técnicos necessários para o funcionamento do serviço.",
      "Dados de saúde e fotos de evolução são sensíveis. Eles ficam visíveis apenas para você e para o profissional com quem você tem vínculo ativo, e as fotos são armazenadas de forma privada.",
      "Usamos os dados para prestar o serviço, enviar notificações do acompanhamento e melhorar a plataforma. Não vendemos dados pessoais.",
      "Compartilhamos dados apenas com provedores necessários para operar o serviço (hospedagem, banco de dados e envio de e-mails), sob obrigações de confidencialidade.",
      "Você pode solicitar acesso, correção, portabilidade ou exclusão dos seus dados, e revogar consentimentos, pelo canal de contato abaixo.",
      "Mantemos os dados enquanto sua conta estiver ativa ou pelo prazo exigido por lei.",
    ],
  },
];

export function LegalPage() {
  const router = useRouter();
  return (
    <main className="min-h-[100dvh] bg-[#f5faf7] px-5 py-10 text-[#09251f]">
      <article className="mx-auto max-w-3xl">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-bold text-[#07845a]">
          <ArrowLeft size={16} />Voltar
        </button>
        <div className="mt-8 flex items-center gap-3">
          <span className="relative h-10 w-10 overflow-hidden rounded-2xl bg-[#07352b]">
            <Image src="/brand/evolink-mark-192.png" alt="Evolink" fill sizes="40px" className="scale-125 object-cover" />
          </span>
          <span className="text-xl font-bold tracking-tight">Evolink</span>
        </div>
        <h1 className="mt-8 text-3xl font-bold tracking-tight">Termos de uso e privacidade</h1>
        <p className="mt-2 text-sm text-[#5f746d]">Última atualização: {updatedAt}</p>
        <nav className="mt-6 flex gap-3 text-sm font-bold">
          {sections.map(section => <a key={section.id} href={`#${section.id}`} className="rounded-full bg-white px-4 py-2 text-[#07845a] shadow-sm">{section.title}</a>)}
        </nav>
        {sections.map(section => (
          <section key={section.id} id={section.id} className="mt-10 scroll-mt-6 rounded-3xl border border-[#e2ece6] bg-white p-6 soft-shadow">
            <h2 className="text-xl font-bold">{section.title}</h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-[#40564e]">
              {section.paragraphs.map(paragraph => <li key={paragraph}>{paragraph}</li>)}
            </ol>
          </section>
        ))}
        <p className="mt-8 text-sm text-[#5f746d]">Dúvidas ou solicitações sobre seus dados: <a href="mailto:admin@solairew.com.br" className="font-bold text-[#07845a]">admin@solairew.com.br</a></p>
      </article>
    </main>
  );
}
