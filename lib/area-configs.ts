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
}

export const slug = (value: string) =>
  value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")

export const cosAreaSources: CosAreaSource[] = [
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
  },
]

export const chatAreaSources = cosAreaSources.filter((area) => area.showInChat)
export const portalAreaSources = cosAreaSources.filter((area) => area.showInPortalNav)

export const areaConfigs: Record<string, AreaConfig> = Object.fromEntries(
  chatAreaSources.map((area) => [
    area.key,
    {
      label: area.label,
      icon: area.icon,
      color: area.color,
      bg: area.bg,
      subsections: area.subsections,
      quickActions: area.quickActions,
      messages: area.messages,
    },
  ]),
) as Record<string, AreaConfig>

export function getCosAreaSourceByKey(key: string) {
  return cosAreaSources.find((area) => area.key === key)
}

export const equipeGroups: Record<string, { label: string; messages: ChatMessage[] }> = {
  comercial: { label: "Equipe Comercial", messages: [] },
  operacional: { label: "Equipe Operacional", messages: [] },
  financeiro: { label: "Equipe Financeira", messages: [] },
  administrativo: { label: "Equipe Administrativa", messages: [] },
}
