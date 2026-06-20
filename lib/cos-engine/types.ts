export type OperationsEngineIntent =
  | "create_client"
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

export type OperationsEngineInput = {
  message: string
  area?: string
  subArea?: string
  idempotencyKey?: string
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
}

export type ValidateIntentPayloadInput = {
  resolvedIntent: OperationsResolvedIntent
  message: string
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
