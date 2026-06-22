import type {
  OperationalActionType as CosActionType,
} from "@/lib/cos-engine/action-registry"
import type { OperationalArea as CosArea } from "@/lib/cos-engine/entity-registry"
import type { OperationalEntityType as CosEntityType } from "@/lib/cos-engine/entity-fields"

export type OperationsEngineIntent =
  | "create_client"
  | "update_client"
  | "create_financial_income"
  | "create_financial_expense"
  | "create_operation"
  | "create_document"
  | "create_meeting"
  | "create_support_ticket"
  | "get_clients_count"
  | "get_financial_summary"
  | "get_recent_activity"
  | "unknown"

export type OperationsIntentSource = "heuristic" | "openai" | "fallback"
export type OperationsIntentFallbackReason =
  | "openai_not_configured"
  | "openai_request_failed"
  | "openai_timeout"
  | "openai_invalid_json"
  | "openai_invalid_schema"
  | "openai_low_confidence"
  | "openai_unknown_intent"
  | "openai_requested_fallback"

export type OperationsEngineInput = {
  message: string
  area?: string
  subArea?: string
  idempotencyKey?: string
  conversationMemory?: OperationsConversationMemory
}

export type OperationsEngineContext = {
  area: string
  subArea: string
}

export type OperationsExecutionStatus =
  | "executed"
  | "failed"
  | "validation_failed"
  | "duplicate_prevented"
  | "not_executed"

export type OperationsEngineResult = {
  ok: boolean
  message: string
  action?: OperationsEngineIntent
  resultId?: string
  suggestedLabel?: string
  suggestedHref?: string
  conversationArea?: string
  error?: string
  executionStatus: OperationsExecutionStatus
  resolvedIntent?: OperationsResolvedIntent
  targetType?: "client" | null
  targetId?: string
  targetName?: string
  updatedFields?: string[]
  area?: CosArea | null
  entityType?: CosEntityType | null
  actionType?: CosActionType | null
  clarificationQuestion?: string | null
  unsupportedReason?: string | null
  unresolvedReference?: string | null
  entities?: Record<string, string | number | boolean | null | undefined>
}

export type PersistedOperationsChatMessage = {
  id: string
  from: "cos" | "user"
  text: string
  time: string
  ctaLabel?: string
  ctaHref?: string
}

export type DetectedIntent = {
  intent: OperationsEngineIntent
  entities: Record<string, string | number | boolean | null | undefined>
  area?: CosArea | null
  entityType?: CosEntityType | null
  actionType?: CosActionType | null
  clarificationQuestion?: string | null
  unsupportedReason?: string | null
  unresolvedReference?: string | null
}

export type OperationsIntentUsage = {
  promptTokens?: number | null
  completionTokens?: number | null
  totalTokens?: number | null
}

export type OperationsResolvedIntent = {
  intent: OperationsEngineIntent
  confidence: number
  entities: Record<string, string | number | boolean | null | undefined>
  requiresConfirmation: boolean
  missingFields: string[]
  unsafeReason?: string | null
  reply: string
  shouldFallbackToHeuristic: boolean
  source: OperationsIntentSource
  area?: CosArea | null
  entityType?: CosEntityType | null
  actionType?: CosActionType | null
  clarificationQuestion?: string | null
  unsupportedReason?: string | null
  unresolvedReference?: string | null
}

export type OperationsConversationClient = {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  company?: string | null
  notes?: string | null
}

export type OperationsConversationEntity = {
  id: string
  name: string
  entityType: CosEntityType | null
  area: CosArea | null
  fields: Record<string, string | number | boolean | null | undefined>
}

export type OperationsConversationMemory = {
  lastSuccessfulAction: OperationsEngineIntent | null
  lastResultId: string | null
  lastEntities: Record<string, string | number | boolean | null | undefined>
  lastClient: OperationsConversationClient | null
  lastEntity: OperationsConversationEntity | null
  lastEntityType: CosEntityType | null
  lastEntityArea: CosArea | null
  recentEntities: OperationsConversationEntity[]
}

export type OperationsIntentResolution = {
  resolvedIntent: OperationsResolvedIntent
  model: string | null
  latencyMs: number | null
  fallbackUsed: boolean
  fallbackReason?: OperationsIntentFallbackReason | null
  usage?: OperationsIntentUsage
  errorMessage?: string | null
}

export type ValidateIntentPayloadInput = {
  resolvedIntent: OperationsResolvedIntent
  message: string
  conversationMemory?: OperationsConversationMemory
}

export type ValidateIntentPayloadResult =
  | {
      ok: true
      resolvedIntent: OperationsResolvedIntent
    }
  | {
      ok: false
      resolvedIntent: OperationsResolvedIntent
      message: string
      executionStatus: OperationsExecutionStatus
    }
