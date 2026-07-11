"use server"

import { canManageWorkspace, getUserAccessForUser } from "@/lib/auth"
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server"

type DatabaseMeetingStatus = "draft" | "recorded" | "transcribed" | "archived"

export type MeetingStatus = "scheduled" | "in_progress" | "finished"
export type MeetingType = "video" | "in_person"
export type MeetingAnalysisItemStatus = "pending" | "accepted" | "discarded"
export type MeetingAnalysisSectionKey =
  | "summary"
  | "decisions"
  | "tasks"
  | "pendingItems"
  | "responsibles"
  | "nextSteps"
export type MeetingAttachmentKind = "audio" | "video" | "document"
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type MeetingAnalysisItem = {
  id: string
  text: string
  status: MeetingAnalysisItemStatus
  updatedAt: string
}

export type MeetingAnalysisSections = Record<MeetingAnalysisSectionKey, MeetingAnalysisItem[]>

export type MeetingAttachment = {
  id: string
  name: string
  kind: MeetingAttachmentKind
  fileUrl: string
  filePath: string
  mimeType: string
  uploadedAt: string
}

export type MeetingTimelineEvent = {
  id: string
  type: string
  label: string
  occurredAt: string | null
}

export type MeetingHistoryEntry = {
  id: string
  action: string
  description: string
  createdAt: string
}

export type MeetingTranscriptionState = {
  status: "not_available" | "planned"
  note: string
}

type MeetingMetadataV1 = {
  version: 1
  scheduledAt: string | null
  participants: string[]
  meetingType: MeetingType
  meetingLink: string
  meetingLocation: string
  description: string
  cosShouldAttend: boolean
  cosShouldRecord: boolean
  cosShouldExtract: boolean
  cosShouldReport: boolean
}

type MeetingMetadata = {
  version: 2
  scheduledAt: string | null
  participants: string[]
  meetingType: MeetingType
  meetingLink: string
  meetingLocation: string
  description: string
  cosShouldAttend: boolean
  cosShouldRecord: boolean
  cosShouldExtract: boolean
  cosShouldReport: boolean
  analysisSections: MeetingAnalysisSections
  attachments: MeetingAttachment[]
  timeline: MeetingTimelineEvent[]
  history: MeetingHistoryEntry[]
  transcriptionState: MeetingTranscriptionState
}

type MeetingRow = {
  id: string
  workspace_id: string
  title: string
  audio_url: string | null
  transcript: string | null
  summary: string | null
  decisions: string | null
  next_steps: string | null
  status: string | null
  created_by: string | null
  created_at: string | null
}

type MeetingActor = {
  actorId: string
  workspaceId: string
  canManage: boolean
  isMaster: boolean
  adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
}

type MeetingPayload = {
  title: string
  audioUrl?: string
  transcript?: string
  summary?: string
  decisions?: string
  nextSteps?: string
  status?: string
  scheduledAt?: string
  participants?: string[] | string
  meetingType?: MeetingType
  meetingLink?: string
  meetingLocation?: string
  description?: string
  cosShouldAttend?: boolean
  cosShouldRecord?: boolean
  cosShouldExtract?: boolean
  cosShouldReport?: boolean
  analysisSections?: MeetingAnalysisSections
  attachments?: MeetingAttachment[]
  timeline?: MeetingTimelineEvent[]
  transcriptionState?: MeetingTranscriptionState
  historyDescription?: string
  historyAction?: string
  timelineEvent?: Omit<MeetingTimelineEvent, "id">
}

const MEETING_METADATA_PREFIX = "COS_MEET_META::"
const TRANSCRIPTION_NOTE = "Video, gravacao e transcricao em tempo real ainda nao estao conectados neste modulo."

const ANALYSIS_SECTION_ORDER: MeetingAnalysisSectionKey[] = [
  "summary",
  "decisions",
  "tasks",
  "pendingItems",
  "responsibles",
  "nextSteps",
]

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function createAnalysisItem(text: string, status: MeetingAnalysisItemStatus = "pending"): MeetingAnalysisItem {
  return {
    id: createId("analysis"),
    text,
    status,
    updatedAt: new Date().toISOString(),
  }
}

function createHistoryEntry(action: string, description: string, createdAt = new Date().toISOString()): MeetingHistoryEntry {
  return {
    id: createId("history"),
    action,
    description,
    createdAt,
  }
}

function createTimelineEvent(type: string, label: string, occurredAt: string | null = new Date().toISOString()): MeetingTimelineEvent {
  return {
    id: createId("timeline"),
    type,
    label,
    occurredAt,
  }
}

