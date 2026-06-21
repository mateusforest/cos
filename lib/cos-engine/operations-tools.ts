import type { OperationsEngineContext } from "@/lib/cos-engine/types"
import {
  isClientsContext,
  isDocumentsContext,
  isFinancialContext,
  isMeetingsContext,
  isOperationsContext,
  isSupportContext,
} from "@/lib/cos-engine/operations-context"

export function normalizeEngineText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

export function toTitleCase(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}

export function extractEmail(message: string) {
  const match = message.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  return match?.[0] || ""
}

export function extractPhone(message: string) {
  const digits = message.match(/\b\d{8,15}\b/)
  return digits?.[0] || ""
}

export function extractMoneyValue(message: string) {
  const match = message.match(/(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})|\d+(?:,\d{1,2})?)/)
  if (!match?.[1]) return ""
  return match[1]
}

export function extractAfterKeyword(message: string, keywords: string[]) {
  const normalized = normalizeEngineText(message)

  for (const keyword of keywords) {
    const index = normalized.indexOf(keyword)
    if (index >= 0) {
      return message.slice(index + keyword.length).trim()
    }
  }

  return ""
}

export function cleanupEntityTail(value: string) {
  return value
    .replace(/\b(com|para|chamado|chamada|nome|email|telefone)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function stripLeadingCommand(value: string) {
  return value
    .replace(/^(crie|criar|novo|nova|cadastrar|cadastre|registrar|registre|lancar|lance|adicionar|abrir)\s+/i, "")
    .trim()
}

function sanitizeClientNameCandidate(value: string) {
  return value
    .replace(/\bcomo cliente\b/giu, " ")
    .replace(/\bcliente\b/giu, " ")
    .replace(/\bcom email\b.*$/iu, "")
    .replace(/\bemail\b.*$/iu, "")
    .replace(/\btelefone\b.*$/iu, "")
    .replace(/\?+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function isLikelyClientName(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return false

  const normalized = normalizeEngineText(trimmed)
  if (
    /^(crie|criar|cadastre|cadastrar|cliente|novo|nova|um|uma|como)$/.test(normalized) ||
    normalized.includes("registrar gasto") ||
    normalized.includes("registrar receita")
  ) {
    return false
  }

  return /^[\p{L}][\p{L}\p{M}'’-]*(?:\s+[\p{L}][\p{L}\p{M}'’-]*)*$/u.test(trimmed)
}

function extractClientNameByPatterns(message: string) {
  const patterns = [
    /^(?:crie|criar|cadastre|cadastrar)\s+(.+?)\s+como\s+cliente$/iu,
    /^(?:crie|criar|cadastre|cadastrar)\s+(?:um\s+|uma\s+)?cliente\s+(.+)$/iu,
    /^(?:crie|criar|cadastre|cadastrar)\s+cliente\s+(.+)$/iu,
    /^cliente\s+(.+)$/iu,
  ]

  for (const pattern of patterns) {
    const match = message.match(pattern)
    const candidate = sanitizeClientNameCandidate(match?.[1] || "")

    if (candidate && isLikelyClientName(candidate)) {
      return toTitleCase(candidate)
    }
  }

  return ""
}

export function extractClientName(message: string, context: OperationsEngineContext) {
  const email = extractEmail(message)
  const phone = extractPhone(message)
  const withoutEmail = email ? message.replace(email, " ") : message
  const withoutPhone = phone ? withoutEmail.replace(phone, " ") : withoutEmail
  const patternedName = extractClientNameByPatterns(withoutPhone)

  if (patternedName) {
    return patternedName
  }

  const direct = extractAfterKeyword(withoutPhone, [
    "cliente chamado",
    "cliente com nome",
    "cadastrar cliente",
    "crie um cliente chamado",
    "crie cliente chamado",
    "crie um cliente",
    "crie cliente",
    "novo cliente",
  ])

  const fallback = isClientsContext(context) ? withoutPhone : ""
  const raw = stripLeadingCommand(cleanupEntityTail(direct || fallback))

  if (!raw) return ""

  const cleaned = sanitizeClientNameCandidate(raw)

  if (!isLikelyClientName(cleaned)) {
    return ""
  }

  return toTitleCase(cleaned)
}

export function recoverClientNameFromMessage(message: string) {
  return extractClientName(message, {
    area: "",
    subArea: "",
  })
}

export function inferFinancialType(message: string, context: OperationsEngineContext) {
  const normalized = normalizeEngineText(message)

  if (/\b(gasto|despesa|pagar|pagamento)\b/.test(normalized)) return "expense"
  if (/\b(ganho|receita|venda|faturamento|consultoria|entrada)\b/.test(normalized)) return "income"
  if (context.subArea === "gastos") return "expense"
  if (context.subArea === "ganhos") return "income"

  return isFinancialContext(context) ? "expense" : ""
}

export function extractFinancialTitle(message: string) {
  const explicit = extractAfterKeyword(message, ["com ", "referente a ", "de "])
  const raw = cleanupEntityTail(explicit)

  if (raw) {
    const cleaned = raw.replace(/^\d+(?:[.,]\d+)?\s*/, "").trim()
    return toTitleCase(cleaned)
  }

  const amount = extractMoneyValue(message)
  if (!amount) return ""

  const remainder = message.slice(message.toLowerCase().indexOf(amount.toLowerCase()) + amount.length).trim()
  return toTitleCase(stripLeadingCommand(cleanupEntityTail(remainder)))
}

export function extractOperationTitle(message: string, context: OperationsEngineContext) {
  const direct = extractAfterKeyword(message, [
    "chamada ",
    "chamado ",
    "criar operacao ",
    "crie operacao ",
    "nova operacao ",
    "abrir processo ",
    "criar processo ",
  ])

  const raw = stripLeadingCommand(cleanupEntityTail(direct || (isOperationsContext(context) ? message : "")))
  return toTitleCase(raw)
}

export function extractOperationClientName(message: string) {
  const match = message.match(/cliente\s+([a-zA-ZÀ-ÿ0-9 ]+?)(?:\s+chamad[ao]|\s*$)/i)
  return match?.[1] ? toTitleCase(match[1].trim()) : ""
}

export function detectDocumentType(message: string) {
  const normalized = normalizeEngineText(message)
  if (normalized.includes("contrato")) return "contrato"
  if (normalized.includes("proposta")) return "proposta"
  if (normalized.includes("relatorio")) return "relatório"
  if (normalized.includes("arquivo")) return "arquivo"
  return "outro"
}

export function extractDocumentTitle(message: string, context: OperationsEngineContext) {
  const direct = extractAfterKeyword(message, [
    "criar documento ",
    "novo documento ",
    "documento ",
  ])

  const raw = stripLeadingCommand(cleanupEntityTail(direct || (isDocumentsContext(context) ? message : "")))
  return toTitleCase(raw)
}

export function extractMeetingTitle(message: string, context: OperationsEngineContext) {
  const direct = extractAfterKeyword(message, [
    "chamada ",
    "criar reuniao ",
    "crie reuniao ",
    "gravar reuniao ",
    "nova reuniao ",
  ])

  const raw = stripLeadingCommand(cleanupEntityTail(direct || (isMeetingsContext(context) ? message : "")))
  return toTitleCase(raw.replace(/^com\s+/i, ""))
}

export function detectSupportCategory(message: string, context: OperationsEngineContext) {
  const normalized = normalizeEngineText(message)

  if (/\b(cobranca|cobranca|plano|assinatura)\b/.test(normalized)) return "Plano ou cobrança"
  if (/\b(integracao|integracoes)\b/.test(normalized)) return "Integrações"
  if (/\b(problema|erro|bug|tecnico)\b/.test(normalized)) return "Problema técnico"
  if (/\b(atendimento|humano|falar com atendimento)\b/.test(normalized)) return "Falar com atendimento"
  if (isSupportContext(context)) return "Dúvida sobre o COS"
  return "Dúvida sobre o COS"
}

export function extractSupportSubject(message: string) {
  const raw = cleanupEntityTail(
    extractAfterKeyword(message, [
      "abrir chamado de suporte ",
      "abrir chamado ",
      "preciso de ajuda com ",
      "ajuda com ",
    ]) || message,
  )

  return toTitleCase(raw)
}

export function isFinancialSummaryQuery(message: string) {
  const normalized = normalizeEngineText(message)
  return /\b(qual meu saldo|mostrar resumo financeiro|resumo financeiro|saldo atual|quanto tenho em caixa)\b/.test(normalized)
}

export function isClientsCountQuery(message: string) {
  const normalized = normalizeEngineText(message)
  return /\b(quantos clientes tenho|quantos clientes|qtd de clientes|total de clientes)\b/.test(normalized)
}

export function isRecentActivityQuery(message: string) {
  const normalized = normalizeEngineText(message)
  return /\b(listar ultimas atividades|ultimas atividades|ultimos registros|mostrar historico)\b/.test(normalized)
}

export function looksLikeCreateClient(message: string, context: OperationsEngineContext) {
  const normalized = normalizeEngineText(message)
  if (/\b(cliente)\b/.test(normalized) && /\b(crie|criar|novo|nova|cadastrar|cadastre)\b/.test(normalized)) return true
  if (isClientsContext(context) && !!extractClientName(message, context)) return true
  return false
}

export function looksLikeCreateFinancial(message: string, context: OperationsEngineContext) {
  const normalized = normalizeEngineText(message)
  if (/\b(gasto|despesa|ganho|receita|lancar|lance|registrar|registre|adicionar)\b/.test(normalized) && !!extractMoneyValue(message)) return true
  if (isFinancialContext(context) && !!extractMoneyValue(message)) return true
  return false
}

export function looksLikeCreateOperation(message: string, context: OperationsEngineContext) {
  const normalized = normalizeEngineText(message)
  if (/\b(operacao|processo|projeto|ordem)\b/.test(normalized) && /\b(criar|crie|novo|nova|abrir)\b/.test(normalized)) return true
  if (isOperationsContext(context) && !!extractOperationTitle(message, context)) return true
  return false
}

export function looksLikeCreateDocument(message: string, context: OperationsEngineContext) {
  const normalized = normalizeEngineText(message)
  if (/\b(documento|contrato|proposta|relatorio|arquivo)\b/.test(normalized) && /\b(criar|crie|novo|nova)\b/.test(normalized)) return true
  if (isDocumentsContext(context) && !!extractDocumentTitle(message, context)) return true
  return false
}

export function looksLikeCreateMeeting(message: string, context: OperationsEngineContext) {
  const normalized = normalizeEngineText(message)
  if (/\b(reuniao|gravar reuniao)\b/.test(normalized) && /\b(criar|crie|nova|novo|gravar)\b/.test(normalized)) return true
  if (isMeetingsContext(context) && !!extractMeetingTitle(message, context)) return true
  return false
}

export function looksLikeCreateSupportTicket(message: string, context: OperationsEngineContext) {
  const normalized = normalizeEngineText(message)
  if (/\b(chamado|suporte|ajuda|problema|cobranca|atendimento)\b/.test(normalized)) return true
  return isSupportContext(context)
}
