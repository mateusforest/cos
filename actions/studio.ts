"use server"

import { logAiUsage } from "@/lib/cos-engine/ai-usage"
import { createSupabaseAdminClient } from "@/lib/supabase/server"
import { validateOperationsActor } from "@/lib/cos-engine/operations-actor"
import { formatOperationsConversationTime } from "@/lib/cos-engine/operations-conversations"
import { getCreativeFormatConfig, getImageFormatConfig, getStudioSectionConfig } from "@/lib/studio-config"
import { debitWorkspaceCredits, refundWorkspaceCredits } from "@/lib/workspace-credit-ledger"
import type {
  StudioCampaignInput,
  StudioCampaignResult,
  StudioConversationSummary,
  StudioCreativeInput,
  StudioCreativeResult,
  StudioHistoryEntry,
  StudioImageInput,
  StudioImageResult,
  StudioResult,
  StudioSection,
  StudioSessionState,
  StudioVideoInput,
  StudioVideoResult,
} from "@/lib/studio-types"

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
const OPENAI_IMAGE_URL = "https://api.openai.com/v1/images/generations"
const LUMA_GENERATIONS_URL = "https://agents.lumalabs.ai/v1/generations"

const studioTextModel = "gpt-5-mini"
const studioTextTimeoutMs = 120000
const studioImageTimeoutMs = 180000
const studioVideoTimeoutMs = 45000
const studioPromptLimit = 6000
const maxDownloadedAssetSize = 30 * 1024 * 1024
const studioConversationArea = "marketing"
const studioDefaultConversationTitle = "Nova criacao"
const studioImageGenerationCreditCost = 1

type QueryError = { message: string } | null

type StudioConversationRow = {
  id: string
  workspace_id: string
  user_id: string
  area: string
  title: string | null
}

type StudioMessageRow = {
  id: string
  conversation_id: string
  role: string | null
  content: string | null
  metadata: Record<string, unknown> | null
  created_at: string | null
}

type StudioAdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>

type StudioActor =
  | { error: string }
  | {
      userId: string
      workspaceId: string
      adminClient: StudioAdminClient
    }

type StudioPersistedResult = StudioResult & {
  imageDataUrl?: never
}

type StudioImageChatFormat = "square" | "portrait" | "story" | "landscape"

type StudioImageMessageMetadata = {
  type: "image"
  status: "preparing" | "generating" | "completed" | "failed"
  prompt: string
  format: StudioImageChatFormat
  formatLabel: string
  purpose: string
  textOverlay: string
  filePath: string | null
  fileName: string | null
  mimeType: string | null
  generatedAt: string | null
  error: string | null
}

function buildStudioConversationArea(section: StudioSection) {
  return `marketing/${section}`
}

function isStudioRootConversationArea(area: string | null | undefined) {
  return (area || "").trim() === studioConversationArea
}

function getStudioImageFormatConfig(format: StudioImageChatFormat) {
  if (format === "portrait") {
    return {
      key: "portrait" as const,
      label: "Vertical 4:5",
      providerSize: "1024x1536" as const,
    }
  }

  if (format === "story") {
    return {
      key: "portrait" as const,
      label: "Stories 9:16",
      providerSize: "1024x1536" as const,
    }
  }

  if (format === "landscape") {
    return {
      key: "landscape" as const,
      label: "Horizontal 16:9",
      providerSize: "1536x1024" as const,
    }
  }

  return {
    key: "square" as const,
    label: "Quadrado 1:1",
    providerSize: "1024x1024" as const,
  }
}

function normalizeStudioImageFormatFromText(value: string): StudioImageChatFormat {
  const normalized = value.toLowerCase()

  if (/\b(story|stories|reels|9:16)\b/.test(normalized)) {
    return "story" as const
  }

  if (/\b(vertical|verticalmente|4:5|feed|instagram)\b/.test(normalized)) {
    return "portrait" as const
  }

  if (/\b(horizontal|16:9|banner|youtube|landscape)\b/.test(normalized)) {
    return "landscape" as const
  }

  return "square" as const
}

function extractStudioImageTextOverlay(message: string) {
  const quoted = message.match(/["“](.+?)["”]/)
  if (quoted?.[1]?.trim()) {
    return quoted[1].trim().slice(0, 120)
  }

  const explicit = message.match(/texto(?: que deve aparecer| na imagem)?[: ]+(.+)$/i)
  return explicit?.[1]?.trim().slice(0, 120) || ""
}

function inferStudioImagePurpose(message: string) {
  const normalized = message.toLowerCase()
  if (/\b(anuncio|ads?|campanha)\b/.test(normalized)) return "campanha"
  if (/\b(story|stories|reels|instagram|post)\b/.test(normalized)) return "redes sociais"
  if (/\b(site|landing page|pagina)\b/.test(normalized)) return "site"
  if (/\b(apresentacao|slide)\b/.test(normalized)) return "apresentacao"
  return "marketing"
}

function stripImageRequestLead(message: string) {
  return message
    .replace(/^(por favor[, ]*)?/i, "")
    .replace(/^(crie|gere|faça|faca|monte|produza)\s+(uma|um)\s+(imagem|arte|ilustracao|ilustração|foto)\s*/i, "")
    .replace(/^(preciso de|quero)\s+(uma|um)\s+(imagem|arte|ilustracao|ilustração|foto)\s*/i, "")
    .trim()
}

function parseStudioImageRequest(message: string):
  | { ask: string }
  | {
      prompt: string
      format: StudioImageChatFormat
      purpose: string
      textOverlay: string
    } {
  const normalized = message.trim()
  if (!normalized) {
    return { ask: "Descreva a imagem que voce deseja criar e o formato desejado: quadrado, vertical, stories ou horizontal." }
  }

  const descriptionCandidate = stripImageRequestLead(normalized)
  const format = normalizeStudioImageFormatFromText(normalized)
  const purpose = inferStudioImagePurpose(normalized)
  const textOverlay = extractStudioImageTextOverlay(normalized)

  const hasMeaningfulDescription =
    descriptionCandidate.length >= 12 &&
    !/^(para|com|sem|em|de|da|do|no|na)\b/i.test(descriptionCandidate)

  if (!hasMeaningfulDescription) {
    return {
      ask:
        "Posso gerar. Me diga em uma frase o que precisa aparecer na imagem e o formato desejado: quadrado, vertical, stories ou horizontal.",
    }
  }

  return {
    prompt: descriptionCandidate,
    format,
    purpose,
    textOverlay,
  }
}

function buildStudioImagePrompt({
  prompt,
  format,
  purpose,
  textOverlay,
}: {
  prompt: string
  format: StudioImageChatFormat
  purpose: string
  textOverlay: string
}) {
  const formatConfig = getStudioImageFormatConfig(format)
  return [
    `Crie uma imagem para ${purpose}.`,
    `Descricao principal: ${prompt}`,
    `Formato solicitado: ${formatConfig.label}`,
    textOverlay ? `Texto que deve aparecer: ${textOverlay}` : "",
    "Entregue uma composicao limpa, legivel e coerente com o pedido.",
  ]
    .filter(Boolean)
    .join("\n")
}

function buildStudioImageMetadata(input: StudioImageMessageMetadata) {
  return {
    engine: "studio",
    conversation_area: studioConversationArea,
    studio_mode: "conversation",
    studio_image: input,
  }
}

function ensureStudioSection(section: string): StudioSection | null {
  return section === "criativos" || section === "campanhas" || section === "imagens" || section === "videos" ? section : null
}

function tryReadOutputText(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null
  }

  const record = payload as Record<string, unknown>

  if (typeof record.output_text === "string" && record.output_text.trim()) {
    return record.output_text.trim()
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
        return text.trim()
      }
    }
  }

  return null
}

function parseJsonObject<T>(value: string): T | null {
  const trimmed = value.trim()

  try {
    return JSON.parse(trimmed) as T
  } catch {
    const firstBrace = trimmed.indexOf("{")
    const lastBrace = trimmed.lastIndexOf("}")

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)) as T
      } catch {
        return null
      }
    }

    return null
  }
}

function safeText(value: string, label: string, maxLength = 800) {
  const trimmed = value.trim()

  if (!trimmed) {
    throw new Error(`Informe ${label}.`)
  }

  if (trimmed.length > maxLength) {
    throw new Error(`${label} excede o limite permitido.`)
  }

  return trimmed
}

function optionalSafeText(value: string, maxLength = 1200) {
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, maxLength) : ""
}

function buildCreativePrompt(input: StudioCreativeInput) {
  return [
    "Gere um JSON valido para um criativo de marketing.",
    'Campos obrigatorios: headline, supportText, cta, caption, visualPrompt.',
    "Nao use markdown.",
    `Objetivo: ${input.objective}`,
    `Produto ou servico: ${input.productOrService}`,
    `Publico: ${input.audience}`,
    `Plataforma: ${input.platform}`,
    `Formato: ${getCreativeFormatConfig(input.format).label}`,
    `Tom: ${input.tone}`,
    input.additionalInfo ? `Informacoes adicionais: ${input.additionalInfo}` : "",
  ]
    .filter(Boolean)
    .join("\n")
}

function buildCampaignPrompt(input: StudioCampaignInput) {
  return [
    "Gere um JSON valido para uma campanha de marketing.",
    'Campos obrigatorios: concept, campaignName, slogan, audience, valueProposition, keyMessages, copies, ctas, ads, publishingSequence, suggestedCalendar, creativeIdeas, recommendedMetrics.',
    "Arrays devem conter textos curtos e uteis.",
    "Nao use markdown.",
    `Objetivo: ${input.objective}`,
    `Produto ou servico: ${input.productOrService}`,
    `Publico: ${input.audience}`,
    `Canal: ${input.channel}`,
    `Duracao: ${input.duration}`,
    input.budget ? `Orcamento: ${input.budget}` : "",
    `Tom: ${input.tone}`,
    input.additionalContext ? `Contexto adicional: ${input.additionalContext}` : "",
  ]
    .filter(Boolean)
    .join("\n")
}

