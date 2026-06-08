import {
  Users,
  Briefcase,
  TrendingUp,
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

export const slug = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-")

export const areaConfigs: Record<string, AreaConfig> = {
  cadastros: {
    label: "Cadastros",
    icon: Users,
    color: "#ec4899",
    bg: "#fce7f3",
    subsections: ["Clientes", "Leads", "Produtos", "Serviços", "Fornecedores", "Estoque"],
    quickActions: ["Cadastrar cliente", "Importar lista", "Ver leads"],
    messages: [],
  },
  operacoes: {
    label: "Operações",
    icon: Briefcase,
    color: "#8b5cf6",
    bg: "#ede9fe",
    subsections: ["Projetos", "Pedidos", "Processos", "Atendimentos", "Execuções"],
    quickActions: ["Nova operação", "Ver em andamento", "Atribuir responsável"],
    messages: [],
  },
  vendas: {
    label: "Vendas",
    icon: TrendingUp,
    color: "#3b82f6",
    bg: "#dbeafe",
    subsections: ["Oportunidades", "Propostas", "Negociações", "Conversões"],
    quickActions: ["Nova proposta", "Ver pipeline", "Registrar venda"],
    messages: [],
  },
  financeiro: {
    label: "Financeiro",
    icon: DollarSign,
    color: "#22c55e",
    bg: "#dcfce7",
    subsections: ["Ganhos", "Gastos", "Cobranças", "Balanço"],
    quickActions: ["Registrar ganho", "Registrar gasto", "Ver balanço"],
    messages: [],
  },
  equipe: {
    label: "Equipe",
    icon: UsersRound,
    color: "#0ea5e9",
    bg: "#e0f2fe",
    subsections: ["Comercial", "Operacional", "Financeiro", "Administrativo", "Gestão"],
    quickActions: ["Adicionar membro", "Atribuir tarefa", "Ver desempenho"],
    messages: [],
  },
  documentos: {
    label: "Documentos",
    icon: FolderOpen,
    color: "#f97316",
    bg: "#ffedd5",
    subsections: ["Contratos", "Propostas", "Termos", "Arquivos"],
    quickActions: ["Gerar documento", "Enviar arquivo", "Ver contratos"],
    messages: [],
  },
  reunioes: {
    label: "Reuniões",
    icon: Video,
    color: "#ef4444",
    bg: "#fee2e2",
    subsections: ["Gravações", "Resumos", "Tarefas geradas"],
    quickActions: ["Gravar reunião", "Ver resumos", "Agendar"],
    messages: [],
  },
  sistema: {
    label: "Sistema",
    icon: Settings,
    color: "#6b7280",
    bg: "#f3f4f6",
    subsections: ["Alertas", "Logs", "Notificações", "Integrações"],
    quickActions: ["Ver alertas", "Gerenciar integrações"],
    messages: [],
  },
  suporte: {
    label: "Suporte",
    icon: LifeBuoy,
    color: "#6b7280",
    bg: "#f3f4f6",
    subsections: [],
    quickActions: ["Iniciar suporte"],
    messages: [],
  },
}

export const equipeGroups: Record<string, { label: string; messages: ChatMessage[] }> = {
  comercial: { label: "Equipe Comercial", messages: [] },
  operacional: { label: "Equipe Operacional", messages: [] },
  financeiro: { label: "Equipe Financeira", messages: [] },
  administrativo: { label: "Equipe Administrativa", messages: [] },
  gestao: { label: "Gestão", messages: [] },
}
