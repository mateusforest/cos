const activityLabels: Record<string, string> = {
  activity_logged: "Atividade registrada",
  workspace_created: "Empresa criada",
  workspace_updated: "Empresa atualizada",
  workspace_deleted: "Empresa removida",
  member_added: "Membro adicionado",
  member_removed: "Membro removido",
  member_updated: "Membro atualizado",
  client_created: "Cliente criado",
  client_updated: "Cliente atualizado",
  client_archived: "Cliente arquivado",
  support_ticket_created: "Chamado criado",
  support_message_created: "Mensagem enviada no suporte",
  support_status_updated: "Status do chamado atualizado",
  support_priority_updated: "Prioridade do chamado atualizada",
  support_ticket_assigned: "Chamado atribuido",
  master_support_reply: "Resposta enviada pela equipe COS",
  operation_created: "Operacao criada",
  operation_updated: "Operacao atualizada",
  operation_archived: "Operacao arquivada",
  document_created: "Documento criado",
  document_updated: "Documento atualizado",
  document_archived: "Documento arquivado",
  meeting_created: "Reuniao criada",
  meeting_updated: "Reuniao atualizada",
  meeting_archived: "Reuniao arquivada",
  connect_source_created: "Fonte conectada",
  connect_source_prepared: "Fonte preparada",
  connect_source_preparation_failed: "Falha na preparacao da fonte",
  connect_source_updated: "Fonte atualizada",
  connect_source_deleted: "Fonte removida",
  connect_section_created: "Sessao criada",
  connect_section_updated: "Sessao atualizada",
  connect_section_deleted: "Sessao removida",
  connect_action_created: "Acao criada",
  connect_action_updated: "Acao atualizada",
  connect_action_deleted: "Acao removida",
  connect_action_executed: "Acao executada",
  connect_action_execution_failed: "Falha na execucao da acao",
  connect_action_execution_blocked: "Execucao da acao bloqueada",
  meeting_join_requested: "Solicitacao de entrada",
  meeting_join_approved: "Entrada na reuniao",
  meeting_join_denied: "Entrada negada",
  meeting_live_connected: "Participante entrou",
  meeting_live_disconnected: "Participante saiu",
  meeting_live_removed: "Participante removido",
  meeting_finished: "Reuniao encerrada",
  meeting_session_recorded: "Registro da reuniao",
}

function normalizeActivityAction(action: string | null | undefined) {
  return (action || "activity_logged")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
}

function extractParticipantName(description: string | null | undefined) {
  const normalizedDescription = (description || "").trim()

  if (!normalizedDescription) {
    return null
  }

  const patterns = [
    /^(.*?)\s+solicitou entrada/i,
    /^(.*?)\s+teve a entrada permitida/i,
    /^(.*?)\s+teve a entrada negada/i,
    /^(.*?)\s+entrou na reuniao/i,
    /^(.*?)\s+saiu da reuniao/i,
    /^(.*?)\s+foi removido da sala ao vivo/i,
    /^(.*?)\s+requested entry/i,
    /^(.*?)\s+was approved to join/i,
    /^(.*?)\s+was denied entry/i,
    /^(.*?)\s+joined the meeting/i,
    /^(.*?)\s+left the meeting/i,
    /^(.*?)\s+was removed from the live room/i,
  ]

  for (const pattern of patterns) {
    const match = normalizedDescription.match(pattern)
    if (match?.[1]?.trim()) {
      return match[1].trim()
    }
  }

  return null
}

function isTechnicalMeetingDescription(description: string | null | undefined) {
  const normalizedDescription = (description || "").trim().toLowerCase()

  if (!normalizedDescription) {
    return true
  }

  return normalizedDescription.startsWith("meeting_") || normalizedDescription.startsWith("meeting ")
}

function detectFinancialLabel(description: string | null | undefined, labels: { income: string; expense: string; fallback: string }) {
  const normalizedDescription = (description || "").trim().toLowerCase()

  if (!normalizedDescription) {
    return labels.fallback
  }

  if (normalizedDescription.includes("ganho") || normalizedDescription.includes("receita") || normalizedDescription.includes("entrada")) {
    return labels.income
  }

  if (normalizedDescription.includes("gasto") || normalizedDescription.includes("despesa") || normalizedDescription.includes("saida")) {
    return labels.expense
  }

  return labels.fallback
}

export function humanizeActivityAction(action: string | null | undefined, description?: string | null) {
  const normalizedAction = normalizeActivityAction(action)

  if (normalizedAction === "financial_entry_created") {
    return detectFinancialLabel(description, {
      income: "Receita registrada",
      expense: "Gasto registrado",
      fallback: "Lancamento registrado",
    })
  }

  if (normalizedAction === "financial_entry_updated") {
    return detectFinancialLabel(description, {
      income: "Receita atualizada",
      expense: "Gasto atualizado",
      fallback: "Lancamento atualizado",
    })
  }

  if (normalizedAction === "financial_entry_deleted") {
    return detectFinancialLabel(description, {
      income: "Receita removida",
      expense: "Gasto removido",
      fallback: "Lancamento removido",
    })
  }

  if (activityLabels[normalizedAction]) {
    return activityLabels[normalizedAction]
  }

  if (normalizedAction.startsWith("meeting_")) {
    return "Atualizacao da reuniao"
  }

  const cleaned = normalizedAction.replace(/_/g, " ").trim()

  if (!cleaned) {
    return "Atividade registrada"
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

export function humanizeActivityDescription(action: string | null | undefined, description?: string | null) {
  const normalizedAction = normalizeActivityAction(action)
  const participantName = extractParticipantName(description)

  if (normalizedAction === "meeting_join_requested") {
    return participantName ? `${participantName} solicitou entrada na reuniao.` : "Um participante solicitou entrada na reuniao."
  }

  if (normalizedAction === "meeting_join_approved") {
    return participantName ? `${participantName} teve a entrada permitida.` : "A entrada na reuniao foi permitida."
  }

  if (normalizedAction === "meeting_join_denied") {
    return participantName ? `${participantName} teve a entrada negada.` : "A entrada na reuniao foi negada."
  }

  if (normalizedAction === "meeting_live_connected") {
    return participantName ? `${participantName} entrou na reuniao.` : "Um participante entrou na reuniao."
  }

  if (normalizedAction === "meeting_live_disconnected") {
    return participantName ? `${participantName} saiu da reuniao.` : "Um participante saiu da reuniao."
  }

  if (normalizedAction === "meeting_live_removed") {
    return participantName ? `${participantName} foi removido da sala ao vivo.` : "Um participante foi removido da sala ao vivo."
  }

  if (normalizedAction === "meeting_created") {
    return "Reuniao criada no COS Meet."
  }

  if (normalizedAction === "meeting_finished") {
    return "A reuniao foi encerrada para todos os participantes."
  }

  if (normalizedAction === "meeting_session_recorded") {
    return "Inicio, fim, duracao e participantes da reuniao foram registrados."
  }

  if (normalizedAction.startsWith("meeting_") && isTechnicalMeetingDescription(description)) {
    return "Atualizacao registrada na reuniao."
  }

  return description?.trim() || "Atividade registrada."
}
