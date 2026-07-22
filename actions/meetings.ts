"use server"

import { createHash } from "crypto"
import { canManageWorkspace, getUserAccessForUser } from "@/lib/auth"
import { AzureBlobUpload, EncodedFileOutput, EncodedFileType, EgressStatus, S3Upload } from "livekit-server-sdk"
import { buildLiveKitRoomName, createLiveKitEgressClient, createLiveKitRoomServiceClient, createLiveKitToken, getLiveKitUrl } from "@/lib/meet/livekit"
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server"

type DatabaseMeetingStatus = "draft" | "recorded" | "transcribed" | "archived"
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
const meetInsightsModel = "gpt-5-mini"
const meetInsightsTimeoutMs = 45000
const meetTranscriptPromptLimit = 12000

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
const PUBLIC_ROOM_SLUG_PATTERN = /^cos-[a-f0-9]{16}$/i
export type MeetingJoinRequestStatus = "waiting" | "approved" | "denied"
export type MeetingParticipantRole = "organizer" | "guest"

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

export type MeetingInsightTask = {
  id: string
  text: string
  responsible: string | null
  deadline: string | null
}

export type MeetingInsightResponsible = {
  id: string
  name: string
  context: string
  deadline: string | null
}

export type MeetingInsightsResult = {
  executiveSummary: string
  mainTopics: string[]
  decisions: string[]
  tasks: MeetingInsightTask[]
  responsibles: MeetingInsightResponsible[]
  risks: string[]
  openQuestions: string[]
  nextSteps: string[]
}

export type MeetingInsightsStatus = "disabled" | "awaiting_transcription" | "ready" | "processing" | "completed" | "failed"

export type MeetingInsightsState = {
  status: MeetingInsightsStatus
  processedAt: string | null
  error: string | null
  transcriptHash: string | null
  result: MeetingInsightsResult | null
}

export type MeetingFollowAlongResult = {
  decisions: string[]
  tasks: MeetingInsightTask[]
  responsibles: MeetingInsightResponsible[]
  deadlines: string[]
  risks: string[]
  openQuestions: string[]
  nextSteps: string[]
}

export type MeetingFollowAlongStatus = "awaiting_content" | "active" | "paused" | "finished" | "error"

export type MeetingFollowAlongState = {
  status: MeetingFollowAlongStatus
  processedAt: string | null
  error: string | null
  sourceHash: string | null
  lastMessageCount: number
  result: MeetingFollowAlongResult | null
}

export type MeetingRecordingStatus =
  | "not_requested"
  | "preparing"
  | "recording"
  | "finalizing"
  | "processing"
  | "available"
  | "unavailable"
  | "failed"

export type MeetingRecordingState = {
  enabled: boolean
  recordingId: string | null
  egressId: string | null
  status: MeetingRecordingStatus
  storagePath: string | null
  mimeType: string | null
  fileName: string | null
  startedAt: string | null
  endedAt: string | null
  durationSeconds: number | null
  sizeBytes: number | null
  updatedAt: string | null
  error: string | null
}

export type MeetingJoinRequest = {
  id: string
  participantName: string
  requestedAt: string
  status: MeetingJoinRequestStatus
}

export type ConnectedMeetingParticipant = {
  requestId: string
  identity: string
  participantName: string
  connectedAt: string
  status: "online"
  role: MeetingParticipantRole
}

export type MeetingSessionParticipant = {
  identity: string
  participantName: string
  role: MeetingParticipantRole
  firstJoinedAt: string
}

export type MeetingSessionRecord = {
  startedAt: string | null
  endedAt: string | null
  durationSeconds: number | null
  endedByUserId: string | null
  endedByName: string | null
  participants: MeetingSessionParticipant[]
  finalState: "idle" | "active" | "ended"
  summaryDraft: string
  decisionsDraft: string[]
  tasksDraft: string[]
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
  transcriptText: string
  insights: MeetingInsightsState
  followAlong: MeetingFollowAlongState
  recording: MeetingRecordingState
  joinRequests: MeetingJoinRequest[]
  connectedParticipants: ConnectedMeetingParticipant[]
  sessionRecord: MeetingSessionRecord
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
  actorName: string
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
  transcriptText?: string
  insights?: MeetingInsightsState
  followAlong?: MeetingFollowAlongState
  recording?: MeetingRecordingState
  joinRequests?: MeetingJoinRequest[]
  connectedParticipants?: ConnectedMeetingParticipant[]
  sessionRecord?: Partial<MeetingSessionRecord>
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

function buildPublicRoomSlug(meetingId: string) {
  return `cos-${createHash("sha256").update(`cos-meet:${meetingId}`).digest("hex").slice(0, 16)}`
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

function createEmptyInsightsState(status: MeetingInsightsStatus = "awaiting_transcription"): MeetingInsightsState {
  return {
    status,
    processedAt: null,
    error: null,
    transcriptHash: null,
    result: null,
  }
}

function createEmptyFollowAlongState(status: MeetingFollowAlongStatus = "awaiting_content"): MeetingFollowAlongState {
  return {
    status,
    processedAt: null,
    error: null,
    sourceHash: null,
    lastMessageCount: 0,
    result: null,
  }
}

function createEmptyRecordingState(enabled = false): MeetingRecordingState {
  return {
    enabled,
    recordingId: null,
    egressId: null,
    status: enabled ? "unavailable" : "not_requested",
    storagePath: null,
    mimeType: null,
    fileName: null,
    startedAt: null,
    endedAt: null,
    durationSeconds: null,
    sizeBytes: null,
    updatedAt: null,
    error: null,
  }
}

function normalizeInsightTextList(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean)
    : []
}

function normalizeMeetingInsightTasks(value: unknown) {
  if (!Array.isArray(value)) return [] as MeetingInsightTask[]

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const record = item as Record<string, unknown>
      const text = typeof record.text === "string" ? record.text.trim() : ""
      if (!text) return null

      return {
        id: typeof record.id === "string" && record.id.trim() ? record.id : createId("insight_task"),
        text,
        responsible: typeof record.responsible === "string" && record.responsible.trim() ? record.responsible.trim() : null,
        deadline: typeof record.deadline === "string" && record.deadline.trim() ? record.deadline.trim() : null,
      } satisfies MeetingInsightTask
    })
    .filter((item): item is MeetingInsightTask => Boolean(item))
}

function normalizeMeetingInsightResponsibles(value: unknown) {
  if (!Array.isArray(value)) return [] as MeetingInsightResponsible[]

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const record = item as Record<string, unknown>
      const name = typeof record.name === "string" ? record.name.trim() : ""
      const context = typeof record.context === "string" ? record.context.trim() : ""
      if (!name) return null

      return {
        id: typeof record.id === "string" && record.id.trim() ? record.id : createId("insight_responsible"),
        name,
        context,
        deadline: typeof record.deadline === "string" && record.deadline.trim() ? record.deadline.trim() : null,
      } satisfies MeetingInsightResponsible
    })
    .filter((item): item is MeetingInsightResponsible => Boolean(item))
}

function normalizeMeetingInsightsResult(value: unknown): MeetingInsightsResult | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const record = value as Record<string, unknown>
  const executiveSummary = typeof record.executiveSummary === "string" ? record.executiveSummary.trim() : ""
  if (!executiveSummary) {
    return null
  }

  return {
    executiveSummary,
    mainTopics: normalizeInsightTextList(record.mainTopics),
    decisions: normalizeInsightTextList(record.decisions),
    tasks: normalizeMeetingInsightTasks(record.tasks),
    responsibles: normalizeMeetingInsightResponsibles(record.responsibles),
    risks: normalizeInsightTextList(record.risks),
    openQuestions: normalizeInsightTextList(record.openQuestions),
    nextSteps: normalizeInsightTextList(record.nextSteps),
  }
}

function normalizeMeetingInsightsState(value?: Partial<MeetingInsightsState> | null) {
  const defaultState = createEmptyInsightsState()
  if (!value || typeof value !== "object") {
    return defaultState
  }

  const result = normalizeMeetingInsightsResult(value.result)
  const status: MeetingInsightsStatus =
    value.status === "disabled" ||
    value.status === "awaiting_transcription" ||
    value.status === "ready" ||
    value.status === "processing" ||
    value.status === "completed" ||
    value.status === "failed"
      ? value.status
      : defaultState.status

  return {
    status,
    processedAt: typeof value.processedAt === "string" && value.processedAt.trim() ? value.processedAt : null,
    error: typeof value.error === "string" && value.error.trim() ? value.error.trim() : null,
    transcriptHash: typeof value.transcriptHash === "string" && value.transcriptHash.trim() ? value.transcriptHash : null,
    result,
  }
}

function normalizeMeetingFollowAlongResult(value: unknown): MeetingFollowAlongResult | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const record = value as Record<string, unknown>

  return {
    decisions: normalizeInsightTextList(record.decisions),
    tasks: normalizeMeetingInsightTasks(record.tasks),
    responsibles: normalizeMeetingInsightResponsibles(record.responsibles),
    deadlines: normalizeInsightTextList(record.deadlines),
    risks: normalizeInsightTextList(record.risks),
    openQuestions: normalizeInsightTextList(record.openQuestions),
    nextSteps: normalizeInsightTextList(record.nextSteps),
  }
}

function normalizeMeetingFollowAlongState(value?: Partial<MeetingFollowAlongState> | null) {
  const defaultState = createEmptyFollowAlongState()
  if (!value || typeof value !== "object") {
    return defaultState
  }

  const result = normalizeMeetingFollowAlongResult(value.result)
  const status: MeetingFollowAlongStatus =
    value.status === "awaiting_content" ||
    value.status === "active" ||
    value.status === "paused" ||
    value.status === "finished" ||
    value.status === "error"
      ? value.status
      : defaultState.status

  return {
    status,
    processedAt: typeof value.processedAt === "string" && value.processedAt.trim() ? value.processedAt : null,
    error: typeof value.error === "string" && value.error.trim() ? value.error.trim() : null,
    sourceHash: typeof value.sourceHash === "string" && value.sourceHash.trim() ? value.sourceHash : null,
    lastMessageCount: typeof value.lastMessageCount === "number" && Number.isFinite(value.lastMessageCount) ? value.lastMessageCount : 0,
    result,
  }
}

function normalizeMeetingRecordingState(value?: Partial<MeetingRecordingState> | null, enabled = false) {
  const defaultState = createEmptyRecordingState(enabled)
  if (!value || typeof value !== "object") {
    return defaultState
  }

  const status: MeetingRecordingStatus =
    value.status === "not_requested" ||
    value.status === "preparing" ||
    value.status === "recording" ||
    value.status === "finalizing" ||
    value.status === "processing" ||
    value.status === "available" ||
    value.status === "unavailable" ||
    value.status === "failed"
      ? value.status
      : defaultState.status

  return {
    enabled: value.enabled ?? enabled,
    recordingId: typeof value.recordingId === "string" && value.recordingId.trim() ? value.recordingId.trim() : null,
    egressId: typeof value.egressId === "string" && value.egressId.trim() ? value.egressId.trim() : null,
    status,
    storagePath: typeof value.storagePath === "string" && value.storagePath.trim() ? value.storagePath.trim() : null,
    mimeType: typeof value.mimeType === "string" && value.mimeType.trim() ? value.mimeType.trim() : null,
    fileName: typeof value.fileName === "string" && value.fileName.trim() ? value.fileName.trim() : null,
    startedAt: typeof value.startedAt === "string" && value.startedAt.trim() ? value.startedAt.trim() : null,
    endedAt: typeof value.endedAt === "string" && value.endedAt.trim() ? value.endedAt.trim() : null,
    durationSeconds: typeof value.durationSeconds === "number" && Number.isFinite(value.durationSeconds) ? value.durationSeconds : null,
    sizeBytes: typeof value.sizeBytes === "number" && Number.isFinite(value.sizeBytes) ? value.sizeBytes : null,
    updatedAt: typeof value.updatedAt === "string" && value.updatedAt.trim() ? value.updatedAt.trim() : null,
    error: typeof value.error === "string" && value.error.trim() ? value.error.trim() : null,
  }
}