function createEmptyAnalysisSections(): MeetingAnalysisSections {
  return {
    summary: [],
    decisions: [],
    tasks: [],
    pendingItems: [],
    responsibles: [],
    nextSteps: [],
  }
}

function normalizeAnalysisSections(value?: Partial<MeetingAnalysisSections> | null) {
  const empty = createEmptyAnalysisSections()

  for (const key of ANALYSIS_SECTION_ORDER) {
    const items = value?.[key]
    empty[key] = Array.isArray(items)
      ? items
          .filter((item): item is MeetingAnalysisItem => Boolean(item?.id && item?.text))
          .map((item) => ({
            id: item.id,
            text: item.text.trim(),
            status: item.status ?? "pending",
            updatedAt: item.updatedAt ?? new Date().toISOString(),
          }))
          .filter((item) => Boolean(item.text))
      : []
  }

  return empty
}

function splitTextItems(value?: string | null) {
  if (!value) return [] as string[]

  return value
    .split(/\r?\n+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => !/^participantes:/i.test(item) && !/^prefer[êe]ncias do cos:/i.test(item))
}

function buildScheduledLabel(title: string, metadata: Pick<MeetingMetadata, "meetingType" | "scheduledAt">) {
  const typeLabel = metadata.meetingType === "video" ? "de video" : "presencial"
  if (!metadata.scheduledAt) {
    return `Reuniao "${title}" ${typeLabel} registrada no COS Meet.`
  }

  const date = new Date(metadata.scheduledAt)
  const formatted = Number.isNaN(date.getTime())
    ? metadata.scheduledAt
    : new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date)

  return `Reuniao "${title}" ${typeLabel} agendada para ${formatted}.`
}

function hasAnalysisContent(sections: MeetingAnalysisSections) {
  return ANALYSIS_SECTION_ORDER.some((key) => sections[key].length > 0)
}

function ensureAnalysisSections({
  title,
  metadata,
  currentRow,
  payload,
}: {
  title: string
  metadata: MeetingMetadata
  currentRow?: MeetingRow
  payload: Partial<MeetingPayload>
}) {
  if (hasAnalysisContent(metadata.analysisSections)) {
    return metadata.analysisSections
  }

  const sections = createEmptyAnalysisSections()
  const decisionItems = splitTextItems(payload.decisions ?? currentRow?.decisions)
  const nextStepItems = splitTextItems(payload.nextSteps ?? currentRow?.next_steps)

  sections.summary = [
    createAnalysisItem(buildScheduledLabel(title, metadata)),
    ...(metadata.description ? [createAnalysisItem(metadata.description)] : []),
  ]

  sections.decisions = decisionItems.map((item) => createAnalysisItem(item))
  sections.tasks = nextStepItems.map((item) => createAnalysisItem(item))
  sections.pendingItems = [
    ...(metadata.cosShouldRecord ? [createAnalysisItem("Gravacao automatica solicitada, mas ainda nao conectada neste modulo.")] : []),
    ...(metadata.cosShouldExtract ? [createAnalysisItem("Extracao automatica de informacoes importantes permanece pendente de integracao real.")] : []),
    ...(metadata.cosShouldReport ? [createAnalysisItem("Relatorio automatico continua dependente da futura integracao real do COS Meet.")] : []),
  ]
  sections.responsibles = metadata.participants.map((participant) => createAnalysisItem(participant))
  sections.nextSteps = [createAnalysisItem("Revisar, editar, aceitar ou descartar os itens antes de transformar qualquer dado no sistema.")]

  return sections
}

async function getMeetingActor() {
  const supabase = await createSupabaseServerClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    return { error: "Sessao invalida. Faca login novamente." as const }
  }

  const access = await getUserAccessForUser(authData.user)

  if (!access.workspace?.id) {
    return { error: "Nenhum workspace encontrado para esta conta." as const }
  }

  const adminClient = createSupabaseAdminClient()
  if (!adminClient) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY nao configurada para reunioes." as const }
  }

  return {
    actorId: authData.user.id,
    workspaceId: access.workspace.id,
    canManage: canManageWorkspace(access),
    isMaster: access.profile?.global_role === "master",
    adminClient,
  } satisfies MeetingActor
}

function normalizeDatabaseMeetingStatus(status: string): DatabaseMeetingStatus {
  const normalized = status.trim().toLowerCase()

  if (normalized === "scheduled" || normalized === "agendada" || normalized === "agendado" || normalized === "draft" || normalized === "rascunho") {
    return "draft"
  }

  if (normalized === "in_progress" || normalized === "em andamento" || normalized === "recorded" || normalized === "gravada" || normalized === "gravado") {
    return "recorded"
  }

  if (normalized === "finished" || normalized === "finalizada" || normalized === "finalizado" || normalized === "transcribed" || normalized === "transcrita" || normalized === "transcrito") {
    return "transcribed"
  }

  if (normalized === "archived" || normalized === "arquivada" || normalized === "arquivado") {
    return "archived"
  }

  return "draft"
}

