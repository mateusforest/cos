"use server"

import { logAiUsage } from "@/lib/cos-engine/ai-usage"
import {
  buildOperationsIdempotencyKey,
  findRecentDuplicateExecution,
} from "@/lib/cos-engine/idempotency"
import { createSupabaseAdminClient } from "@/lib/supabase/server"
import { runOperationsEngine } from "@/lib/cos-engine/operations-engine"
import { validateOperationsActor } from "@/lib/cos-engine/operations-actor"
import { buildOperationsContext } from "@/lib/cos-engine/operations-context"
import { detectOperationsIntent } from "@/lib/cos-engine/operations-intents"
import {
  buildOperationsConversationArea,
  buildOperationsConversationTitle,
  formatOperationsConversationTime,
  inferOperationsConversationAreaFromIntent,
} from "@/lib/cos-engine/operations-conversations"
import { buildResolvedIntentFromDetected, isSideEffectIntent } from "@/lib/cos-engine/schemas"
import type {
  OperationsEngineInput,
  OperationsEngineResult,
  OperationsResolvedIntent,
  PersistedOperationsChatMessage,
} from "@/lib/cos-engine/types"

type ConversationRow = {
  id: string
  workspace_id: string
  user_id: string
  area: string
  title: string | null
}

type MessageRow = {
  id: string
  conversation_id: string
  role: string | null
  content: string | null
  metadata: Record<string, unknown> | null
  created_at: string | null
}

type QueryError = { message: string } | null

type SelectChain = {
  eq: (column: string, value: string) => SelectChain
  order: (column: string, options: { ascending: boolean }) => SelectChain
  maybeSingle: () => Promise<unknown>
}

type InsertSelectChain = {
  single: () => Promise<unknown>
}

type OperationsAdminClient = {
  from: (table: string) => unknown
}

type OperationsConversationActor =
  | { error: string }
  | {
      user: { id: string }
      access: { workspace: { id: string } }
      adminClient: OperationsAdminClient
    }

async function getOperationsConversationActor(): Promise<OperationsConversationActor> {
  const actor = await validateOperationsActor()

  if ("error" in actor && actor.error) {
    return actor
  }

  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY nao configurada para conversas do COS." as const }
  }

  return {
    user: { id: actor.user.id },
    access: { workspace: { id: actor.access.workspace!.id } },
    adminClient,
  }
}

async function findOrCreateConversation({
  adminClient,
  workspaceId,
  userId,
  area,
  title,
}: {
  adminClient: OperationsAdminClient
  workspaceId: string
  userId: string
  area: string
  title: string
}) {
  const conversationsTable = adminClient.from("ai_conversations") as {
    select: (columns: string) => SelectChain
    insert: (value: Record<string, unknown>) => {
      select: (columns: string) => InsertSelectChain
    }
  }

  const lookupResult = (await conversationsTable
    .select("id, workspace_id, user_id, area, title")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .eq("area", area)
    .maybeSingle()) as { data: ConversationRow | null; error: QueryError }
  const existingConversation = lookupResult.data as ConversationRow | null
  const lookupError = lookupResult.error as QueryError

  if (lookupError) {
    return { error: lookupError.message }
  }

  if (existingConversation) {
    return { conversation: existingConversation }
  }

  const insertResult = (await conversationsTable
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      area,
      title,
    })
    .select("id, workspace_id, user_id, area, title")
    .single()) as { data: ConversationRow | null; error: QueryError }
  const createdConversation = insertResult.data as ConversationRow | null
  const insertError = insertResult.error as QueryError

  if (insertError || !createdConversation) {
    return { error: insertError?.message ?? "Nao foi possivel criar a conversa do COS." }
  }

  return { conversation: createdConversation }
}

async function saveConversationMessage({
  adminClient,
  conversationId,
  role,
  content,
  metadata,
}: {
  adminClient: OperationsAdminClient
  conversationId: string
  role: "user" | "assistant"
  content: string
  metadata: Record<string, unknown>
}) {
  const messagesTable = adminClient.from("ai_messages") as {
    insert: (value: Record<string, unknown>) => Promise<unknown>
  }
  const { error } = (await messagesTable.insert({
    conversation_id: conversationId,
    role,
    content,
    metadata,
  })) as { error: QueryError }

  if (error) {
    console.error("[operations-engine] message-persist:", error.message)
    return { success: false as const, error: error.message }
  }

  return { success: true as const }
}