function buildImagePrompt(input: StudioImageInput) {
  return [
    `Descricao principal: ${input.description}`,
    `Estilo: ${input.style}`,
    `Finalidade: ${input.purpose}`,
    input.textOverlay ? `Texto que deve aparecer: ${input.textOverlay}` : "",
  ]
    .filter(Boolean)
    .join("\n")
}

function buildVideoPrompt(input: StudioVideoInput) {
  return [
    `Cena: ${input.sceneDescription}`,
    `Estilo: ${input.style}`,
    `Movimento de camera: ${input.cameraMovement}`,
    `Formato: ${input.aspectRatio}`,
    `Duracao: ${input.duration}`,
  ].join("\n")
}

async function getStudioActor(): Promise<StudioActor> {
  const actor = await validateOperationsActor()

  if ("error" in actor) {
    return { error: actor.error ?? "Sessao invalida. Faca login novamente." }
  }

  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY nao configurada para o Studio." }
  }

  return {
    userId: actor.user.id,
    workspaceId: actor.access.workspace!.id,
    adminClient,
  }
}

function isStudioActorReady(actor: StudioActor): actor is Exclude<StudioActor, { error: string }> {
  return !("error" in actor)
}

async function findStudioConversation({
  actor,
  section,
  conversationId,
}: {
  actor: Exclude<StudioActor, { error: string }>
  section: StudioSection
  conversationId?: string
}) {
  const conversationsTable = actor.adminClient.from("ai_conversations") as unknown as {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          eq: (column: string, value: string) => {
            maybeSingle: () => Promise<unknown>
          }
        }
      }
    }
  }

  const area = buildStudioConversationArea(section)
  const query = (
    conversationId
      ? await conversationsTable
          .select("id, workspace_id, user_id, area, title")
          .eq("workspace_id", actor.workspaceId)
          .eq("user_id", actor.userId)
          .eq("id", conversationId)
          .maybeSingle()
      : await conversationsTable
          .select("id, workspace_id, user_id, area, title")
          .eq("workspace_id", actor.workspaceId)
          .eq("user_id", actor.userId)
          .eq("area", area)
          .maybeSingle()
  ) as { data: StudioConversationRow | null; error: QueryError }

  if (query.error) {
    return { error: query.error.message }
  }

  const conversation = query.data

  if (conversation && conversation.area !== area) {
    return { error: "A conversa solicitada nao pertence a esta sessao do Studio." }
  }

  return { conversation: conversation ?? null }
}

async function findOrCreateStudioConversation({
  actor,
  section,
}: {
  actor: Exclude<StudioActor, { error: string }>
  section: StudioSection
}) {
  const existing = await findStudioConversation({ actor, section })

  if ("error" in existing) {
    return existing
  }

  if (existing.conversation) {
    return existing
  }

  const area = buildStudioConversationArea(section)
  const sectionConfig = getStudioSectionConfig(section)
  const conversationsTable = actor.adminClient.from("ai_conversations") as unknown as {
    insert: (value: Record<string, unknown>) => {
      select: (columns: string) => {
        single: () => Promise<unknown>
      }
    }
  }

  const insertQuery = (await conversationsTable
    .insert({
      workspace_id: actor.workspaceId,
      user_id: actor.userId,
      area,
      title: sectionConfig.title,
    })
    .select("id, workspace_id, user_id, area, title")
    .single()) as { data: StudioConversationRow | null; error: QueryError }

  if (insertQuery.error || !insertQuery.data) {
    return { error: insertQuery.error?.message ?? "Nao foi possivel preparar a sessao do Studio." }
  }

  return { conversation: insertQuery.data }
}

async function insertStudioMessage({
  actor,
  conversationId,
  role,
  content,
  metadata,
}: {
  actor: Exclude<StudioActor, { error: string }>
  conversationId: string
  role: "user" | "assistant"
  content: string
  metadata: Record<string, unknown>
}) {
  const messagesTable = actor.adminClient.from("ai_messages") as unknown as {
    insert: (value: Record<string, unknown>) => {
      select: (columns: string) => {
        single: () => Promise<unknown>
      }
    }
  }

  const query = (await messagesTable
    .insert({
      conversation_id: conversationId,
      role,
      content,
      metadata,
    })
    .select("id, conversation_id, role, content, metadata, created_at")
    .single()) as { data: StudioMessageRow | null; error: QueryError }

  if (query.error || !query.data) {
    return { error: query.error?.message ?? "Nao foi possivel salvar a mensagem do Studio." }
  }

  return { message: query.data }
}

async function updateStudioMessage({
  actor,
  messageId,
  content,
  metadata,
}: {
  actor: Exclude<StudioActor, { error: string }>
  messageId: string
  content: string
  metadata: Record<string, unknown>
}) {
  const messagesTable = actor.adminClient.from("ai_messages") as unknown as {
    update: (value: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<unknown>
    }
  }

  const query = (await messagesTable.update({ content, metadata }).eq("id", messageId)) as { error: QueryError }

  if (query.error) {
    return { error: query.error.message }
  }

  return { success: true as const }
}

async function getStudioMessages({
  actor,
  conversationId,
}: {
  actor: Exclude<StudioActor, { error: string }>
  conversationId: string
}) {
  const messagesTable = actor.adminClient.from("ai_messages") as unknown as {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        order: (column: string, options: { ascending: boolean }) => Promise<unknown>
      }
    }
  }

  const query = (await messagesTable
    .select("id, conversation_id, role, content, metadata, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })) as { data: StudioMessageRow[] | null; error: QueryError }

  if (query.error) {
    return { error: query.error.message }
  }

  return { rows: query.data ?? [] }
}

async function createStudioRootConversation({
  actor,
  title,
}: {
  actor: Exclude<StudioActor, { error: string }>
  title?: string
}) {
  const conversationsTable = actor.adminClient.from("ai_conversations") as unknown as {
    insert: (value: Record<string, unknown>) => {
      select: (columns: string) => {
        single: () => Promise<unknown>
      }
    }
  }

  const insertQuery = (await conversationsTable
    .insert({
      workspace_id: actor.workspaceId,
      user_id: actor.userId,
      area: studioConversationArea,
      title: (title || studioDefaultConversationTitle).trim(),
    })
    .select("id, workspace_id, user_id, area, title")
    .single()) as { data: StudioConversationRow | null; error: QueryError }

  if (insertQuery.error || !insertQuery.data) {
    return { error: insertQuery.error?.message ?? "Nao foi possivel criar a conversa do Studio." }
  }

  return { conversation: insertQuery.data }
}

async function findStudioRootConversation({
  actor,
  conversationId,
}: {
  actor: Exclude<StudioActor, { error: string }>
  conversationId: string
}) {
  const conversationsTable = actor.adminClient.from("ai_conversations") as unknown as {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          eq: (column: string, value: string) => {
            maybeSingle: () => Promise<unknown>
          }
        }
      }
    }
  }

  const query = (await conversationsTable
    .select("id, workspace_id, user_id, area, title")
    .eq("workspace_id", actor.workspaceId)
    .eq("user_id", actor.userId)
    .eq("id", conversationId)
    .maybeSingle()) as { data: StudioConversationRow | null; error: QueryError }

  if (query.error) {
    return { error: query.error.message }
  }

  if (!query.data || !isStudioRootConversationArea(query.data.area)) {
    return { error: "A conversa solicitada nao pertence ao Studio IA." }
  }

  return { conversation: query.data }
}

async function updateStudioConversationTitle({
  actor,
  conversationId,
  title,
}: {
  actor: Exclude<StudioActor, { error: string }>
  conversationId: string
  title: string
}) {
  const conversationsTable = actor.adminClient.from("ai_conversations") as unknown as {
    update: (value: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<unknown>
    }
  }

  const query = (await conversationsTable.update({ title }).eq("id", conversationId)) as { error: QueryError }

  if (query.error) {
    return { error: query.error.message }
  }

  return { success: true as const }
}

async function deleteStudioConversation({
  actor,
  conversationId,
}: {
  actor: Exclude<StudioActor, { error: string }>
  conversationId: string
}) {
  const messagesTable = actor.adminClient.from("ai_messages") as unknown as {
    delete: () => {
      eq: (column: string, value: string) => Promise<unknown>
    }
  }
  const conversationsTable = actor.adminClient.from("ai_conversations") as unknown as {
    delete: () => {
      eq: (column: string, value: string) => Promise<unknown>
    }
  }

  const messagesQuery = (await messagesTable.delete().eq("conversation_id", conversationId)) as { error: QueryError }

  if (messagesQuery.error) {
    return { error: messagesQuery.error.message }
  }

  const conversationQuery = (await conversationsTable.delete().eq("id", conversationId)) as { error: QueryError }

  if (conversationQuery.error) {
    return { error: conversationQuery.error.message }
  }

  return { success: true as const }
}

function deriveStudioConversationTitle(message: string) {
  const trimmed = message.trim().replace(/\s+/g, " ")
  if (!trimmed) return studioDefaultConversationTitle
  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed
}

