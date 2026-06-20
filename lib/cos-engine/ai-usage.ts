type LogAiUsageInput = {
  adminClient?: {
    from: (table: string) => unknown
  } | null
  workspaceId?: string | null
  userId?: string | null
  model?: string | null
  intent?: string | null
  source?: string | null
  promptTokens?: number | null
  completionTokens?: number | null
  totalTokens?: number | null
  latencyMs?: number | null
  metadata?: Record<string, unknown>
}

export async function logAiUsage(input: LogAiUsageInput) {
  if (!input.adminClient || !input.workspaceId || !input.userId || !input.model) {
    return { logged: false as const }
  }

  const usageTable = input.adminClient.from("ai_usage_logs") as {
    insert: (value: Record<string, unknown>) => unknown
  }

  const { error } = (await usageTable.insert({
    workspace_id: input.workspaceId,
    user_id: input.userId,
    model: input.model,
    intent: input.intent ?? null,
    source: input.source ?? null,
    prompt_tokens: input.promptTokens ?? null,
    completion_tokens: input.completionTokens ?? null,
    total_tokens: input.totalTokens ?? null,
    latency_ms: input.latencyMs ?? null,
    metadata: input.metadata ?? {},
  })) as { error: { message: string } | null }

  if (error) {
    console.error("[operations-engine] ai-usage:", error.message)
    return { logged: false as const, error: error.message }
  }

  return { logged: true as const }
}