function mapConversationMessage(row: MessageRow): PersistedOperationsChatMessage | null {
  const role = row.role === "assistant" ? "cos" : row.role === "user" ? "user" : null

  if (!role || !row.content) {
    return null
  }

  const metadata = row.metadata ?? {}
  const ctaLabel = typeof metadata.suggestedLabel === "string" ? metadata.suggestedLabel : undefined
  const ctaHref = typeof metadata.suggestedHref === "string" ? metadata.suggestedHref : undefined

  return {
    id: row.id,
    from: role,
    text: row.content,
    time: formatOperationsConversationTime(row.created_at),
    ctaLabel,
    ctaHref,
  }
}

export async function runOperationsEngineAction(input: OperationsEngineInput) {
  const actor = await getOperationsConversationActor()

  if ("error" in actor) {
    return {
      ok: false,
      message: actor.error,
    }
  }

  const message = input.message.trim()

  if (!message) {
    return {
      ok: false,
      message: "Escreva uma solicitacao para eu poder ajudar.",
    }
  }

  const explicitConversationArea = buildOperationsConversationArea({
    area: input.area,
    subArea: input.subArea,
  })
  const detectedIntent = detectOperationsIntent(
    message,
    buildOperationsContext({
      area: input.area,
      subArea: input.subArea,
    }),
  )
  const resolvedIntent: OperationsResolvedIntent = buildResolvedIntentFromDetected(detectedIntent)
  const conversationArea =
    explicitConversationArea !== "general"
      ? explicitConversationArea
      : inferOperationsConversationAreaFromIntent(detectedIntent)
  const conversationTitle = buildOperationsConversationTitle({
    area: conversationArea.split("/")[0],
    subArea: conversationArea.split("/")[1],
  })
  const idempotencyKey =
    input.idempotencyKey ||
    buildOperationsIdempotencyKey({
      workspaceId: actor.access.workspace.id,
      userId: actor.user.id,
      message,
      area: conversationArea,
      intent: resolvedIntent.intent,
    })

  const conversationResult = await findOrCreateConversation({
    adminClient: actor.adminClient,
    workspaceId: actor.access.workspace.id,
    userId: actor.user.id,
    area: conversationArea,
    title: conversationTitle,
  })

  if ("error" in conversationResult) {
    return {
      ok: false,
      message: "Nao consegui preparar esta conversa agora. Tente novamente em instantes.",
    }
  }

  const userMessagePersist = await saveConversationMessage({
    adminClient: actor.adminClient,
    conversationId: conversationResult.conversation.id,
    role: "user",
    content: message,
    metadata: {
      area: input.area ?? null,
      subArea: input.subArea ?? null,
      source: "operations_engine",
      conversation_area: conversationArea,
      detected_intent: detectedIntent.intent,
      idempotencyKey,
      intentSource: resolvedIntent.source,
    },
  })

  if (!userMessagePersist.success && isSideEffectIntent(resolvedIntent.intent)) {
    return {
      ok: false,
      action: resolvedIntent.intent,
      message: "Nao consegui registrar sua mensagem com seguranca. Tente novamente em instantes.",
      error: userMessagePersist.error,
      executionStatus: "failed",
      conversationId: conversationResult.conversation.id,
      conversationArea,
    }
  }

  const duplicateExecution = await findRecentDuplicateExecution({
    adminClient: actor.adminClient,
    conversationId: conversationResult.conversation.id,
    idempotencyKey,
    resolvedIntent,
  })

  if (duplicateExecution) {
    await saveConversationMessage({
      adminClient: actor.adminClient,
      conversationId: conversationResult.conversation.id,
      role: "assistant",
      content: duplicateExecution.message,
      metadata: {
        action: duplicateExecution.action ?? null,
        ok: duplicateExecution.ok,
        resultId: duplicateExecution.resultId ?? null,
        source: "operations_engine",
        area: input.area ?? null,
        subArea: input.subArea ?? null,
        conversation_area: conversationArea,
        detected_intent: detectedIntent.intent,
        intentSource: resolvedIntent.source,
        idempotencyKey,
        executionStatus: duplicateExecution.executionStatus,
        suggestedLabel: duplicateExecution.suggestedLabel ?? null,
        suggestedHref: duplicateExecution.suggestedHref ?? null,
      },
    })

    return {
      ...duplicateExecution,
      conversationId: conversationResult.conversation.id,
      conversationArea,
    }
  }

  let result: OperationsEngineResult

  try {
    result = await runOperationsEngine(input, resolvedIntent)
  } catch {
    result = {
      ok: false,
      message: "Nao consegui executar sua solicitacao agora. Tente novamente em instantes.",
      error: "Falha inesperada no Operations Engine.",
      executionStatus: "failed",
    }
  }

  await saveConversationMessage({
    adminClient: actor.adminClient,
    conversationId: conversationResult.conversation.id,
    role: "assistant",
    content: result.message,
    metadata: {
      action: result.action ?? null,
      ok: result.ok,
      resultId: result.resultId ?? null,
      source: "operations_engine",
      area: input.area ?? null,
      subArea: input.subArea ?? null,
      conversation_area: conversationArea,
      detected_intent: detectedIntent.intent,
      intentSource: resolvedIntent.source,
      idempotencyKey,
      executionStatus: result.executionStatus,
      suggestedLabel: result.suggestedLabel ?? null,
      suggestedHref: result.suggestedHref ?? null,
    },
  })

  await logAiUsage({
    adminClient: actor.adminClient,
    workspaceId: actor.access.workspace.id,
    userId: actor.user.id,
    model: null,
    intent: resolvedIntent.intent,
    source: resolvedIntent.source,
    metadata: {
      conversationId: conversationResult.conversation.id,
      conversationArea,
      executionStatus: result.executionStatus,
    },
  })

  return {
    ...result,
    conversationId: conversationResult.conversation.id,
    conversationArea,
  }
}