function normalizeStudioBlocks(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null
      }

      const record = item as Record<string, unknown>
      const label = typeof record.label === "string" ? record.label.trim() : ""
      const content = typeof record.content === "string" ? record.content.trim() : ""

      if (!label || !content) {
        return null
      }

      return { label, content }
    })
    .filter((item): item is { label: string; content: string } => Boolean(item))
}

function formatStudioBlocks(blocks: Array<{ label: string; content: string }>) {
  return blocks.map((block) => `${block.label}\n${block.content}`).join("\n\n")
}

function isStudioMediaRequest(message: string) {
  const normalized = message.toLowerCase()
  return (
    /\b(imagem|imagens|image|foto|fotos)\b/.test(normalized) ||
    /\b(video|videos|vídeo|vídeos)\b/.test(normalized)
  )
}

async function fetchStudioConversationResponse({
  history,
  message,
}: {
  history: Array<{ role: "user" | "assistant"; content: string }>
  message: string
}): Promise<
  | {
      title: string
      blocks: Array<{ label: string; content: string }>
      text: string
    }
  | { error: string }
> {
  if (!process.env.OPENAI_API_KEY) {
    return { error: "OPENAI_API_KEY nao configurada. O Studio IA nao consegue responder agora." }
  }

  const conversationHistory = history
    .slice(-12)
    .map((entry) => `${entry.role === "assistant" ? "COS" : "Usuario"}: ${entry.content}`)
    .join("\n\n")

  const prompt = [
    "Voce trabalha no Studio IA do COS.",
    "Responda somente com JSON valido.",
    'Estrutura obrigatoria: {"title":"string","blocks":[{"label":"string","content":"string"}]}.',
    "A resposta deve ser textual, clara e operacional.",
    "Nunca prometa gerar imagem ou video nesta etapa.",
    "Quando fizer sentido, organize em blocos como Titulo, Texto, CTA, Hashtags, Headline, Subheadline, Estrutura, Roteiro, Proximos passos.",
    "Nao use markdown.",
    conversationHistory ? `Historico recente:\n${conversationHistory}` : "",
    `Mensagem atual:\n${message}`,
  ]
    .filter(Boolean)
    .join("\n\n")

  const structured = await fetchOpenAiStructuredJson<{
    title?: string
    blocks?: Array<{ label?: string; content?: string }>
  }>({
    prompt,
  })

  if ("error" in structured && typeof structured.error === "string") {
    return { error: structured.error }
  }

  const blocks = normalizeStudioBlocks(structured.data.blocks)

  if (blocks.length === 0) {
    return { error: "A OpenAI nao retornou blocos validos para esta criacao." }
  }

  const title =
    typeof structured.data.title === "string" && structured.data.title.trim()
      ? structured.data.title.trim()
      : deriveStudioConversationTitle(message)

  return {
    title,
    blocks,
    text: formatStudioBlocks(blocks),
  }
}

async function maybeStoreGeneratedAsset({
  actor,
  sourceBytes,
  contentType,
  fileName,
}: {
  actor: Exclude<StudioActor, { error: string }>
  sourceBytes: Uint8Array
  contentType: string
  fileName: string
}) {
  try {
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-")
    const filePath = `${actor.workspaceId}/${actor.userId}/studio/${Date.now()}-${safeFileName}`
    const storage = actor.adminClient.storage.from("documents")
    const { error: uploadError } = await storage.upload(filePath, sourceBytes, {
      upsert: true,
      contentType,
    })

    if (uploadError) {
      return { error: uploadError.message }
    }

    return {
      filePath,
      fileName: safeFileName,
      mimeType: contentType,
    }
  } catch {
    return { error: "Storage de documentos ainda nao configurado." }
  }
}

async function fetchOpenAiStructuredJson<T>({
  prompt,
}: {
  prompt: string
}) {
  if (!process.env.OPENAI_API_KEY) {
    return { error: "OPENAI_API_KEY nao configurada. O Studio nao consegue gerar este conteudo agora." }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), studioTextTimeoutMs)

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: studioTextModel,
        temperature: 0.6,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: "Voce trabalha no Studio do COS. Responda somente JSON valido, sem markdown e sem comentarios.",
              },
            ],
          },
          {
            role: "user",
            content: [{ type: "input_text", text: prompt.slice(0, studioPromptLimit) }],
          },
        ],
      }),
    })

    const payload = (await response.json()) as Record<string, unknown>

    if (!response.ok) {
      const providerMessage =
        typeof payload.error === "object" &&
        payload.error &&
        typeof (payload.error as Record<string, unknown>).message === "string"
          ? ((payload.error as Record<string, unknown>).message as string)
          : `OpenAI request failed with status ${response.status}.`

      return { error: `Nao foi possivel concluir a geracao com a OpenAI. ${providerMessage}` }
    }

    const outputText = tryReadOutputText(payload)

    if (!outputText) {
      return { error: "A OpenAI nao retornou um conteudo valido para o Studio." }
    }

    const parsed = parseJsonObject<T>(outputText)

    if (!parsed) {
      return { error: "A OpenAI retornou um formato invalido para esta geracao." }
    }

    return { data: parsed, rawText: outputText }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { error: "A resposta da OpenAI demorou demais para esta geracao. Tente novamente." }
    }

    return { error: error instanceof Error ? error.message : "Falha desconhecida ao consultar a OpenAI." }
  } finally {
    clearTimeout(timeout)
  }
}

async function generateOpenAiImage({
  actor,
  prompt,
  size,
  fileName,
}: {
  actor: Exclude<StudioActor, { error: string }>
  prompt: string
  size: "1024x1024" | "1024x1536" | "1536x1024"
  fileName: string
}) {
  if (!process.env.OPENAI_API_KEY) {
    return { error: "OPENAI_API_KEY nao configurada. O Studio nao consegue gerar imagens agora." }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), studioImageTimeoutMs)

  try {
    const response = await fetch(OPENAI_IMAGE_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: prompt.slice(0, studioPromptLimit),
        size,
        quality: "high",
        output_format: "png",
      }),
    })

    const payload = (await response.json()) as Record<string, unknown>

    if (!response.ok) {
      const providerMessage =
        typeof payload.error === "object" &&
        payload.error &&
        typeof (payload.error as Record<string, unknown>).message === "string"
          ? ((payload.error as Record<string, unknown>).message as string)
          : `OpenAI image request failed with status ${response.status}.`

      return { error: `Nao foi possivel gerar a imagem agora. ${providerMessage}` }
    }

    const data = Array.isArray(payload.data) ? payload.data : []
    const first = data[0] as Record<string, unknown> | undefined
    const b64 = first && typeof first.b64_json === "string" ? first.b64_json : ""

    if (!b64) {
      return { error: "A OpenAI nao retornou uma imagem valida para esta geracao." }
    }

    const bytes = Uint8Array.from(Buffer.from(b64, "base64"))
    const stored = await maybeStoreGeneratedAsset({
      actor,
      sourceBytes: bytes,
      contentType: "image/png",
      fileName,
    })

    if ("error" in stored) {
      return { error: stored.error }
    }

    return {
      filePath: stored.filePath,
      fileName: stored.fileName,
      mimeType: stored.mimeType,
      persistence: "stored" as const,
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { error: "A geracao da imagem demorou demais. Tente novamente." }
    }

    return { error: error instanceof Error ? error.message : "Falha desconhecida ao gerar a imagem." }
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchLumaGeneration({
  endpoint,
  method = "GET",
  body,
  timeoutMs = studioVideoTimeoutMs,
}: {
  endpoint: string
  method?: "GET" | "POST"
  body?: Record<string, unknown>
  timeoutMs?: number
}) {
  if (!process.env.LUMA_AGENTS_API_KEY) {
    return {
      error:
        "LUMA_AGENTS_API_KEY nao configurada. Configure a variavel para ativar a geracao de videos no Studio.",
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(endpoint, {
      method,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LUMA_AGENTS_API_KEY}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const payload = (await response.json()) as Record<string, unknown>

    if (!response.ok) {
      const providerMessage =
        typeof payload.error === "object" &&
        payload.error &&
        typeof (payload.error as Record<string, unknown>).message === "string"
          ? ((payload.error as Record<string, unknown>).message as string)
          : `Luma request failed with status ${response.status}.`

      return { error: `Nao foi possivel concluir a geracao de video. ${providerMessage}` }
    }

    return { data: payload }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { error: "A comunicacao com a Luma demorou demais. Tente novamente." }
    }

    return { error: error instanceof Error ? error.message : "Falha desconhecida ao consultar a Luma." }
  } finally {
    clearTimeout(timeout)
  }
}

async function downloadRemoteAsset(url: string) {
  const response = await fetch(url)

  if (!response.ok) {
    return { error: `Nao foi possivel baixar o arquivo gerado (${response.status}).` }
  }

  const contentLength = Number(response.headers.get("content-length") || 0)

  if (contentLength > maxDownloadedAssetSize) {
    return { error: "O arquivo gerado excede o limite de download suportado pelo Studio nesta etapa." }
  }

  const buffer = new Uint8Array(await response.arrayBuffer())

  if (buffer.length > maxDownloadedAssetSize) {
    return { error: "O arquivo gerado excede o limite de download suportado pelo Studio nesta etapa." }
  }

  return {
    bytes: buffer,
    contentType: response.headers.get("content-type") || "application/octet-stream",
  }
}

function isNonEmptyStringArray(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim())
}