function extractStoredTranscriptText(value?: string | null) {
  if (!value || value.startsWith(MEETING_METADATA_PREFIX)) {
    return ""
  }

  return value.trim()
}

function syncMeetingInsightsState({
  currentState,
  cosShouldExtract,
  transcriptText,
}: {
  currentState?: MeetingInsightsState | null
  cosShouldExtract: boolean
  transcriptText: string
}): MeetingInsightsState {
  const normalizedState = normalizeMeetingInsightsState(currentState)

  if (normalizedState.result && normalizedState.status === "completed") {
    return normalizedState
  }

  if (!cosShouldExtract) {
    return {
      ...normalizedState,
      status: "disabled",
      error: null,
    }
  }

  if (!transcriptText.trim()) {
    return {
      ...normalizedState,
      status: "awaiting_transcription",
      error: null,
    }
  }

  if (normalizedState.status === "processing") {
    return normalizedState
  }

  if (normalizedState.status === "failed") {
    return normalizedState
  }

  return {
    ...normalizedState,
    status: "ready",
    error: null,
  }
}

function syncMeetingFollowAlongState({
  currentState,
  cosShouldAttend,
  hasContent,
  isFinished,
}: {
  currentState?: MeetingFollowAlongState | null
  cosShouldAttend: boolean
  hasContent: boolean
  isFinished: boolean
}): MeetingFollowAlongState {
  const normalizedState = normalizeMeetingFollowAlongState(currentState)

  if (!cosShouldAttend) {
    return createEmptyFollowAlongState()
  }

  if (normalizedState.status === "active") {
    return {
      ...normalizedState,
      error: null,
    }
  }

  if (normalizedState.status === "error") {
    return normalizedState
  }

  if (isFinished) {
    return {
      ...normalizedState,
      status: "finished",
      error: null,
    }
  }

  if (!hasContent) {
    return {
      ...normalizedState,
      status: "awaiting_content",
      error: null,
    }
  }

  if (normalizedState.processedAt) {
    return {
      ...normalizedState,
      status: "paused",
      error: null,
    }
  }

  return {
    ...normalizedState,
    status: "active",
    error: null,
  }
}

function syncMeetingRecordingState({
  currentState,
  enabled,
}: {
  currentState?: MeetingRecordingState | null
  enabled: boolean
}): MeetingRecordingState {
  const normalizedState = normalizeMeetingRecordingState(currentState, enabled)

  if (!enabled) {
    return createEmptyRecordingState(false)
  }

  if (normalizedState.status === "not_requested") {
    return {
      ...normalizedState,
      enabled: true,
      status: "unavailable",
    }
  }

  return {
    ...normalizedState,
    enabled: true,
  }
}

function bigintToIsoString(value: bigint) {
  if (!value || value <= BigInt(0)) return null
  return new Date(Number(value)).toISOString()
}

function bigintToSeconds(value: bigint) {
  if (!value || value <= BigInt(0)) return null
  return Number(value)
}

function bigintToNumber(value: bigint) {
  if (!value || value <= BigInt(0)) return null
  return Number(value)
}

function sanitizeRecordingFileSegment(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "reuniao"
}

function buildRecordingFileName(title: string, startedAt: string | null) {
  const baseTitle = sanitizeRecordingFileSegment(title)
  const date = startedAt ? new Date(startedAt) : new Date()
  const normalizedDate = Number.isNaN(date.getTime()) ? new Date() : date
  const datePart = normalizedDate.toISOString().slice(0, 10)
  return `${baseTitle}-${datePart}.mp4`
}

function requireMeetingRecordingStorageEnv() {
  const endpoint = process.env.SUPABASE_STORAGE_S3_ENDPOINT?.trim()
  const region = process.env.SUPABASE_STORAGE_S3_REGION?.trim()
  const accessKey = process.env.SUPABASE_STORAGE_S3_ACCESS_KEY_ID?.trim()
  const secret = process.env.SUPABASE_STORAGE_S3_SECRET_ACCESS_KEY?.trim()
  const bucket = process.env.SUPABASE_MEETING_RECORDINGS_BUCKET?.trim() || "meeting-recordings"

  if (!endpoint || !region || !accessKey || !secret || !bucket) {
    throw new Error(
      "Gravacao server-side nao configurada. Defina SUPABASE_STORAGE_S3_ENDPOINT, SUPABASE_STORAGE_S3_REGION, SUPABASE_STORAGE_S3_ACCESS_KEY_ID, SUPABASE_STORAGE_S3_SECRET_ACCESS_KEY e SUPABASE_MEETING_RECORDINGS_BUCKET.",
    )
  }

  return {
    endpoint,
    region,
    accessKey,
    secret,
    bucket,
  }
}

function hasFollowAlongContent(result: MeetingFollowAlongResult | null) {
  if (!result) return false

  return (
    result.decisions.length > 0 ||
    result.tasks.length > 0 ||
    result.responsibles.length > 0 ||
    result.deadlines.length > 0 ||
    result.risks.length > 0 ||
    result.openQuestions.length > 0 ||
    result.nextSteps.length > 0
  )
}

function mergeUniqueTextItems(current: string[], incoming: string[]) {
  const seen = new Set<string>()
  const merged: string[] = []

  for (const item of [...current, ...incoming]) {
    const normalized = item.trim()
    const key = normalized.toLocaleLowerCase("pt-BR")
    if (!normalized || seen.has(key)) continue
    seen.add(key)
    merged.push(normalized)
  }

  return merged
}

function mergeUniqueInsightTasks(current: MeetingInsightTask[], incoming: MeetingInsightTask[]) {
  const seen = new Set<string>()
  const merged: MeetingInsightTask[] = []

  for (const task of [...current, ...incoming]) {
    const key = `${task.text.trim().toLocaleLowerCase("pt-BR")}::${task.responsible?.trim().toLocaleLowerCase("pt-BR") ?? ""}::${task.deadline?.trim().toLocaleLowerCase("pt-BR") ?? ""}`
    if (!task.text.trim() || seen.has(key)) continue
    seen.add(key)
    merged.push(task)
  }

  return merged
}

function mergeUniqueInsightResponsibles(current: MeetingInsightResponsible[], incoming: MeetingInsightResponsible[]) {
  const seen = new Set<string>()
  const merged: MeetingInsightResponsible[] = []

  for (const item of [...current, ...incoming]) {
    const key = `${item.name.trim().toLocaleLowerCase("pt-BR")}::${item.context.trim().toLocaleLowerCase("pt-BR")}::${item.deadline?.trim().toLocaleLowerCase("pt-BR") ?? ""}`
    if (!item.name.trim() || seen.has(key)) continue
    seen.add(key)
    merged.push(item)
  }

  return merged
}

