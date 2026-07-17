"use client"

import { use, useEffect, useMemo } from "react"
import Link from "next/link"
import { ArrowRight, BarChart3, Box, Briefcase, FileSignature, Receipt, ShoppingCart, TrendingUp, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { PortalHeader } from "@/components/portal/portal-header"
import { PortalModulePage } from "@/components/portal/portal-module-page"
import type { QuickActionType } from "@/components/portal/portal-interactions"
import { ClientsManager } from "@/components/operations/clients-manager"
import { DocumentsManager } from "@/components/operations/documents-manager"
import { FinancialManager } from "@/components/operations/financial-manager"
import { MeetingsManager } from "@/components/operations/meetings-manager"
import { OperationsManager } from "@/components/operations/operations-manager"
import { SupportWorkspaceCenter } from "@/components/support/support-workspace-center"
import { getCosAreaSourceByKey, slug as slugify } from "@/lib/area-configs"
import { SystemActivityManager } from "@/components/portal/system-activity-manager"
import { useOperationsTemplatePreview } from "@/components/operations/operations-template-preview"

type SectionMeta = {
  title: string
  description: string
  ctaLabel: string
  emptyLabel: string
  listHref: string
  ctaType?: QuickActionType
}

const SECTION_META: Record<string, SectionMeta> = {
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

const SALES_ROUTE_ORDER = VENDAS_SECTIONS.map((section) => section.key)

type SessionPortalMeta = {
  description: string
  emptyLabel: string
  ctaLabel?: string
  ctaType?: QuickActionType
}

const SESSION_PORTAL_META: Record<string, SessionPortalMeta> = {
  clientes: {
    description: "Gerencie clientes e relacionamentos reais do seu workspace.",
    emptyLabel: "Nenhum cliente cadastrado.",
    ctaLabel: "Novo cliente",
    ctaType: "cliente",
  },
  pacientes: {
    description: "Gerencie pacientes e relacionamentos reais do seu workspace.",
    emptyLabel: "Nenhum paciente cadastrado.",
    ctaLabel: "Novo paciente",
    ctaType: "cliente",
  },
  alunos: {
    description: "Gerencie alunos e relacionamentos reais do seu workspace.",
    emptyLabel: "Nenhum aluno cadastrado.",
    ctaLabel: "Novo aluno",
    ctaType: "cliente",
  },
  candidatos: {
    description: "Gerencie candidatos e relacionamentos reais do seu workspace.",
    emptyLabel: "Nenhum candidato cadastrado.",
    ctaLabel: "Novo candidato",
    ctaType: "cliente",
  },
  imoveis: {
    description: "Gerencie imoveis usando a estrutura operacional ja existente do seu workspace.",
    emptyLabel: "Nenhum imovel cadastrado.",
    ctaLabel: "Novo imovel",
    ctaType: "operacao",
  },
  motoristas: {
    description: "Consulte motoristas do portal por aqui quando a persistencia real desta sessao estiver conectada.",
    emptyLabel: "Nenhum motorista cadastrado.",
    ctaLabel: "Novo motorista",
  },
  fornecedores: {
    description: "Consulte fornecedores do portal por aqui quando a persistencia real desta sessao estiver conectada.",
    emptyLabel: "Nenhum fornecedor cadastrado.",
    ctaLabel: "Novo fornecedor",
  },
  veiculos: {
    description: "Consulte veiculos do portal por aqui quando a persistencia real desta sessao estiver conectada.",
    emptyLabel: "Nenhum veiculo cadastrado.",
    ctaLabel: "Novo veiculo",
  },
  rotas: {
    description: "Consulte rotas do portal por aqui quando a persistencia real desta sessao estiver conectada.",
    emptyLabel: "Nenhuma rota cadastrada.",
    ctaLabel: "Nova rota",
  },
  leads: {
    description: "Consulte leads do portal por aqui quando a persistencia real desta sessao estiver conectada.",
    emptyLabel: "Nenhum lead cadastrado.",
    ctaLabel: "Novo lead",
  },
  produtos: {
    description: "Consulte produtos do portal por aqui quando a persistencia real desta sessao estiver conectada.",
    emptyLabel: "Nenhum produto cadastrado.",
    ctaLabel: "Novo produto",
  },
  servicos: {
    description: "Consulte servicos do portal por aqui quando a persistencia real desta sessao estiver conectada.",
    emptyLabel: "Nenhum servico cadastrado.",
    ctaLabel: "Novo servico",
  },
  consultas: {
    description: "Organize consultas com a estrutura operacional ja existente do seu workspace.",
    emptyLabel: "Nenhuma consulta agendada.",
    ctaLabel: "Nova consulta",
    ctaType: "operacao",
  },
  ordens: {
    description: "Organize ordens com a estrutura operacional ja existente do seu workspace.",
    emptyLabel: "Nenhuma ordem cadastrada.",
    ctaLabel: "Nova ordem",
    ctaType: "operacao",
  },
  processos: {
    description: "Organize processos com a estrutura operacional ja existente do seu workspace.",
    emptyLabel: "Nenhum processo cadastrado.",
    ctaLabel: "Novo processo",
    ctaType: "operacao",
  },
  entregas: {
    description: "Organize entregas com a estrutura operacional ja existente do seu workspace.",
    emptyLabel: "Nenhuma entrega registrada.",
    ctaLabel: "Nova entrega",
    ctaType: "operacao",
  },
  viagens: {
    description: "Organize viagens com a estrutura operacional ja existente do seu workspace.",
    emptyLabel: "Nenhuma viagem registrada.",
    ctaLabel: "Nova viagem",
    ctaType: "operacao",
  },
  audiencias: {
    description: "Organize audiencias com a estrutura operacional ja existente do seu workspace.",
    emptyLabel: "Nenhuma audiencia cadastrada.",
    ctaLabel: "Nova audiencia",
    ctaType: "operacao",
  },
  atendimentos: {
    description: "Organize atendimentos com a estrutura operacional ja existente do seu workspace.",
    emptyLabel: "Nenhum atendimento registrado.",
    ctaLabel: "Novo atendimento",
    ctaType: "operacao",
  },
  "ordens-de-servico": {
    description: "Organize ordens de servico com a estrutura operacional ja existente do seu workspace.",
    emptyLabel: "Nenhuma ordem de servico registrada.",
    ctaLabel: "Nova ordem de servico",
    ctaType: "operacao",
  },
  "ordens-de-producao": {
    description: "Organize ordens de producao com a estrutura operacional ja existente do seu workspace.",
    emptyLabel: "Nenhuma ordem de producao registrada.",
    ctaLabel: "Nova producao",
    ctaType: "operacao",
  },
  negociacoes: {
    description: "Consulte negociacoes do portal por aqui quando a persistencia real desta sessao estiver conectada.",
    emptyLabel: "Nenhuma negociacao registrada.",
    ctaLabel: "Nova negociacao",
  },
  pedidos: {
    description: "Consulte pedidos do portal por aqui quando a persistencia real desta sessao estiver conectada.",
    emptyLabel: "Nenhum pedido registrado.",
    ctaLabel: "Novo pedido",
  },
  propostas: {
    description: "Centralize propostas reais e acompanhe seus rascunhos e envios.",
    emptyLabel: "Nenhuma proposta cadastrada.",
    ctaLabel: "Nova proposta",
    ctaType: "documento",
  },
  cotacoes: {
    description: "Consulte cotacoes do portal por aqui quando a persistencia real desta sessao estiver conectada.",
    emptyLabel: "Nenhuma cotacao cadastrada.",
    ctaLabel: "Nova cotacao",
  },
  oportunidades: {
    description: "Consulte oportunidades do portal por aqui quando a persistencia real desta sessao estiver conectada.",
    emptyLabel: "Nenhuma oportunidade cadastrada.",
    ctaLabel: "Nova oportunidade",
  },
  contratos: {
    description: "Gerencie contratos reais do seu workspace.",
    emptyLabel: "Nenhum contrato cadastrado.",
    ctaLabel: "Novo contrato",
    ctaType: "documento",
  },
  peticoes: {
    description: "Centralize peticoes reais do seu workspace.",
    emptyLabel: "Nenhuma peticao cadastrada.",
    ctaLabel: "Nova peticao",
    ctaType: "documento",
  },
  relatorios: {
    description: "Acompanhe relatorios reais salvos no seu workspace.",
    emptyLabel: "Nenhum relatorio cadastrado.",
    ctaLabel: "Novo relatorio",
    ctaType: "relatorio",
  },
  exames: {
    description: "Centralize exames reais do seu workspace.",
    emptyLabel: "Nenhum exame cadastrado.",
    ctaLabel: "Novo exame",
    ctaType: "documento",
  },
  guias: {
    description: "Centralize guias reais do seu workspace.",
    emptyLabel: "Nenhuma guia cadastrada.",
    ctaLabel: "Nova guia",
    ctaType: "documento",
  },
  arquivos: {
    description: "Centralize arquivos reais do seu workspace.",
    emptyLabel: "Nenhum arquivo cadastrado.",
    ctaLabel: "Novo documento",
    ctaType: "documento",
  },
  recebimentos: {
    description: "Acompanhe recebimentos reais do seu workspace.",
    emptyLabel: "Nenhum recebimento registrado.",
    ctaLabel: "Novo recebimento",
    ctaType: "financeiro",
  },
  pagamentos: {
    description: "Acompanhe pagamentos reais do seu workspace.",
    emptyLabel: "Nenhum pagamento registrado.",
    ctaLabel: "Novo pagamento",
    ctaType: "financeiro",
  },
  despesas: {
    description: "Acompanhe despesas reais do seu workspace.",
    emptyLabel: "Nenhuma despesa registrada.",
    ctaLabel: "Nova despesa",
    ctaType: "financeiro",
  },
  honorarios: {
    description: "Acompanhe honorarios reais do seu workspace.",
    emptyLabel: "Nenhum honorario registrado.",
    ctaLabel: "Novo honorario",
    ctaType: "financeiro",
  },
  ganhos: {
    description: "Acompanhe ganhos reais do seu workspace.",
    emptyLabel: "Nenhum ganho registrado.",
    ctaLabel: "Novo lancamento",
    ctaType: "financeiro",
  },
  gastos: {
    description: "Acompanhe gastos reais do seu workspace.",
    emptyLabel: "Nenhum gasto registrado.",
    ctaLabel: "Novo lancamento",
    ctaType: "financeiro",
  },
  "fluxo-de-caixa": {
    description: "Acompanhe o fluxo de caixa real do seu workspace.",
    emptyLabel: "Nenhum lancamento registrado.",
    ctaLabel: "Novo lancamento",
    ctaType: "financeiro",
  },
  reunioes: {
    description: "Organize reunioes, gravacoes e resumos do COS Meet.",
    emptyLabel: "Nenhuma reuniao registrada.",
    ctaLabel: "Nova reuniao",
    ctaType: "reuniao",
  },
  marketing: {
    description: "Acompanhe campanhas e iniciativas de marketing por aqui.",
    emptyLabel: "Nenhuma campanha cadastrada.",
    ctaLabel: "Nova campanha",
  },
}

function titleize(slug: string) {
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ")
}

function resolveSessionPortalMeta(areaKey: string, sessionLabel: string): SessionPortalMeta {
  const normalized = slugify(sessionLabel)
  const explicit = SESSION_PORTAL_META[normalized]

  if (explicit) {
    return explicit
  }

  if (areaKey === "cadastros") {
    return {
      description: `Consulte ${sessionLabel.toLowerCase()} do portal por aqui quando a persistencia real desta sessao estiver conectada.`,
      emptyLabel: `Nenhum ${sessionLabel.toLowerCase()} cadastrado.`,
      ctaLabel: `Novo ${sessionLabel.slice(0, -1).toLowerCase()}`,
    }
  }

  if (areaKey === "operacoes") {
    return {
      description: `Organize ${sessionLabel.toLowerCase()} com a estrutura operacional ja existente do seu workspace.`,
      emptyLabel: `Nenhum ${sessionLabel.slice(0, -1).toLowerCase()} registrado.`,
      ctaLabel: `Novo ${sessionLabel.slice(0, -1).toLowerCase()}`,
      ctaType: "operacao",
    }
  }

  if (areaKey === "financeiro") {
    return {
      description: `Acompanhe ${sessionLabel.toLowerCase()} reais do seu workspace.`,
      emptyLabel: `Nenhum ${sessionLabel.slice(0, -1).toLowerCase()} registrado.`,
      ctaLabel: "Novo lancamento",
      ctaType: "financeiro",
    }
  }

  if (areaKey === "documentos") {
    return {
      description: `Centralize ${sessionLabel.toLowerCase()} reais do seu workspace.`,
      emptyLabel: `Nenhum ${sessionLabel.slice(0, -1).toLowerCase()} cadastrado.`,
      ctaLabel: "Novo documento",
      ctaType: normalized === "relatorios" ? "relatorio" : "documento",
    }
  }

  if (areaKey === "vendas") {
    return {
      description: `Consulte ${sessionLabel.toLowerCase()} do portal por aqui quando a persistencia real desta sessao estiver conectada.`,
      emptyLabel: `Nenhum ${sessionLabel.slice(0, -1).toLowerCase()} registrado.`,
      ctaLabel: `Novo ${sessionLabel.slice(0, -1).toLowerCase()}`,
    }
  }

  return {
    description: "Gerencie esta area do portal com busca, filtros e acao principal.",
    emptyLabel: "Nenhum registro disponivel ainda.",
    ctaLabel: "Nova acao",
  }
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
  const { effectiveSegment } = useOperationsTemplatePreview()
  const isClinicWorkspace = effectiveSegment === "clinicas"
  const isRealEstateWorkspace = effectiveSegment === "imobiliarias"
  const isServicesWorkspace = effectiveSegment === "servicos"
  const key = slug[slug.length - 1]
  const salesSubsection = slug[0] === "vendas" && slug.length > 1 ? slug[1] : null
  const sharedArea = getCosAreaSourceByKey(key, effectiveSegment)
  const cadastrosArea = getCosAreaSourceByKey("cadastros", effectiveSegment)
  const documentsArea = getCosAreaSourceByKey("documentos", effectiveSegment)
  const meetingsArea = getCosAreaSourceByKey("reunioes", effectiveSegment)
  const operationsArea = getCosAreaSourceByKey("operacoes", effectiveSegment)
  const salesArea = getCosAreaSourceByKey("vendas", effectiveSegment)
  const rootAreaKey = slug[0] || key
  const rootArea = getCosAreaSourceByKey(rootAreaKey, effectiveSegment)
  const cadastrosSections = useMemo(() => {
    const titles = cadastrosArea?.subsections?.length ? cadastrosArea.subsections : CADASTROS_SECTIONS.map((section) => section.title)

    return CADASTROS_SECTIONS.map((section, index) => ({
      ...section,
      title: titles[index] || section.title,
      description: resolveSessionPortalMeta("cadastros", titles[index] || section.title).description,
    })).slice(0, titles.length)
  }, [cadastrosArea?.subsections, isRealEstateWorkspace, isServicesWorkspace])
  const salesSections = useMemo(() => {
    const titles = salesArea?.subsections?.length ? salesArea.subsections : VENDAS_SECTIONS.map((section) => section.title)

    return titles.map((title, index) => {
      const fallbackSection = VENDAS_SECTIONS[index] ?? VENDAS_SECTIONS[VENDAS_SECTIONS.length - 1]
      const routeKey = SALES_ROUTE_ORDER[index] ?? fallbackSection.key

      return {
        key: routeKey,
        title,
        href: `/portal/vendas/${routeKey}`,
        icon: fallbackSection.icon,
        description: resolveSessionPortalMeta("vendas", title).description,
      }
    })
  }, [salesArea?.subsections])

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
              <h1 className="text-2xl font-semibold text-[#0a0a0a]">{cadastrosArea?.label || "Cadastros"}</h1>
              <p className="text-sm text-gray-500">
                {cadastrosArea
                  ? `Acesse ${cadastrosArea.subsections.map((item) => item.toLowerCase()).join(", ")} do seu workspace.`
                  : "Acesse clientes, leads, produtos e servicos do seu workspace."}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {cadastrosSections.map((section) => (
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
          title={cadastrosSections[0]?.title || "Clientes"}
          description={`Gerencie ${String(cadastrosSections[0]?.title || "clientes").toLowerCase()} e relacionamentos reais do seu workspace.`}
          variant="portal"
          mode={isClinicWorkspace ? "clinic" : isRealEstateWorkspace ? "real-estate" : isServicesWorkspace ? "services" : "default"}
          realEstateRole="client"
          servicesRole="client"
        />
      </div>
    )
  }

  if (key === "leads") {
    if (isRealEstateWorkspace) {
      return (
        <div className="flex-1 flex flex-col h-full">
          <PortalHeader />
          <ClientsManager
            title={cadastrosSections[1]?.title || "Proprietarios"}
            description={`Gerencie ${String(cadastrosSections[1]?.title || "proprietarios").toLowerCase()} e contatos reais do seu workspace.`}
            variant="portal"
            mode="real-estate"
            realEstateRole="owner"
          />
        </div>
      )
    }

    if (isServicesWorkspace) {
      return (
        <div className="flex-1 flex flex-col h-full">
          <PortalHeader />
          <ClientsManager
            title={cadastrosSections[1]?.title || "Servicos"}
            description={`Gerencie ${String(cadastrosSections[1]?.title || "servicos").toLowerCase()} e valores reais do seu workspace.`}
            variant="portal"
            mode="services"
            servicesRole="service"
          />
        </div>
      )
    }

    return (
      <PortalModulePage
        title={cadastrosSections[1]?.title || "Leads"}
        description={resolveSessionPortalMeta("cadastros", cadastrosSections[1]?.title || "Leads").description}
        ctaLabel={resolveSessionPortalMeta("cadastros", cadastrosSections[1]?.title || "Leads").ctaLabel}
        ctaType={resolveSessionPortalMeta("cadastros", cadastrosSections[1]?.title || "Leads").ctaType}
        emptyLabel={resolveSessionPortalMeta("cadastros", cadastrosSections[1]?.title || "Leads").emptyLabel}
        listHref="/portal/cadastros"
      />
    )
  }

  if (key === "produtos") {
    if (isRealEstateWorkspace) {
      return (
        <div className="flex-1 flex flex-col h-full">
          <PortalHeader />
          <ClientsManager
            title={cadastrosSections[2]?.title || "Interessados"}
            description={`Gerencie ${String(cadastrosSections[2]?.title || "interessados").toLowerCase()} e relacionamentos reais do seu workspace.`}
            variant="portal"
            mode="real-estate"
            realEstateRole="interested"
          />
        </div>
      )
    }

    if (isServicesWorkspace) {
      return (
        <div className="flex-1 flex flex-col h-full">
          <PortalHeader />
          <ClientsManager
            title={cadastrosSections[2]?.title || "Responsaveis"}
            description={`Gerencie ${String(cadastrosSections[2]?.title || "responsaveis").toLowerCase()} e atribuicoes reais do seu workspace.`}
            variant="portal"
            mode="services"
            servicesRole="responsible"
          />
        </div>
      )
    }

    return (
      <PortalModulePage
        title={cadastrosSections[2]?.title || "Produtos"}
        description={resolveSessionPortalMeta("cadastros", cadastrosSections[2]?.title || "Produtos").description}
        ctaLabel={resolveSessionPortalMeta("cadastros", cadastrosSections[2]?.title || "Produtos").ctaLabel}
        ctaType={resolveSessionPortalMeta("cadastros", cadastrosSections[2]?.title || "Produtos").ctaType}
        emptyLabel={resolveSessionPortalMeta("cadastros", cadastrosSections[2]?.title || "Produtos").emptyLabel}
        listHref="/portal/cadastros"
      />
    )
  }

  if (key === "servicos") {
    if (isRealEstateWorkspace) {
      return (
        <div className="flex-1 flex flex-col h-full">
          <PortalHeader />
          <OperationsManager
            title={cadastrosSections[3]?.title || "Imoveis"}
            description={`Gerencie ${String(cadastrosSections[3]?.title || "imoveis").toLowerCase()} usando a estrutura existente de operacoes.`}
            variant="portal"
            mode="real-estate"
            realEstateKind="property"
          />
        </div>
      )
    }

    return (
      <PortalModulePage
        title={cadastrosSections[3]?.title || "Servicos"}
        description={resolveSessionPortalMeta("cadastros", cadastrosSections[3]?.title || "Servicos").description}
        ctaLabel={resolveSessionPortalMeta("cadastros", cadastrosSections[3]?.title || "Servicos").ctaLabel}
        ctaType={resolveSessionPortalMeta("cadastros", cadastrosSections[3]?.title || "Servicos").ctaType}
        emptyLabel={resolveSessionPortalMeta("cadastros", cadastrosSections[3]?.title || "Servicos").emptyLabel}
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
          description={`Visualize ${String(sharedArea?.label || "o balanco").toLowerCase()} consolidado do seu workspace com dados reais.`}
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
          title={operationsArea?.label || "Operacoes"}
          description={`Organize ${operationsArea?.subsections.map((item) => item.toLowerCase()).join(", ") || "processos, atendimentos e fluxos operacionais"} com dados reais.`}
          variant="portal"
          mode={isClinicWorkspace ? "clinic" : isRealEstateWorkspace ? "real-estate" : isServicesWorkspace ? "services" : "default"}
          realEstateKind="all"
          servicesKind="all"
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
      const sessionTitle = salesSections.find((section) => section.key === salesSubsection)?.title || titleize(salesSubsection)
      const meta = resolveSessionPortalMeta("vendas", sessionTitle)

      return (
        <PortalModulePage
          title={sessionTitle}
          description={meta.description}
          ctaLabel={meta.ctaLabel}
          ctaType={meta.ctaType}
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
              {salesSections.map((section) => (
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
    const meta = resolveSessionPortalMeta("marketing", "Marketing")

    return (
      <PortalModulePage
        title="Marketing"
        description={meta.description}
        ctaLabel={meta.ctaLabel}
        emptyLabel={meta.emptyLabel}
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
          description={key === "documentos" ? `Centralize ${documentsArea?.subsections.map((item) => item.toLowerCase()).join(", ") || "documentos reais do seu workspace"}.` : meta.description}
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
          title={meetingsArea?.label || "Reunioes"}
          description={`Gerencie ${meetingsArea?.subsections.map((item) => item.toLowerCase()).join(", ") || "gravacoes, resumos e proximos passos reais"} do COS Meet.`}
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

  const resolvedSessionTitle =
    rootArea?.subsections?.find((item) => slugify(item) === key) ||
    SECTION_META[key]?.title ||
    titleize(key)
  const sessionMeta =
    rootArea && rootAreaKey !== key
      ? resolveSessionPortalMeta(rootAreaKey, resolvedSessionTitle)
      : resolveSessionPortalMeta(key, resolvedSessionTitle)
  const meta: SectionMeta = SECTION_META[key] ?? {
    title: resolvedSessionTitle,
    description: sessionMeta.description,
    ctaLabel: sessionMeta.ctaLabel || "Nova acao",
    emptyLabel: sessionMeta.emptyLabel,
    listHref: rootArea ? `/portal/${rootAreaKey}` : `/portal/${slug.join("/")}`,
    ctaType: sessionMeta.ctaType,
  }

  return (
    <PortalModulePage
      title={meta.title}
      description={meta.description}
      ctaLabel={meta.ctaLabel}
      ctaType={meta.ctaType}
      emptyLabel={meta.emptyLabel}
      listHref={meta.listHref}
    />
  )
}
