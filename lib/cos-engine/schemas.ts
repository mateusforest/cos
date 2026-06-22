import type {
  DetectedIntent,
  OperationsEngineIntent,
  OperationsIntentUsage,
  OperationsResolvedIntent,
  OperationsIntentSource,
} from "@/lib/cos-engine/types"
import {
  operationalActionTypeValues,
  type OperationalActionType,
} from "@/lib/cos-engine/action-registry"
import {
  operationalAreaValues,
  type OperationalArea,
} from "@/lib/cos-engine/entity-registry"
import {
  operationalEntityTypeValues,
  type OperationalEntityType,
} from "@/lib/cos-engine/entity-fields"
import { z } from "zod"

export const operationsIntentValues = [
  "create_client",
  "update_client",
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
  "company",
  "notes",
  "amount",
  "description",
  "title",
  "category",
  "date",
  "clientId",
  "clientName",
  "documentType",
  "type",
  "subject",
  "client",
  "value",
  "priority",
  "status",
  "role",
  "department",
  "period",
  "stage",
  "responsible",
  "participants",
  "severity",
  "source",
  "sku",
  "url",
] as const

const defaultReplies: Record<OperationsEngineIntent, string> = {
  create_client: "Vou criar esse cliente para voce.",
  update_client: "Vou atualizar esse cliente para voce.",
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

function normalizeOperationalArea(value: string | null | undefined): OperationalArea | null {
  return value && operationalAreaValues.includes(value as OperationalArea) ? (value as OperationalArea) : null
}

function normalizeOperationalEntityType(value: string | null | undefined): OperationalEntityType | null {
  return value && operationalEntityTypeValues.includes(value as OperationalEntityType)
    ? (value as OperationalEntityType)
    : null
}

function normalizeOperationalActionType(value: string | null | undefined): OperationalActionType | null {
  return value && operationalActionTypeValues.includes(value as OperationalActionType)
    ? (value as OperationalActionType)
    : null
}

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
  area: z.string().nullable().optional(),
  entityType: z.string().nullable().optional(),
  actionType: z.string().nullable().optional(),
  clarificationQuestion: z.string().nullable().optional(),
  unsupportedReason: z.string().nullable().optional(),
  unresolvedReference: z.string().nullable().optional(),
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
      "area",
      "entityType",
      "actionType",
      "clarificationQuestion",
      "unsupportedReason",
      "unresolvedReference",
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
      area: {
        anyOf: [{ type: "string" }, { type: "null" }],
      },
      entityType: {
        anyOf: [{ type: "string" }, { type: "null" }],
      },
      actionType: {
        anyOf: [{ type: "string" }, { type: "null" }],
      },
      clarificationQuestion: {
        anyOf: [{ type: "string" }, { type: "null" }],
      },
      unsupportedReason: {
        anyOf: [{ type: "string" }, { type: "null" }],
      },
      unresolvedReference: {
        anyOf: [{ type: "string" }, { type: "null" }],
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
    "update_client",
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
    area: detected.area ?? null,
    entityType: detected.entityType ?? null,
    actionType: detected.actionType ?? null,
    clarificationQuestion: detected.clarificationQuestion ?? null,
    unsupportedReason: detected.unsupportedReason ?? null,
    unresolvedReference: detected.unresolvedReference ?? null,
  }
}

export function createEmptyIntentEntities() {
  return {
    name: null,
    email: null,
    phone: null,
    company: null,
    notes: null,
    amount: null,
    description: null,
    title: null,
    category: null,
    date: null,
    clientId: null,
    clientName: null,
    documentType: null,
    type: null,
    subject: null,
    client: null,
    value: null,
    priority: null,
    status: null,
    role: null,
    department: null,
    period: null,
    stage: null,
    responsible: null,
    participants: null,
    severity: null,
    source: null,
    sku: null,
    url: null,
  } satisfies Record<(typeof operationsIntentEntityKeys)[number], string | number | boolean | null>
}

export function normalizeResolvedIntent(
  input: Omit<OperationsResolvedIntent, "area" | "entityType" | "actionType"> & {
    area?: string | null
    entityType?: string | null
    actionType?: string | null
  },
): OperationsResolvedIntent {
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
    area: normalizeOperationalArea(input.area),
    entityType: normalizeOperationalEntityType(input.entityType),
    actionType: normalizeOperationalActionType(input.actionType),
    clarificationQuestion: input.clarificationQuestion ?? null,
    unsupportedReason: input.unsupportedReason ?? null,
    unresolvedReference: input.unresolvedReference ?? null,
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