function normalizeCampaignResult(value: unknown): StudioCampaignResult | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const record = value as Record<string, unknown>

  if (
    typeof record.concept !== "string" ||
    typeof record.campaignName !== "string" ||
    typeof record.slogan !== "string" ||
    typeof record.audience !== "string" ||
    typeof record.valueProposition !== "string" ||
    !isNonEmptyStringArray(record.keyMessages) ||
    !isNonEmptyStringArray(record.copies) ||
    !isNonEmptyStringArray(record.ctas) ||
    !isNonEmptyStringArray(record.ads) ||
    !isNonEmptyStringArray(record.publishingSequence) ||
    !isNonEmptyStringArray(record.suggestedCalendar) ||
    !isNonEmptyStringArray(record.creativeIdeas) ||
    !isNonEmptyStringArray(record.recommendedMetrics)
  ) {
    return null
  }

  return {
    type: "campaign",
    concept: record.concept.trim(),
    campaignName: record.campaignName.trim(),
    slogan: record.slogan.trim(),
    audience: record.audience.trim(),
    valueProposition: record.valueProposition.trim(),
    keyMessages: [...(record.keyMessages as string[])],
    copies: [...(record.copies as string[])],
    ctas: [...(record.ctas as string[])],
    ads: [...(record.ads as string[])],
    publishingSequence: [...(record.publishingSequence as string[])],
    suggestedCalendar: [...(record.suggestedCalendar as string[])],
    creativeIdeas: [...(record.creativeIdeas as string[])],
    recommendedMetrics: [...(record.recommendedMetrics as string[])],
  }
}

function normalizeCreativeResult(value: unknown): Omit<StudioCreativeResult, "type" | "imageUrl" | "imageDataUrl" | "imageFileName" | "selectedFormatLabel" | "requestedWidth" | "requestedHeight" | "providerSize" | "persistence"> | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const record = value as Record<string, unknown>

  if (
    typeof record.headline !== "string" ||
    typeof record.supportText !== "string" ||
    typeof record.cta !== "string" ||
    typeof record.caption !== "string" ||
    typeof record.visualPrompt !== "string"
  ) {
    return null
  }

  return {
    headline: record.headline.trim(),
    supportText: record.supportText.trim(),
    cta: record.cta.trim(),
    caption: record.caption.trim(),
    visualPrompt: record.visualPrompt.trim(),
  }
}

function readStudioEntry(row: StudioMessageRow): StudioHistoryEntry | null {
  if (row.role !== "assistant" || !row.metadata || typeof row.metadata !== "object") {
    return null
  }

  const metadata = row.metadata as Record<string, unknown>
  const studio = metadata.studio

  if (!studio || typeof studio !== "object") {
    return null
  }

  const studioRecord = studio as Record<string, unknown>
  const section = ensureStudioSection(String(studioRecord.section || ""))
  const title = typeof studioRecord.title === "string" ? studioRecord.title : ""
  const summary = typeof studioRecord.summary === "string" ? studioRecord.summary : ""
  const input = studioRecord.input
  const result = studioRecord.result

  if (!section || !title || !summary || !input || typeof input !== "object" || !result || typeof result !== "object") {
    return null
  }

  return {
    messageId: row.id,
    conversationId: row.conversation_id,
    conversationArea: buildStudioConversationArea(section),
    section,
    title,
    summary,
    assistantText: row.content || summary,
    createdAt: row.created_at,
    input: input as StudioHistoryEntry["input"],
    result: result as StudioResult,
  }
}

function buildStudioMetadata({
  section,
  title,
  summary,
  input,
  result,
}: {
  section: StudioSection
  title: string
  summary: string
  input: StudioHistoryEntry["input"]
  result: StudioPersistedResult
}) {
  return {
    engine: "studio",
    conversation_area: buildStudioConversationArea(section),
    studio: {
      section,
      title,
      summary,
      input,
      result,
    },
  }
}

async function createStudioDocumentSignedUrl({
  actor,
  filePath,
  download,
  fileName,
}: {
  actor: Exclude<StudioActor, { error: string }>
  filePath: string
  download?: boolean
  fileName?: string | null
}) {
  const options = download && fileName ? { download: fileName } : undefined
  const { data, error } = await actor.adminClient.storage.from("documents").createSignedUrl(filePath, 600, options)

  if (error || !data?.signedUrl) {
    return { error: error?.message ?? "Nao foi possivel gerar o acesso temporario da imagem." }
  }

  return {
    url: data.signedUrl,
    expiresInSeconds: 600,
  }
}

async function mapStudioChatMessage({
  actor,
  row,
}: {
  actor: Exclude<StudioActor, { error: string }>
  row: StudioMessageRow
}) {
  const role = row.role === "assistant" ? "cos" : row.role === "user" ? "user" : null

  if (!role || !row.content) {
    return null
  }

  const metadata = row.metadata ?? {}
  const studioImage =
    metadata && typeof metadata === "object" && "studio_image" in metadata && metadata.studio_image && typeof metadata.studio_image === "object"
      ? (metadata.studio_image as Record<string, unknown>)
      : null

  let imageUrl: string | undefined
  let imageAlt: string | undefined
  let imageStatus: string | undefined
  let imagePrompt: string | undefined

  if (studioImage) {
    const filePath = typeof studioImage.filePath === "string" ? studioImage.filePath : ""
    const fileName = typeof studioImage.fileName === "string" ? studioImage.fileName : null
    const status = typeof studioImage.status === "string" ? studioImage.status : ""
    const prompt = typeof studioImage.prompt === "string" ? studioImage.prompt : ""

    if (filePath && status === "completed") {
      const signedUrl = await createStudioDocumentSignedUrl({
        actor,
        filePath,
        fileName,
      })

      if ("url" in signedUrl) {
        imageUrl = signedUrl.url
      }
    }

    imageAlt = prompt || "Imagem gerada pelo Studio"
    imagePrompt = prompt || undefined
    imageStatus =
      status === "preparing"
        ? "Preparando imagem"
        : status === "generating"
          ? "Gerando imagem"
          : status === "completed"
            ? "Imagem concluida"
            : status === "failed"
              ? "Falha na geracao"
              : undefined
  }

  return {
    id: row.id,
    from: role,
    text: row.content,
    time: formatOperationsConversationTime(row.created_at),
    imageUrl,
    imageAlt,
    imageStatus,
    imagePrompt,
  }
}

async function getRecentStudioConversationRows({
  actor,
  conversationId,
  limit = 1,
}: {
  actor: Exclude<StudioActor, { error: string }>
  conversationId: string
  limit?: number
}) {
  const messagesTable = actor.adminClient.from("ai_messages") as unknown as {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        order: (column: string, options: { ascending: boolean }) => {
          limit: (value: number) => Promise<unknown>
        }
      }
    }
  }

  const query = (await messagesTable
    .select("id, conversation_id, role, content, metadata, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit)) as { data: StudioMessageRow[] | null; error: QueryError }

  if (query.error) {
    return { error: query.error.message }
  }

  return {
    rows: [...(query.data ?? [])].reverse(),
  }
}

function readStudioImageMetadata(row: StudioMessageRow) {
  const metadata = row.metadata ?? {}
  if (!metadata || typeof metadata !== "object") {
    return null
  }

  const studioImage =
    "studio_image" in metadata && metadata.studio_image && typeof metadata.studio_image === "object"
      ? (metadata.studio_image as Record<string, unknown>)
      : null

  if (!studioImage) {
    return null
  }

  const format =
    studioImage.format === "portrait" ||
    studioImage.format === "story" ||
    studioImage.format === "landscape" ||
    studioImage.format === "square"
      ? studioImage.format
      : null

  if (!format) {
    return null
  }

  return {
    format: format as StudioImageChatFormat,
    prompt: typeof studioImage.prompt === "string" ? studioImage.prompt : "",
    purpose: typeof studioImage.purpose === "string" ? studioImage.purpose : "marketing",
    textOverlay: typeof studioImage.textOverlay === "string" ? studioImage.textOverlay : "",
    filePath: typeof studioImage.filePath === "string" ? studioImage.filePath : null,
    fileName: typeof studioImage.fileName === "string" ? studioImage.fileName : null,
    mimeType: typeof studioImage.mimeType === "string" ? studioImage.mimeType : null,
    status: typeof studioImage.status === "string" ? studioImage.status : "failed",
  }
}

export async function createStudioConversationAction() {
  const actor = await getStudioActor()

  if (!isStudioActorReady(actor)) {
    return { error: actor.error }
  }

  return createStudioRootConversation({ actor })
}

export async function getStudioConversationMessagesAction(input?: { conversationId?: string }) {
  const actor = await getStudioActor()

  if (!isStudioActorReady(actor)) {
    return { error: actor.error }
  }

  if (!input?.conversationId) {
    return {
      success: true as const,
      conversationId: null,
      conversationArea: studioConversationArea,
      title: studioDefaultConversationTitle,
      messages: [] as Array<{ id: string; from: "cos" | "user"; text: string; time: string }>,
    }
  }

  const found = await findStudioRootConversation({
    actor,
    conversationId: input.conversationId,
  })

  if ("error" in found) {
    return { error: found.error }
  }

  const messages = await getStudioMessages({
    actor,
    conversationId: found.conversation.id,
  })

  if ("error" in messages) {
    return { error: messages.error }
  }

  const mappedMessages = (
    await Promise.all(
      messages.rows.map((row) =>
        mapStudioChatMessage({
          actor,
          row,
        }),
      ),
    )
  ).filter((message) => Boolean(message)) as Array<{
    id: string
    from: "cos" | "user"
    text: string
    time: string
    imageUrl?: string
    imageAlt?: string
    imageStatus?: string
    imagePrompt?: string
  }>

  return {
    success: true as const,
    conversationId: found.conversation.id,
    conversationArea: found.conversation.area,
    title: found.conversation.title?.trim() || studioDefaultConversationTitle,
    messages: mappedMessages,
  }
}

export async function getStudioConversationsAction() {
  const actor = await getStudioActor()

  if (!isStudioActorReady(actor)) {
    return { error: actor.error }
  }

  const conversationsTable = actor.adminClient.from("ai_conversations") as unknown as {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          order: (column: string, options: { ascending: boolean }) => Promise<unknown>
        }
      }
    }
  }

  const query = (await conversationsTable
    .select("id, workspace_id, user_id, area, title")
    .eq("workspace_id", actor.workspaceId)
    .eq("user_id", actor.userId)
    .order("id", { ascending: false })) as { data: StudioConversationRow[] | null; error: QueryError }

  if (query.error) {
    return { error: "Nao foi possivel carregar as conversas do Studio agora." }
  }

  const studioConversations = (query.data ?? []).filter((conversation) => isStudioRootConversationArea(conversation.area))

  const conversations = await Promise.all(
    studioConversations.map(async (conversation) => {
      const recent = await getRecentStudioConversationRows({
        actor,
        conversationId: conversation.id,
      })

      if ("error" in recent) {
        return null
      }

      const lastRow = recent.rows[0] ?? null
      const lastMessage = lastRow
        ? await mapStudioChatMessage({
            actor,
            row: lastRow,
          })
        : null

      return {
        id: conversation.id,
        title: conversation.title?.trim() || studioDefaultConversationTitle,
        preview: lastMessage?.text || "Nenhuma mensagem registrada ainda.",
        time: formatOperationsConversationTime(lastRow?.created_at ?? null),
        updatedAt: lastRow?.created_at ?? null,
      } satisfies StudioConversationSummary
    }),
  )

  const validConversations = conversations.filter((conversation): conversation is StudioConversationSummary => Boolean(conversation))

  return {
    success: true as const,
    conversations: validConversations.sort((left, right) => {
      const leftTime = left.updatedAt ? new Date(left.updatedAt).getTime() : 0
      const rightTime = right.updatedAt ? new Date(right.updatedAt).getTime() : 0
      return rightTime - leftTime
    }),
  }
}

