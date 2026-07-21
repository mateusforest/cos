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

const standardAreaLabels: Record<string, string> = {
  cadastros: "Cadastros",
  operacoes: "Operações",
  vendas: "Vendas",
  financeiro: "Financeiro",
  equipe: "Equipe",
  documentos: "Documentos",
  reunioes: "Reuniões",
  marketing: "Studio",
  sistema: "Sistema",
  suporte: "Suporte",
}

export const slug = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")

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
    subsections: ["Negociações", "Propostas", "Pedidos", "Funil"],
    quickActions: ["Ver propostas", "Buscar negociação", "Ver vendas no Portal"],
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
    label: "Studio",
    icon: Megaphone,
    color: "#ec4899",
    bg: "#fce7f3",
    subsections: [],
    quickActions: ["Criar conteudo", "Abrir Studio no Portal"],
    messages: [],
    chatHref: "/app/conversas/marketing",
    portalHref: "/portal/marketing",
    portalStatus: "active",
    portalDestination: "/portal/marketing",
    showInChat: true,
    showInPortalNav: true,
    conversationSuggestion: "Criacao de campanhas, imagens, videos e conteudos.",
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
  comercio: {
    segment: "comercio",
    label: "Comércio",
    areas: {
      cadastros: {
        label: "Cadastros comerciais",
        subsections: ["Clientes", "Produtos", "Fornecedores", "Categorias"],
        quickActions: ["Criar cliente", "Buscar produto", "Ver cadastros no Portal"],
        conversationSuggestion: "Base comercial pronta para organizar clientes, produtos e vendas.",
      },
      operacoes: {
        label: "Pedidos",
        subsections: ["Pedidos", "Entregas", "Trocas"],
        quickActions: ["Registrar pedido", "Buscar pedido", "Ver pedidos no Portal"],
        conversationSuggestion: "Pedidos e entregas organizados para a operação comercial.",
      },
      vendas: {
        subsections: ["Propostas", "Pedidos", "Pós-venda"],
        quickActions: ["Criar proposta", "Buscar pedido", "Ver vendas no Portal"],
        conversationSuggestion: "Acompanhe propostas, pedidos e pós-venda da operação comercial.",
      },
      financeiro: {
        subsections: ["Recebimentos", "Pagamentos", "Fluxo de caixa"],
      },
      documentos: {
        subsections: ["Propostas", "Notas", "Relatórios"],
      },
    },
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
        subsections: ["Consultas", "Agenda", "Exames", "Retornos"],
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
  saude: {
    segment: "saude",
    label: "Saúde",
    areas: {
      cadastros: {
        label: "Cadastros de saúde",
        subsections: ["Pacientes", "Convênios", "Procedimentos", "Profissionais"],
        quickActions: ["Criar paciente", "Buscar paciente", "Ver pacientes no Portal"],
        conversationSuggestion: "Base de saúde pronta para organizar atendimentos e agendas.",
      },
      operacoes: {
        label: "Atendimentos",
        subsections: ["Consultas", "Agenda", "Exames", "Retornos"],
        quickActions: ["Registrar atendimento", "Buscar atendimento", "Ver atendimentos no Portal"],
        conversationSuggestion: "Atendimentos e exames prontos para acompanhamento no COS.",
      },
      financeiro: {
        subsections: ["Recebimentos", "Despesas", "Fluxo de caixa"],
      },
      documentos: {
        label: "Documentos de saúde",
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
        label: "Cadastros jurídicos",
        subsections: ["Clientes", "Casos", "Contrapartes", "Prazos"],
        quickActions: ["Criar cliente", "Buscar cadastro", "Ver cadastros no Portal"],
        conversationSuggestion: "Base jurídica pronta para acompanhar clientes e processos.",
      },
      operacoes: {
        label: "Processos",
        subsections: ["Processos", "Andamentos", "Audiências", "Prazos"],
        quickActions: ["Criar processo", "Buscar andamento", "Ver operações no Portal"],
      },
      financeiro: {
        subsections: ["Honorários", "Recebimentos", "Despesas"],
      },
      documentos: {
        subsections: ["Contratos", "Petições", "Procurações", "Relatórios"],
      },
    },
  },
  educacao: {
    segment: "educacao",
    label: "Educação",
    areas: {
      cadastros: {
        label: "Cadastros acadêmicos",
        subsections: ["Alunos", "Turmas", "Cursos", "Responsáveis"],
        quickActions: ["Criar aluno", "Buscar turma", "Ver cadastros no Portal"],
        conversationSuggestion: "Base acadêmica pronta para organizar alunos, cursos e turmas.",
      },
      operacoes: {
        label: "Acadêmico",
        subsections: ["Matrículas", "Aulas", "Presenças", "Atendimentos"],
        quickActions: ["Registrar matrícula", "Buscar aluno", "Ver acadêmico no Portal"],
        conversationSuggestion: "Matrículas, aulas e atendimentos prontos para acompanhamento.",
      },
      financeiro: {
        subsections: ["Mensalidades", "Pagamentos", "Fluxo de caixa"],
      },
      documentos: {
        subsections: ["Contratos", "Boletins", "Relatórios"],
      },
    },
  },
  imobiliarias: {
    segment: "imobiliarias",
    label: "Imobiliárias",
    areas: {
      cadastros: {
        label: "Cadastros imobiliários",
        subsections: ["Clientes", "Proprietários", "Interessados", "Imóveis"],
        quickActions: ["Criar cliente", "Buscar proprietário", "Ver cadastros no Portal"],
        conversationSuggestion: "Base imobiliária pronta para organizar captações e negociações.",
      },
      operacoes: {
        label: "Negociações",
        subsections: ["Captações", "Visitas", "Negociações", "Locações"],
        quickActions: ["Registrar negociação", "Buscar imóvel", "Ver negociações no Portal"],
      },
      vendas: {
        subsections: ["Propostas", "Vendas", "Contratos"],
        quickActions: ["Criar proposta", "Buscar venda", "Ver vendas no Portal"],
        conversationSuggestion: "Acompanhe propostas, vendas e contratos do fluxo imobiliário.",
      },
      financeiro: {
        subsections: ["Recebimentos", "Comissões", "Fluxo de caixa"],
      },
      documentos: {
        label: "Documentos imobiliários",
        subsections: ["Contratos", "Vistorias", "Propostas"],
        quickActions: ["Criar documento imobiliário", "Buscar arquivo", "Ver documentos no Portal"],
      },
    },
  },
  industria: {
    segment: "industria",
    label: "Indústria",
    areas: {
      cadastros: {
        label: "Cadastros industriais",
        subsections: ["Clientes", "Produtos", "Insumos", "Fornecedores"],
        quickActions: ["Criar cliente", "Buscar insumo", "Ver cadastros no Portal"],
        conversationSuggestion: "Base industrial pronta para organizar produção, insumos e clientes.",
      },
      operacoes: {
        label: "Produção",
        subsections: ["Ordens de produção", "Lotes", "Qualidade", "Expedição"],
        quickActions: ["Registrar ordem de produção", "Buscar lote", "Ver produção no Portal"],
        conversationSuggestion: "Ordens, lotes e expedição prontas para acompanhamento.",
      },
      vendas: {
        subsections: ["Cotações", "Pedidos", "Contratos"],
        quickActions: ["Criar cotação", "Buscar pedido", "Ver vendas no Portal"],
        conversationSuggestion: "Acompanhe cotações, pedidos e contratos da operação industrial.",
      },
      financeiro: {
        subsections: ["Custos", "Recebimentos", "Fluxo de caixa"],
      },
      documentos: {
        subsections: ["Ordens", "Laudos", "Relatórios"],
      },
    },
  },
  logistica: {
    segment: "logistica",
    label: "Logística",
    areas: {
      cadastros: {
        label: "Cadastros logísticos",
        subsections: ["Clientes", "Motoristas", "Veículos", "Rotas"],
        quickActions: ["Criar cliente", "Buscar rota", "Ver cadastros no Portal"],
        conversationSuggestion: "Base logística pronta para organizar coletas, entregas e rotas.",
      },
      operacoes: {
        label: "Operação logística",
        subsections: ["Coletas", "Cargas", "Entregas", "Viagens", "Ocorrências"],
        quickActions: ["Registrar entrega", "Buscar coleta", "Ver operação no Portal"],
        conversationSuggestion: "Coletas, entregas e ocorrências prontas para acompanhamento.",
      },
      financeiro: {
        subsections: ["Fretes", "Custos", "Fluxo de caixa"],
      },
      documentos: {
        subsections: ["CT-e", "MDF-e", "Comprovantes", "Relatórios"],
      },
    },
  },
  servicos: {
    segment: "servicos",
    label: "Serviços",
    areas: {
      cadastros: {
        label: "Cadastros de serviços",
        subsections: ["Clientes", "Serviços", "Responsáveis"],
        quickActions: ["Criar cliente", "Cadastrar serviço", "Ver cadastros no Portal"],
        conversationSuggestion: "Base de serviços pronta para organizar atendimentos e entregas.",
      },
      operacoes: {
        label: "Atendimentos",
        subsections: ["Ordens de serviço", "Atendimentos", "Agenda"],
        quickActions: ["Registrar ordem de serviço", "Buscar atendimento", "Ver atendimentos no Portal"],
      },
      vendas: {
        subsections: ["Oportunidades", "Propostas", "Contratos"],
        quickActions: ["Criar proposta", "Buscar oportunidade", "Ver vendas no Portal"],
        conversationSuggestion: "Acompanhe oportunidades, propostas e contratos de serviços.",
      },
      financeiro: {
        subsections: ["Recebimentos", "Despesas", "Fluxo de caixa"],
      },
      documentos: {
        subsections: ["Propostas", "Contratos", "Relatórios"],
      },
    },
  },
  contabilidade: {
    segment: "contabilidade",
    label: "Contabilidade",
    areas: {
      cadastros: {
        label: "Cadastros contábeis",
        subsections: ["Clientes", "Empresas", "Obrigações", "Responsáveis"],
        quickActions: ["Criar cliente", "Buscar obrigação", "Ver cadastros no Portal"],
        conversationSuggestion: "Base contábil pronta para organizar clientes, empresas e obrigações.",
      },
      operacoes: {
        label: "Rotinas contábeis",
        subsections: ["Fechamentos", "Apurações", "Entregas"],
        quickActions: ["Registrar fechamento", "Buscar apuração", "Ver rotinas no Portal"],
        conversationSuggestion: "Fechamentos, apurações e entregas prontos para acompanhamento.",
      },
      financeiro: {
        subsections: ["Honorários", "Recebimentos", "Despesas"],
      },
      documentos: {
        subsections: ["Balancetes", "Guias", "Relatórios"],
      },
    },
  },
  construcao: {
    segment: "construcao",
    label: "Construção",
    areas: {
      cadastros: {
        label: "Cadastros de obras",
        subsections: ["Clientes", "Obras", "Fornecedores", "Responsáveis"],
        quickActions: ["Criar cliente", "Buscar obra", "Ver cadastros no Portal"],
        conversationSuggestion: "Base de construção pronta para organizar obras, equipes e fornecedores.",
      },
      operacoes: {
        label: "Obras",
        subsections: ["Cronogramas", "Execuções", "Medições", "Vistorias"],
        quickActions: ["Registrar obra", "Buscar vistoria", "Ver obras no Portal"],
        conversationSuggestion: "Cronogramas, execuções e vistorias prontos para acompanhamento.",
      },
      financeiro: {
        subsections: ["Medições", "Custos", "Fluxo de caixa"],
      },
      documentos: {
        subsections: ["Contratos", "Projetos", "Relatórios"],
      },
    },
  },
  "recursos-humanos": {
    segment: "recursos-humanos",
    label: "Recursos Humanos",
    areas: {
      cadastros: {
        label: "Cadastros de pessoas",
        subsections: ["Candidatos", "Colaboradores", "Vagas", "Gestores"],
        quickActions: ["Criar candidato", "Buscar colaborador", "Ver cadastros no Portal"],
        conversationSuggestion: "Base de RH pronta para organizar candidatos, vagas e colaboradores.",
      },
      operacoes: {
        label: "Pessoas",
        subsections: ["Recrutamentos", "Admissões", "Treinamentos", "Férias"],
        quickActions: ["Registrar admissão", "Buscar vaga", "Ver pessoas no Portal"],
        conversationSuggestion: "Recrutamentos, admissões, treinamentos e férias prontos para acompanhamento.",
      },
      financeiro: {
        subsections: ["Folha", "Benefícios", "Reembolsos"],
      },
      documentos: {
        subsections: ["Currículos", "Contratos", "Relatórios"],
      },
    },
  },
  outro: {
    segment: "outro",
    label: "Outro segmento",
    areas: {},
  },
}

function applySectorTemplate(area: CosAreaSource, override?: SectorAreaOverride): CosAreaSource {
  const nextArea = override
    ? {
        ...area,
        ...override,
        subsections: override.subsections ?? area.subsections,
        quickActions: override.quickActions ?? area.quickActions,
        messages: override.messages ?? area.messages,
      }
    : area

  return {
    ...nextArea,
    label: standardAreaLabels[nextArea.key] ?? nextArea.label,
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