function mapDatabaseStatusToMeetingStatus(status: string | null): MeetingStatus {
  const normalized = normalizeDatabaseMeetingStatus(status ?? "draft")

  if (normalized === "recorded") return "in_progress"
  if (normalized === "transcribed") return "finished"
  return "scheduled"
}

function normalizeParticipants(input?: string[] | string | null) {
  if (!input) return [] as string[]

  if (Array.isArray(input)) {
    return input.map((value) => value.trim()).filter(Boolean)
  }

  return input
    .split(/[\n,;]+/)
    .map((value) => value.trim())
    .filter(Boolean)
}

function serializeMeetingMetadata(metadata: MeetingMetadata) {
  return `${MEETING_METADATA_PREFIX}${JSON.stringify(metadata)}`
}

function parseMeetingMetadata(value?: string | null): MeetingMetadata | null {
  if (!value || !value.startsWith(MEETING_METADATA_PREFIX)) {
    return null
  }

  try {
    const parsed = JSON.parse(value.slice(MEETING_METADATA_PREFIX.length)) as MeetingMetadata | MeetingMetadataV1

    if (parsed.version === 2) {
      return {
        ...parsed,
        analysisSections: normalizeAnalysisSections(parsed.analysisSections),
        attachments: Array.isArray(parsed.attachments) ? parsed.attachments : [],
        timeline: Array.isArray(parsed.timeline) ? parsed.timeline : [],
        history: Array.isArray(parsed.history) ? parsed.history : [],
        transcriptionState: parsed.transcriptionState ?? { status: "not_available", note: TRANSCRIPTION_NOTE },
      }
    }

    if (parsed.version === 1) {
      return {
        ...parsed,
        version: 2,
        analysisSections: createEmptyAnalysisSections(),
        attachments: [],
        timeline: [],
        history: [],
        transcriptionState: { status: "not_available", note: TRANSCRIPTION_NOTE },
      }
    }

    return null
  } catch {
    return null
  }
}

function buildMeetingMetadata(payload: Partial<MeetingPayload>, currentRow?: MeetingRow): MeetingMetadata {
  const currentMetadata = parseMeetingMetadata(currentRow?.transcript)
  const legacyDescription = payload.summary?.trim() || currentRow?.summary?.trim() || currentMetadata?.description || ""
  const baseMetadata: MeetingMetadata = {
    version: 2,
    scheduledAt: payload.scheduledAt?.trim() || currentMetadata?.scheduledAt || currentRow?.created_at || null,
    participants: normalizeParticipants(payload.participants ?? currentMetadata?.participants ?? []),
    meetingType:
      payload.meetingType ??
      currentMetadata?.meetingType ??
      ((payload.meetingLink?.trim() || payload.audioUrl?.trim()) ? "video" : "in_person"),
    meetingLink: payload.meetingLink?.trim() || payload.audioUrl?.trim() || currentMetadata?.meetingLink || currentRow?.audio_url || "",
    meetingLocation: payload.meetingLocation?.trim() || currentMetadata?.meetingLocation || "",
    description: payload.description?.trim() || legacyDescription,
    cosShouldAttend: payload.cosShouldAttend ?? currentMetadata?.cosShouldAttend ?? false,
    cosShouldRecord: payload.cosShouldRecord ?? currentMetadata?.cosShouldRecord ?? false,
    cosShouldExtract: payload.cosShouldExtract ?? currentMetadata?.cosShouldExtract ?? false,
    cosShouldReport: payload.cosShouldReport ?? currentMetadata?.cosShouldReport ?? false,
    analysisSections: normalizeAnalysisSections(payload.analysisSections ?? currentMetadata?.analysisSections),
    attachments: payload.attachments ?? currentMetadata?.attachments ?? [],
    timeline: payload.timeline ?? currentMetadata?.timeline ?? [],
    history: currentMetadata?.history ?? [],
    transcriptionState: payload.transcriptionState ?? currentMetadata?.transcriptionState ?? { status: "not_available", note: TRANSCRIPTION_NOTE },
  }

  return {
    ...baseMetadata,
    analysisSections: ensureAnalysisSections({
      title: payload.title?.trim() || currentRow?.title || "Reuniao",
      metadata: baseMetadata,
      currentRow,
      payload,
    }),
  }
}