export async function renameStudioConversationAction(input: {
  conversationId: string
  title: string
}) {
  const actor = await getStudioActor()

  if (!isStudioActorReady(actor)) {
    return { error: actor.error }
  }

  const found = await findStudioRootConversation({
    actor,
    conversationId: input.conversationId,
  })

  if ("error" in found) {
    return { error: found.error }
  }

  const title = safeText(input.title, "um titulo", 100)
  return updateStudioConversationTitle({
    actor,
    conversationId: found.conversation.id,
    title,
  })
}

export async function deleteStudioConversationAction(input: { conversationId: string }) {
  const actor = await getStudioActor()

  if (!isStudioActorReady(actor)) {
    return { error: actor.error }
  }

  const found = await findStudioRootConversation({
    actor,
    conversationId: input.conversationId,
  })

  if ("error" in found) {
    return { error: found.error }
  }

  return deleteStudioConversation({
    actor,
    conversationId: found.conversation.id,
  })
}

export async function duplicateStudioConversationAction(input: { conversationId: string }) {
  const actor = await getStudioActor()

  if (!isStudioActorReady(actor)) {
    return { error: actor.error }
  }

  const found = await findStudioRootConversation({
    actor,
    conversationId: input.conversationId,
  })

  if ("error" in found) {
    return { error: found.error }
  }

  const created = await createStudioRootConversation({
    actor,
    title: `${found.conversation.title?.trim() || studioDefaultConversationTitle} (copia)`,
  })

  if ("error" in created) {
    return { error: created.error }
  }

  const messages = await getStudioMessages({
    actor,
    conversationId: found.conversation.id,
  })

  if ("error" in messages) {
    return { error: messages.error }
  }

  for (const message of messages.rows) {
    if (!message.content || (message.role !== "user" && message.role !== "assistant")) {
      continue
    }

    const saved = await insertStudioMessage({
      actor,
      conversationId: created.conversation.id,
      role: message.role,
      content: message.content,
      metadata: message.metadata ?? {
        engine: "studio",
        conversation_area: studioConversationArea,
      },
    })

    if ("error" in saved) {
      return { error: saved.error }
    }
  }

  return {
    success: true as const,
    conversationId: created.conversation.id,
  }
}

export async function getStudioImageSignedUrlAction({
  conversationId,
  messageId,
  download = false,
}: {
  conversationId: string
  messageId: string
  download?: boolean
}) {
  const actor = await getStudioActor()

  if (!isStudioActorReady(actor)) {
    return { error: actor.error }
  }

  const found = await findStudioRootConversation({
    actor,
    conversationId,
  })

  if ("error" in found) {
    return { error: found.error }
  }

  const messages = await getStudioMessages({
    actor,
    conversationId: found.conversation.id,
  })

  if ("error" in messages) {
    return { error: messages.error }
  }

  const row = messages.rows.find((item) => item.id === messageId)
  if (!row) {
    return { error: "Nao foi possivel localizar esta imagem no historico do Studio." }
  }

  const image = readStudioImageMetadata(row)
  if (!image?.filePath || image.status !== "completed") {
    return { error: "Esta imagem ainda nao esta disponivel para acesso." }
  }

  const signed = await createStudioDocumentSignedUrl({
    actor,
    filePath: image.filePath,
    download,
    fileName: image.fileName,
  })

  if ("error" in signed) {
    return { error: signed.error }
  }

  return {
    success: true as const,
    url: signed.url,
    expiresInSeconds: signed.expiresInSeconds,
  }
}

export async function createStudioImageVariationAction({
  conversationId,
  messageId,
  instructions,
  regenerate = false,
}: {
  conversationId: string
  messageId: string
  instructions?: string
  regenerate?: boolean
}) {
  const actor = await getStudioActor()

  if (!isStudioActorReady(actor)) {
    return { error: actor.error }
  }

  const found = await findStudioRootConversation({
    actor,
    conversationId,
  })

  if ("error" in found) {
    return { error: found.error }
  }

  const messages = await getStudioMessages({
    actor,
    conversationId: found.conversation.id,
  })

  if ("error" in messages) {
    return { error: messages.error }
  }

  const baseRow = messages.rows.find((item) => item.id === messageId)
  if (!baseRow) {
    return { error: "Nao foi possivel localizar a imagem original desta variacao." }
  }

  const baseImage = readStudioImageMetadata(baseRow)
  if (!baseImage?.prompt) {
    return { error: "Nao foi possivel recuperar o contexto desta imagem." }
  }

  const extraInstructions = optionalSafeText(instructions || "", 600)
  const format = regenerate ? baseImage.format : normalizeStudioImageFormatFromText(extraInstructions || baseImage.format)
  const formatConfig = getStudioImageFormatConfig(format)
  const prompt = regenerate
    ? baseImage.prompt
    : [baseImage.prompt, extraInstructions ? `Ajuste adicional: ${extraInstructions}` : ""].filter(Boolean).join("\n")

  const userMessage = regenerate
    ? "Gerar novamente esta imagem mantendo o conceito."
    : `Criar variacao da imagem anterior.${extraInstructions ? ` ${extraInstructions}` : ""}`

  const userSaved = await insertStudioMessage({
    actor,
    conversationId: found.conversation.id,
    role: "user",
    content: userMessage,
    metadata: {
      engine: "studio",
      conversation_area: studioConversationArea,
      studio_mode: "conversation",
    },
  })

  if ("error" in userSaved) {
    return { error: userSaved.error }
  }

  const generated = await generateOpenAiImage({
    actor,
    prompt,
    size: formatConfig.providerSize,
    fileName: `studio-${format}-${Date.now()}.png`,
  })

  if ("error" in generated) {
    await logAiUsage({
      adminClient: actor.adminClient,
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      feature: "studio_image_generation",
      provider: "openai",
      model: "gpt-image-1",
      source: "studio_variation",
      success: false,
      errorMessage: generated.error,
      metadata: {
        conversationId: found.conversation.id,
        conversationArea: studioConversationArea,
        format,
        regenerate,
      },
    })

    const failedSaved = await insertStudioMessage({
      actor,
      conversationId: found.conversation.id,
      role: "assistant",
      content: "Nao foi possivel concluir esta nova versao da imagem agora.",
      metadata: buildStudioImageMetadata({
        type: "image",
        status: "failed",
        prompt,
        format,
        formatLabel: formatConfig.label,
        purpose: baseImage.purpose,
        textOverlay: baseImage.textOverlay,
        filePath: null,
        fileName: null,
        mimeType: null,
        generatedAt: new Date().toISOString(),
        error: generated.error ?? "Nao foi possivel concluir esta nova versao da imagem agora.",
      }),
    })

    if ("error" in failedSaved) {
      return { error: failedSaved.error }
    }

    return {
      success: true as const,
      conversationId: found.conversation.id,
      message: await mapStudioChatMessage({
        actor,
        row: failedSaved.message,
      }),
    }
  }

  await logAiUsage({
    adminClient: actor.adminClient,
    workspaceId: actor.workspaceId,
    userId: actor.userId,
    feature: "studio_image_generation",
    provider: "openai",
    model: "gpt-image-1",
    source: "studio_variation",
    success: true,
    metadata: {
      conversationId: found.conversation.id,
      conversationArea: studioConversationArea,
      format,
      regenerate,
    },
  })

  const assistantSaved = await insertStudioMessage({
    actor,
    conversationId: found.conversation.id,
    role: "assistant",
    content: regenerate ? "Imagem gerada novamente." : "Variacao da imagem pronta.",
    metadata: buildStudioImageMetadata({
      type: "image",
      status: "completed",
      prompt,
      format,
      formatLabel: formatConfig.label,
      purpose: baseImage.purpose,
      textOverlay: baseImage.textOverlay,
      filePath: generated.filePath,
      fileName: generated.fileName ?? null,
      mimeType: generated.mimeType ?? null,
      generatedAt: new Date().toISOString(),
      error: null,
    }),
  })

  if ("error" in assistantSaved) {
    return { error: assistantSaved.error }
  }

  return {
    success: true as const,
    conversationId: found.conversation.id,
    message: await mapStudioChatMessage({
      actor,
      row: assistantSaved.message,
    }),
  }
}

