import type { OperationsEngineResult } from "@/lib/cos-engine/types"

const activityLabels: Record<string, string> = {
  financial_entry_created: "Lançamento financeiro criado",
  financial_entry_updated: "Lançamento financeiro atualizado",
  financial_entry_deleted: "Lançamento financeiro removido",
  client_created: "Cliente criado",
  client_updated: "Cliente atualizado",
  client_archived: "Cliente arquivado",
  support_ticket_created: "Chamado de suporte aberto",
  support_message_created: "Mensagem enviada no suporte",
  master_support_reply: "Resposta enviada pela equipe COS",
  operation_created: "Operação criada",
  operation_updated: "Operação atualizada",
  operation_archived: "Operação arquivada",
  document_created: "Documento criado",
  document_updated: "Documento atualizado",
  document_archived: "Documento arquivado",
  meeting_created: "Reunião criada",
  meeting_updated: "Reunião atualizada",
  meeting_archived: "Reunião arquivada",
}

export function formatCurrencyBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

export function humanizeActivityAction(action: string) {
  if (activityLabels[action]) {
    return activityLabels[action]
  }

  const cleaned = action.replace(/_/g, " ").trim()
  if (!cleaned) return "Atividade registrada"
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

export function buildEngineError(message: string, action?: OperationsEngineResult["action"]): OperationsEngineResult {
  return {
    ok: false,
    message,
    action,
  }
}

export function buildEngineSuccess(input: Omit<OperationsEngineResult, "ok">): OperationsEngineResult {
  return {
    ok: true,
    ...input,
  }
}