function mergeMeetingFollowAlongResult(
  current: MeetingFollowAlongResult | null,
  incoming: MeetingFollowAlongResult | null,
): MeetingFollowAlongResult | null {
  if (!current && !incoming) return null
  if (!current) return incoming
  if (!incoming) return current

  return {
    decisions: mergeUniqueTextItems(current.decisions, incoming.decisions),
    tasks: mergeUniqueInsightTasks(current.tasks, incoming.tasks),
    responsibles: mergeUniqueInsightResponsibles(current.responsibles, incoming.responsibles),
    deadlines: mergeUniqueTextItems(current.deadlines, incoming.deadlines),
    risks: mergeUniqueTextItems(current.risks, incoming.risks),
    openQuestions: mergeUniqueTextItems(current.openQuestions, incoming.openQuestions),
    nextSteps: mergeUniqueTextItems(current.nextSteps, incoming.nextSteps),
  }
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

function normalizeJoinRequests(value?: MeetingJoinRequest[] | null) {
  if (!Array.isArray(value)) return [] as MeetingJoinRequest[]

  return value
    .filter((item): item is MeetingJoinRequest => Boolean(item?.id && item?.participantName))
    .map((item) => ({
      id: item.id,
      participantName: item.participantName.trim(),
      requestedAt: item.requestedAt ?? new Date().toISOString(),
      status: item.status ?? "waiting",
    }))
    .filter((item) => Boolean(item.participantName))
}

function normalizeConnectedParticipants(value?: ConnectedMeetingParticipant[] | null) {
  if (!Array.isArray(value)) return [] as ConnectedMeetingParticipant[]

  return value
    .filter((item): item is ConnectedMeetingParticipant => Boolean(item?.requestId && item?.participantName))
    .map((item) => {
      const role: MeetingParticipantRole = item.role === "organizer" ? "organizer" : "guest"

      return {
        requestId: item.requestId,
        identity: item.identity?.trim() || item.requestId,
        participantName: item.participantName.trim(),
        connectedAt: item.connectedAt ?? new Date().toISOString(),
        status: "online" as const,
        role,
      }
    })
    .filter((item) => Boolean(item.participantName))
}

function normalizeSessionParticipants(value?: MeetingSessionParticipant[] | null) {
  if (!Array.isArray(value)) return [] as MeetingSessionParticipant[]

  return value
    .filter((item): item is MeetingSessionParticipant => Boolean(item?.identity && item?.participantName))
    .map((item) => {
      const role: MeetingParticipantRole = item.role === "organizer" ? "organizer" : "guest"

      return {
        identity: item.identity,
        participantName: item.participantName.trim(),
        role,
        firstJoinedAt: item.firstJoinedAt ?? new Date().toISOString(),
      }
    })
    .filter((item) => Boolean(item.participantName))
}

function normalizeSessionRecord(value?: Partial<MeetingSessionRecord> | null): MeetingSessionRecord {
  return {
    startedAt: value?.startedAt ?? null,
    endedAt: value?.endedAt ?? null,
    durationSeconds: typeof value?.durationSeconds === "number" ? value.durationSeconds : null,
    endedByUserId: value?.endedByUserId ?? null,
    endedByName: value?.endedByName?.trim() || null,
    participants: normalizeSessionParticipants(value?.participants),
    finalState: value?.finalState === "active" || value?.finalState === "ended" ? value.finalState : "idle",
    summaryDraft: value?.summaryDraft?.trim() || "",
    decisionsDraft: Array.isArray(value?.decisionsDraft) ? value.decisionsDraft.map((item) => item.trim()).filter(Boolean) : [],
    tasksDraft: Array.isArray(value?.tasksDraft) ? value.tasksDraft.map((item) => item.trim()).filter(Boolean) : [],
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
    ...(metadata.cosShouldExtract
      ? [
          createAnalysisItem(
            metadata.transcriptText.trim()
              ? "Extracao de informacoes importantes disponivel para processamento manual nesta reuniao."
              : "Extracao de informacoes importantes depende de uma transcricao disponivel.",
          ),
        ]
      : []),
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
    actorName: access.profile?.full_name?.trim() || authData.user.email?.trim() || "Organizador",
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
        transcriptText: typeof parsed.transcriptText === "string" ? parsed.transcriptText.trim() : "",
        insights: normalizeMeetingInsightsState(parsed.insights),
        followAlong: normalizeMeetingFollowAlongState(parsed.followAlong),
        recording: normalizeMeetingRecordingState(parsed.recording, parsed.cosShouldRecord),
        joinRequests: normalizeJoinRequests(parsed.joinRequests),
        connectedParticipants: normalizeConnectedParticipants(parsed.connectedParticipants),
        sessionRecord: normalizeSessionRecord(parsed.sessionRecord),
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
        transcriptText: "",
        insights: createEmptyInsightsState(),
        followAlong: createEmptyFollowAlongState(),
        recording: createEmptyRecordingState(parsed.cosShouldRecord),
        joinRequests: [],
        connectedParticipants: [],
        sessionRecord: normalizeSessionRecord(),
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
  const transcriptText =
    payload.transcriptText?.trim() ||
    currentMetadata?.transcriptText ||
    extractStoredTranscriptText(currentRow?.transcript)
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
    transcriptText,
    insights: normalizeMeetingInsightsState(payload.insights ?? currentMetadata?.insights),
    followAlong: normalizeMeetingFollowAlongState(payload.followAlong ?? currentMetadata?.followAlong),
    recording: normalizeMeetingRecordingState(payload.recording ?? currentMetadata?.recording, payload.cosShouldRecord ?? currentMetadata?.cosShouldRecord ?? false),
    joinRequests: normalizeJoinRequests(payload.joinRequests ?? currentMetadata?.joinRequests),
    connectedParticipants: normalizeConnectedParticipants(payload.connectedParticipants ?? currentMetadata?.connectedParticipants),
    sessionRecord: normalizeSessionRecord(payload.sessionRecord ?? currentMetadata?.sessionRecord),
  }

  return {
    ...baseMetadata,
    insights: syncMeetingInsightsState({
      currentState: baseMetadata.insights,
      cosShouldExtract: baseMetadata.cosShouldExtract,
      transcriptText: baseMetadata.transcriptText,
    }),
    followAlong: syncMeetingFollowAlongState({
      currentState: baseMetadata.followAlong,
      cosShouldAttend: baseMetadata.cosShouldAttend,
      hasContent: hasFollowAlongContent(baseMetadata.followAlong.result),
      isFinished: mapDatabaseStatusToMeetingStatus(currentRow?.status ?? payload.status ?? "scheduled") === "finished",
    }),
    recording: syncMeetingRecordingState({
      currentState: baseMetadata.recording,
      enabled: baseMetadata.cosShouldRecord,
    }),
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
  const publicRoomSlug = metadata.meetingType === "video" ? buildPublicRoomSlug(meeting.id) : ""

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
    publicRoomSlug,
    publicRoomLink: publicRoomSlug ? `/meet/${publicRoomSlug}` : "",
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
    transcriptionTextAvailable: Boolean(metadata.transcriptText.trim()),
    insights: metadata.insights,
    followAlong: metadata.followAlong,
    recording: metadata.recording,
    joinRequests: metadata.joinRequests.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt)),
    connectedParticipants: metadata.connectedParticipants.sort((a, b) => b.connectedAt.localeCompare(a.connectedAt)),
    sessionRecord: metadata.sessionRecord,
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

async function findPublicMeetingBySlug(adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, slug: string) {
  const { data, error } = await adminClient
    .from("meetings")
    .select("id, workspace_id, title, audio_url, transcript, summary, decisions, next_steps, status, created_by, created_at")
    .neq("status", "archived")
    .returns<MeetingRow[]>()

  if (error) {
    return { error: error.message } as const
  }

  const matchedMeeting = (data ?? []).find((meeting) => buildPublicRoomSlug(meeting.id) === slug)
  if (!matchedMeeting) {
    return { error: "Sala publica nao encontrada." } as const
  }

  return { meeting: matchedMeeting } as const
}

function buildMeetingTranscriptUpdate(metadata: MeetingMetadata, history?: MeetingHistoryEntry[]) {
  return {
    transcript: serializeMeetingMetadata({
      ...metadata,
      history: history ?? metadata.history,
    }),
  }
}

function mapEgressStatusToRecordingStatus(status: EgressStatus): MeetingRecordingStatus {
  if (status === EgressStatus.EGRESS_STARTING) return "preparing"
  if (status === EgressStatus.EGRESS_ACTIVE) return "recording"
  if (status === EgressStatus.EGRESS_ENDING) return "finalizing"
  if (status === EgressStatus.EGRESS_COMPLETE) return "available"
  if (status === EgressStatus.EGRESS_FAILED) return "failed"
  if (status === EgressStatus.EGRESS_ABORTED) return "failed"
  return "processing"
}

function buildRecordingStateFromEgressInfo({
  currentState,
  egressInfo,
}: {
  currentState: MeetingRecordingState
  egressInfo: {
    egressId: string
    status: EgressStatus
    startedAt: bigint
    endedAt: bigint
    updatedAt: bigint
    error: string
    fileResults: Array<{
      filename: string
      location: string
      startedAt: bigint
      endedAt: bigint
      duration: bigint
      size: bigint
    }>
  }
}): MeetingRecordingState {
  const fileResult = egressInfo.fileResults[0]
  const storagePath = fileResult?.filename?.trim() || currentState.storagePath
  const startedAt = bigintToIsoString(fileResult?.startedAt ?? egressInfo.startedAt) ?? currentState.startedAt
  const endedAt = bigintToIsoString(fileResult?.endedAt ?? egressInfo.endedAt) ?? currentState.endedAt
  const durationSeconds = bigintToSeconds(fileResult?.duration ?? BigInt(0)) ?? currentState.durationSeconds
  const sizeBytes = bigintToNumber(fileResult?.size ?? BigInt(0)) ?? currentState.sizeBytes
  const fileName = storagePath ? storagePath.split("/").pop() ?? currentState.fileName : currentState.fileName

  return {
    ...currentState,
    enabled: true,
    egressId: egressInfo.egressId || currentState.egressId,
    status: mapEgressStatusToRecordingStatus(egressInfo.status),
    storagePath,
    mimeType: "video/mp4",
    fileName,
    startedAt,
    endedAt,
    durationSeconds,
    sizeBytes,
    updatedAt: bigintToIsoString(egressInfo.updatedAt) ?? new Date().toISOString(),
    error: egressInfo.error?.trim() || null,
  }
}

async function syncMeetingRecordingStateFromEgress({
  actor,
  meeting,
}: {
  actor: MeetingActor
  meeting: MeetingRow
}) {
  const hydratedMeeting = hydrateMeeting(meeting)
  const metadata = buildMeetingMetadata({}, meeting)
  const currentRecording = metadata.recording

  if (!hydratedMeeting.cosShouldRecord || !currentRecording.egressId) {
    return {
      meeting,
      hydratedMeeting,
      metadata,
      changed: false,
    }
  }

  try {
    const egressClient = createLiveKitEgressClient()
    const results = await egressClient.listEgress({ egressId: currentRecording.egressId })
    const egressInfo = results[0]

    if (!egressInfo) {
      if (currentRecording.status === "available" || currentRecording.status === "failed") {
        return { meeting, hydratedMeeting, metadata, changed: false }
      }

      const nextMetadata = buildMeetingMetadata(
        {
          title: hydratedMeeting.title,
          scheduledAt: hydratedMeeting.scheduledAt ?? undefined,
          participants: hydratedMeeting.participants,
          meetingType: hydratedMeeting.meetingType,
          meetingLink: hydratedMeeting.meetingLink,
          meetingLocation: hydratedMeeting.meetingLocation,
          description: hydratedMeeting.description,
          cosShouldAttend: hydratedMeeting.cosShouldAttend,
          cosShouldRecord: hydratedMeeting.cosShouldRecord,
          cosShouldExtract: hydratedMeeting.cosShouldExtract,
          cosShouldReport: hydratedMeeting.cosShouldReport,
          analysisSections: hydratedMeeting.analysisSections,
          attachments: hydratedMeeting.attachments,
          timeline: hydratedMeeting.timeline,
          transcriptionState: hydratedMeeting.transcriptionState,
          followAlong: hydratedMeeting.followAlong,
          insights: hydratedMeeting.insights,
          joinRequests: hydratedMeeting.joinRequests,
          connectedParticipants: hydratedMeeting.connectedParticipants,
          sessionRecord: hydratedMeeting.sessionRecord,
          recording: {
            ...currentRecording,
            status: currentRecording.storagePath ? "available" : "processing",
            updatedAt: new Date().toISOString(),
          },
        },
        meeting,
      )

      await actor.adminClient.from("meetings").update(buildMeetingTranscriptUpdate(nextMetadata)).eq("id", meeting.id)
      const refreshed = await resolveMeetingForActor(actor, meeting.id)
      if ("error" in refreshed) {
        return { meeting, hydratedMeeting, metadata, changed: false }
      }

      return {
        meeting: refreshed.meeting,
        hydratedMeeting: hydrateMeeting(refreshed.meeting),
        metadata: buildMeetingMetadata({}, refreshed.meeting),
        changed: true,
      }
    }

    const nextRecording = buildRecordingStateFromEgressInfo({
      currentState: currentRecording,
      egressInfo,
    })

    const didChange =
      JSON.stringify(currentRecording) !== JSON.stringify(nextRecording)

    if (!didChange) {
      return {
        meeting,
        hydratedMeeting,
        metadata,
        changed: false,
      }
    }

    const nextMetadata = buildMeetingMetadata(
      {
        title: hydratedMeeting.title,
        scheduledAt: hydratedMeeting.scheduledAt ?? undefined,
        participants: hydratedMeeting.participants,
        meetingType: hydratedMeeting.meetingType,
        meetingLink: hydratedMeeting.meetingLink,
        meetingLocation: hydratedMeeting.meetingLocation,
        description: hydratedMeeting.description,
        cosShouldAttend: hydratedMeeting.cosShouldAttend,
        cosShouldRecord: hydratedMeeting.cosShouldRecord,
        cosShouldExtract: hydratedMeeting.cosShouldExtract,
        cosShouldReport: hydratedMeeting.cosShouldReport,
        analysisSections: hydratedMeeting.analysisSections,
        attachments: hydratedMeeting.attachments,
        timeline: hydratedMeeting.timeline,
        transcriptionState: hydratedMeeting.transcriptionState,
        followAlong: hydratedMeeting.followAlong,
        insights: hydratedMeeting.insights,
        joinRequests: hydratedMeeting.joinRequests,
        connectedParticipants: hydratedMeeting.connectedParticipants,
        sessionRecord: hydratedMeeting.sessionRecord,
        recording: nextRecording,
      },
      meeting,
    )

    await actor.adminClient.from("meetings").update(buildMeetingTranscriptUpdate(nextMetadata)).eq("id", meeting.id)
    const refreshed = await resolveMeetingForActor(actor, meeting.id)
    if ("error" in refreshed) {
      return { meeting, hydratedMeeting, metadata, changed: false }
    }

    return {
      meeting: refreshed.meeting,
      hydratedMeeting: hydrateMeeting(refreshed.meeting),
      metadata: buildMeetingMetadata({}, refreshed.meeting),
      changed: true,
    }
  } catch (error) {
    const failedMetadata = buildMeetingMetadata(
      {
        title: hydratedMeeting.title,
        scheduledAt: hydratedMeeting.scheduledAt ?? undefined,
        participants: hydratedMeeting.participants,
        meetingType: hydratedMeeting.meetingType,
        meetingLink: hydratedMeeting.meetingLink,
        meetingLocation: hydratedMeeting.meetingLocation,
        description: hydratedMeeting.description,
        cosShouldAttend: hydratedMeeting.cosShouldAttend,
        cosShouldRecord: hydratedMeeting.cosShouldRecord,
        cosShouldExtract: hydratedMeeting.cosShouldExtract,
        cosShouldReport: hydratedMeeting.cosShouldReport,
        analysisSections: hydratedMeeting.analysisSections,
        attachments: hydratedMeeting.attachments,
        timeline: hydratedMeeting.timeline,
        transcriptionState: hydratedMeeting.transcriptionState,
        followAlong: hydratedMeeting.followAlong,
        insights: hydratedMeeting.insights,
        joinRequests: hydratedMeeting.joinRequests,
        connectedParticipants: hydratedMeeting.connectedParticipants,
        sessionRecord: hydratedMeeting.sessionRecord,
        recording: {
          ...currentRecording,
          status: "failed",
          updatedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : "Nao foi possivel consultar a gravacao agora.",
        },
      },
      meeting,
    )

    await actor.adminClient.from("meetings").update(buildMeetingTranscriptUpdate(failedMetadata)).eq("id", meeting.id)

    const refreshed = await resolveMeetingForActor(actor, meeting.id)
    if ("error" in refreshed) {
      return {
        meeting,
        hydratedMeeting,
        metadata,
        changed: false,
      }
    }

    return {
      meeting: refreshed.meeting,
      hydratedMeeting: hydrateMeeting(refreshed.meeting),
      metadata: buildMeetingMetadata({}, refreshed.meeting),
      changed: true,
    }
  }
}

function buildMeetingInsightsPrompt({
  title,
  description,
  participants,
  transcriptText,
}: {
  title: string
  description: string
  participants: string[]
  transcriptText: string
}) {
  return [
    "Analise a transcricao de uma reuniao do COS Meet e gere somente JSON valido.",
    "Nao use markdown.",
    "Campos obrigatorios: executiveSummary, mainTopics, decisions, tasks, responsibles, risks, openQuestions, nextSteps.",
    "tasks deve ser um array de objetos com text, responsible e deadline.",
    "responsibles deve ser um array de objetos com name, context e deadline.",
    "Quando nao houver um responsavel ou prazo claro, retorne null nesses campos.",
    `Titulo da reuniao: ${title}`,
    description ? `Descricao: ${description}` : "",
    participants.length > 0 ? `Participantes informados: ${participants.join(", ")}` : "",
    `Transcricao:\n${transcriptText.slice(0, meetTranscriptPromptLimit)}`,
  ]
    .filter(Boolean)
    .join("\n")
}

function buildMeetingFollowAlongPrompt({
  title,
  description,
  participants,
  transcriptText,
}: {
  title: string
  description: string
  participants: string[]
  transcriptText: string
}) {
  return [
    "Analise somente o conteudo textual parcial de uma reuniao em andamento do COS Meet e gere apenas JSON valido.",
    "Nao use markdown.",
    "Nao invente informacoes ausentes no texto.",
    "Retorne apenas itens realmente novos e claramente sustentados pelo conteudo recebido.",
    "Campos obrigatorios: decisions, tasks, responsibles, deadlines, risks, openQuestions, nextSteps.",
    "tasks deve ser um array de objetos com text, responsible e deadline.",
    "responsibles deve ser um array de objetos com name, context e deadline.",
    `Titulo da reuniao: ${title}`,
    description ? `Descricao: ${description}` : "",
    participants.length > 0 ? `Participantes informados: ${participants.join(", ")}` : "",
    `Conteudo textual parcial da reuniao:\n${transcriptText.slice(0, meetTranscriptPromptLimit)}`,
  ]
    .filter(Boolean)
    .join("\n")
}

async function extractMeetingInsightsWithOpenAi({
  title,
  description,
  participants,
  transcriptText,
}: {
  title: string
  description: string
  participants: string[]
  transcriptText: string
}) {
  if (!process.env.OPENAI_API_KEY) {
    return { error: "OPENAI_API_KEY nao configurada. O COS Meet nao consegue extrair os insights agora." }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), meetInsightsTimeoutMs)

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: meetInsightsModel,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: "Voce trabalha no COS Meet. Responda somente JSON valido, sem markdown e sem texto adicional.",
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: buildMeetingInsightsPrompt({
                  title,
                  description,
                  participants,
                  transcriptText,
                }),
              },
            ],
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

      return { error: `Nao foi possivel concluir a extracao dos insights. ${providerMessage}` }
    }

    const outputText = tryReadOutputText(payload)
    if (!outputText) {
      return { error: "A OpenAI nao retornou um conteudo valido para os insights da reuniao." }
    }

    const parsed = parseJsonObject<MeetingInsightsResult>(outputText)
    const normalized = normalizeMeetingInsightsResult(parsed)

    if (!normalized) {
      return { error: "A OpenAI retornou um formato invalido para os insights da reuniao." }
    }

    return { result: normalized }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { error: "A extracao dos insights demorou demais. Tente novamente." }
    }

    return { error: error instanceof Error ? error.message : "Falha desconhecida ao extrair os insights da reuniao." }
  } finally {
    clearTimeout(timeout)
  }
}