export async function runStudioConversationAction(input: {
  conversationId?: string
  message: string
}) {
  const actor = await getStudioActor()

  if (!isStudioActorReady(actor)) {
    return { error: actor.error }
  }

  const message = safeText(input.message, "sua mensagem", 3000)
  const existingConversation =
    input.conversationId?.trim()
      ? await findStudioRootConversation({
          actor,
          conversationId: input.conversationId.trim(),
        })
      : null

  if (existingConversation && "error" in existingConversation) {
    return { error: existingConversation.error }
  }

  const createdConversation =
    !existingConversation || !("conversation" in existingConversation)
      ? await createStudioRootConversation({
          actor,
          title: deriveStudioConversationTitle(message),
        })
      : null

  if (createdConversation && "error" in createdConversation) {
    return { error: createdConversation.error }
  }

  const conversation =
    existingConversation && "conversation" in existingConversation
      ? existingConversation.conversation
      : createdConversation?.conversation ?? null

  if (!conversation) {
    return { error: "Nao foi possivel preparar a conversa do Studio agora." }
  }

  const normalizedTitle = conversation.title?.trim() || ""

  if (!normalizedTitle || normalizedTitle === studioDefaultConversationTitle) {
    await updateStudioConversationTitle({
      actor,
      conversationId: conversation.id,
      title: deriveStudioConversationTitle(message),
    })
  }

  const userSaved = await insertStudioMessage({
    actor,
    conversationId: conversation.id,
    role: "user",
    content: message,
    metadata: {
      engine: "studio",
      conversation_area: studioConversationArea,
      studio_mode: "conversation",
    },
  })

  if ("error" in userSaved) {
    return { error: userSaved.error }
  }

  const priorMessages = await getStudioMessages({
    actor,
    conversationId: conversation.id,
  })

  if ("error" in priorMessages) {
    return { error: priorMessages.error }
  }

  const history = priorMessages.rows
    .filter((row) => row.id !== userSaved.message.id)
    .map((row) => ({
      role: (row.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
      content: row.content || "",
    }))
    .filter((row) => row.content.trim())

  const lowerMessage = message.toLowerCase()
  const isVideoRequest = /\b(video|videos|vídeo|vídeos)\b/.test(lowerMessage)
  const isImageRequest = !isVideoRequest && /\b(imagem|imagens|image|foto|fotos|arte visual|arte)\b/.test(lowerMessage)

  if (isVideoRequest) {
    const assistantSaved = await insertStudioMessage({
      actor,
      conversationId: conversation.id,
      role: "assistant",
      content: "Status\nA geracao de videos sera disponibilizada nesta area em breve.",
      metadata: {
        engine: "studio",
        conversation_area: studioConversationArea,
        studio_mode: "conversation",
        title: deriveStudioConversationTitle(message),
      },
    })

    if ("error" in assistantSaved) {
      return { error: assistantSaved.error }
    }

    return {
      success: true as const,
      conversationId: conversation.id,
      conversationArea: studioConversationArea,
      message: await mapStudioChatMessage({
        actor,
        row: assistantSaved.message,
      }),
    }
  }

  if (isImageRequest) {
    const parsedImageRequest = parseStudioImageRequest(message)

    if ("ask" in parsedImageRequest) {
      const assistantSaved = await insertStudioMessage({
        actor,
        conversationId: conversation.id,
        role: "assistant",
        content: parsedImageRequest.ask,
        metadata: {
          engine: "studio",
          conversation_area: studioConversationArea,
          studio_mode: "conversation",
          title: deriveStudioConversationTitle(message),
        },
      })

      if ("error" in assistantSaved) {
        return { error: assistantSaved.error }
      }

      return {
        success: true as const,
        conversationId: conversation.id,
        conversationArea: studioConversationArea,
        message: await mapStudioChatMessage({
          actor,
          row: assistantSaved.message,
        }),
      }
    }

    const imageFormat = getStudioImageFormatConfig(parsedImageRequest.format)
    const imagePrompt = buildStudioImagePrompt({
      prompt: parsedImageRequest.prompt,
      format: parsedImageRequest.format,
      purpose: parsedImageRequest.purpose,
      textOverlay: parsedImageRequest.textOverlay,
    })
    const debitKey = `studio-image:${conversation.id}:${userSaved.message.id}`
    const debitResult = await debitWorkspaceCredits({
      amount: studioImageGenerationCreditCost,
      feature: "studio_image_generation",
      provider: "openai",
      reason: "Geracao de imagem no Studio IA",
      idempotencyKey: debitKey,
      metadata: {
        conversationId: conversation.id,
        messageId: userSaved.message.id,
        conversationArea: studioConversationArea,
        format: parsedImageRequest.format,
        purpose: parsedImageRequest.purpose,
      },
    })

    if (debitResult.status === "insufficient_credits") {
      const insufficientSaved = await insertStudioMessage({
        actor,
        conversationId: conversation.id,
        role: "assistant",
        content: "Saldo insuficiente para gerar esta imagem agora.",
        metadata: buildStudioImageMetadata({
          type: "image",
          status: "failed",
          prompt: imagePrompt,
          format: parsedImageRequest.format,
          formatLabel: imageFormat.label,
          purpose: parsedImageRequest.purpose,
          textOverlay: parsedImageRequest.textOverlay,
          filePath: null,
          fileName: null,
          mimeType: null,
          generatedAt: new Date().toISOString(),
          error: "Saldo insuficiente para gerar esta imagem agora.",
        }),
      })

      if ("error" in insufficientSaved) {
        return { error: insufficientSaved.error }
      }

      return {
        success: true as const,
        conversationId: conversation.id,
        conversationArea: studioConversationArea,
        message: await mapStudioChatMessage({
          actor,
          row: insufficientSaved.message,
        }),
      }
    }

    if (debitResult.status === "failed" || !debitResult.transactionId) {
      return { error: "Nao foi possivel validar os creditos do Studio agora." }
    }

    const generated = await generateOpenAiImage({
      actor,
      prompt: imagePrompt,
      size: imageFormat.providerSize,
      fileName: `studio-${parsedImageRequest.format}-${Date.now()}.png`,
    })

    if ("error" in generated) {
      await refundWorkspaceCredits({
        originalTransactionId: debitResult.transactionId,
        reason: "Falha na geracao de imagem do Studio IA",
        idempotencyKey: `studio-image-refund:${debitResult.transactionId}`,
        metadata: {
          conversationId: conversation.id,
          messageId: userSaved.message.id,
          conversationArea: studioConversationArea,
          format: parsedImageRequest.format,
          purpose: parsedImageRequest.purpose,
          error: generated.error,
        },
      })

      await logAiUsage({
        adminClient: actor.adminClient,
        workspaceId: actor.workspaceId,
        userId: actor.userId,
        feature: "studio_image_generation",
        provider: "openai",
        model: "gpt-image-1",
        source: "studio",
        success: false,
        errorMessage: generated.error,
        metadata: {
          conversationId: conversation.id,
          conversationArea: studioConversationArea,
          format: parsedImageRequest.format,
          purpose: parsedImageRequest.purpose,
        },
      })

      const failedSaved = await insertStudioMessage({
        actor,
        conversationId: conversation.id,
        role: "assistant",
        content: "Nao foi possivel concluir a geracao desta imagem agora.",
        metadata: buildStudioImageMetadata({
          type: "image",
          status: "failed",
          prompt: imagePrompt,
          format: parsedImageRequest.format,
          formatLabel: imageFormat.label,
          purpose: parsedImageRequest.purpose,
          textOverlay: parsedImageRequest.textOverlay,
          filePath: null,
          fileName: null,
          mimeType: null,
          generatedAt: new Date().toISOString(),
          error: generated.error ?? "Nao foi possivel concluir a geracao desta imagem agora.",
        }),
      })

      if ("error" in failedSaved) {
        return { error: failedSaved.error }
      }

      return {
        success: true as const,
        conversationId: conversation.id,
        conversationArea: studioConversationArea,
        message: await mapStudioChatMessage({
          actor,
          row: failedSaved.message,
        }),
      }
    }

    await logAiUsage({
      adminClient: actor.adminClient,
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      feature: "studio_image_generation",
      provider: "openai",
      model: "gpt-image-1",
      source: "studio",
      success: true,
      metadata: {
        conversationId: conversation.id,
        conversationArea: studioConversationArea,
        format: parsedImageRequest.format,
        purpose: parsedImageRequest.purpose,
      },
    })

    const assistantSaved = await insertStudioMessage({
      actor,
      conversationId: conversation.id,
      role: "assistant",
      content: [
        "Imagem pronta",
        "",
        `Formato\n${imageFormat.label}`,
        "",
        `Finalidade\n${parsedImageRequest.purpose}`,
      ].join("\n"),
      metadata: buildStudioImageMetadata({
        type: "image",
        status: "completed",
        prompt: imagePrompt,
        format: parsedImageRequest.format,
        formatLabel: imageFormat.label,
        purpose: parsedImageRequest.purpose,
        textOverlay: parsedImageRequest.textOverlay,
        filePath: generated.filePath,
        fileName: generated.fileName ?? null,
        mimeType: generated.mimeType ?? null,
        generatedAt: new Date().toISOString(),
        error: null,
      }),
    })

    if ("error" in assistantSaved) {
      return { error: assistantSaved.error }
    }

    return {
      success: true as const,
      conversationId: conversation.id,
      conversationArea: studioConversationArea,
      message: await mapStudioChatMessage({
        actor,
        row: assistantSaved.message,
      }),
    }
  }

  const response =
    isStudioMediaRequest(message)
      ? {
          title: deriveStudioConversationTitle(message),
          text:
            /\b(video|videos|vídeo|vídeos)\b/.test(message.toLowerCase())
              ? "Status\nA geracao de videos sera disponibilizada nesta area em breve."
              : "Status\nA geracao de imagens sera disponibilizada nesta area em breve.",
        }
      : await fetchStudioConversationResponse({
          history,
          message,
        })

  if ("error" in response) {
    return { error: response.error }
  }

  const assistantSaved = await insertStudioMessage({
    actor,
    conversationId: conversation.id,
    role: "assistant",
    content: response.text,
    metadata: {
      engine: "studio",
      conversation_area: studioConversationArea,
      studio_mode: "conversation",
      title: response.title,
    },
  })

  if ("error" in assistantSaved) {
    return { error: assistantSaved.error }
  }

  return {
    success: true as const,
    conversationId: conversation.id,
    conversationArea: studioConversationArea,
    message: await mapStudioChatMessage({
      actor,
      row: assistantSaved.message,
    }),
  }
}

export async function getStudioSessionAction({
  section,
  conversationId,
}: {
  section: StudioSection
  conversationId?: string
}): Promise<StudioSessionState | { error: string }> {
  const actor = await getStudioActor()

  if (!isStudioActorReady(actor)) {
    return { error: actor.error }
  }

  const found = await findStudioConversation({ actor, section, conversationId })

  if ("error" in found) {
    return { error: found.error ?? "Nao foi possivel localizar esta sessao do Studio." }
  }

  if (!found.conversation) {
    return {
      conversationId: null,
      conversationArea: buildStudioConversationArea(section),
      entries: [],
      openAiConfigured: Boolean(process.env.OPENAI_API_KEY),
      lumaConfigured: Boolean(process.env.LUMA_AGENTS_API_KEY),
    }
  }

  const messages = await getStudioMessages({
    actor,
    conversationId: found.conversation.id,
  })

  if ("error" in messages) {
    return { error: "Nao foi possivel carregar o historico desta sessao do Studio agora." }
  }

  return {
    conversationId: found.conversation.id,
    conversationArea: found.conversation.area,
    entries: messages.rows.map(readStudioEntry).filter((entry): entry is StudioHistoryEntry => Boolean(entry)).reverse(),
    openAiConfigured: Boolean(process.env.OPENAI_API_KEY),
    lumaConfigured: Boolean(process.env.LUMA_AGENTS_API_KEY),
  }
}

export async function generateStudioCampaignAction(input: StudioCampaignInput) {
  try {
    const actor = await getStudioActor()

    if (!isStudioActorReady(actor)) {
      return { error: actor.error }
    }

    const normalizedInput: StudioCampaignInput = {
      objective: safeText(input.objective, "o objetivo"),
      productOrService: safeText(input.productOrService, "o produto ou servico"),
      audience: safeText(input.audience, "o publico"),
      channel: safeText(input.channel, "o canal"),
      duration: safeText(input.duration, "a duracao"),
      budget: optionalSafeText(input.budget, 120),
      tone: safeText(input.tone, "o tom"),
      additionalContext: optionalSafeText(input.additionalContext, 1200),
    }

    const openAiResult = await fetchOpenAiStructuredJson<StudioCampaignResult>({
      prompt: buildCampaignPrompt(normalizedInput),
    })

    if ("error" in openAiResult) {
      return { error: openAiResult.error }
    }

    const normalizedResult = normalizeCampaignResult(openAiResult.data)

    if (!normalizedResult) {
      return { error: "A OpenAI nao retornou a estrutura esperada para a campanha." }
    }

    const conversationResult = await findOrCreateStudioConversation({ actor, section: "campanhas" })

    if ("error" in conversationResult || !conversationResult.conversation) {
      return { error: conversationResult.error ?? "Nao foi possivel preparar a conversa da campanha." }
    }

    await insertStudioMessage({
      actor,
      conversationId: conversationResult.conversation.id,
      role: "user",
      content: buildCampaignPrompt(normalizedInput),
      metadata: {
        engine: "studio",
        studio_section: "campanhas",
        conversation_area: buildStudioConversationArea("campanhas"),
      },
    })

    const title = normalizedResult.campaignName || "Campanha gerada"
    const summary = normalizedResult.slogan || normalizedResult.concept
    const assistantText = `Campanha "${title}" gerada com sucesso.`

    const saved = await insertStudioMessage({
      actor,
      conversationId: conversationResult.conversation.id,
      role: "assistant",
      content: assistantText,
      metadata: buildStudioMetadata({
        section: "campanhas",
        title,
        summary,
        input: normalizedInput,
        result: normalizedResult,
      }),
    })

    if ("error" in saved) {
      return { error: saved.error }
    }

    return {
      conversationId: conversationResult.conversation.id,
      entry: readStudioEntry(saved.message),
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Nao foi possivel gerar a campanha agora.",
    }
  }
}

export async function generateStudioCreativeAction(input: StudioCreativeInput) {
  try {
    const actor = await getStudioActor()

    if (!isStudioActorReady(actor)) {
      return { error: actor.error }
    }

    const normalizedInput: StudioCreativeInput = {
      objective: safeText(input.objective, "o objetivo"),
      productOrService: safeText(input.productOrService, "o produto ou servico"),
      audience: safeText(input.audience, "o publico"),
      platform: safeText(input.platform, "a plataforma"),
      format: input.format,
      tone: safeText(input.tone, "o tom"),
      additionalInfo: optionalSafeText(input.additionalInfo, 1200),
    }

    const structured = await fetchOpenAiStructuredJson<StudioCreativeResult>({
      prompt: buildCreativePrompt(normalizedInput),
    })

    if ("error" in structured) {
      return { error: structured.error }
    }

    const baseCreative = normalizeCreativeResult(structured.data)

    if (!baseCreative) {
      return { error: "A OpenAI nao retornou a estrutura esperada para o criativo." }
    }

    const format = getCreativeFormatConfig(normalizedInput.format)
    const imageResult = await generateOpenAiImage({
      actor,
      prompt: baseCreative.visualPrompt,
      size: format.providerSize,
      fileName: `studio-criativo-${normalizedInput.format}.png`,
    })

    if ("error" in imageResult) {
      return { error: imageResult.error }
    }

    const creativeSignedUrl = await createStudioDocumentSignedUrl({
      actor,
      filePath: imageResult.filePath,
      fileName: imageResult.fileName,
    })

    const result: StudioCreativeResult = {
      type: "creative",
      headline: baseCreative.headline,
      supportText: baseCreative.supportText,
      cta: baseCreative.cta,
      caption: baseCreative.caption,
      visualPrompt: baseCreative.visualPrompt,
      imageUrl: "url" in creativeSignedUrl ? creativeSignedUrl.url ?? null : null,
      imageFileName: imageResult.fileName ?? null,
      selectedFormatLabel: format.label,
      requestedWidth: format.requestedWidth,
      requestedHeight: format.requestedHeight,
      providerSize: format.providerSize,
      persistence: imageResult.persistence,
    }

    const conversationResult = await findOrCreateStudioConversation({ actor, section: "criativos" })

    if ("error" in conversationResult || !conversationResult.conversation) {
      return { error: conversationResult.error ?? "Nao foi possivel preparar a conversa do criativo." }
    }

    await insertStudioMessage({
      actor,
      conversationId: conversationResult.conversation.id,
      role: "user",
      content: buildCreativePrompt(normalizedInput),
      metadata: {
        engine: "studio",
        studio_section: "criativos",
        conversation_area: buildStudioConversationArea("criativos"),
      },
    })

    const persistedResult: StudioPersistedResult = {
      ...result,
      imageDataUrl: undefined,
    }
    const saved = await insertStudioMessage({
      actor,
      conversationId: conversationResult.conversation.id,
      role: "assistant",
      content: `Criativo gerado para ${format.label}.`,
      metadata: buildStudioMetadata({
        section: "criativos",
        title: result.headline,
        summary: result.caption,
        input: normalizedInput,
        result: persistedResult,
      }),
    })

    if ("error" in saved) {
      return { error: saved.error }
    }

    const entry = readStudioEntry(saved.message)

    if (!entry) {
      return { error: "Nao foi possivel montar o historico deste criativo." }
    }

    entry.result = result

    return {
      conversationId: conversationResult.conversation.id,
      entry,
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Nao foi possivel gerar o criativo agora.",
    }
  }
}

export async function generateStudioImageAction(input: StudioImageInput) {
  try {
    const actor = await getStudioActor()

    if (!isStudioActorReady(actor)) {
      return { error: actor.error }
    }

    const normalizedInput: StudioImageInput = {
      description: safeText(input.description, "a descricao"),
      style: safeText(input.style, "o estilo"),
      purpose: safeText(input.purpose, "a finalidade"),
      format: input.format,
      textOverlay: optionalSafeText(input.textOverlay, 200),
    }

    const format = getImageFormatConfig(normalizedInput.format)
    const imageResult = await generateOpenAiImage({
      actor,
      prompt: buildImagePrompt(normalizedInput),
      size: format.providerSize,
      fileName: `studio-imagem-${normalizedInput.format}.png`,
    })

    if ("error" in imageResult) {
      return { error: imageResult.error }
    }

    const generatedImageSignedUrl = await createStudioDocumentSignedUrl({
      actor,
      filePath: imageResult.filePath,
      fileName: imageResult.fileName,
    })

    const result: StudioImageResult = {
      type: "image",
      revisedPrompt: buildImagePrompt(normalizedInput),
      imageUrl: "url" in generatedImageSignedUrl ? generatedImageSignedUrl.url ?? null : null,
      imageFileName: imageResult.fileName ?? null,
      requestedFormatLabel: format.label,
      requestedWidth: format.requestedWidth,
      requestedHeight: format.requestedHeight,
      providerSize: format.providerSize,
      persistence: imageResult.persistence,
    }

    const conversationResult = await findOrCreateStudioConversation({ actor, section: "imagens" })

    if ("error" in conversationResult || !conversationResult.conversation) {
      return { error: conversationResult.error ?? "Nao foi possivel preparar a conversa de imagens." }
    }

    await insertStudioMessage({
      actor,
      conversationId: conversationResult.conversation.id,
      role: "user",
      content: buildImagePrompt(normalizedInput),
      metadata: {
        engine: "studio",
        studio_section: "imagens",
        conversation_area: buildStudioConversationArea("imagens"),
      },
    })

    const persistedResult: StudioPersistedResult = {
      ...result,
      imageDataUrl: undefined,
    }
    const saved = await insertStudioMessage({
      actor,
      conversationId: conversationResult.conversation.id,
      role: "assistant",
      content: `Imagem gerada para ${format.label}.`,
      metadata: buildStudioMetadata({
        section: "imagens",
        title: "Imagem gerada",
        summary: normalizedInput.description,
        input: normalizedInput,
        result: persistedResult,
      }),
    })

    if ("error" in saved) {
      return { error: saved.error }
    }

    const entry = readStudioEntry(saved.message)

    if (!entry) {
      return { error: "Nao foi possivel montar o historico desta imagem." }
    }

    entry.result = result

    return {
      conversationId: conversationResult.conversation.id,
      entry,
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Nao foi possivel gerar a imagem agora.",
    }
  }
}

export async function createStudioVideoAction(input: StudioVideoInput) {
  try {
    const actor = await getStudioActor()

    if (!isStudioActorReady(actor)) {
      return { error: actor.error }
    }

    const normalizedInput: StudioVideoInput = {
      sceneDescription: safeText(input.sceneDescription, "a descricao da cena"),
      style: safeText(input.style, "o estilo"),
      cameraMovement: safeText(input.cameraMovement, "o movimento de camera"),
      aspectRatio: input.aspectRatio,
      duration: input.duration,
    }

    const conversationResult = await findOrCreateStudioConversation({ actor, section: "videos" })

    if ("error" in conversationResult || !conversationResult.conversation) {
      return { error: conversationResult.error ?? "Nao foi possivel preparar a conversa de videos." }
    }

    await insertStudioMessage({
      actor,
      conversationId: conversationResult.conversation.id,
      role: "user",
      content: buildVideoPrompt(normalizedInput),
      metadata: {
        engine: "studio",
        studio_section: "videos",
        conversation_area: buildStudioConversationArea("videos"),
      },
    })

    const lumaResponse = await fetchLumaGeneration({
      endpoint: LUMA_GENERATIONS_URL,
      method: "POST",
      body: {
        model: "ray-3.2",
        type: "video",
        prompt: buildVideoPrompt(normalizedInput),
        aspect_ratio: normalizedInput.aspectRatio,
        video: {
          resolution: "720p",
          duration: normalizedInput.duration,
        },
      },
    })

    if ("error" in lumaResponse) {
      return { error: lumaResponse.error }
    }

    const payload = lumaResponse.data
    const generationId = typeof payload.id === "string" ? payload.id : ""
    const state = payload.state === "processing" ? "processing" : payload.state === "completed" ? "completed" : payload.state === "failed" ? "failed" : "queued"

    if (!generationId) {
      return { error: "A Luma nao retornou um identificador valido para esta geracao." }
    }

    const result: StudioVideoResult = {
      type: "video",
      generationId,
      state,
      videoUrl: null,
      persistence: "none",
      aspectRatio: normalizedInput.aspectRatio,
      duration: normalizedInput.duration,
      statusMessage: state === "queued" ? "Video enviado para a fila de processamento." : "Video em processamento.",
    }

    const saved = await insertStudioMessage({
      actor,
      conversationId: conversationResult.conversation.id,
      role: "assistant",
      content: "Geracao de video iniciada.",
      metadata: buildStudioMetadata({
        section: "videos",
        title: "Video em processamento",
        summary: normalizedInput.sceneDescription,
        input: normalizedInput,
        result,
      }),
    })

    if ("error" in saved) {
      return { error: saved.error }
    }

    const entry = readStudioEntry(saved.message)

    return {
      conversationId: conversationResult.conversation.id,
      entry,
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Nao foi possivel iniciar a geracao de video agora.",
    }
  }
}

export async function refreshStudioVideoAction({
  conversationId,
  messageId,
  generationId,
}: {
  conversationId: string
  messageId: string
  generationId: string
}) {
  const actor = await getStudioActor()

  if (!isStudioActorReady(actor)) {
    return { error: actor.error }
  }

  const lumaResponse = await fetchLumaGeneration({
    endpoint: `${LUMA_GENERATIONS_URL}/${generationId}`,
    method: "GET",
    timeoutMs: 30000,
  })

  if ("error" in lumaResponse) {
    return { error: lumaResponse.error }
  }

  const payload = lumaResponse.data
  const state = payload.state === "completed" ? "completed" : payload.state === "failed" ? "failed" : payload.state === "processing" ? "processing" : "queued"
  const outputs = Array.isArray(payload.output) ? payload.output : []
  const videoOutput = outputs.find((item) => item && typeof item === "object" && (item as Record<string, unknown>).type === "video") as Record<string, unknown> | undefined
  const outputUrl = videoOutput && typeof videoOutput.url === "string" ? videoOutput.url : ""
  let persistedUrl: string | null = null
  let persistence: StudioVideoResult["persistence"] = "none"
  let fileName: string | undefined

  if (state === "completed" && outputUrl) {
    const downloaded = await downloadRemoteAsset(outputUrl)

    if (!("error" in downloaded)) {
      fileName = `studio-video-${generationId}.mp4`
      const stored = await maybeStoreGeneratedAsset({
        actor,
        sourceBytes: downloaded.bytes,
        contentType: downloaded.contentType,
        fileName,
      })

      if (!("error" in stored)) {
        const signedVideoUrl = await createStudioDocumentSignedUrl({
          actor,
          filePath: stored.filePath,
          fileName: stored.fileName,
        })

        persistedUrl = "url" in signedVideoUrl ? signedVideoUrl.url ?? outputUrl ?? null : outputUrl || null
        persistence = "stored"
      } else {
        persistedUrl = outputUrl || null
        persistence = "ephemeral"
      }
    } else {
      persistedUrl = outputUrl || null
      persistence = "ephemeral"
    }
  }

  const found = await findStudioConversation({
    actor,
    section: "videos",
    conversationId,
  })

  if ("error" in found || !found.conversation) {
    return { error: "Nao foi possivel localizar a conversa deste video." }
  }

  const messages = await getStudioMessages({ actor, conversationId })

  if ("error" in messages) {
    return { error: "Nao foi possivel atualizar o historico deste video." }
  }

  const currentMessage = messages.rows.find((row) => row.id === messageId)

  if (!currentMessage) {
    return { error: "Nao foi possivel localizar a geracao de video no historico." }
  }

  const entry = readStudioEntry(currentMessage)

  if (!entry || entry.section !== "videos") {
    return { error: "A geracao informada nao pertence ao Studio de videos." }
  }

  const result: StudioVideoResult = {
    type: "video",
    generationId,
    state,
    videoUrl: persistedUrl,
    videoFileName: fileName,
    persistence,
    aspectRatio: (entry.input as StudioVideoInput).aspectRatio,
    duration: (entry.input as StudioVideoInput).duration,
    failureReason: typeof payload.failure_reason === "string" ? payload.failure_reason : null,
    statusMessage:
      state === "completed"
        ? "Video gerado com sucesso."
        : state === "failed"
          ? "A geracao de video falhou."
          : state === "processing"
            ? "Video em processamento."
            : "Video na fila de processamento.",
  }

  const metadata = buildStudioMetadata({
    section: "videos",
    title: state === "completed" ? "Video gerado" : state === "failed" ? "Falha na geracao do video" : "Video em processamento",
    summary: entry.summary,
    input: entry.input,
    result,
  })

  const update = await updateStudioMessage({
    actor,
    messageId,
    content:
      state === "completed"
        ? "Video gerado com sucesso."
        : state === "failed"
          ? "Nao foi possivel concluir a geracao deste video."
          : "Geracao de video em andamento.",
    metadata,
  })

  if ("error" in update) {
    return { error: update.error }
  }

  return {
    entry: {
      ...entry,
      title: typeof metadata.studio === "object" && metadata.studio ? String((metadata.studio as Record<string, unknown>).title) : entry.title,
      assistantText:
        state === "completed"
          ? "Video gerado com sucesso."
          : state === "failed"
            ? "Nao foi possivel concluir a geracao deste video."
            : "Geracao de video em andamento.",
      result,
    },
  }
}
