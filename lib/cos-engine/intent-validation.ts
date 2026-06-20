import { futureMinimumIntentConfidence, getRequiredFieldsForIntent } from "@/lib/cos-engine/schemas"
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

function buildMissingFieldMessage(intent: OperationsResolvedIntent["intent"], missingFields: string[]) {
  if (intent === "create_client" && missingFields.includes("name")) {
    return "Para criar o cliente, preciso pelo menos do nome."
  }

  if ((intent === "create_financial_income" || intent === "create_financial_expense") && missingFields.includes("amount")) {
    return "Para registrar esse lancamento, preciso saber o valor."
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

  const requiredFields = getRequiredFieldsForIntent(resolvedIntent.intent)
  const entities: OperationsResolvedIntent["entities"] = {
    ...resolvedIntent.entities,
    description: resolvedIntent.entities.description ?? message,
  }

  const missingFields = requiredFields.filter((field) => !hasMeaningfulValue(entities[field]))
  if (missingFields.length > 0) {
    return {
      ok: false,
      resolvedIntent: {
        ...resolvedIntent,
        entities,
        missingFields,
      },
      message: buildMissingFieldMessage(resolvedIntent.intent, missingFields),
      executionStatus: "validation_failed",
    }
  }

  if (
    resolvedIntent.intent === "create_financial_income" ||
    resolvedIntent.intent === "create_financial_expense"
  ) {
    const parsedAmount = parseAmount(entities.amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return {
        ok: false,
        resolvedIntent: {
          ...resolvedIntent,
          entities,
          missingFields: ["amount"],
        },
        message: "Para registrar esse lancamento, preciso saber o valor.",
        executionStatus: "validation_failed",
      }
    }
  }

  return {
    ok: true,
    resolvedIntent: {
      ...resolvedIntent,
      entities,
      missingFields: [],
    },
  }
}
