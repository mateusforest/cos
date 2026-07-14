import {
  Users,
  Briefcase,
  TrendingUp,
  Megaphone,
  DollarSign,
  UsersRound,
  FolderOpen,
  Video,
  Settings,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react"
import type { ChatMessage } from "@/components/app/area-chat"

export type AreaConfig = {
  label: string
  icon: LucideIcon
  color: string
  bg: string
  subsections: string[]
  quickActions: string[]
  messages: ChatMessage[]
  conversationSuggestion?: string
}

export type CosAreaSource = {
  key: string
  label: string
  icon: LucideIcon
  color: string
  bg: string
  subsections: string[]
  quickActions: string[]
  messages: ChatMessage[]
  chatHref: string
  portalHref: string
  portalStatus: "active" | "redirect"
  portalDestination: string
  showInChat: boolean
  showInPortalNav: boolean
  conversationSuggestion?: string
}

type SectorAreaOverride = Partial<
  Pick<
    CosAreaSource,
    "label" | "subsections" | "quickActions" | "messages" | "showInChat" | "showInPortalNav" | "conversationSuggestion"
  >
>

type SectorTemplate = {
  segment: string
  label: string
  areas: Partial<Record<string, SectorAreaOverride>>
}

export const slug = (value: string) =>
  value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")

function normalizeSegment(value?: string | null) {
  return slug((value || "").trim())
}

const defaultAreaSources: CosAreaSource[] = [
  {
    key: "cadastros",
    label: "Cadastros",
    icon: Users,
    color: "#ec4899",
    bg: "#fce7f3",
    subsections: ["Clientes", "Leads", "Produtos", "Serviços"],
    quickActions: ["Criar cliente", "Buscar cadastro", "Ver cadastros no Portal"],
    messages: [],
    chatHref: "/app/conversas/cadastros",
    portalHref: "/portal/cadastros",
    portalStatus: "active",
    portalDestination: "/portal/cadastros",
    showInChat: true,
    showInPortalNav: true,
    conversationSuggestion: "Sem registros",
  },
  {
    key: "operacoes",
    label: "Operações",
    icon: Briefcase,
    color: "#8b5cf6",
    bg: "#ede9fe",
    subsections: ["Projetos", "Ordens", "Processos"],
    quickActions: ["Criar operação", "Buscar operação", "Ver operações no Portal"],
    messages: [],
    chatHref: "/app/conversas/operacoes",
    portalHref: "/portal/operacoes",
    portalStatus: "active",
    portalDestination: "/portal/operacoes",
    showInChat: true,
    showInPortalNav: true,
    conversationSuggestion: "Sem registros",
  },
  {
    key: "vendas",
    label: "Vendas",
    icon: TrendingUp,
    color: "#3b82f6",
    bg: "#dbeafe",
    subsections: ["Negociações", "Propostas", "Pedidos", "Vendas", "Funil"],
    quickActions: ["Ver propostas", "Buscar negociacao", "Ver vendas no Portal"],
    messages: [],
    chatHref: "/app/conversas/vendas",
    portalHref: "/portal/vendas",
    portalStatus: "active",
    portalDestination: "/portal/vendas",
    showInChat: true,
    showInPortalNav: true,
    conversationSuggestion: "Conversa contextual pronta",
  },
  {
    key: "marketing",
    label: "Marketing",
    icon: Megaphone,
    color: "#ec4899",
    bg: "#fce7f3",
    subsections: [],
    quickActions: [],
    messages: [],
    chatHref: "/app/novo/marketing",
    portalHref: "/portal/marketing",
    portalStatus: "active",
    portalDestination: "/portal/marketing",
    showInChat: false,
    showInPortalNav: true,
  },
  {
    key: "financeiro",
    label: "Financeiro",
    icon: DollarSign,
    color: "#22c55e",
    bg: "#dcfce7",
    subsections: ["Ganhos", "Gastos", "Fluxo de caixa"],
    quickActions: ["Registrar ganho", "Registrar gasto", "Ver financeiro no Portal"],
    messages: [],
    chatHref: "/app/conversas/financeiro",
    portalHref: "/portal/financeiro",
    portalStatus: "active",
    portalDestination: "/portal/financeiro",
    showInChat: true,
    showInPortalNav: true,
    conversationSuggestion: "Sem registros",
  },
  {
    key: "equipe",
    label: "Equipe",
    icon: UsersRound,
    color: "#0ea5e9",
    bg: "#e0f2fe",
    subsections: ["Comercial", "Operacional", "Financeiro", "Administrativo"],
    quickActions: ["Adicionar membro", "Falar com a equipe", "Ver equipe no Portal"],
    messages: [],
    chatHref: "/app/conversas/equipe",
    portalHref: "/portal/equipe",
    portalStatus: "active",
    portalDestination: "/portal/equipe",
    showInChat: true,
    showInPortalNav: true,
    conversationSuggestion: "Sem registros",
  },
  {
    key: "documentos",
    label: "Documentos",
    icon: FolderOpen,
    color: "#f97316",
    bg: "#ffedd5",
    subsections: ["Contratos", "Arquivos", "Relatórios"],
    quickActions: ["Criar documento", "Buscar arquivo", "Ver documentos no Portal"],
    messages: [],
    chatHref: "/app/conversas/documentos",
    portalHref: "/portal/documentos",
    portalStatus: "active",
    portalDestination: "/portal/documentos",
    showInChat: true,
    showInPortalNav: true,
    conversationSuggestion: "Sem registros",
  },
  {
    key: "reunioes",
    label: "Reuniões",
    icon: Video,
    color: "#ef4444",
    bg: "#fee2e2",
    subsections: [],
    quickActions: ["Criar reunião", "Buscar reunião", "Ver reuniões no Portal"],
    messages: [],
    chatHref: "/app/conversas/reunioes",
    portalHref: "/portal/reunioes",
    portalStatus: "active",
    portalDestination: "/portal/reunioes",
    showInChat: true,
    showInPortalNav: true,
    conversationSuggestion: "Sem registros",
  },
  {
    key: "sistema",
    label: "Sistema",
    icon: Settings,
    color: "#6b7280",
    bg: "#f3f4f6",
    subsections: [],
    quickActions: ["Ver logs", "Abrir integrações", "Acessar Portal"],
    messages: [],
    chatHref: "/app/conversas/sistema",
    portalHref: "/portal/sistema",
    portalStatus: "active",
    portalDestination: "/portal/sistema",
    showInChat: true,
    showInPortalNav: false,
    conversationSuggestion: "Configurações e logs",
  },
  {
    key: "suporte",
    label: "Suporte",
    icon: LifeBuoy,
    color: "#6b7280",
    bg: "#f3f4f6",
    subsections: [],
    quickActions: ["Iniciar suporte"],
    messages: [],
    chatHref: "/app/conversas/suporte",
    portalHref: "/portal/suporte",
    portalStatus: "active",
    portalDestination: "/portal/suporte",
    showInChat: true,
    showInPortalNav: false,
    conversationSuggestion: "Sem registros",
  },
]

export const operationsSectorTemplates: Record<string, SectorTemplate> = {
  default: {
    segment: "default",
    label: "Padrão",
    areas: {},
  },
  clinicas: {
    segment: "clinicas",
    label: "Clínicas",
    areas: {
      cadastros: {
        label: "Cadastros clínicos",
        subsections: ["Pacientes", "Convênios", "Procedimentos", "Profissionais"],
        quickActions: ["Criar paciente", "Buscar paciente", "Ver pacientes no Portal"],
        conversationSuggestion: "Base clínica pronta para organizar atendimentos.",
      },
      operacoes: {
        label: "Atendimentos",
        subsections: ["Consultas", "Agenda", "Exames"],
        quickActions: ["Registrar atendimento", "Buscar atendimento", "Ver atendimentos no Portal"],
      },
      financeiro: {
        subsections: ["Recebimentos", "Despesas", "Fluxo de caixa"],
      },
      documentos: {
        label: "Documentos clínicos",
        subsections: ["Guias", "Exames", "Relatórios"],
        quickActions: ["Criar documento clínico", "Buscar arquivo", "Ver documentos no Portal"],
      },
    },
  },
  advocacia: {
    segment: "advocacia",
    label: "Advocacia",
    areas: {
      cadastros: {
        label: "Cadastros juridicos",
        subsections: ["Clientes", "Casos", "Contrapartes", "Prazos"],
        quickActions: ["Criar cliente", "Buscar cadastro", "Ver cadastros no Portal"],
        conversationSuggestion: "Base juridica pronta para acompanhar clientes e processos.",
      },
      operacoes: {
        label: "Processos",
        subsections: ["Andamentos", "Audiencias", "Peticoes"],
        quickActions: ["Criar operacao", "Buscar operacao", "Ver operacoes no Portal"],
      },
      financeiro: {
        subsections: ["Honorarios", "Recebimentos", "Despesas"],
      },
      documentos: {
        subsections: ["Contratos", "Peticoes", "Relatorios"],
      },
    },
  },
  imobiliarias: {
    segment: "imobiliarias",
    label: "Imobiliarias",
    areas: {
      cadastros: {
        label: "Cadastros imobiliarios",
        subsections: ["Clientes", "Proprietarios", "Interessados", "Imoveis"],
        quickActions: ["Criar cliente", "Buscar proprietario", "Ver cadastros no Portal"],
        conversationSuggestion: "Base imobiliaria pronta para organizar captacoes e negociacoes.",
      },
      operacoes: {
        label: "Negociacoes",
        subsections: ["Imoveis", "Visitas", "Negociacoes"],
        quickActions: ["Registrar negociacao", "Buscar imovel", "Ver negociacoes no Portal"],
      },
      financeiro: {
        subsections: ["Recebimentos", "Comissoes", "Fluxo de caixa"],
      },
      documentos: {
        label: "Documentos imobiliarios",
        subsections: ["Contratos", "Vistorias", "Propostas"],
        quickActions: ["Criar documento imobiliario", "Buscar arquivo", "Ver documentos no Portal"],
      },
    },
  },
  servicos: {
    segment: "servicos",
    label: "Servicos",
    areas: {
      cadastros: {
        label: "Cadastros de servicos",
        subsections: ["Clientes", "Servicos", "Responsaveis"],
        quickActions: ["Criar cliente", "Cadastrar servico", "Ver cadastros no Portal"],
        conversationSuggestion: "Base de servicos pronta para organizar atendimentos e entregas.",
      },
      operacoes: {
        label: "Atendimentos",
        subsections: ["Ordens de servico", "Atendimentos"],
        quickActions: ["Registrar ordem de servico", "Buscar atendimento", "Ver atendimentos no Portal"],
      },
      financeiro: {
        subsections: ["Recebimentos", "Despesas", "Fluxo de caixa"],
      },
      documentos: {
        subsections: ["Propostas", "Contratos", "Relatorios"],
      },
    },
  },
}

function applySectorTemplate(area: CosAreaSource, override?: SectorAreaOverride): CosAreaSource {
  if (!override) {
    return area
  }

  return {
    ...area,
    ...override,
    subsections: override.subsections ?? area.subsections,
    quickActions: override.quickActions ?? area.quickActions,
    messages: override.messages ?? area.messages,
  }
}

export function getOperationsSectorTemplate(segment?: string | null) {
  const normalizedSegment = normalizeSegment(segment)

  return operationsSectorTemplates[normalizedSegment] ?? operationsSectorTemplates.default
}

export function getOperationsAreaSources(segment?: string | null) {
  const template = getOperationsSectorTemplate(segment)

  return defaultAreaSources.map((area) => applySectorTemplate(area, template.areas[area.key]))
}

export function getOperationsChatAreaSources(segment?: string | null) {
  return getOperationsAreaSources(segment).filter((area) => area.showInChat)
}

export function getOperationsPortalAreaSources(segment?: string | null) {
  return getOperationsAreaSources(segment).filter((area) => area.showInPortalNav)
}

export function getOperationsAreaConfigs(segment?: string | null): Record<string, AreaConfig> {
  return Object.fromEntries(
    getOperationsChatAreaSources(segment).map((area) => [
      area.key,
      {
        label: area.label,
        icon: area.icon,
        color: area.color,
        bg: area.bg,
        subsections: area.subsections,
        quickActions: area.quickActions,
        messages: area.messages,
        conversationSuggestion: area.conversationSuggestion,
      },
    ]),
  ) as Record<string, AreaConfig>
}

export const cosAreaSources = defaultAreaSources
export const chatAreaSources = getOperationsChatAreaSources()
export const portalAreaSources = getOperationsPortalAreaSources()
export const areaConfigs = getOperationsAreaConfigs()

export function getCosAreaSourceByKey(key: string, segment?: string | null) {
  return getOperationsAreaSources(segment).find((area) => area.key === key)
}

export const equipeGroups: Record<string, { label: string; messages: ChatMessage[] }> = {
  comercial: { label: "Equipe Comercial", messages: [] },
  operacional: { label: "Equipe Operacional", messages: [] },
  financeiro: { label: "Equipe Financeira", messages: [] },
  administrativo: { label: "Equipe Administrativa", messages: [] },
}