async function extractMeetingFollowAlongWithOpenAi({
  title,
  description,
  participants,
  transcriptText,
}: {
  title: string
  description: string
  participants: string[]
  transcriptText: string
}) {
  if (!process.env.OPENAI_API_KEY) {
    return { error: "OPENAI_API_KEY nao configurada. O COS Meet nao consegue acompanhar esta reuniao agora." }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), meetInsightsTimeoutMs)

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: meetInsightsModel,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: "Voce trabalha no COS Meet. Responda somente JSON valido, sem markdown e sem texto adicional.",
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: buildMeetingFollowAlongPrompt({
                  title,
                  description,
                  participants,
                  transcriptText,
                }),
              },
            ],
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
          : null

      return {
        error: providerMessage || "Nao foi possivel acompanhar a reuniao com a OpenAI agora.",
      }
    }

    const outputText = tryReadOutputText(payload)
    if (!outputText) {
      return { error: "A OpenAI nao retornou um conteudo valido para o acompanhamento desta reuniao." }
    }

    const parsed = parseJsonObject<MeetingFollowAlongResult>(outputText)
    const result = normalizeMeetingFollowAlongResult(parsed)

    if (!result) {
      return { error: "A OpenAI retornou um formato invalido para o acompanhamento desta reuniao." }
    }

    return { result }
  } catch (error) {
    return {
      error:
        error instanceof Error && error.name === "AbortError"
          ? "O acompanhamento excedeu o tempo limite do provedor."
          : error instanceof Error
            ? error.message
            : "Nao foi possivel acompanhar esta reuniao agora.",
    }
  } finally {
    clearTimeout(timeout)
  }
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

  const synced = await syncMeetingRecordingStateFromEgress({
    actor,
    meeting: resolved.meeting,
  })

  return {
    success: true,
    meeting: synced.hydratedMeeting,
    canManage: actor.canManage || actor.isMaster,
  }
}

