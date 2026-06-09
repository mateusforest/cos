"use server"

import { createSupabaseAdminClient } from "@/lib/supabase/server"
import { runOperationsEngine } from "@/lib/cos-engine/operations-engine"
import { validateOperationsActor } from "@/lib/cos-engine/operations-actor"
import {
  buildOperationsConversationArea,
  buildOperationsConversationTitle,
  formatOperationsConversationTime,
} from "@/lib/cos-engine/operations-conversations"
import type {
  OperationsEngineInput,
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

async function getOperationsConversationActor() {
  const actor = await validateOperationsActor()

  if ("error" in actor) {
    return actor
  }

  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY nao configurada para conversas do COS." as const }
  }

  return {
    user: actor.user,
    access: actor.access,
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
  adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
  workspaceId: string
  userId: string
  area: string
  title: string
}) {
  const { data: existingConversation, error: lookupError } = await adminClient
    .from("ai_conversations")
    .select("id, workspace_id, user_id, area, title")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .eq("area", area)
    .maybeSingle<ConversationRow>()

  if (lookupError) {
    return { error: lookupError.message }
  }

  if (existingConversation) {
    return { conversation: existingConversation }
  }

  const { data: createdConversation, error: insertError } = await adminClient
    .from("ai_conversations")
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      area,
      title,
    })
    .select("id, workspace_id, user_id, area, title")
    .single<ConversationRow>()

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
  adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
  conversationId: string
  role: "user" | "assistant"
  content: string
  metadata: Record<string, unknown>
}) {
  const { error } = await adminClient.from("ai_messages").insert({
    conversation_id: conversationId,
    role,
    content,
    metadata,
  })

  if (error) {
    console.error("[operations-engine] message-persist:", error.message)
  }
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

  const conversationArea = buildOperationsConversationArea({
    area: input.area,
    subArea: input.subArea,
  })
  const conversationTitle = buildOperationsConversationTitle({
    area: input.area,
    subArea: input.subArea,
  })

  const conversationResult = await findOrCreateConversation({
    adminClient: actor.adminClient,
    workspaceId: actor.access.workspace!.id,
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

  await saveConversationMessage({
    adminClient: actor.adminClient,
    conversationId: conversationResult.conversation.id,
    role: "user",
    content: message,
    metadata: {
      area: input.area ?? null,
      subArea: input.subArea ?? null,
      source: "operations_engine",
      conversation_area: conversationArea,
    },
  })

  let result

  try {
    result = await runOperationsEngine(input)
  } catch {
    result = {
      ok: false,
      message: "Nao consegui executar sua solicitacao agora. Tente novamente em instantes.",
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
      suggestedLabel: result.suggestedLabel ?? null,
      suggestedHref: result.suggestedHref ?? null,
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

  const { data: conversation, error: conversationError } = await actor.adminClient
    .from("ai_conversations")
    .select("id, workspace_id, user_id, area, title")
    .eq("workspace_id", actor.access.workspace!.id)
    .eq("user_id", actor.user.id)
    .eq("area", conversationArea)
    .maybeSingle<ConversationRow>()

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

  const { data: rows, error: messagesError } = await actor.adminClient
    .from("ai_messages")
    .select("id, conversation_id, role, content, metadata, created_at")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true })
    .returns<MessageRow[]>()

  if (messagesError) {
    return { error: "Nao consegui carregar as mensagens desta conversa agora." }
  }

  return {
    success: true,
    conversationId: conversation.id,
    conversationArea,
    messages: (rows ?? [])
      .map(mapConversationMessage)
      .filter((message): message is PersistedOperationsChatMessage => Boolean(message)),
  }
}