function hydrateMeeting(meeting: MeetingRow) {
  const metadata = buildMeetingMetadata({}, meeting)
  const meetingLink = metadata.meetingType === "video" ? metadata.meetingLink : ""
  const status = mapDatabaseStatusToMeetingStatus(meeting.status)

  return {
    id: meeting.id,
    title: meeting.title,
    audioUrl: meeting.audio_url || "",
    transcript: meeting.transcript || "",
    summary: meeting.summary || "",
    decisions: meeting.decisions || "",
    nextSteps: meeting.next_steps || "",
    status,
    createdAt: meeting.created_at,
    scheduledAt: metadata.scheduledAt,
    participants: metadata.participants,
    meetingType: metadata.meetingType,
    meetingLink,
    meetingLocation: metadata.meetingType === "in_person" ? metadata.meetingLocation : "",
    description: metadata.description,
    cosShouldAttend: metadata.cosShouldAttend,
    cosShouldRecord: metadata.cosShouldRecord,
    cosShouldExtract: metadata.cosShouldExtract,
    cosShouldReport: metadata.cosShouldReport,
    analysisSections: metadata.analysisSections,
    attachments: metadata.attachments,
    timeline: metadata.timeline.sort((a, b) => (b.occurredAt ?? "").localeCompare(a.occurredAt ?? "")),
    history: metadata.history.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    transcriptionState: metadata.transcriptionState,
    statusLabel: status === "scheduled" ? "Agendada" : status === "in_progress" ? "Em andamento" : "Finalizada",
  }
}

async function logMeetingActivity({
  adminClient,
  workspaceId,
  userId,
  action,
  description,
}: {
  adminClient: MeetingActor["adminClient"]
  workspaceId: string
  userId: string
  action: string
  description: string
}) {
  const { error } = await adminClient.from("activity_logs").insert({
    workspace_id: workspaceId,
    user_id: userId,
    area: "meetings",
    action,
    description,
  })

  if (error) {
    console.error("[meetings] activity-log:", error.message)
  }
}

async function resolveMeetingForActor(actor: MeetingActor, meetingId: string) {
  if (!UUID_PATTERN.test(meetingId)) {
    return { error: "Reuniao nao encontrada neste workspace." }
  }

  const { data, error } = await actor.adminClient
    .from("meetings")
    .select("id, workspace_id, title, audio_url, transcript, summary, decisions, next_steps, status, created_by, created_at")
    .eq("id", meetingId)
    .maybeSingle<MeetingRow>()

  if (error) {
    return { error: error.message }
  }

  if (!data || data.workspace_id !== actor.workspaceId) {
    return { error: "Reuniao nao encontrada neste workspace." }
  }

  return { meeting: data }
}

export async function getMeetingsAction() {
  const actor = await getMeetingActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const { data, error } = await actor.adminClient
    .from("meetings")
    .select("id, workspace_id, title, audio_url, transcript, summary, decisions, next_steps, status, created_by, created_at")
    .eq("workspace_id", actor.workspaceId)
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .returns<MeetingRow[]>()

  if (error) {
    return { error: error.message }
  }

  return {
    success: true,
    meetings: (data ?? []).map(hydrateMeeting),
    canManage: actor.canManage || actor.isMaster,
  }
}

export async function getMeetingByIdAction({ meetingId }: { meetingId: string }) {
  const actor = await getMeetingActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const resolved = await resolveMeetingForActor(actor, meetingId)
  if ("error" in resolved) {
    return { error: resolved.error }
  }

  return {
    success: true,
    meeting: hydrateMeeting(resolved.meeting),
    canManage: actor.canManage || actor.isMaster,
  }
}

