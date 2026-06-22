import { extractEmail, extractPhone, normalizeEngineText, toTitleCase } from "@/lib/cos-engine/operations-tools"
import type { OperationsConversationMemory, OperationsResolvedIntent } from "@/lib/cos-engine/types"

function hasClientPronounReference(message: string) {
  const normalized = normalizeEngineText(message)

  return /\b(dele|dela|nele|nela|nesse cliente|nessa cliente|desse cliente|dessa cliente|esse cliente|essa cliente|ele|ela|o mesmo|a mesma|ultimo cliente|ultima cliente)\b/.test(
    normalized,
  )
}

function extractExplicitTargetClientName(message: string) {
  const patterns = [
    /(?:cliente)\s+(.+?)\s+para\s+(?:\d{8,15}|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/iu,
    /(?:cliente)\s+(.+?)\s+(?:com\s+email|com\s+telefone)/iu,
    /(?:cliente)\s+(.+?)\s*$/iu,
  ]

  for (const pattern of patterns) {
    const match = message.match(pattern)
    const candidate = match?.[1]?.trim()

    if (candidate) {
      return toTitleCase(candidate)
    }
  }

  return ""
}

function extractUpdatedClientName(message: string) {
  const match = message.match(/(?:mude|altere|atualize|troque)\s+o?\s*nome(?:\s+dele|\s+dela|\s+do cliente\s+.+?|\s+da cliente\s+.+?)?\s+para\s+(.+)$/iu)
  return match?.[1] ? toTitleCase(match[1].trim()) : ""
}

function extractUpdatedCompany(message: string) {
  const match = message.match(/(?:empresa|companhia)(?:\s+dele|\s+dela|\s+do cliente\s+.+?|\s+da cliente\s+.+?)?\s+para\s+(.+)$/iu)
  return match?.[1] ? match[1].trim() : ""
}

function extractUpdatedNotes(message: string) {
  const match = message.match(/(?:observacao|observa[cç][aã]o|nota|notes?)(?:\s+dele|\s+dela|\s+do cliente\s+.+?|\s+da cliente\s+.+?)?\s+para\s+(.+)$/iu)
  return match?.[1] ? match[1].trim() : ""
}

function mergeClientReference({
  resolvedIntent,
  message,
  conversationMemory,
}: {
  resolvedIntent: OperationsResolvedIntent
  message: string
  conversationMemory?: OperationsConversationMemory
}) {
  const entities = { ...resolvedIntent.entities }
  const explicitClientName = String(entities.clientName || "").trim() || extractExplicitTargetClientName(message)
  const canUseLastClient = hasClientPronounReference(message) && conversationMemory?.lastClient
  const trustedClientId =
    String(entities.clientId || "").trim() &&
    conversationMemory?.lastClient?.id &&
    String(entities.clientId).trim() === conversationMemory.lastClient.id
      ? String(entities.clientId).trim()
      : ""

  if (trustedClientId) {
    entities.clientId = trustedClientId
    entities.clientName = conversationMemory?.lastClient?.name ?? explicitClientName
    return entities
  }

  if (canUseLastClient && conversationMemory?.lastClient) {
    entities.clientId = conversationMemory.lastClient.id
    entities.clientName = conversationMemory.lastClient.name
    return entities
  }

  if (explicitClientName) {
    entities.clientName = explicitClientName
    entities.clientId = null
  }

  return entities
}

export function resolveIntentReferences({
  resolvedIntent,
  message,
  conversationMemory,
}: {
  resolvedIntent: OperationsResolvedIntent
  message: string
  conversationMemory?: OperationsConversationMemory
}) {
  if (resolvedIntent.intent !== "update_client") {
    return resolvedIntent
  }

  const entities = mergeClientReference({
    resolvedIntent,
    message,
    conversationMemory,
  })
  const extractedName = extractUpdatedClientName(message)
  const extractedEmail = extractEmail(message)
  const extractedPhone = extractPhone(message)
  const extractedCompany = extractUpdatedCompany(message)
  const extractedNotes = extractUpdatedNotes(message)

  return {
    ...resolvedIntent,
    unresolvedReference:
      hasClientPronounReference(message) && !conversationMemory?.lastClient && !entities.clientName
        ? "client_reference_not_resolved"
        : resolvedIntent.unresolvedReference ?? null,
    entities: {
      ...entities,
      name: extractedName || entities.name || null,
      email: extractedEmail || entities.email || null,
      phone: extractedPhone || entities.phone || null,
      company: extractedCompany || entities.company || null,
      notes: extractedNotes || entities.notes || null,
    },
  }
}
