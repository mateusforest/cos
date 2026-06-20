import { buildOperationsContext } from "@/lib/cos-engine/operations-context"
import { detectOperationsIntent } from "@/lib/cos-engine/operations-intents"
import {
  buildResolvedIntentFromDetected,
  createEmptyIntentEntities,
  extractUsageFromOpenAiResponse,
  futureMinimumIntentConfidence,
  isAllowedOperationsIntent,
  normalizeResolvedIntent,
  operationsOpenAiJsonSchema,
  operationsOpenAiModel,
  operationsOpenAiResponseSchema,
  operationsOpenAiTimeoutMs,
} from "@/lib/cos-engine/schemas"
import type {
  OperationsEngineContext,
  OperationsEngineInput,
  OperationsIntentResolution,
  OperationsResolvedIntent,
} from "@/lib/cos-engine/types"

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"

const operationsSystemPrompt = [
  "Voce e o resolvedor de intencao do COS, um software operacional conversacional.",
  "Sua unica funcao e interpretar a mensagem do usuario e responder somente JSON valido.",
  "Nunca diga que executou uma acao.",
  "Nunca confirme criacao, edicao ou exclusao.",
  "Nunca invente IDs, clientes existentes, valores, datas ou resultados.",
  "Se faltar dado obrigatorio, preencha missingFields corretamente.",
  "Se estiver ambiguo ou inseguro, reduza confidence e use missingFields ou unsafeReason.",
  "Se nao tiver certeza suficiente, use shouldFallbackToHeuristic true.",
  "Use apenas intents permitidas.",
  "Nao retorne markdown, comentarios, texto adicional ou blocos de codigo.",
].join(" ")

function buildFallbackResolution(
  message: string,
  context: OperationsEngineContext,
  fallbackReason: OperationsIntentResolution["fallbackReason"],
  input?: Partial<Pick<OperationsIntentResolution, "model" | "latencyMs" | "errorMessage" | "usage">>,
): OperationsIntentResolution {
  const detectedIntent = detectOperationsIntent(message, context)

  return {
    resolvedIntent: buildResolvedIntentFromDetected(detectedIntent, "fallback"),
    model: input?.model ?? null,
    latencyMs: input?.latencyMs ?? null,
    fallbackUsed: true,
    fallbackReason,
    usage: input?.usage,
    errorMessage: input?.errorMessage ?? null,
  }
}

function buildUserPrompt(message: string, context: OperationsEngineContext) {
  return JSON.stringify(
    {
      task: "Interpretar a intencao operacional do usuario para o COS.",
      allowedIntents: [
        "create_client",
        "create_financial_income",
        "create_financial_expense",
        "create_operation",
        "create_document",
        "create_meeting",
        "create_support_ticket",
        "get_clients_count",
        "get_financial_summary",
        "get_recent_activity",
        "unknown",
      ],
      context: {
        area: context.area || null,
        subArea: context.subArea || null,
      },
      message,
      requiredEntityKeys: Object.keys(createEmptyIntentEntities()),
      guidance: {
        create_client: ["name"],
        create_financial_income: ["amount", "title"],
        create_financial_expense: ["amount", "title"],
        create_operation: ["title"],
        create_document: ["title"],
        create_meeting: ["title"],
        create_support_ticket: ["subject", "description"],
      },
    },
    null,
    2,
  )
}

function tryReadOutputText(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null
  }

  const record = payload as Record<string, unknown>
  if (typeof record.output_text === "string" && record.output_text.trim()) {
    return record.output_text
  }

  const output = Array.isArray(record.output) ? record.output : []
  for (const item of output) {
    if (!item || typeof item !== "object") continue
    const content = Array.isArray((item as Record<string, unknown>).content)
      ? ((item as Record<string, unknown>).content as unknown[])
      : []

    for (const contentItem of content) {
      if (!contentItem || typeof contentItem !== "object") continue
      const text = (contentItem as Record<string, unknown>).text
      if (typeof text === "string" && text.trim()) {
        return text
      }
    }
  }

  return null
}

