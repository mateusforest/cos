"use client"

import { use, useEffect } from "react"
import Link from "next/link"
import { ArrowRight, BarChart3, Box, Briefcase, FileSignature, Receipt, ShoppingCart, TrendingUp, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { PortalHeader } from "@/components/portal/portal-header"
import { PortalModulePage } from "@/components/portal/portal-module-page"
import { ClientsManager } from "@/components/operations/clients-manager"
import { DocumentsManager } from "@/components/operations/documents-manager"
import { FinancialManager } from "@/components/operations/financial-manager"
import { MeetingsManager } from "@/components/operations/meetings-manager"
import { OperationsManager } from "@/components/operations/operations-manager"
import { SupportWorkspaceCenter } from "@/components/support/support-workspace-center"
import { getCosAreaSourceByKey } from "@/lib/area-configs"
import { SystemActivityManager } from "@/components/portal/system-activity-manager"

const SECTION_META: Record<string, { title: string; description: string; ctaLabel: string; emptyLabel: string; listHref: string }> = {
  conversas: {
    title: "Conversas",
    description: "Acompanhe conversas e solicitacoes do portal em um so lugar.",
    ctaLabel: "Nova conversa",
    emptyLabel: "Nenhuma conversa registrada ainda.",
    listHref: "/portal/conversas",
  },
  cadastros: {
    title: "Cadastros",
    description: "Gerencie clientes, contatos e relacionamentos.",
    ctaLabel: "Novo cliente",
    emptyLabel: "Nenhum cadastro disponivel ainda.",
    listHref: "/portal/cadastros",
  },
  operacoes: {
    title: "Operacoes",
    description: "Organize processos, atendimentos e fluxos operacionais.",
    ctaLabel: "Nova operacao",
    emptyLabel: "Nenhuma operacao cadastrada ainda.",
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
    description: "Centralize documentos, termos e contratos da operacao.",
    ctaLabel: "Novo documento",
    emptyLabel: "Nenhum documento disponivel ainda.",
    listHref: "/portal/documentos",
  },
  reunioes: {
    title: "Reunioes",
    description: "Organize reunioes, gravacoes e resumos do COS Meet.",
    ctaLabel: "Nova reuniao",
    emptyLabel: "Nenhuma reuniao registrada ainda.",
    listHref: "/portal/reunioes",
  },
  relatorios: {
    title: "Relatorios",
    description: "Visualize relatorios e indicadores do seu negocio.",
    ctaLabel: "Novo relatorio",
    emptyLabel: "Nenhum relatorio disponivel ainda.",
    listHref: "/portal/relatorios",
  },
  propostas: {
    title: "Propostas",
    description: "Gerencie propostas comerciais do portal.",
    ctaLabel: "Nova proposta",
    emptyLabel: "Nenhuma proposta cadastrada ainda.",
    listHref: "/portal/propostas",
  },
  contratos: {
    title: "Contratos",
    description: "Gerencie contratos e documentos formais.",
    ctaLabel: "Novo contrato",
    emptyLabel: "Nenhum contrato disponivel ainda.",
    listHref: "/portal/contratos",
  },
  atendimentos: {
    title: "Atendimentos",
    description: "Acompanhe atendimentos e demandas operacionais.",
    ctaLabel: "Novo atendimento",
    emptyLabel: "Nenhum atendimento registrado ainda.",
    listHref: "/portal/atendimentos",
  },
  balanco: {
    title: "Balanco",
    description: "Visualize o balanco consolidado do periodo.",
    ctaLabel: "Novo lancamento",
    emptyLabel: "Nenhum balanco disponivel ainda.",
    listHref: "/portal/financeiro/balanco",
  },
}

const CADASTROS_SECTIONS = [
  {
    key: "clientes",
    title: "Clientes",
    description: "Gerencie clientes e relacionamentos reais do seu workspace.",
    href: "/portal/cadastros/clientes",
    icon: Users,
  },
  {
    key: "leads",
    title: "Leads",
    description: "Acompanhe leads por aqui assim que a persistencia real deste modulo estiver conectada.",
    href: "/portal/cadastros/leads",
    icon: Users,
  },
  {
    key: "produtos",
    title: "Produtos",
    description: "Acompanhe produtos por aqui assim que a persistencia real deste modulo estiver conectada.",
    href: "/portal/cadastros/produtos",
    icon: Box,
  },
  {
    key: "servicos",
    title: "Servicos",
    description: "Acompanhe servicos por aqui assim que a persistencia real deste modulo estiver conectada.",
    href: "/portal/cadastros/servicos",
    icon: Briefcase,
  },
] as const

const VENDAS_SECTIONS = [
  {
    key: "negociacoes",
    title: "Negociacoes",
    description: "Acompanhe negociacoes por aqui assim que a persistencia real deste modulo estiver conectada.",
    href: "/portal/vendas/negociacoes",
    icon: Briefcase,
  },
  {
    key: "propostas",
    title: "Propostas",
    description: "Gerencie propostas reais do seu workspace.",
    href: "/portal/vendas/propostas",
    icon: FileSignature,
  },
  {
    key: "pedidos",
    title: "Pedidos",
    description: "Acompanhe pedidos por aqui assim que a persistencia real deste modulo estiver conectada.",
    href: "/portal/vendas/pedidos",
    icon: Receipt,
  },
  {
    key: "vendas",
    title: "Vendas",
    description: "Acompanhe vendas por aqui assim que a persistencia real deste modulo estiver conectada.",
    href: "/portal/vendas/vendas",
    icon: ShoppingCart,
  },
  {
    key: "funil",
    title: "Funil",
    description: "Visualize o funil por aqui assim que a persistencia real deste modulo estiver conectada.",
    href: "/portal/vendas/funil",
    icon: BarChart3,
  },
] as const

function titleize(slug: string) {
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ")
}

function metaForDocumentKey(key: string) {
  if (key === "contratos") {
    return {
      title: "Contratos",
      description: "Gerencie contratos reais do seu workspace.",
    }
  }

  if (key === "propostas") {
    return {
      title: "Propostas",
      description: "Centralize propostas reais e acompanhe seus rascunhos e envios.",
    }
  }

  if (key === "relatorios") {
    return {
      title: "Relatorios",
      description: "Acompanhe relatorios reais salvos no seu workspace.",
    }
  }

  return {
    title: "Documentos",
    description: "Centralize documentos reais do seu workspace.",
  }
}

export default function PortalSectionPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = use(params)
  const router = useRouter()
  const key = slug[slug.length - 1]
  const salesSubsection = slug[0] === "vendas" && slug.length > 1 ? slug[1] : null
  const sharedArea = getCosAreaSourceByKey(key)

  useEffect(() => {
    if (sharedArea?.portalStatus === "redirect") {
      router.replace(sharedArea.portalDestination)
    }
  }, [router, sharedArea])

  if (sharedArea?.portalStatus === "redirect") {
    return null
  }

  if (key === "cadastros") {
    return (
      <div className="flex-1 flex flex-col h-full">
        <PortalHeader />
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-[#0a0a0a]">Cadastros</h1>
              <p className="text-sm text-gray-500">Acesse clientes, leads, produtos e servicos do seu workspace.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {CADASTROS_SECTIONS.map((section) => (
                <Link
                  key={section.key}
                  href={section.href}
                  className="rounded-2xl border border-gray-100 bg-white p-5 transition-colors hover:bg-gray-50"
                >
                  <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-50">
                    <section.icon className="h-5 w-5 text-[#0a0a0a]" />
                  </span>
                  <p className="text-base font-semibold text-[#0a0a0a]">{section.title}</p>
                  <p className="mt-2 text-sm text-gray-500">{section.description}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#0a0a0a]">
                    Abrir modulo
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (key === "clientes") {
    return (
      <div className="flex-1 flex flex-col h-full">
        <PortalHeader />
        <ClientsManager
          title="Clientes"
          description="Gerencie clientes e relacionamentos reais do seu workspace."
          variant="portal"
        />
      </div>
    )
  }

  if (key === "leads") {
    return (
      <PortalModulePage
        title="Leads"
        description="Consulte os leads do portal por aqui quando a persistencia real deste modulo estiver conectada."
        emptyLabel="Nenhum lead disponivel ainda. Este modulo ainda nao possui persistencia real conectada neste workspace."
        listHref="/portal/cadastros"
      />
    )
  }

  if (key === "produtos") {
    return (
      <PortalModulePage
        title="Produtos"
        description="Consulte os produtos do portal por aqui quando a persistencia real deste modulo estiver conectada."
        emptyLabel="Nenhum produto disponivel ainda. Este modulo ainda nao possui persistencia real conectada neste workspace."
        listHref="/portal/cadastros"
      />
    )
  }

  if (key === "servicos") {
    return (
      <PortalModulePage
        title="Servicos"
        description="Consulte os servicos do portal por aqui quando a persistencia real deste modulo estiver conectada."
        emptyLabel="Nenhum servico disponivel ainda. Este modulo ainda nao possui persistencia real conectada neste workspace."
        listHref="/portal/cadastros"
      />
    )
  }

  if (key === "balanco") {
    return (
      <div className="flex-1 flex flex-col h-full">
        <PortalHeader />
        <FinancialManager
          title="Balanco"
          description="Visualize o balanco consolidado do seu workspace com dados reais."
          variant="portal"
        />
      </div>
    )
  }

  if (key === "operacoes") {
    return (
      <div className="flex-1 flex flex-col h-full">
        <PortalHeader />
        <OperationsManager
          title="Operacoes"
          description="Organize processos, atendimentos e fluxos operacionais com dados reais."
          variant="portal"
        />
      </div>
    )
  }

  if (key === "vendas") {
    if (salesSubsection === "propostas") {
      return (
        <div className="flex-1 flex flex-col h-full">
          <PortalHeader />
          <DocumentsManager
            title="Propostas"
            description="Centralize propostas reais e acompanhe seus rascunhos e envios."
            variant="portal"
            filterType="propostas"
          />
        </div>
      )
    }

    if (salesSubsection === "negociacoes" || salesSubsection === "pedidos" || salesSubsection === "funil" || salesSubsection === "vendas") {
      const titles: Record<string, { title: string; description: string; emptyLabel: string }> = {
        negociacoes: {
          title: "Negociacoes",
          description: "Consulte negociacoes do portal por aqui quando a persistencia real deste modulo estiver conectada.",
          emptyLabel: "Nenhuma negociacao disponivel ainda. Este modulo ainda nao possui persistencia real conectada neste workspace.",
        },
        pedidos: {
          title: "Pedidos",
          description: "Consulte pedidos do portal por aqui quando a persistencia real deste modulo estiver conectada.",
          emptyLabel: "Nenhum pedido disponivel ainda. Este modulo ainda nao possui persistencia real conectada neste workspace.",
        },
        vendas: {
          title: "Vendas",
          description: "Consulte vendas do portal por aqui quando a persistencia real deste modulo estiver conectada.",
          emptyLabel: "Nenhuma venda disponivel ainda. Este modulo ainda nao possui persistencia real conectada neste workspace.",
        },
        funil: {
          title: "Funil",
          description: "Consulte o funil do portal por aqui quando a persistencia real deste modulo estiver conectada.",
          emptyLabel: "Nenhum dado de funil disponivel ainda. Este modulo ainda nao possui persistencia real conectada neste workspace.",
        },
      }

      const meta = titles[salesSubsection]

      return (
        <PortalModulePage
          title={meta.title}
          description={meta.description}
          emptyLabel={meta.emptyLabel}
          listHref="/portal/vendas"
        />
      )
    }

    return (
      <div className="flex-1 flex flex-col h-full">
        <PortalHeader />
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-[#0a0a0a]">Vendas</h1>
              <p className="text-sm text-gray-500">Acesse negociacoes, propostas, pedidos, vendas e funil do seu workspace.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              {VENDAS_SECTIONS.map((section) => (
                <Link
                  key={section.key}
                  href={section.href}
                  className="rounded-2xl border border-gray-100 bg-white p-5 transition-colors hover:bg-gray-50"
                >
                  <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-50">
                    <section.icon className="h-5 w-5 text-[#0a0a0a]" />
                  </span>
                  <p className="text-base font-semibold text-[#0a0a0a]">{section.title}</p>
                  <p className="mt-2 text-sm text-gray-500">{section.description}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#0a0a0a]">
                    Abrir modulo
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (key === "marketing") {
    return (
      <PortalModulePage
        title="Marketing"
        description="Acompanhe campanhas e iniciativas de marketing por aqui, sem depender do fluxo de chat."
        emptyLabel="Nenhuma acao de marketing disponivel ainda."
        listHref="/portal/marketing"
      />
    )
  }

  if (key === "documentos" || key === "contratos" || key === "propostas" || key === "relatorios") {
    const meta = metaForDocumentKey(key)

    return (
      <div className="flex-1 flex flex-col h-full">
        <PortalHeader />
        <DocumentsManager
          title={meta.title}
          description={meta.description}
          variant="portal"
          filterType={key}
        />
      </div>
    )
  }

  if (key === "reunioes") {
    return (
      <div className="flex-1 flex flex-col h-full">
        <PortalHeader />
        <MeetingsManager
          title="Reunioes"
          description="Gerencie gravacoes, resumos e proximos passos reais do COS Meet."
          variant="portal"
        />
      </div>
    )
  }

  if (key === "suporte" || key === "atendimentos") {
    return (
      <div className="flex-1 flex flex-col h-full">
        <PortalHeader />
        <div className="flex-1 overflow-y-auto">
          <SupportWorkspaceCenter />
        </div>
      </div>
    )
  }

  if (key === "sistema") {
    return (
      <div className="flex-1 flex flex-col h-full">
        <PortalHeader />
        <div className="flex-1 overflow-y-auto">
          <SystemActivityManager />
        </div>
      </div>
    )
  }

  const meta = SECTION_META[key] ?? {
    title: titleize(key),
    description: "Gerencie esta area do portal com busca, filtros e acao principal.",
    ctaLabel: "Nova acao",
    emptyLabel: "Nenhum registro disponivel ainda.",
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