export async function startMeetingRecordingAction({ meetingId }: { meetingId: string }) {
  const actor = await getMeetingActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage && !actor.isMaster) {
    return { error: "Apenas owner, admin ou master podem iniciar a gravacao da reuniao." }
  }

  const resolved = await resolveMeetingForActor(actor, meetingId)
  if ("error" in resolved) {
    return { error: resolved.error }
  }

  const hydratedMeeting = hydrateMeeting(resolved.meeting)
  const currentMetadata = buildMeetingMetadata({}, resolved.meeting)
  const currentRecording = currentMetadata.recording

  if (!hydratedMeeting.cosShouldRecord) {
    return { error: "A gravacao desta reuniao nao foi habilitada nas preferencias." }
  }

  const synced = await syncMeetingRecordingStateFromEgress({
    actor,
    meeting: resolved.meeting,
  })

  const effectiveMeeting = synced.hydratedMeeting
  const effectiveMetadata = synced.metadata
  const effectiveRecording = effectiveMetadata.recording

  if (
    effectiveRecording.status === "preparing" ||
    effectiveRecording.status === "recording" ||
    effectiveRecording.status === "finalizing" ||
    effectiveRecording.status === "processing" ||
    effectiveRecording.status === "available"
  ) {
    return {
      success: true,
      reused: true,
      meeting: effectiveMeeting,
    }
  }

  let recordingConfig: ReturnType<typeof requireMeetingRecordingStorageEnv>
  try {
    recordingConfig = requireMeetingRecordingStorageEnv()
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Gravacao server-side nao configurada.",
    }
  }

  const recordingId = effectiveRecording.recordingId ?? createId("recording")
  const fileName = buildRecordingFileName(hydratedMeeting.title, hydratedMeeting.scheduledAt ?? new Date().toISOString())
  const storagePath = `${actor.workspaceId}/${hydratedMeeting.id}/${recordingId}/${fileName}`

  try {
    const egressClient = createLiveKitEgressClient()
    const output = new EncodedFileOutput({
      filepath: storagePath,
      fileType: EncodedFileType.MP4,
      output: {
        case: "s3",
        value: new S3Upload({
          accessKey: recordingConfig.accessKey,
          secret: recordingConfig.secret,
          bucket: recordingConfig.bucket,
          region: recordingConfig.region,
          endpoint: recordingConfig.endpoint,
          forcePathStyle: true,
          contentDisposition: `attachment; filename="${fileName}"`,
        }),
      },
    })

    const egressInfo = await egressClient.startRoomCompositeEgress(buildLiveKitRoomName(hydratedMeeting.id), {
      file: output,
    })

    const nextRecording = buildRecordingStateFromEgressInfo({
      currentState: {
        ...currentRecording,
        enabled: true,
        recordingId,
        storagePath,
        fileName,
        mimeType: "video/mp4",
      },
      egressInfo,
    })

    const metadata = buildMeetingMetadata(
      {
        title: hydratedMeeting.title,
        scheduledAt: hydratedMeeting.scheduledAt ?? undefined,
        participants: hydratedMeeting.participants,
        meetingType: hydratedMeeting.meetingType,
        meetingLink: hydratedMeeting.meetingLink,
        meetingLocation: hydratedMeeting.meetingLocation,
        description: hydratedMeeting.description,
        cosShouldAttend: hydratedMeeting.cosShouldAttend,
        cosShouldRecord: hydratedMeeting.cosShouldRecord,
        cosShouldExtract: hydratedMeeting.cosShouldExtract,
        cosShouldReport: hydratedMeeting.cosShouldReport,
        analysisSections: hydratedMeeting.analysisSections,
        attachments: hydratedMeeting.attachments,
        timeline: [
          ...hydratedMeeting.timeline,
          createTimelineEvent("meeting_recording_started", "Gravacao da reuniao iniciada"),
        ],
        transcriptionState: hydratedMeeting.transcriptionState,
        followAlong: hydratedMeeting.followAlong,
        insights: hydratedMeeting.insights,
        joinRequests: hydratedMeeting.joinRequests,
        connectedParticipants: hydratedMeeting.connectedParticipants,
        sessionRecord: hydratedMeeting.sessionRecord,
        recording: nextRecording,
      },
      synced.meeting,
    )

    const history = [
      ...metadata.history,
      createHistoryEntry("meeting_recording_started", "Gravacao server-side iniciada para esta reuniao."),
    ]

    const { error } = await actor.adminClient
      .from("meetings")
      .update(buildMeetingTranscriptUpdate(metadata, history))
      .eq("id", meetingId)

    if (error) {
      return { error: error.message }
    }

    const refreshed = await resolveMeetingForActor(actor, meetingId)
    if ("error" in refreshed) {
      return { error: refreshed.error }
    }

    return {
      success: true,
      reused: false,
      meeting: hydrateMeeting(refreshed.meeting),
    }
  } catch (error) {
    const failedMetadata = buildMeetingMetadata(
      {
        title: hydratedMeeting.title,
        scheduledAt: hydratedMeeting.scheduledAt ?? undefined,
        participants: hydratedMeeting.participants,
        meetingType: hydratedMeeting.meetingType,
        meetingLink: hydratedMeeting.meetingLink,
        meetingLocation: hydratedMeeting.meetingLocation,
        description: hydratedMeeting.description,
        cosShouldAttend: hydratedMeeting.cosShouldAttend,
        cosShouldRecord: hydratedMeeting.cosShouldRecord,
        cosShouldExtract: hydratedMeeting.cosShouldExtract,
        cosShouldReport: hydratedMeeting.cosShouldReport,
        analysisSections: hydratedMeeting.analysisSections,
        attachments: hydratedMeeting.attachments,
        timeline: hydratedMeeting.timeline,
        transcriptionState: hydratedMeeting.transcriptionState,
        followAlong: hydratedMeeting.followAlong,
        insights: hydratedMeeting.insights,
        joinRequests: hydratedMeeting.joinRequests,
        connectedParticipants: hydratedMeeting.connectedParticipants,
        sessionRecord: hydratedMeeting.sessionRecord,
        recording: {
          ...currentRecording,
          enabled: true,
          recordingId,
          storagePath,
          fileName,
          mimeType: "video/mp4",
          status: "failed",
          updatedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : "Nao foi possivel iniciar a gravacao da reuniao.",
        },
      },
      synced.meeting,
    )

    await actor.adminClient.from("meetings").update(buildMeetingTranscriptUpdate(failedMetadata)).eq("id", meetingId)

    return {
      error: error instanceof Error ? error.message : "Nao foi possivel iniciar a gravacao da reuniao.",
    }
  }
}

export async function refreshMeetingRecordingStatusAction({ meetingId }: { meetingId: string }) {
  const actor = await getMeetingActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const resolved = await resolveMeetingForActor(actor, meetingId)
  if ("error" in resolved) {
    return { error: resolved.error }
  }

  const synced = await syncMeetingRecordingStateFromEgress({
    actor,
    meeting: resolved.meeting,
  })

  return {
    success: true,
    meeting: synced.hydratedMeeting,
  }
}

export async function getMeetingRecordingSignedUrlAction({
  meetingId,
  download = false,
}: {
  meetingId: string
  download?: boolean
}) {
  const actor = await getMeetingActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const resolved = await resolveMeetingForActor(actor, meetingId)
  if ("error" in resolved) {
    return { error: resolved.error }
  }

  const synced = await syncMeetingRecordingStateFromEgress({
    actor,
    meeting: resolved.meeting,
  })

  const recording = synced.metadata.recording
  if (recording.status !== "available" || !recording.storagePath) {
    return { error: "A gravacao desta reuniao ainda nao esta disponivel." }
  }

  const bucket = process.env.SUPABASE_MEETING_RECORDINGS_BUCKET?.trim() || "meeting-recordings"
  const fileName = recording.fileName || buildRecordingFileName(synced.hydratedMeeting.title, recording.startedAt)
  const { data, error } = await actor.adminClient.storage
    .from(bucket)
    .createSignedUrl(recording.storagePath, 600, download ? { download: fileName } : undefined)

  if (error || !data?.signedUrl) {
    return { error: error?.message ?? "Nao foi possivel gerar o acesso temporario da gravacao." }
  }

  return {
    success: true,
    url: data.signedUrl,
    expiresInSeconds: 600,
  }
}

export async function processMeetingFollowAlongAction({
  meetingId,
  messages,
}: {
  meetingId: string
  messages: string[]
}) {
  const actor = await getMeetingActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const resolved = await resolveMeetingForActor(actor, meetingId)
  if ("error" in resolved) {
    return { error: resolved.error }
  }

  const hydratedMeeting = hydrateMeeting(resolved.meeting)
  const currentMetadata = buildMeetingMetadata({}, resolved.meeting)

  if (!hydratedMeeting.cosShouldAttend) {
    return { error: "O acompanhamento inteligente nao esta ativo nesta reuniao." }
  }

  const normalizedMessages = Array.isArray(messages)
    ? messages.map((message) => message.trim()).filter(Boolean).slice(-80)
    : []
  const transcriptText = normalizedMessages.join("\n")
  const sourceHash = transcriptText ? createHash("sha256").update(transcriptText).digest("hex") : null
  const currentFollowAlong = normalizeMeetingFollowAlongState(currentMetadata.followAlong)
  const isFinished = hydratedMeeting.status === "finished"

  if (!transcriptText) {
    const emptyState = syncMeetingFollowAlongState({
      currentState: createEmptyFollowAlongState(isFinished ? "finished" : "awaiting_content"),
      cosShouldAttend: true,
      hasContent: false,
      isFinished,
    })

    if (
      currentFollowAlong.status === emptyState.status &&
      currentFollowAlong.lastMessageCount === 0 &&
      !currentFollowAlong.result &&
      !currentFollowAlong.error
    ) {
      return {
        success: true,
        reused: true,
        meeting: hydratedMeeting,
      }
    }

    const metadata = buildMeetingMetadata(
      {
        title: hydratedMeeting.title,
        scheduledAt: hydratedMeeting.scheduledAt ?? undefined,
        participants: hydratedMeeting.participants,
        meetingType: hydratedMeeting.meetingType,
        meetingLink: hydratedMeeting.meetingLink,
        meetingLocation: hydratedMeeting.meetingLocation,
        description: hydratedMeeting.description,
        cosShouldAttend: hydratedMeeting.cosShouldAttend,
        cosShouldRecord: hydratedMeeting.cosShouldRecord,
        cosShouldExtract: hydratedMeeting.cosShouldExtract,
        cosShouldReport: hydratedMeeting.cosShouldReport,
        analysisSections: hydratedMeeting.analysisSections,
        attachments: hydratedMeeting.attachments,
        timeline: hydratedMeeting.timeline,
        transcriptionState: hydratedMeeting.transcriptionState,
        joinRequests: hydratedMeeting.joinRequests,
        connectedParticipants: hydratedMeeting.connectedParticipants,
        sessionRecord: hydratedMeeting.sessionRecord,
        followAlong: emptyState,
      },
      resolved.meeting,
    )

    const { error } = await actor.adminClient
      .from("meetings")
      .update(buildMeetingTranscriptUpdate(metadata))
      .eq("id", meetingId)

    if (error) {
      return { error: error.message }
    }

    const refreshed = await resolveMeetingForActor(actor, meetingId)
    if ("error" in refreshed) {
      return { error: refreshed.error }
    }

    return {
      success: true,
      reused: false,
      meeting: hydrateMeeting(refreshed.meeting),
    }
  }

  if (
    currentFollowAlong.sourceHash === sourceHash &&
    currentFollowAlong.lastMessageCount === normalizedMessages.length &&
    currentFollowAlong.result
  ) {
    return {
      success: true,
      reused: true,
      meeting: hydratedMeeting,
    }
  }

  const processingMetadata = buildMeetingMetadata(
    {
      title: hydratedMeeting.title,
      scheduledAt: hydratedMeeting.scheduledAt ?? undefined,
      participants: hydratedMeeting.participants,
      meetingType: hydratedMeeting.meetingType,
      meetingLink: hydratedMeeting.meetingLink,
      meetingLocation: hydratedMeeting.meetingLocation,
      description: hydratedMeeting.description,
      cosShouldAttend: hydratedMeeting.cosShouldAttend,
      cosShouldRecord: hydratedMeeting.cosShouldRecord,
      cosShouldExtract: hydratedMeeting.cosShouldExtract,
      cosShouldReport: hydratedMeeting.cosShouldReport,
      analysisSections: hydratedMeeting.analysisSections,
      attachments: hydratedMeeting.attachments,
      timeline: hydratedMeeting.timeline,
      transcriptionState: hydratedMeeting.transcriptionState,
      joinRequests: hydratedMeeting.joinRequests,
      connectedParticipants: hydratedMeeting.connectedParticipants,
      sessionRecord: hydratedMeeting.sessionRecord,
      followAlong: {
        ...currentFollowAlong,
        status: isFinished ? "finished" : "active",
        error: null,
      },
    },
    resolved.meeting,
  )

  const { error: processingError } = await actor.adminClient
    .from("meetings")
    .update(buildMeetingTranscriptUpdate(processingMetadata))
    .eq("id", meetingId)

  if (processingError) {
    return { error: processingError.message }
  }

  const extracted = await extractMeetingFollowAlongWithOpenAi({
    title: hydratedMeeting.title,
    description: hydratedMeeting.description,
    participants: hydratedMeeting.participants,
    transcriptText,
  })

  if (extracted.error) {
    const failedMetadata = buildMeetingMetadata(
      {
        title: hydratedMeeting.title,
        scheduledAt: hydratedMeeting.scheduledAt ?? undefined,
        participants: hydratedMeeting.participants,
        meetingType: hydratedMeeting.meetingType,
        meetingLink: hydratedMeeting.meetingLink,
        meetingLocation: hydratedMeeting.meetingLocation,
        description: hydratedMeeting.description,
        cosShouldAttend: hydratedMeeting.cosShouldAttend,
        cosShouldRecord: hydratedMeeting.cosShouldRecord,
        cosShouldExtract: hydratedMeeting.cosShouldExtract,
        cosShouldReport: hydratedMeeting.cosShouldReport,
        analysisSections: hydratedMeeting.analysisSections,
        attachments: hydratedMeeting.attachments,
        timeline: hydratedMeeting.timeline,
        transcriptionState: hydratedMeeting.transcriptionState,
        joinRequests: hydratedMeeting.joinRequests,
        connectedParticipants: hydratedMeeting.connectedParticipants,
        sessionRecord: hydratedMeeting.sessionRecord,
        followAlong: {
          ...currentFollowAlong,
          status: "error",
          error: extracted.error,
          sourceHash,
          lastMessageCount: normalizedMessages.length,
        },
      },
      resolved.meeting,
    )

    await actor.adminClient.from("meetings").update(buildMeetingTranscriptUpdate(failedMetadata)).eq("id", meetingId)

    return { error: extracted.error }
  }

  const mergedResult = mergeMeetingFollowAlongResult(currentFollowAlong.result, extracted.result ?? null)
  const nextStatus: MeetingFollowAlongStatus = isFinished ? "finished" : "paused"
  const completedMetadata = buildMeetingMetadata(
    {
      title: hydratedMeeting.title,
      scheduledAt: hydratedMeeting.scheduledAt ?? undefined,
      participants: hydratedMeeting.participants,
      meetingType: hydratedMeeting.meetingType,
      meetingLink: hydratedMeeting.meetingLink,
      meetingLocation: hydratedMeeting.meetingLocation,
      description: hydratedMeeting.description,
      cosShouldAttend: hydratedMeeting.cosShouldAttend,
      cosShouldRecord: hydratedMeeting.cosShouldRecord,
      cosShouldExtract: hydratedMeeting.cosShouldExtract,
      cosShouldReport: hydratedMeeting.cosShouldReport,
      analysisSections: hydratedMeeting.analysisSections,
      attachments: hydratedMeeting.attachments,
      timeline: hydratedMeeting.timeline,
      transcriptionState: hydratedMeeting.transcriptionState,
      joinRequests: hydratedMeeting.joinRequests,
      connectedParticipants: hydratedMeeting.connectedParticipants,
      sessionRecord: hydratedMeeting.sessionRecord,
      followAlong: {
        status: nextStatus,
        processedAt: new Date().toISOString(),
        error: null,
        sourceHash,
        lastMessageCount: normalizedMessages.length,
        result: mergedResult,
      },
    },
    resolved.meeting,
  )

  const { error: completedError } = await actor.adminClient
    .from("meetings")
    .update(buildMeetingTranscriptUpdate(completedMetadata))
    .eq("id", meetingId)

  if (completedError) {
    return { error: completedError.message }
  }

  const refreshed = await resolveMeetingForActor(actor, meetingId)
  if ("error" in refreshed) {
    return { error: refreshed.error }
  }

  return {
    success: true,
    reused: false,
    meeting: hydrateMeeting(refreshed.meeting),
  }
}