export async function createMeetingAction(payload: MeetingPayload) {
  const actor = await getMeetingActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const trimmedTitle = payload.title.trim()
  if (!trimmedTitle) {
    return { error: "Informe o titulo da reuniao." }
  }

  const metadata = buildMeetingMetadata(payload)
  const createdAt = new Date().toISOString()
  const timeline = [
    createTimelineEvent("meeting_created", "Reuniao criada", createdAt),
    ...(metadata.scheduledAt ? [createTimelineEvent("meeting_scheduled", "Reuniao agendada", metadata.scheduledAt)] : []),
  ]
  const history = [createHistoryEntry("meeting_created", "Reuniao criada no COS Meet.", createdAt)]

  const { data, error } = await actor.adminClient
    .from("meetings")
    .insert({
      workspace_id: actor.workspaceId,
      title: trimmedTitle,
      audio_url: metadata.meetingType === "video" ? metadata.meetingLink || null : null,
      transcript: serializeMeetingMetadata({
        ...metadata,
        timeline,
        history,
      }),
      summary: metadata.description || payload.summary?.trim() || null,
      decisions: payload.decisions?.trim() || null,
      next_steps: payload.nextSteps?.trim() || null,
      status: normalizeDatabaseMeetingStatus(payload.status ?? "scheduled"),
      created_by: actor.actorId,
    })
    .select("id, workspace_id, title, audio_url, transcript, summary, decisions, next_steps, status, created_by, created_at")
    .single<MeetingRow>()

  if (error || !data) {
    return { error: error?.message ?? "Nao foi possivel criar a reuniao." }
  }

  await logMeetingActivity({
    adminClient: actor.adminClient,
    workspaceId: actor.workspaceId,
    userId: actor.actorId,
    action: "meeting_created",
    description: "reuniao criada",
  })

  return { success: true, meetingId: data.id }
}

export async function updateMeetingAction({ meetingId, ...payload }: MeetingPayload & { meetingId: string }) {
  const actor = await getMeetingActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage && !actor.isMaster) {
    return { error: "Apenas owner, admin ou master podem editar reunioes." }
  }

  const resolved = await resolveMeetingForActor(actor, meetingId)
  if ("error" in resolved) {
    return { error: resolved.error }
  }

  const trimmedTitle = payload.title.trim()
  if (!trimmedTitle) {
    return { error: "Informe o titulo da reuniao." }
  }

  const currentStatus = mapDatabaseStatusToMeetingStatus(resolved.meeting.status)
  const nextStatus = payload.status ? mapDatabaseStatusToMeetingStatus(payload.status) : currentStatus
  const metadata = buildMeetingMetadata(payload, resolved.meeting)
  const historyEntry = createHistoryEntry(
    payload.historyAction ?? (nextStatus === "finished" && currentStatus !== "finished" ? "meeting_finished" : "meeting_updated"),
    payload.historyDescription ??
      (nextStatus === "finished" && currentStatus !== "finished"
        ? "Reuniao finalizada e analise do COS liberada."
        : "Reuniao atualizada."),
  )

  const timeline = [...metadata.timeline]
  const history = [...metadata.history, historyEntry]

  if (payload.timelineEvent) {
    timeline.push(createTimelineEvent(payload.timelineEvent.type, payload.timelineEvent.label, payload.timelineEvent.occurredAt ?? new Date().toISOString()))
  } else if (nextStatus === "finished" && currentStatus !== "finished") {
    timeline.push(createTimelineEvent("meeting_finished", "Reuniao finalizada"))
  }

  const { error } = await actor.adminClient
    .from("meetings")
    .update({
      title: trimmedTitle,
      audio_url: metadata.meetingType === "video" ? metadata.meetingLink || null : null,
      transcript: serializeMeetingMetadata({
        ...metadata,
        timeline,
        history,
      }),
      summary: metadata.description || payload.summary?.trim() || null,
      decisions: payload.decisions?.trim() || null,
      next_steps: payload.nextSteps?.trim() || null,
      status: normalizeDatabaseMeetingStatus(payload.status ?? resolved.meeting.status ?? "scheduled"),
    })
    .eq("id", meetingId)

  if (error) {
    return { error: error.message }
  }

  await logMeetingActivity({
    adminClient: actor.adminClient,
    workspaceId: actor.workspaceId,
    userId: actor.actorId,
    action: payload.historyAction ?? (nextStatus === "finished" && currentStatus !== "finished" ? "meeting_finished" : "meeting_updated"),
    description: payload.historyDescription?.toLowerCase() ?? (nextStatus === "finished" && currentStatus !== "finished" ? "reuniao finalizada" : "reuniao atualizada"),
  })

  return { success: true }
}

export async function deleteMeetingAction({ meetingId }: { meetingId: string }) {
  const actor = await getMeetingActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage && !actor.isMaster) {
    return { error: "Apenas owner, admin ou master podem arquivar reunioes." }
  }

  const resolved = await resolveMeetingForActor(actor, meetingId)
  if ("error" in resolved) {
    return { error: resolved.error }
  }

  const { error } = await actor.adminClient
    .from("meetings")
    .update({
      status: "archived",
    })
    .eq("id", meetingId)

  if (error) {
    return { error: error.message }
  }

  await logMeetingActivity({
    adminClient: actor.adminClient,
    workspaceId: actor.workspaceId,
    userId: actor.actorId,
    action: "meeting_archived",
    description: "reuniao arquivada",
  })

  return { success: true }
}