function parseResolvedIntentPayload(payloadText: string): OperationsResolvedIntent | null {
  try {
    const parsed = JSON.parse(payloadText)
    const result = operationsOpenAiResponseSchema.safeParse(parsed)

    if (!result.success) {
      return null
    }

    if (!isAllowedOperationsIntent(result.data.intent)) {
      return null
    }

    return normalizeResolvedIntent(result.data)
  } catch {
    return null
  }
}

export function isOperationsOpenAiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY)
}

export async function resolveOperationsIntent(input: OperationsEngineInput): Promise<OperationsIntentResolution> {
  const message = input.message.trim()
  const context = buildOperationsContext(input)

  if (!isOperationsOpenAiConfigured()) {
    return buildFallbackResolution(message, context, "openai_not_configured")
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), operationsOpenAiTimeoutMs)
  const startedAt = Date.now()

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: operationsOpenAiModel,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: operationsSystemPrompt }],
          },
          {
            role: "user",
            content: [{ type: "input_text", text: buildUserPrompt(message, context) }],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            ...operationsOpenAiJsonSchema,
          },
        },
      }),
    })

    const latencyMs = Date.now() - startedAt
    const payload = (await response.json()) as Record<string, unknown>
    const usage = extractUsageFromOpenAiResponse(payload.usage)

    if (!response.ok) {
      return buildFallbackResolution(message, context, "openai_request_failed", {
        model: operationsOpenAiModel,
        latencyMs,
        usage,
        errorMessage:
          typeof payload.error === "object" &&
          payload.error &&
          typeof (payload.error as Record<string, unknown>).message === "string"
            ? ((payload.error as Record<string, unknown>).message as string)
            : `OpenAI request failed with status ${response.status}.`,
      })
    }

    const outputText = tryReadOutputText(payload)
    if (!outputText) {
      return buildFallbackResolution(message, context, "openai_invalid_json", {
        model: operationsOpenAiModel,
        latencyMs,
        usage,
        errorMessage: "OpenAI nao retornou output_text valido.",
      })
    }

    const resolvedIntent = parseResolvedIntentPayload(outputText)
    if (!resolvedIntent) {
      return buildFallbackResolution(message, context, "openai_invalid_schema", {
        model: operationsOpenAiModel,
        latencyMs,
        usage,
        errorMessage: "OpenAI retornou JSON fora do contrato esperado.",
      })
    }

    if (resolvedIntent.shouldFallbackToHeuristic) {
      return buildFallbackResolution(message, context, "openai_requested_fallback", {
        model: operationsOpenAiModel,
        latencyMs,
        usage,
      })
    }

    if (!isAllowedOperationsIntent(resolvedIntent.intent) || resolvedIntent.intent === "unknown") {
      return buildFallbackResolution(message, context, "openai_unknown_intent", {
        model: operationsOpenAiModel,
        latencyMs,
        usage,
      })
    }

    if (resolvedIntent.confidence < futureMinimumIntentConfidence) {
      return buildFallbackResolution(message, context, "openai_low_confidence", {
        model: operationsOpenAiModel,
        latencyMs,
        usage,
      })
    }

    return {
      resolvedIntent,
      model: operationsOpenAiModel,
      latencyMs,
      fallbackUsed: false,
      fallbackReason: null,
      usage,
      errorMessage: null,
    }
  } catch (error) {
    const latencyMs = Date.now() - startedAt
    const errorMessage = error instanceof Error ? error.message : "Falha desconhecida na OpenAI."

    if (error instanceof Error && error.name === "AbortError") {
      return buildFallbackResolution(message, context, "openai_timeout", {
        model: operationsOpenAiModel,
        latencyMs,
        errorMessage,
      })
    }

    return buildFallbackResolution(message, context, "openai_request_failed", {
      model: operationsOpenAiModel,
      latencyMs,
      errorMessage,
    })
  } finally {
    clearTimeout(timeout)
  }
}