export async function processMeetingInsightsAction({
  meetingId,
  force = false,
}: {
  meetingId: string
  force?: boolean
}) {
  const actor = await getMeetingActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage && !actor.isMaster) {
    return { error: "Apenas owner, admin ou master podem processar os insights da reuniao." }
  }

  const resolved = await resolveMeetingForActor(actor, meetingId)
  if ("error" in resolved) {
    return { error: resolved.error }
  }

  const hydratedMeeting = hydrateMeeting(resolved.meeting)
  const currentMetadata = buildMeetingMetadata({}, resolved.meeting)
  const transcriptText = currentMetadata.transcriptText.trim()
  const transcriptHash = transcriptText ? createHash("sha256").update(transcriptText).digest("hex") : null
  const currentInsights = currentMetadata.insights

  if (!hydratedMeeting.cosShouldExtract) {
    return { error: "A extracao de informacoes importantes esta desativada nas preferencias desta reuniao." }
  }

  if (!transcriptText) {
    return { error: "A extracao depende de uma transcricao disponivel para esta reuniao." }
  }

  if (currentInsights.status === "processing") {
    return { error: "Os insights desta reuniao ja estao em processamento." }
  }

  if (!force && currentInsights.status === "completed" && currentInsights.result && currentInsights.transcriptHash === transcriptHash) {
    return {
      success: true,
      reused: true,
      meeting: hydratedMeeting,
    }
  }

  const processingAt = new Date().toISOString()
  const processingMetadata = buildMeetingMetadata(
    {
      title: hydratedMeeting.title,
      scheduledAt: hydratedMeeting.scheduledAt ?? undefined,
      participants: hydratedMeeting.participants,
      meetingType: hydratedMeeting.meetingType,
      meetingLink: hydratedMeeting.meetingLink,
      meetingLocation: hydratedMeeting.meetingLocation,
      description: hydratedMeeting.description,
      cosShouldAttend: hydratedMeeting.cosShouldAttend,
      cosShouldRecord: hydratedMeeting.cosShouldRecord,
      cosShouldExtract: hydratedMeeting.cosShouldExtract,
      cosShouldReport: hydratedMeeting.cosShouldReport,
      analysisSections: hydratedMeeting.analysisSections,
      attachments: hydratedMeeting.attachments,
      timeline: hydratedMeeting.timeline,
      transcriptionState: hydratedMeeting.transcriptionState,
      joinRequests: hydratedMeeting.joinRequests,
      connectedParticipants: hydratedMeeting.connectedParticipants,
      sessionRecord: hydratedMeeting.sessionRecord,
      transcriptText,
      insights: {
        ...currentInsights,
        status: "processing",
        error: null,
        transcriptHash,
      },
    },
    resolved.meeting,
  )

  const processingHistory = [
    ...processingMetadata.history,
    createHistoryEntry("meeting_insights_processing", "Extracao de informacoes importantes iniciada.", processingAt),
  ]

  const { error: processingError } = await actor.adminClient
    .from("meetings")
    .update(buildMeetingTranscriptUpdate(processingMetadata, processingHistory))
    .eq("id", meetingId)

  if (processingError) {
    return { error: processingError.message }
  }

  const insightsResult = await extractMeetingInsightsWithOpenAi({
    title: hydratedMeeting.title,
    description: hydratedMeeting.description,
    participants: hydratedMeeting.participants,
    transcriptText,
  })

  if ("error" in insightsResult) {
    const failedAt = new Date().toISOString()
    const failedMetadata = buildMeetingMetadata(
      {
        title: hydratedMeeting.title,
        scheduledAt: hydratedMeeting.scheduledAt ?? undefined,
        participants: hydratedMeeting.participants,
        meetingType: hydratedMeeting.meetingType,
        meetingLink: hydratedMeeting.meetingLink,
        meetingLocation: hydratedMeeting.meetingLocation,
        description: hydratedMeeting.description,
        cosShouldAttend: hydratedMeeting.cosShouldAttend,
        cosShouldRecord: hydratedMeeting.cosShouldRecord,
        cosShouldExtract: hydratedMeeting.cosShouldExtract,
        cosShouldReport: hydratedMeeting.cosShouldReport,
        analysisSections: hydratedMeeting.analysisSections,
        attachments: hydratedMeeting.attachments,
        timeline: hydratedMeeting.timeline,
        transcriptionState: hydratedMeeting.transcriptionState,
        joinRequests: hydratedMeeting.joinRequests,
        connectedParticipants: hydratedMeeting.connectedParticipants,
        sessionRecord: hydratedMeeting.sessionRecord,
        transcriptText,
        insights: {
          ...currentInsights,
          status: "failed",
          processedAt: null,
          error: insightsResult.error ?? "Nao foi possivel concluir a extracao dos insights desta reuniao.",
          transcriptHash,
          result: null,
        },
      },
      resolved.meeting,
    )

    const failedHistory = [
      ...failedMetadata.history,
      createHistoryEntry("meeting_insights_failed", "A extracao de informacoes importantes falhou.", failedAt),
    ]

    await actor.adminClient
      .from("meetings")
      .update(buildMeetingTranscriptUpdate(failedMetadata, failedHistory))
      .eq("id", meetingId)

    return { error: insightsResult.error }
  }

  const completedAt = new Date().toISOString()
  const completedMetadata = buildMeetingMetadata(
    {
      title: hydratedMeeting.title,
      scheduledAt: hydratedMeeting.scheduledAt ?? undefined,
      participants: hydratedMeeting.participants,
      meetingType: hydratedMeeting.meetingType,
      meetingLink: hydratedMeeting.meetingLink,
      meetingLocation: hydratedMeeting.meetingLocation,
      description: hydratedMeeting.description,
      cosShouldAttend: hydratedMeeting.cosShouldAttend,
      cosShouldRecord: hydratedMeeting.cosShouldRecord,
      cosShouldExtract: hydratedMeeting.cosShouldExtract,
      cosShouldReport: hydratedMeeting.cosShouldReport,
      analysisSections: hydratedMeeting.analysisSections,
      attachments: hydratedMeeting.attachments,
      timeline: hydratedMeeting.timeline,
      transcriptionState: hydratedMeeting.transcriptionState,
      joinRequests: hydratedMeeting.joinRequests,
      connectedParticipants: hydratedMeeting.connectedParticipants,
      sessionRecord: hydratedMeeting.sessionRecord,
      transcriptText,
      insights: {
        status: "completed",
        processedAt: completedAt,
        error: null,
        transcriptHash,
        result: insightsResult.result,
      },
    },
    resolved.meeting,
  )

  const completedHistory = [
    ...completedMetadata.history,
    createHistoryEntry("meeting_insights_completed", "Insights da reuniao processados com sucesso.", completedAt),
  ]

  const { error: completedError } = await actor.adminClient
    .from("meetings")
    .update(buildMeetingTranscriptUpdate(completedMetadata, completedHistory))
    .eq("id", meetingId)

  if (completedError) {
    return { error: completedError.message }
  }

  const refreshed = await resolveMeetingForActor(actor, meetingId)
  if ("error" in refreshed) {
    return { error: refreshed.error }
  }

  return {
    success: true,
    reused: false,
    meeting: hydrateMeeting(refreshed.meeting),
  }
}

export async function getPublicMeetingBySlugAction({ slug }: { slug: string }) {
  if (!PUBLIC_ROOM_SLUG_PATTERN.test(slug)) {
    return { error: "Sala publica nao encontrada." }
  }

  const adminClient = createSupabaseAdminClient()
  if (!adminClient) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY nao configurada para reunioes." }
  }

  const resolved = await findPublicMeetingBySlug(adminClient, slug)
  if ("error" in resolved) {
    return { error: resolved.error }
  }

  const hydratedMeeting = hydrateMeeting(resolved.meeting)
  if (hydratedMeeting.meetingType !== "video") {
    return { error: "Sala publica nao encontrada." }
  }

  const actor = {
    actorId: "public",
    actorName: "Publico",
    workspaceId: resolved.meeting.workspace_id,
    canManage: false,
    isMaster: false,
    adminClient,
  } satisfies MeetingActor

  const synced = await syncMeetingRecordingStateFromEgress({
    actor,
    meeting: resolved.meeting,
  })

  return {
    success: true,
    meeting: synced.hydratedMeeting,
  }
}

