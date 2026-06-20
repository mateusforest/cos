import type {
  DetectedIntent,
  OperationsEngineIntent,
  OperationsIntentUsage,
  OperationsResolvedIntent,
  OperationsIntentSource,
} from "@/lib/cos-engine/types"
import { z } from "zod"

export const operationsIntentValues = [
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
] as const

export const operationsIntentEntityKeys = [
  "name",
  "email",
  "phone",
  "amount",
  "description",
  "title",
  "category",
  "date",
  "clientName",
  "documentType",
  "type",
  "subject",
] as const

const defaultReplies: Record<OperationsEngineIntent, string> = {
  create_client: "Vou criar esse cliente para voce.",
  create_financial_income: "Vou registrar essa receita para voce.",
  create_financial_expense: "Vou registrar esse gasto para voce.",
  create_operation: "Vou criar essa operacao para voce.",
  create_document: "Vou criar esse documento para voce.",
  create_meeting: "Vou criar essa reuniao para voce.",
  create_support_ticket: "Vou abrir esse chamado para voce.",
  get_clients_count: "Vou consultar seus clientes.",
  get_financial_summary: "Vou consultar seu resumo financeiro.",
  get_recent_activity: "Vou consultar suas ultimas atividades.",
  unknown: "Ainda nao consegui interpretar essa solicitacao com seguranca.",
}

const requiredFieldsByIntent: Partial<Record<OperationsEngineIntent, string[]>> = {
  create_client: ["name"],
  create_financial_income: ["amount", "title"],
  create_financial_expense: ["amount", "title"],
  create_operation: ["title"],
  create_document: ["title"],
  create_meeting: ["title"],
  create_support_ticket: ["subject", "description"],
}

export const futureMinimumIntentConfidence = 0.55
export const operationsOpenAiModel = process.env.OPENAI_OPERATIONS_MODEL || process.env.OPENAI_MODEL || "gpt-4.1-mini"
export const operationsOpenAiTimeoutMs = 10000

const nullableEntityValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()])

export const operationsResolvedIntentSchema = z.object({
  intent: z.enum(operationsIntentValues),
  confidence: z.number().min(0).max(1),
  entities: z.record(z.string(), nullableEntityValueSchema),
  requiresConfirmation: z.boolean(),
  missingFields: z.array(z.string()),
  unsafeReason: z.string().nullable(),
  reply: z.string(),
  shouldFallbackToHeuristic: z.boolean(),
  source: z.enum(["heuristic", "openai", "fallback"]),
})

export const operationsOpenAiResponseSchema = operationsResolvedIntentSchema.extend({
  source: z.literal("openai"),
})

export const operationsOpenAiJsonSchema = {
  name: "operations_intent_result",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "intent",
      "confidence",
      "entities",
      "requiresConfirmation",
      "missingFields",
      "unsafeReason",
      "reply",
      "shouldFallbackToHeuristic",
      "source",
    ],
    properties: {
      intent: {
        type: "string",
        enum: [...operationsIntentValues],
      },
      confidence: {
        type: "number",
        minimum: 0,
        maximum: 1,
      },
      entities: {
        type: "object",
        additionalProperties: false,
        required: [...operationsIntentEntityKeys],
        properties: Object.fromEntries(
          operationsIntentEntityKeys.map((key) => [
            key,
            {
              anyOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }, { type: "null" }],
            },
          ]),
        ),
      },
      requiresConfirmation: {
        type: "boolean",
      },
      missingFields: {
        type: "array",
        items: {
          type: "string",
        },
      },
      unsafeReason: {
        anyOf: [{ type: "string" }, { type: "null" }],
      },
      reply: {
        type: "string",
      },
      shouldFallbackToHeuristic: {
        type: "boolean",
      },
      source: {
        type: "string",
        enum: ["openai"],
      },
    },
  },
} as const

export function getRequiredFieldsForIntent(intent: OperationsEngineIntent) {
  return requiredFieldsByIntent[intent] ?? []
}

export function isAllowedOperationsIntent(value: string): value is OperationsEngineIntent {
  return operationsIntentValues.includes(value as OperationsEngineIntent)
}

export function isSideEffectIntent(intent: OperationsEngineIntent) {
  return [
    "create_client",
    "create_financial_income",
    "create_financial_expense",
    "create_operation",
    "create_document",
    "create_meeting",
    "create_support_ticket",
  ].includes(intent)
}

export function buildResolvedIntentFromDetected(
  detected: DetectedIntent,
  source: OperationsIntentSource = "heuristic",
): OperationsResolvedIntent {
  return {
    intent: detected.intent,
    confidence: detected.intent === "unknown" ? 0 : 1,
    entities: detected.entities,
    requiresConfirmation: false,
    missingFields: [],
    unsafeReason: null,
    reply: defaultReplies[detected.intent] ?? defaultReplies.unknown,
    shouldFallbackToHeuristic: source !== "heuristic",
    source,
  }
}

export function createEmptyIntentEntities() {
  return {
    name: null,
    email: null,
    phone: null,
    amount: null,
    description: null,
    title: null,
    category: null,
    date: null,
    clientName: null,
    documentType: null,
    type: null,
    subject: null,
  } satisfies Record<(typeof operationsIntentEntityKeys)[number], string | number | boolean | null>
}

export function normalizeResolvedIntent(input: OperationsResolvedIntent): OperationsResolvedIntent {
  return {
    ...input,
    confidence: Number.isFinite(input.confidence) ? Math.max(0, Math.min(1, input.confidence)) : 0,
    entities: {
      ...createEmptyIntentEntities(),
      ...input.entities,
      documentType:
        input.entities.documentType ??
        input.entities.type ??
        createEmptyIntentEntities().documentType,
      type:
        input.entities.type ??
        input.entities.documentType ??
        createEmptyIntentEntities().type,
    },
    missingFields: Array.from(new Set(input.missingFields.filter(Boolean))),
    unsafeReason: input.unsafeReason ?? null,
    reply: input.reply?.trim() || defaultReplies[input.intent] || defaultReplies.unknown,
  }
}

export function extractUsageFromOpenAiResponse(usage: unknown): OperationsIntentUsage {
  if (!usage || typeof usage !== "object") {
    return {}
  }

  const usageRecord = usage as Record<string, unknown>
  const promptTokens = typeof usageRecord.input_tokens === "number" ? usageRecord.input_tokens : null
  const completionTokens = typeof usageRecord.output_tokens === "number" ? usageRecord.output_tokens : null
  const totalTokens = typeof usageRecord.total_tokens === "number" ? usageRecord.total_tokens : null

  return {
    promptTokens,
    completionTokens,
    totalTokens,
  }
}
