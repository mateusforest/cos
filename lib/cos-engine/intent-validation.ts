import { futureMinimumIntentConfidence, getRequiredFieldsForIntent } from "@/lib/cos-engine/schemas"
import { normalizeEngineText, recoverClientNameFromMessage } from "@/lib/cos-engine/operations-tools"
import type {
  OperationsResolvedIntent,
  ValidateIntentPayloadInput,
  ValidateIntentPayloadResult,
} from "@/lib/cos-engine/types"

function hasMeaningfulValue(value: string | number | boolean | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value)
  }

  if (typeof value === "boolean") {
    return true
  }

  return typeof value === "string" ? value.trim().length > 0 : false
}

function parseAmount(value: string | number | boolean | null | undefined) {
  if (typeof value === "number") {
    return value
  }

  if (typeof value !== "string") {
    return Number.NaN
  }

  const normalized = value.replace(/\./g, "").replace(",", ".").trim()
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

function buildFinancialAmountQuestion(resolvedIntent: OperationsResolvedIntent) {
  const subject = String(resolvedIntent.entities.title || resolvedIntent.entities.description || "")
    .trim()
    .toLowerCase()

  if (resolvedIntent.intent === "create_financial_income") {
    return subject ? `Qual foi o valor da receita com ${subject}?` : "Qual foi o valor da receita?"
  }

  return subject ? `Qual foi o valor do gasto com ${subject}?` : "Qual foi o valor do gasto?"
}

function buildMissingFieldMessage(
  intent: OperationsResolvedIntent["intent"],
  missingFields: string[],
  entities?: OperationsResolvedIntent["entities"],
) {
  if (intent === "create_client" && missingFields.includes("name")) {
    return "Para criar o cliente, preciso pelo menos do nome."
  }

  if ((intent === "create_financial_income" || intent === "create_financial_expense") && missingFields.includes("amount")) {
    return buildFinancialAmountQuestion({
      intent,
      confidence: 1,
      entities: entities ?? {},
      requiresConfirmation: false,
      missingFields,
      unsafeReason: null,
      reply: "",
      shouldFallbackToHeuristic: false,
      source: "heuristic",
    })
  }

  if ((intent === "create_financial_income" || intent === "create_financial_expense") && missingFields.includes("title")) {
    return "Para registrar esse lancamento, preciso da descricao."
  }

  if (intent === "create_operation" && missingFields.includes("title")) {
    return "Para criar a operacao, preciso do titulo."
  }

  if (intent === "create_document" && missingFields.includes("title")) {
    return "Para criar o documento, preciso do titulo."
  }

  if (intent === "create_meeting" && missingFields.includes("title")) {
    return "Para criar a reuniao, preciso do titulo."
  }

  if (intent === "create_support_ticket" && missingFields.includes("subject")) {
    return "Para abrir o chamado, preciso do assunto."
  }

  if (intent === "create_support_ticket" && missingFields.includes("description")) {
    return "Para abrir o chamado, preciso da descricao do problema."
  }

  return "Preciso de mais informacoes para executar essa solicitacao."
}

function isRecoverableClientNameUnsafeReason(unsafeReason: string | null | undefined) {
  const normalized = normalizeEngineText(unsafeReason || "")

  if (!normalized) {
    return false
  }

  return [
    "special character",
    "encoding",
    "question mark",
    "accent",
    "acento",
    "typo",
    "caractere especial",
  ].some((term) => normalized.includes(normalizeEngineText(term)))
}

function recoverClientIntentIfSafe({
  resolvedIntent,
  message,
}: {
  resolvedIntent: OperationsResolvedIntent
  message: string
}) {
  if (resolvedIntent.intent !== "create_client" || resolvedIntent.confidence < 0.75) {
    return resolvedIntent
  }

  const recoveredName = recoverClientNameFromMessage(message)
  if (!recoveredName) {
    return resolvedIntent
  }

  const currentName = String(resolvedIntent.entities.name || "").trim()
  const nameLooksBroken = !currentName || currentName.includes("?")
  const unsafeReasonIsRecoverable = isRecoverableClientNameUnsafeReason(resolvedIntent.unsafeReason)

  if (!nameLooksBroken && !unsafeReasonIsRecoverable && !resolvedIntent.missingFields.includes("name")) {
    return resolvedIntent
  }

  return {
    ...resolvedIntent,
    entities: {
      ...resolvedIntent.entities,
      name: recoveredName,
    },
    missingFields: resolvedIntent.missingFields.filter((field) => field !== "name"),
    unsafeReason: unsafeReasonIsRecoverable ? null : resolvedIntent.unsafeReason,
  }
}

export function validateIntentPayload({
  resolvedIntent,
  message,
}: ValidateIntentPayloadInput): ValidateIntentPayloadResult {
  if (resolvedIntent.intent === "unknown") {
    return {
      ok: false,
      resolvedIntent,
      message:
        "Ainda nao consigo executar essa solicitacao, mas posso ajudar com clientes, financeiro, operacoes, documentos, reunioes e suporte.",
      executionStatus: "not_executed",
    }
  }

  if (resolvedIntent.source === "openai" && resolvedIntent.confidence < futureMinimumIntentConfidence) {
    return {
      ok: false,
      resolvedIntent: {
        ...resolvedIntent,
        unsafeReason: "low_confidence",
      },
      message: "Nao consegui interpretar essa solicitacao com seguranca. Pode reformular?",
      executionStatus: "validation_failed",
    }
  }

  const normalizedResolvedIntent = recoverClientIntentIfSafe({
    resolvedIntent,
    message,
  })

  if (normalizedResolvedIntent.unsafeReason) {
    return {
      ok: false,
      resolvedIntent: normalizedResolvedIntent,
      message: "Preciso de uma solicitacao mais clara antes de executar isso.",
      executionStatus: "validation_failed",
    }
  }

  const requiredFields = getRequiredFieldsForIntent(normalizedResolvedIntent.intent)
  const entities: OperationsResolvedIntent["entities"] = {
    ...normalizedResolvedIntent.entities,
    description: normalizedResolvedIntent.entities.description ?? message,
  }

  const missingFields = requiredFields.filter((field) => !hasMeaningfulValue(entities[field]))
  if (missingFields.length > 0) {
    return {
      ok: false,
      resolvedIntent: {
        ...normalizedResolvedIntent,
        entities,
        missingFields,
      },
      message: buildMissingFieldMessage(normalizedResolvedIntent.intent, missingFields, entities),
      executionStatus: "validation_failed",
    }
  }

  if (
    normalizedResolvedIntent.intent === "create_financial_income" ||
    normalizedResolvedIntent.intent === "create_financial_expense"
  ) {
    const parsedAmount = parseAmount(entities.amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return {
        ok: false,
        resolvedIntent: {
          ...normalizedResolvedIntent,
          entities,
          missingFields: ["amount"],
        },
        message: buildFinancialAmountQuestion({
          ...normalizedResolvedIntent,
          entities,
        }),
        executionStatus: "validation_failed",
      }
    }
  }

  return {
    ok: true,
    resolvedIntent: {
      ...normalizedResolvedIntent,
      entities,
      missingFields: [],
    },
  }
}