export async function requestPublicMeetingEntryAction({
  slug,
  participantName,
}: {
  slug: string
  participantName: string
}) {
  const trimmedName = participantName.trim()
  if (!trimmedName) {
    return { error: "Informe o nome do participante." }
  }

  if (!PUBLIC_ROOM_SLUG_PATTERN.test(slug)) {
    return { error: "Sala publica nao encontrada." }
  }

  const adminClient = createSupabaseAdminClient()
  if (!adminClient) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY nao configurada para reunioes." }
  }

  const resolved = await findPublicMeetingBySlug(adminClient, slug)
  if ("error" in resolved) {
    return { error: resolved.error }
  }

  const matchedMeeting = resolved.meeting
  const hydratedMeeting = hydrateMeeting(matchedMeeting)
  const requestedAt = new Date().toISOString()
  const requestId = createId("join")
  const nextJoinRequests = [
    ...hydratedMeeting.joinRequests.filter((request) => request.status !== "denied"),
    {
      id: requestId,
      participantName: trimmedName,
      requestedAt,
      status: "waiting" as const,
    },
  ]

  const metadata = buildMeetingMetadata(
    {
      title: hydratedMeeting.title,
      scheduledAt: hydratedMeeting.scheduledAt ?? undefined,
      participants: hydratedMeeting.participants,
      meetingType: hydratedMeeting.meetingType,
      meetingLink: hydratedMeeting.meetingLink,
      meetingLocation: hydratedMeeting.meetingLocation,
      description: hydratedMeeting.description,
      cosShouldAttend: hydratedMeeting.cosShouldAttend,
      cosShouldRecord: hydratedMeeting.cosShouldRecord,
      cosShouldExtract: hydratedMeeting.cosShouldExtract,
      cosShouldReport: hydratedMeeting.cosShouldReport,
      analysisSections: hydratedMeeting.analysisSections,
      attachments: hydratedMeeting.attachments,
      timeline: [
        ...hydratedMeeting.timeline,
        createTimelineEvent("meeting_join_requested", `${trimmedName} solicitou entrada`, requestedAt),
      ],
      transcriptionState: hydratedMeeting.transcriptionState,
      joinRequests: nextJoinRequests,
      connectedParticipants: hydratedMeeting.connectedParticipants,
      historyAction: "meeting_join_requested",
      historyDescription: `${trimmedName} solicitou entrada na reuniao.`,
    },
    matchedMeeting,
  )

  const history = [...metadata.history, createHistoryEntry("meeting_join_requested", `${trimmedName} solicitou entrada na reuniao.`, requestedAt)]

  const { error: updateError } = await adminClient
    .from("meetings")
    .update(buildMeetingTranscriptUpdate(metadata, history))
    .eq("id", matchedMeeting.id)

  if (updateError) {
    return { error: updateError.message }
  }

  return {
    success: true,
    requestId,
  }
}

export async function decidePublicMeetingEntryAction({
  meetingId,
  requestId,
  decision,
}: {
  meetingId: string
  requestId: string
  decision: "approved" | "denied"
}) {
  const actor = await getMeetingActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage && !actor.isMaster) {
    return { error: "Apenas owner, admin ou master podem aprovar participantes." }
  }

  const resolved = await resolveMeetingForActor(actor, meetingId)
  if ("error" in resolved) {
    return { error: resolved.error }
  }

  const hydratedMeeting = hydrateMeeting(resolved.meeting)
  const targetRequest = hydratedMeeting.joinRequests.find((request) => request.id === requestId)

  if (!targetRequest) {
    return { error: "Solicitacao de entrada nao encontrada." }
  }

  const decidedAt = new Date().toISOString()
  const nextJoinRequests =
    decision === "approved"
      ? hydratedMeeting.joinRequests.map((request) =>
          request.id === requestId ? { ...request, status: "approved" as const } : request,
        )
      : hydratedMeeting.joinRequests.map((request) =>
          request.id === requestId ? { ...request, status: "denied" as const } : request,
        )

  const nextConnectedParticipants =
    decision === "approved"
      ? hydratedMeeting.connectedParticipants.filter((participant) => participant.requestId !== requestId)
      : hydratedMeeting.connectedParticipants.filter((participant) => participant.requestId !== requestId)

  const metadata = buildMeetingMetadata(
    {
      title: hydratedMeeting.title,
      scheduledAt: hydratedMeeting.scheduledAt ?? undefined,
      participants: hydratedMeeting.participants,
      meetingType: hydratedMeeting.meetingType,
      meetingLink: hydratedMeeting.meetingLink,
      meetingLocation: hydratedMeeting.meetingLocation,
      description: hydratedMeeting.description,
      cosShouldAttend: hydratedMeeting.cosShouldAttend,
      cosShouldRecord: hydratedMeeting.cosShouldRecord,
      cosShouldExtract: hydratedMeeting.cosShouldExtract,
      cosShouldReport: hydratedMeeting.cosShouldReport,
      analysisSections: hydratedMeeting.analysisSections,
      attachments: hydratedMeeting.attachments,
      timeline: [
        ...hydratedMeeting.timeline,
        createTimelineEvent(
          decision === "approved" ? "meeting_join_approved" : "meeting_join_denied",
          decision === "approved"
            ? `${targetRequest.participantName} entrou na reuniao`
            : `${targetRequest.participantName} teve a entrada negada`,
          decidedAt,
        ),
      ],
      transcriptionState: hydratedMeeting.transcriptionState,
      joinRequests: nextJoinRequests,
      connectedParticipants: nextConnectedParticipants,
    },
    resolved.meeting,
  )

  const description =
    decision === "approved"
      ? `${targetRequest.participantName} teve a entrada permitida.`
      : `${targetRequest.participantName} teve a entrada negada.`

  const history = [
    ...metadata.history,
    createHistoryEntry(decision === "approved" ? "meeting_join_approved" : "meeting_join_denied", description, decidedAt),
  ]

  const { error } = await actor.adminClient
    .from("meetings")
    .update(buildMeetingTranscriptUpdate(metadata, history))
    .eq("id", meetingId)

  if (error) {
    return { error: error.message }
  }

  await logMeetingActivity({
    adminClient: actor.adminClient,
    workspaceId: actor.workspaceId,
    userId: actor.actorId,
    action: decision === "approved" ? "meeting_join_approved" : "meeting_join_denied",
    description: description.toLowerCase(),
  })

  return { success: true }
}

export async function getMeetingLiveKitTokenAction({
  role,
  participantName,
  meetingId,
  slug,
  requestId,
}: {
  role: MeetingParticipantRole
  participantName: string
  meetingId?: string
  slug?: string
  requestId?: string
}) {
  const trimmedName = participantName.trim()
  if (!trimmedName) {
    return { error: "Informe o nome do participante." }
  }

  try {
    const liveKitUrl = getLiveKitUrl()

    if (role === "organizer") {
      if (!meetingId) {
        return { error: "Reuniao nao informada para o organizador." }
      }

      const actor = await getMeetingActor()
      if ("error" in actor) {
        return { error: actor.error }
      }

      const resolved = await resolveMeetingForActor(actor, meetingId)
      if ("error" in resolved) {
        return { error: resolved.error }
      }

      const hydratedMeeting = hydrateMeeting(resolved.meeting)
      if (hydratedMeeting.meetingType !== "video") {
        return { error: "Apenas reunioes por video usam a sala do COS Meet." }
      }

      const identity = `organizer:${actor.actorId}`
      const roomName = buildLiveKitRoomName(hydratedMeeting.id)
      const token = await createLiveKitToken({
        roomName,
        identity,
        participantName: trimmedName,
        role,
      })

      return {
        success: true,
        token,
        url: liveKitUrl,
        roomName,
        identity,
        meetingId: hydratedMeeting.id,
      }
    }

    if (!slug || !requestId) {
      return { error: "Solicitacao de entrada nao encontrada." }
    }

    if (!PUBLIC_ROOM_SLUG_PATTERN.test(slug)) {
      return { error: "Sala publica nao encontrada." }
    }

    const adminClient = createSupabaseAdminClient()
    if (!adminClient) {
      return { error: "SUPABASE_SERVICE_ROLE_KEY nao configurada para reunioes." }
    }

    const resolved = await findPublicMeetingBySlug(adminClient, slug)
    if ("error" in resolved) {
      return { error: resolved.error }
    }

    const hydratedMeeting = hydrateMeeting(resolved.meeting)
    if (hydratedMeeting.meetingType !== "video") {
      return { error: "Sala publica nao encontrada." }
    }

    const joinRequest = hydratedMeeting.joinRequests.find((item) => item.id === requestId)
    if (!joinRequest || joinRequest.status !== "approved") {
      return { error: "Sua entrada ainda nao foi aprovada pelo organizador." }
    }

    const identity = `guest:${requestId}`
    const roomName = buildLiveKitRoomName(hydratedMeeting.id)
    const token = await createLiveKitToken({
      roomName,
      identity,
      participantName: trimmedName,
      role,
    })

    return {
      success: true,
      token,
      url: liveKitUrl,
      roomName,
      identity,
      meetingId: hydratedMeeting.id,
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Nao foi possivel gerar o acesso da sala.",
    }
  }
}