export async function getOperationsConversationMessagesAction(input?: {
  area?: string
  subArea?: string
}) {
  const actor = await getOperationsConversationActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const conversationArea = buildOperationsConversationArea({
    area: input?.area,
    subArea: input?.subArea,
  })

  const conversationsTable = actor.adminClient.from("ai_conversations") as {
    select: (columns: string) => SelectChain
  }
  const conversationQuery = (await conversationsTable
    .select("id, workspace_id, user_id, area, title")
    .eq("workspace_id", actor.access.workspace.id)
    .eq("user_id", actor.user.id)
    .eq("area", conversationArea)
    .maybeSingle()) as { data: ConversationRow | null; error: QueryError }
  const conversation = conversationQuery.data as ConversationRow | null
  const conversationError = conversationQuery.error as QueryError

  if (conversationError) {
    return { error: "Nao consegui carregar esta conversa agora." }
  }

  if (!conversation) {
    return {
      success: true,
      conversationArea,
      messages: [] as PersistedOperationsChatMessage[],
    }
  }

  const messagesTable = actor.adminClient.from("ai_messages") as {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        order: (column: string, options: { ascending: boolean }) => Promise<unknown>
      }
    }
  }
  const messagesQuery = (await messagesTable
    .select("id, conversation_id, role, content, metadata, created_at")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true })) as { data: MessageRow[] | null; error: QueryError }
  const rows = messagesQuery.data as MessageRow[] | null
  const messagesError = messagesQuery.error as QueryError

  if (messagesError) {
    return { error: "Nao consegui carregar as mensagens desta conversa agora." }
  }

  return {
    success: true,
    conversationId: conversation.id,
    conversationArea,
    messages: (rows ?? [])
      .map(mapConversationMessage)
      .filter((message: PersistedOperationsChatMessage | null): message is PersistedOperationsChatMessage => Boolean(message)),
  }
}
