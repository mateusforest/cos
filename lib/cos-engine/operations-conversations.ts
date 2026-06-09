import { buildOperationsContext } from "@/lib/cos-engine/operations-context"

const areaTitles: Record<string, string> = {
  general: "Geral",
  cadastros: "Cadastros",
  clientes: "Clientes",
  leads: "Leads",
  produtos: "Produtos",
  servicos: "Servicos",
  financeiro: "Financeiro",
  ganhos: "Ganhos",
  gastos: "Gastos",
  "fluxo de caixa": "Fluxo de caixa",
  operacoes: "Operacoes",
  projetos: "Projetos",
  ordens: "Ordens",
  processos: "Processos",
  documentos: "Documentos",
  contratos: "Contratos",
  arquivos: "Arquivos",
  relatorios: "Relatorios",
  reunioes: "Reunioes",
  suporte: "Suporte",
  sistema: "Sistema",
}

function humanizeSegment(value: string) {
  const cleaned = value.replace(/-/g, " ").trim()

  if (!cleaned) {
    return "Geral"
  }

  if (areaTitles[cleaned]) {
    return areaTitles[cleaned]
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

export function buildOperationsConversationArea(input: { area?: string; subArea?: string }) {
  const context = buildOperationsContext(input)

  if (!context.area) {
    return "general"
  }

  if (!context.subArea) {
    return context.area
  }

  return `${context.area}/${context.subArea}`
}

export function buildOperationsConversationTitle(input: { area?: string; subArea?: string }) {
  const conversationArea = buildOperationsConversationArea(input)
  const segments = conversationArea.split("/")
  const lastSegment = segments[segments.length - 1] || "general"

  return humanizeSegment(lastSegment)
}

export function formatOperationsConversationTime(value: string | null) {
  if (!value) {
    return "Agora"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Agora"
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}
