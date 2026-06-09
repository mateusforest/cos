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

export type OperationsEngineInput = {
  message: string
  area?: string
  subArea?: string
}

export type OperationsEngineContext = {
  area: string
  subArea: string
}

export type OperationsEngineResult = {
  ok: boolean
  message: string
  action?: OperationsEngineIntent
  resultId?: string
  suggestedLabel?: string
  suggestedHref?: string
}

export type DetectedIntent = {
  intent: OperationsEngineIntent
  entities: Record<string, string | number | boolean | null | undefined>
}
