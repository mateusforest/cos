export type WhileYouRestItemKind = "executable" | "waiting_confirmation" | "unsupported"
export type WhileYouRestPriority = "alta" | "media" | "baixa"
export type WhileYouRestActionType = "create_client" | "create_document" | "waiting_confirmation" | "unsupported"
export type WhileYouRestControlState = "draft" | "running" | "paused" | "ended"

export type WhileYouRestPlanItem = {
  id: string
  title: string
  description: string
  priority: WhileYouRestPriority
  deadline: string | null
  actionType: WhileYouRestActionType
  kind: WhileYouRestItemKind
  predictedStatus: string
  requiresConfirmation: boolean
  payload: Record<string, unknown>
}

const SENSITIVE_KEYWORDS = [
  "pagar",
  "pagamento",
  "transferir",
  "transferencia",
  "excluir",
  "apagar",
  "remover",
  "enviar email",
  "enviar e-mail",
  "enviar whatsapp",
  "mandar mensagem",
]

const DOCUMENT_KEYWORDS = ["documento", "contrato", "relatorio", "relatorio", "proposta", "arquivo"]
const CLIENT_KEYWORDS = ["cliente", "paciente", "lead", "contato"]

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

function splitRequestIntoEntries(request: string) {
  const normalized = request
    .split(/\r?\n+/)
    .flatMap((line) => line.split(/[;]+/))
    .flatMap((line) => line.split(/(?<=\.)\s+/))
    .map((line) => line.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter(Boolean)

  if (normalized.length > 0) {
    return normalized
  }

  return request.trim() ? [request.trim()] : []
}

function inferPriority(entry: string): WhileYouRestPriority {
  const normalized = normalizeText(entry)

  if (normalized.includes("urgente") || normalized.includes("hoje") || normalized.includes("agora")) {
    return "alta"
  }

  if (normalized.includes("amanha") || normalized.includes("prioridade")) {
    return "media"
  }

  return "baixa"
}

function inferDeadline(entry: string) {
  const normalized = normalizeText(entry)
  const dateMatch = entry.match(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/)

  if (dateMatch) {
    return dateMatch[0]
  }

  if (normalized.includes("hoje")) {
    return "Hoje"
  }

  if (normalized.includes("amanha")) {
    return "Amanha"
  }

  if (normalized.includes("esta semana")) {
    return "Esta semana"
  }

  return null
}

function extractQuotedLabel(entry: string) {
  const quoted = entry.match(/["“](.+?)["”]/)
  return quoted?.[1]?.trim() || null
}

function extractClientName(entry: string) {
  const quoted = extractQuotedLabel(entry)
  if (quoted) return quoted

  const match = entry.match(/(?:cliente|paciente|lead|contato)\s+(.+)/i)
  return match?.[1]?.trim() || null
}

function extractDocumentTitle(entry: string) {
  const quoted = extractQuotedLabel(entry)
  if (quoted) return quoted

  const match = entry.match(/(?:documento|contrato|relat[oó]rio|proposta|arquivo)\s+(.+)/i)
  return match?.[1]?.trim() || null
}

function buildExecutableClientItem(entry: string, index: number): WhileYouRestPlanItem {
  const name = extractClientName(entry) || `Cliente ${index + 1}`
  return {
    id: `item-${index + 1}`,
    title: `Criar ${name}`,
    description: entry,
    priority: inferPriority(entry),
    deadline: inferDeadline(entry),
    actionType: "create_client",
    kind: "executable",
    predictedStatus: "Aguardando execucao",
    requiresConfirmation: false,
    payload: {
      name,
      email: "",
      phone: "",
      company: "",
      notes: `Criado a partir do pedido: ${entry}`,
      status: "active",
    },
  }
}

function buildExecutableDocumentItem(entry: string, index: number): WhileYouRestPlanItem {
  const title = extractDocumentTitle(entry) || `Documento ${index + 1}`
  return {
    id: `item-${index + 1}`,
    title: `Criar ${title}`,
    description: entry,
    priority: inferPriority(entry),
    deadline: inferDeadline(entry),
    actionType: "create_document",
    kind: "executable",
    predictedStatus: "Aguardando execucao",
    requiresConfirmation: false,
    payload: {
      title,
      type: "outro",
      content: `Gerado a partir do pedido: ${entry}`,
      status: "draft",
      fileUrl: "",
    },
  }
}

function buildWaitingConfirmationItem(entry: string, index: number): WhileYouRestPlanItem {
  return {
    id: `item-${index + 1}`,
    title: `Revisar: ${entry.slice(0, 60)}`,
    description: entry,
    priority: inferPriority(entry),
    deadline: inferDeadline(entry),
    actionType: "waiting_confirmation",
    kind: "waiting_confirmation",
    predictedStatus: "Aguardando confirmacao",
    requiresConfirmation: true,
    payload: {},
  }
}

function buildUnsupportedItem(entry: string, index: number): WhileYouRestPlanItem {
  return {
    id: `item-${index + 1}`,
    title: `Planejar: ${entry.slice(0, 60)}`,
    description: entry,
    priority: inferPriority(entry),
    deadline: inferDeadline(entry),
    actionType: "unsupported",
    kind: "unsupported",
    predictedStatus: "Nao suportado",
    requiresConfirmation: false,
    payload: {},
  }
}

export function buildWhileYouRestPlan(request: string) {
  const entries = splitRequestIntoEntries(request)

  const items = entries.map<WhileYouRestPlanItem>((entry, index) => {
    const normalized = normalizeText(entry)

    if (SENSITIVE_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
      return buildWaitingConfirmationItem(entry, index)
    }

    if (
      CLIENT_KEYWORDS.some((keyword) => normalized.includes(keyword)) &&
      /(criar|cadastar|cadastrar|registrar|adicionar|incluir|preparar)/i.test(normalized)
    ) {
      return buildExecutableClientItem(entry, index)
    }

    if (
      DOCUMENT_KEYWORDS.some((keyword) => normalized.includes(keyword)) &&
      /(criar|gerar|preparar|montar|registrar)/i.test(normalized)
    ) {
      return buildExecutableDocumentItem(entry, index)
    }

    return buildUnsupportedItem(entry, index)
  })

  return {
    request,
    items,
  }
}

export function buildWhileYouRestNextStep(items: WhileYouRestPlanItem[]) {
  if (items.some((item) => item.kind === "waiting_confirmation")) {
    return "Revise os itens sensiveis antes de liberar novas execucoes."
  }

  if (items.some((item) => item.kind === "unsupported")) {
    return "Use os itens nao suportados como roteiro para a proxima etapa manual."
  }

  return "Acompanhe os jobs em segundo plano e revise os resultados concluidos."
}

export function buildWhileYouRestTitle(request: string, items: WhileYouRestPlanItem[]) {
  const executableItem = items.find((item) => item.kind === "executable")
  if (executableItem) {
    return executableItem.title
  }

  const waitingConfirmationItem = items.find((item) => item.kind === "waiting_confirmation")
  if (waitingConfirmationItem) {
    return waitingConfirmationItem.title
  }

  const firstLine = request
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .find(Boolean)

  if (firstLine) {
    return firstLine.length > 60 ? `${firstLine.slice(0, 57)}...` : firstLine
  }

  return "Nova execucao"
}

export function estimateWhileYouRestMinutes(items: WhileYouRestPlanItem[]) {
  return items.reduce((total, item) => {
    if (item.kind === "executable") return total + 4
    if (item.kind === "waiting_confirmation") return total + 2
    return total + 1
  }, 0)
}
