"use client"

import { use } from "react"
import { PortalModulePage } from "@/components/portal/portal-module-page"

const SECTION_META: Record<string, { title: string; description: string; ctaLabel: string; emptyLabel: string; listHref: string }> = {
  conversas: {
    title: "Conversas",
    description: "Acompanhe conversas e solicitações do portal em um só lugar.",
    ctaLabel: "Nova conversa",
    emptyLabel: "Nenhuma conversa registrada ainda.",
    listHref: "/portal/conversas",
  },
  cadastros: {
    title: "Cadastros",
    description: "Gerencie clientes, contatos e relacionamentos.",
    ctaLabel: "Novo cliente",
    emptyLabel: "Nenhum cadastro disponível ainda.",
    listHref: "/portal/cadastros",
  },
  operacoes: {
    title: "Operações",
    description: "Organize processos, atendimentos e fluxos operacionais.",
    ctaLabel: "Nova operação",
    emptyLabel: "Nenhuma operação cadastrada ainda.",
    listHref: "/portal/operacoes",
  },
  vendas: {
    title: "Vendas",
    description: "Acompanhe propostas, pipeline e desempenho comercial.",
    ctaLabel: "Nova proposta",
    emptyLabel: "Nenhuma oportunidade registrada ainda.",
    listHref: "/portal/vendas",
  },
  documentos: {
    title: "Documentos",
    description: "Centralize documentos, termos e contratos da operação.",
    ctaLabel: "Novo documento",
    emptyLabel: "Nenhum documento disponível ainda.",
    listHref: "/portal/documentos",
  },
  reunioes: {
    title: "Reuniões",
    description: "Organize reuniões, gravações e resumos do COS Meet.",
    ctaLabel: "Nova reunião",
    emptyLabel: "Nenhuma reunião registrada ainda.",
    listHref: "/portal/reunioes",
  },
  relatorios: {
    title: "Relatórios",
    description: "Visualize relatórios e indicadores do seu negócio.",
    ctaLabel: "Novo relatório",
    emptyLabel: "Nenhum relatório disponível ainda.",
    listHref: "/portal/relatorios",
  },
  propostas: {
    title: "Propostas",
    description: "Gerencie propostas comerciais do portal.",
    ctaLabel: "Nova proposta",
    emptyLabel: "Nenhuma proposta cadastrada ainda.",
    listHref: "/portal/vendas/propostas",
  },
  contratos: {
    title: "Contratos",
    description: "Gerencie contratos e documentos formais.",
    ctaLabel: "Novo contrato",
    emptyLabel: "Nenhum contrato disponível ainda.",
    listHref: "/portal/documentos/contratos",
  },
  atendimentos: {
    title: "Atendimentos",
    description: "Acompanhe atendimentos e demandas operacionais.",
    ctaLabel: "Novo atendimento",
    emptyLabel: "Nenhum atendimento registrado ainda.",
    listHref: "/portal/operacoes/atendimentos",
  },
  balanco: {
    title: "Balanço",
    description: "Visualize o balanço consolidado do período.",
    ctaLabel: "Novo lançamento",
    emptyLabel: "Nenhum balanço disponível ainda.",
    listHref: "/portal/financeiro/balanco",
  },
}

function titleize(slug: string) {
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ")
}

export default function PortalSectionPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = use(params)
  const key = slug[slug.length - 1]
  const meta = SECTION_META[key] ?? {
    title: titleize(key),
    description: "Gerencie esta área do portal com busca, filtros e ação principal.",
    ctaLabel: "Nova ação",
    emptyLabel: "Nenhum registro disponível ainda.",
    listHref: `/portal/${slug.join("/")}`,
  }

  return (
    <PortalModulePage
      title={meta.title}
      description={meta.description}
      ctaLabel={meta.ctaLabel}
      emptyLabel={meta.emptyLabel}
      listHref={meta.listHref}
    />
  )
}
