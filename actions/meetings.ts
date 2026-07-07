"use server"

import { canManageWorkspace, getUserAccessForUser } from "@/lib/auth"
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server"

type DatabaseMeetingStatus = "draft" | "recorded" | "transcribed" | "archived"

export type MeetingStatus = "scheduled" | "in_progress" | "finished"
export type MeetingType = "video" | "in_person"

type MeetingMetadata = {
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
}

const MEETING_METADATA_PREFIX = "COS_MEET_META::"

async function getMeetingActor() {
  const supabase = await createSupabaseServerClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    return { error: "Sessão inválida. Faça login novamente." as const }
  }

  const access = await getUserAccessForUser(authData.user)

  if (!access.workspace?.id) {
    return { error: "Nenhum workspace encontrado para esta conta." as const }
  }

  const adminClient = createSupabaseAdminClient()
  if (!adminClient) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY não configurada para reuniões." as const }
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

function parseMeetingMetadata(value?: string | null) {
  if (!value || !value.startsWith(MEETING_METADATA_PREFIX)) {
    return null
  }

  try {
    const parsed = JSON.parse(value.slice(MEETING_METADATA_PREFIX.length)) as MeetingMetadata
    if (parsed.version !== 1) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function buildMeetingMetadata(payload: Partial<MeetingPayload>, currentRow?: MeetingRow): MeetingMetadata {
  const currentMetadata = parseMeetingMetadata(currentRow?.transcript)
  const legacyDescription = payload.summary?.trim() || currentRow?.summary?.trim() || currentMetadata?.description || ""

  return {
    version: 1,
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
  }
}

function hydrateMeeting(meeting: MeetingRow) {
  const metadata = buildMeetingMetadata({}, meeting)
  const meetingLink = metadata.meetingType === "video" ? metadata.meetingLink : ""

  return {
    id: meeting.id,
    title: meeting.title,
    audioUrl: meeting.audio_url || "",
    transcript: meeting.transcript || "",
    summary: meeting.summary || "",
    decisions: meeting.decisions || "",
    nextSteps: meeting.next_steps || "",
    status: mapDatabaseStatusToMeetingStatus(meeting.status),
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
    statusLabel:
      mapDatabaseStatusToMeetingStatus(meeting.status) === "scheduled"
        ? "Agendada"
        : mapDatabaseStatusToMeetingStatus(meeting.status) === "in_progress"
          ? "Em andamento"
          : "Finalizada",
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
  const { data, error } = await actor.adminClient
    .from("meetings")
    .select("id, workspace_id, title, audio_url, transcript, summary, decisions, next_steps, status, created_by, created_at")
    .eq("id", meetingId)
    .maybeSingle<MeetingRow>()

  if (error) {
    return { error: error.message }
  }

  if (!data || data.workspace_id !== actor.workspaceId) {
    return { error: "Reunião não encontrada neste workspace." }
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
    return { error: "Informe o título da reunião." }
  }

  const metadata = buildMeetingMetadata(payload)

  const { data, error } = await actor.adminClient
    .from("meetings")
    .insert({
      workspace_id: actor.workspaceId,
      title: trimmedTitle,
      audio_url: metadata.meetingType === "video" ? metadata.meetingLink || null : null,
      transcript: serializeMeetingMetadata(metadata),
      summary: metadata.description || payload.summary?.trim() || null,
      decisions: payload.decisions?.trim() || null,
      next_steps: payload.nextSteps?.trim() || null,
      status: normalizeDatabaseMeetingStatus(payload.status ?? "scheduled"),
      created_by: actor.actorId,
    })
    .select("id, workspace_id, title, audio_url, transcript, summary, decisions, next_steps, status, created_by, created_at")
    .single<MeetingRow>()

  if (error || !data) {
    return { error: error?.message ?? "Não foi possível criar a reunião." }
  }

  await logMeetingActivity({
    adminClient: actor.adminClient,
    workspaceId: actor.workspaceId,
    userId: actor.actorId,
    action: "meeting_created",
    description: "reunião criada",
  })

  return { success: true, meetingId: data.id }
}

export async function updateMeetingAction({ meetingId, ...payload }: MeetingPayload & { meetingId: string }) {
  const actor = await getMeetingActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage && !actor.isMaster) {
    return { error: "Apenas owner, admin ou master podem editar reuniões." }
  }

  const resolved = await resolveMeetingForActor(actor, meetingId)
  if ("error" in resolved) {
    return { error: resolved.error }
  }

  const trimmedTitle = payload.title.trim()
  if (!trimmedTitle) {
    return { error: "Informe o título da reunião." }
  }

  const metadata = buildMeetingMetadata(payload, resolved.meeting)

  const { error } = await actor.adminClient
    .from("meetings")
    .update({
      title: trimmedTitle,
      audio_url: metadata.meetingType === "video" ? metadata.meetingLink || null : null,
      transcript: serializeMeetingMetadata(metadata),
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
    action: "meeting_updated",
    description: "reunião atualizada",
  })

  return { success: true }
}

export async function deleteMeetingAction({ meetingId }: { meetingId: string }) {
  const actor = await getMeetingActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage && !actor.isMaster) {
    return { error: "Apenas owner, admin ou master podem arquivar reuniões." }
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
    description: "reunião arquivada",
  })

  return { success: true }
}