export async function syncMeetingParticipantConnectionAction({
  role,
  status,
  identity,
  participantName,
  meetingId,
  slug,
  requestId,
}: {
  role: MeetingParticipantRole
  status: "connected" | "disconnected"
  identity: string
  participantName: string
  meetingId?: string
  slug?: string
  requestId?: string
}) {
  const trimmedName = participantName.trim()
  if (!trimmedName) {
    return { error: "Informe o nome do participante." }
  }

  let targetMeeting: MeetingRow | null = null
  let adminClient = createSupabaseAdminClient()

  if (role === "organizer") {
    const actor = await getMeetingActor()
    if ("error" in actor) {
      return { error: actor.error }
    }

    if (!meetingId) {
      return { error: "Reuniao nao informada para o organizador." }
    }

    const resolved = await resolveMeetingForActor(actor, meetingId)
    if ("error" in resolved) {
      return { error: resolved.error }
    }

    adminClient = actor.adminClient
    targetMeeting = resolved.meeting
    requestId = requestId ?? `organizer:${actor.actorId}`
  } else {
    if (!adminClient) {
      return { error: "SUPABASE_SERVICE_ROLE_KEY nao configurada para reunioes." }
    }

    if (!slug || !requestId) {
      return { error: "Solicitacao de entrada nao encontrada." }
    }

    const resolved = await findPublicMeetingBySlug(adminClient, slug)
    if ("error" in resolved) {
      return { error: resolved.error }
    }

    const hydratedMeeting = hydrateMeeting(resolved.meeting)
    const joinRequest = hydratedMeeting.joinRequests.find((item) => item.id === requestId)
    if (!joinRequest || joinRequest.status !== "approved") {
      return { error: "Sua entrada ainda nao foi aprovada pelo organizador." }
    }

    targetMeeting = resolved.meeting
  }

  if (!adminClient || !targetMeeting) {
    return { error: "Nao foi possivel atualizar a presenca da reuniao." }
  }

  const hydratedMeeting = hydrateMeeting(targetMeeting)
  const existingParticipants = hydratedMeeting.connectedParticipants.filter((participant) => participant.identity !== identity)
  const currentTimestamp = new Date().toISOString()
  const nextConnectedParticipants =
    status === "connected"
      ? [
          ...existingParticipants,
          {
            requestId: requestId ?? identity,
            identity,
            participantName: trimmedName,
            connectedAt: currentTimestamp,
            status: "online" as const,
            role,
          },
        ]
      : existingParticipants
  const existingSessionParticipant = hydratedMeeting.sessionRecord.participants.find((participant) => participant.identity === identity)
  const nextSessionParticipants =
    status === "connected" && !existingSessionParticipant
      ? [
          ...hydratedMeeting.sessionRecord.participants,
          {
            identity,
            participantName: trimmedName,
            role,
            firstJoinedAt: currentTimestamp,
          },
        ]
      : hydratedMeeting.sessionRecord.participants
  const nextSessionStartedAt =
    status === "connected"
      ? hydratedMeeting.sessionRecord.startedAt ?? currentTimestamp
      : hydratedMeeting.sessionRecord.startedAt
  const nextSessionRecord = normalizeSessionRecord({
    ...hydratedMeeting.sessionRecord,
    startedAt: nextSessionStartedAt,
    participants: nextSessionParticipants,
    finalState:
      status === "connected"
        ? "active"
        : hydratedMeeting.status === "finished"
          ? "ended"
          : hydratedMeeting.sessionRecord.finalState,
  })

  const historyDescription =
    status === "connected"
      ? `${trimmedName} entrou na sala do COS Meet.`
      : `${trimmedName} saiu da sala do COS Meet.`

  const timelineLabel =
    status === "connected"
      ? `${trimmedName} conectou audio e video em tempo real`
      : `${trimmedName} saiu da reuniao ao vivo`

  const nextStatus = status === "connected" && hydratedMeeting.status !== "finished" ? "in_progress" : hydratedMeeting.status

  const metadata = buildMeetingMetadata(
    {
      title: hydratedMeeting.title,
      scheduledAt: hydratedMeeting.scheduledAt ?? undefined,
      participants: hydratedMeeting.participants,
      meetingType: hydratedMeeting.meetingType,
      meetingLink: hydratedMeeting.meetingLink,
      meetingLocation: hydratedMeeting.meetingLocation,
      description: hydratedMeeting.description,
      cosShouldAttend: hydratedMeeting.cosShouldAttend,
      cosShouldRecord: hydratedMeeting.cosShouldRecord,
      cosShouldExtract: hydratedMeeting.cosShouldExtract,
      cosShouldReport: hydratedMeeting.cosShouldReport,
      analysisSections: hydratedMeeting.analysisSections,
      attachments: hydratedMeeting.attachments,
      timeline: [
        ...hydratedMeeting.timeline,
        createTimelineEvent(status === "connected" ? "meeting_live_connected" : "meeting_live_disconnected", timelineLabel),
      ],
      transcriptionState: hydratedMeeting.transcriptionState,
      joinRequests: hydratedMeeting.joinRequests,
      connectedParticipants: nextConnectedParticipants,
      sessionRecord: nextSessionRecord,
    },
    targetMeeting,
  )

  const history = [
    ...metadata.history,
    createHistoryEntry(status === "connected" ? "meeting_live_connected" : "meeting_live_disconnected", historyDescription),
  ]

  const { error } = await adminClient
    .from("meetings")
    .update({
      status: normalizeDatabaseMeetingStatus(nextStatus),
      ...buildMeetingTranscriptUpdate(metadata, history),
    })
    .eq("id", targetMeeting.id)

  if (error) {
    return { error: error.message }
  }

  return { success: true, meetingId: targetMeeting.id }
}

export async function removeMeetingParticipantAction({
  meetingId,
  identity,
}: {
  meetingId: string
  identity: string
}) {
  const actor = await getMeetingActor()
  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage && !actor.isMaster) {
    return { error: "Apenas owner, admin ou master podem remover participantes." }
  }

  const resolved = await resolveMeetingForActor(actor, meetingId)
  if ("error" in resolved) {
    return { error: resolved.error }
  }

  const hydratedMeeting = hydrateMeeting(resolved.meeting)
  const targetParticipant = hydratedMeeting.connectedParticipants.find((participant) => participant.identity === identity)
  if (!targetParticipant) {
    return { error: "Participante conectado nao encontrado." }
  }

  try {
    const roomServiceClient = createLiveKitRoomServiceClient()
    await roomServiceClient.removeParticipant(buildLiveKitRoomName(meetingId), identity)
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Nao foi possivel remover o participante da sala.",
    }
  }

  const nextJoinRequests =
    targetParticipant.role === "guest"
      ? hydratedMeeting.joinRequests.map((request) =>
          request.id === targetParticipant.requestId ? { ...request, status: "denied" as const } : request,
        )
      : hydratedMeeting.joinRequests

  const metadata = buildMeetingMetadata(
    {
      title: hydratedMeeting.title,
      scheduledAt: hydratedMeeting.scheduledAt ?? undefined,
      participants: hydratedMeeting.participants,
      meetingType: hydratedMeeting.meetingType,
      meetingLink: hydratedMeeting.meetingLink,
      meetingLocation: hydratedMeeting.meetingLocation,
      description: hydratedMeeting.description,
      cosShouldAttend: hydratedMeeting.cosShouldAttend,
      cosShouldRecord: hydratedMeeting.cosShouldRecord,
      cosShouldExtract: hydratedMeeting.cosShouldExtract,
      cosShouldReport: hydratedMeeting.cosShouldReport,
      analysisSections: hydratedMeeting.analysisSections,
      attachments: hydratedMeeting.attachments,
      timeline: [
        ...hydratedMeeting.timeline,
        createTimelineEvent("meeting_live_removed", `${targetParticipant.participantName} foi removido da sala ao vivo`),
      ],
      transcriptionState: hydratedMeeting.transcriptionState,
      joinRequests: nextJoinRequests,
      connectedParticipants: hydratedMeeting.connectedParticipants.filter((participant) => participant.identity !== identity),
      sessionRecord: hydratedMeeting.sessionRecord,
    },
    resolved.meeting,
  )

  const history = [
    ...metadata.history,
    createHistoryEntry("meeting_live_removed", `${targetParticipant.participantName} foi removido da sala ao vivo.`),
  ]

  const { error } = await actor.adminClient
    .from("meetings")
    .update(buildMeetingTranscriptUpdate(metadata, history))
    .eq("id", meetingId)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function endMeetingLiveRoomAction({ meetingId }: { meetingId: string }) {
  const actor = await getMeetingActor()
  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage && !actor.isMaster) {
    return { error: "Apenas owner, admin ou master podem encerrar a reuniao." }
  }

  const resolved = await resolveMeetingForActor(actor, meetingId)
  if ("error" in resolved) {
    return { error: resolved.error }
  }

  const hydratedMeeting = hydrateMeeting(resolved.meeting)
  const currentMetadata = buildMeetingMetadata({}, resolved.meeting)
  const endedAt = new Date().toISOString()
  const startedAt =
    hydratedMeeting.sessionRecord.startedAt ??
    hydratedMeeting.connectedParticipants
      .map((participant) => participant.connectedAt)
      .sort((a, b) => a.localeCompare(b))[0] ??
    null
  const durationSeconds =
    startedAt && !Number.isNaN(new Date(startedAt).getTime())
      ? Math.max(0, Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000))
      : null
  const nextSessionRecord = normalizeSessionRecord({
    ...hydratedMeeting.sessionRecord,
    startedAt,
    endedAt,
    durationSeconds,
    endedByUserId: actor.actorId,
    endedByName: actor.actorName,
    participants:
      hydratedMeeting.sessionRecord.participants.length > 0
        ? hydratedMeeting.sessionRecord.participants
        : hydratedMeeting.connectedParticipants.map((participant) => ({
            identity: participant.identity,
            participantName: participant.participantName,
            role: participant.role,
            firstJoinedAt: participant.connectedAt,
          })),
    finalState: "ended",
    summaryDraft: hydratedMeeting.sessionRecord.summaryDraft,
    decisionsDraft: hydratedMeeting.sessionRecord.decisionsDraft,
    tasksDraft: hydratedMeeting.sessionRecord.tasksDraft,
  })

  try {
    const roomServiceClient = createLiveKitRoomServiceClient()
    await roomServiceClient.deleteRoom(buildLiveKitRoomName(meetingId))
  } catch {
  }

  let nextRecording = currentMetadata.recording
  if (hydratedMeeting.cosShouldRecord && currentMetadata.recording.egressId) {
    try {
      const egressClient = createLiveKitEgressClient()
      const egressInfo = await egressClient.stopEgress(currentMetadata.recording.egressId)
      nextRecording = {
        ...buildRecordingStateFromEgressInfo({
          currentState: currentMetadata.recording,
          egressInfo,
        }),
        status:
          egressInfo.status === EgressStatus.EGRESS_COMPLETE
            ? "available"
            : egressInfo.status === EgressStatus.EGRESS_ENDING
              ? "finalizing"
              : "processing",
      }
    } catch (error) {
      nextRecording = {
        ...currentMetadata.recording,
        status:
          currentMetadata.recording.status === "available"
            ? "available"
            : currentMetadata.recording.storagePath
              ? "processing"
              : "failed",
        endedAt: endedAt,
        updatedAt: endedAt,
        error: error instanceof Error ? error.message : "Nao foi possivel finalizar a gravacao da reuniao.",
      }
    }
  }

  const metadata = buildMeetingMetadata(
    {
      title: hydratedMeeting.title,
      scheduledAt: hydratedMeeting.scheduledAt ?? undefined,
      participants: hydratedMeeting.participants,
      meetingType: hydratedMeeting.meetingType,
      meetingLink: hydratedMeeting.meetingLink,
      meetingLocation: hydratedMeeting.meetingLocation,
      description: hydratedMeeting.description,
      cosShouldAttend: hydratedMeeting.cosShouldAttend,
      cosShouldRecord: hydratedMeeting.cosShouldRecord,
      cosShouldExtract: hydratedMeeting.cosShouldExtract,
      cosShouldReport: hydratedMeeting.cosShouldReport,
      analysisSections: hydratedMeeting.analysisSections,
      attachments: hydratedMeeting.attachments,
      timeline: [
        ...hydratedMeeting.timeline,
        createTimelineEvent("meeting_finished", "Reuniao finalizada"),
        createTimelineEvent(
          "meeting_session_recorded",
          durationSeconds !== null ? `Sessao registrada com duracao de ${durationSeconds} segundo(s)` : "Sessao registrada",
          endedAt,
        ),
      ],
      transcriptionState: hydratedMeeting.transcriptionState,
      insights: hydratedMeeting.insights,
      followAlong: hydratedMeeting.followAlong,
      joinRequests: hydratedMeeting.joinRequests,
      connectedParticipants: [],
      sessionRecord: nextSessionRecord,
      recording: nextRecording,
    },
    resolved.meeting,
  )

  const history = [
    ...metadata.history,
    createHistoryEntry(
      "meeting_finished",
      `Reuniao finalizada por ${actor.actorName}. Sessao registrada${durationSeconds !== null ? ` com ${durationSeconds} segundo(s)` : ""}.`,
      endedAt,
    ),
  ]

  const { error } = await actor.adminClient
    .from("meetings")
    .update({
      status: normalizeDatabaseMeetingStatus("finished"),
      ...buildMeetingTranscriptUpdate(metadata, history),
    })
    .eq("id", meetingId)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
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
