import { canManageWorkspace, getUserAccessForUser } from "@/lib/auth"
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server"

type BackgroundJobStatus = "pending" | "processing" | "completed" | "failed" | "waiting_confirmation"
type BackgroundJobType = "create_client" | "create_document"
type BackgroundSensitiveJobType = "delete_client" | "send_external_message" | "process_payment" | "transfer_funds"

type BackgroundJobRow = {
  id: string
  workspace_id: string
  user_id: string | null
  type: string
  payload: Record<string, unknown> | null
  status: BackgroundJobStatus
  idempotency_key: string
  attempts: number
  max_attempts: number
  available_at: string
  locked_at: string | null
  locked_by: string | null
  result: Record<string, unknown> | null
  error: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
  updated_at: string
}

type BackgroundJobActor =
  | { error: string }
  | {
      userId: string
      workspaceId: string
      canManage: boolean
      isMaster: boolean
      adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
    }

type CreateBackgroundJobInput = {
  type: BackgroundJobType | BackgroundSensitiveJobType | string
  payload: Record<string, unknown>
  idempotencyKey: string
  maxAttempts?: number
  availableAt?: string
}

type BackgroundJobMutationStatus = "success" | "already_processed" | "failed"

type ProcessBatchOptions = {
  batchSize?: number
  workerId?: string
  processingTimeoutSeconds?: number
}

const DEFAULT_MAX_ATTEMPTS = 3
const DEFAULT_BATCH_SIZE = 5
const DEFAULT_PROCESSING_TIMEOUT_SECONDS = 15 * 60
const SENSITIVE_JOB_TYPES = new Set<BackgroundSensitiveJobType>([
  "delete_client",
  "send_external_message",
  "process_payment",
  "transfer_funds",
])

function buildBackoffMinutes(attempts: number) {
  if (attempts <= 1) return 1
  if (attempts === 2) return 5
  return 15
}

async function getBackgroundJobActor(): Promise<BackgroundJobActor> {
  const supabase = await createSupabaseServerClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    return { error: "Sessao invalida. Faca login novamente." as const }
  }

  const access = await getUserAccessForUser(authData.user, supabase)

  if (!access.workspace?.id) {
    return { error: "Nenhum workspace encontrado para esta conta." as const }
  }

  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY nao configurada para jobs em segundo plano." as const }
  }

  return {
    userId: authData.user.id,
    workspaceId: access.workspace.id,
    canManage: canManageWorkspace(access),
    isMaster: access.profile?.global_role === "master",
    adminClient,
  }
}

function normalizeRow(row: BackgroundJobRow) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    type: row.type,
    payload: row.payload ?? {},
    status: row.status,
    idempotencyKey: row.idempotency_key,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    availableAt: row.available_at,
    lockedAt: row.locked_at,
    lockedBy: row.locked_by,
    result: row.result ?? {},
    error: row.error,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  }
}

async function logBackgroundActivity({
  adminClient,
  workspaceId,
  userId,
  action,
  description,
}: {
  adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
  workspaceId: string
  userId: string | null
  action: string
  description: string
}) {
  const { error } = await adminClient.from("activity_logs").insert({
    workspace_id: workspaceId,
    user_id: userId,
    area: "system",
    action,
    description,
  })

  if (error) {
    console.error("[background-jobs] activity-log:", error.message)
  }
}

async function executeCreateClientJob({
  adminClient,
  workspaceId,
  userId,
  payload,
}: {
  adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
  workspaceId: string
  userId: string | null
  payload: Record<string, unknown>
}) {
  const name = typeof payload.name === "string" ? payload.name.trim() : ""
  const email = typeof payload.email === "string" ? payload.email.trim() : ""
  const phone = typeof payload.phone === "string" ? payload.phone.trim() : ""
  const company = typeof payload.company === "string" ? payload.company.trim() : ""
  const notes = typeof payload.notes === "string" ? payload.notes.trim() : ""
  const status = payload.status === "archived" ? "archived" : "active"

  if (!name) {
    return { ok: false as const, error: "Informe o nome do cliente para executar este job." }
  }

  const { data, error } = await adminClient
    .from("clients")
    .insert({
      workspace_id: workspaceId,
      name,
      email: email || null,
      phone: phone || null,
      company: company || null,
      notes: notes || null,
      status,
      created_by: userId,
    })
    .select("id, name, created_at")
    .single<{ id: string; name: string; created_at: string | null }>()

  if (error || !data) {
    return { ok: false as const, error: error?.message ?? "Nao foi possivel criar o cliente." }
  }

  await logBackgroundActivity({
    adminClient,
    workspaceId,
    userId,
    action: "background_job_client_created",
    description: `cliente criado em segundo plano: ${data.name}`,
  })

  return {
    ok: true as const,
    result: {
      entityType: "client",
      entityId: data.id,
      name: data.name,
      createdAt: data.created_at,
    },
  }
}

async function executeCreateDocumentJob({
  adminClient,
  workspaceId,
  userId,
  payload,
}: {
  adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
  workspaceId: string
  userId: string | null
  payload: Record<string, unknown>
}) {
  const title = typeof payload.title === "string" ? payload.title.trim() : ""
  const type = typeof payload.type === "string" && payload.type.trim() ? payload.type.trim().toLowerCase() : "outro"
  const content = typeof payload.content === "string" ? payload.content.trim() : ""
  const status = typeof payload.status === "string" && payload.status.trim() ? payload.status.trim().toLowerCase() : "draft"
  const fileUrl = typeof payload.fileUrl === "string" ? payload.fileUrl.trim() : ""

  if (!title) {
    return { ok: false as const, error: "Informe o titulo do documento para executar este job." }
  }

  const { data, error } = await adminClient
    .from("documents")
    .insert({
      workspace_id: workspaceId,
      title,
      type,
      content: content || null,
      status,
      file_url: fileUrl || null,
      created_by: userId,
    })
    .select("id, title, created_at")
    .single<{ id: string; title: string; created_at: string | null }>()

  if (error || !data) {
    return { ok: false as const, error: error?.message ?? "Nao foi possivel criar o documento." }
  }

  await logBackgroundActivity({
    adminClient,
    workspaceId,
    userId,
    action: "background_job_document_created",
    description: `documento criado em segundo plano: ${data.title}`,
  })

  return {
    ok: true as const,
    result: {
      entityType: "document",
      entityId: data.id,
      title: data.title,
      createdAt: data.created_at,
    },
  }
}

function buildJobUnsupportedReason(type: string) {
  if (SENSITIVE_JOB_TYPES.has(type as BackgroundSensitiveJobType)) {
    return "Essa acao precisa de confirmacao manual antes de ser executada."
  }

  return "Esse tipo de job ainda nao esta conectado a uma acao real do COS."
}

export async function createBackgroundJob(input: CreateBackgroundJobInput) {
  const actor = await getBackgroundJobActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage && !actor.isMaster) {
    return { error: "Apenas owner, admin ou master podem criar jobs em segundo plano." }
  }

  const trimmedType = input.type.trim()
  const trimmedIdempotencyKey = input.idempotencyKey.trim()

  if (!trimmedType || !trimmedIdempotencyKey) {
    return { error: "Informe o tipo do job e a chave de idempotencia." }
  }

  const { data: existing, error: existingError } = await actor.adminClient
    .from("background_jobs")
    .select("*")
    .eq("workspace_id", actor.workspaceId)
    .eq("idempotency_key", trimmedIdempotencyKey)
    .maybeSingle<BackgroundJobRow>()

  if (existingError) {
    return { error: existingError.message }
  }

  if (existing) {
    return {
      success: true,
      status: "already_processed" as BackgroundJobMutationStatus,
      job: normalizeRow(existing),
    }
  }

  const initialStatus: BackgroundJobStatus = SENSITIVE_JOB_TYPES.has(trimmedType as BackgroundSensitiveJobType)
    ? "waiting_confirmation"
    : "pending"

  const { data, error } = await actor.adminClient
    .from("background_jobs")
    .insert({
      workspace_id: actor.workspaceId,
      user_id: actor.userId,
      type: trimmedType,
      payload: input.payload ?? {},
      status: initialStatus,
      idempotency_key: trimmedIdempotencyKey,
      max_attempts: Math.max(input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS, 1),
      available_at: input.availableAt ?? new Date().toISOString(),
      result: {},
      error: initialStatus === "waiting_confirmation" ? buildJobUnsupportedReason(trimmedType) : null,
    })
    .select("*")
    .single<BackgroundJobRow>()

  if (error || !data) {
    return { error: error?.message ?? "Nao foi possivel criar o job." }
  }

  await logBackgroundActivity({
    adminClient: actor.adminClient,
    workspaceId: actor.workspaceId,
    userId: actor.userId,
    action: "background_job_created",
    description: `job em segundo plano criado: ${trimmedType}`,
  })

  return {
    success: true,
    status: "success" as BackgroundJobMutationStatus,
    job: normalizeRow(data),
  }
}

export async function getBackgroundJobStatus(jobId: string) {
  const actor = await getBackgroundJobActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const { data, error } = await actor.adminClient
    .from("background_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("workspace_id", actor.workspaceId)
    .maybeSingle<BackgroundJobRow>()

  if (error) {
    return { error: error.message }
  }

  if (!data) {
    return { error: "Job nao encontrado neste workspace." }
  }

  return {
    success: true,
    job: normalizeRow(data),
  }
}

async function completeBackgroundJob({
  adminClient,
  job,
  result,
}: {
  adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
  job: BackgroundJobRow
  result: Record<string, unknown>
}) {
  const { data, error } = await adminClient
    .from("background_jobs")
    .update({
      status: "completed",
      result,
      error: null,
      locked_at: null,
      locked_by: null,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id)
    .select("*")
    .single<BackgroundJobRow>()

  if (error || !data) {
    return { error: error?.message ?? "Nao foi possivel concluir o job." }
  }

  await logBackgroundActivity({
    adminClient,
    workspaceId: job.workspace_id,
    userId: job.user_id,
    action: "background_job_completed",
    description: `job concluido em segundo plano: ${job.type}`,
  })

  return { success: true, job: normalizeRow(data) }
}

async function moveBackgroundJobToWaitingConfirmation({
  adminClient,
  job,
  errorMessage,
}: {
  adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
  job: BackgroundJobRow
  errorMessage: string
}) {
  const { data, error } = await adminClient
    .from("background_jobs")
    .update({
      status: "waiting_confirmation",
      error: errorMessage,
      locked_at: null,
      locked_by: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id)
    .select("*")
    .single<BackgroundJobRow>()

  if (error || !data) {
    return { error: error?.message ?? "Nao foi possivel pausar o job para confirmacao." }
  }

  return { success: true, job: normalizeRow(data) }
}

async function failBackgroundJob({
  adminClient,
  job,
  errorMessage,
}: {
  adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
  job: BackgroundJobRow
  errorMessage: string
}) {
  const hasRemainingAttempts = job.attempts < job.max_attempts
  const nextStatus: BackgroundJobStatus = hasRemainingAttempts ? "pending" : "failed"
  const availableAt = hasRemainingAttempts
    ? new Date(Date.now() + buildBackoffMinutes(job.attempts) * 60 * 1000).toISOString()
    : job.available_at

  const { data, error } = await adminClient
    .from("background_jobs")
    .update({
      status: nextStatus,
      available_at: availableAt,
      error: errorMessage,
      locked_at: null,
      locked_by: null,
      completed_at: hasRemainingAttempts ? null : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id)
    .select("*")
    .single<BackgroundJobRow>()

  if (error || !data) {
    return { error: error?.message ?? "Nao foi possivel atualizar a falha do job." }
  }

  if (!hasRemainingAttempts) {
    await logBackgroundActivity({
      adminClient,
      workspaceId: job.workspace_id,
      userId: job.user_id,
      action: "background_job_failed",
      description: `job falhou em segundo plano: ${job.type}`,
    })
  }

  return { success: true, job: normalizeRow(data) }
}

async function processSingleJob({
  adminClient,
  job,
}: {
  adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
  job: BackgroundJobRow
}) {
  if (SENSITIVE_JOB_TYPES.has(job.type as BackgroundSensitiveJobType)) {
    return moveBackgroundJobToWaitingConfirmation({
      adminClient,
      job,
      errorMessage: buildJobUnsupportedReason(job.type),
    })
  }

  try {
    let execution:
      | { ok: true; result: Record<string, unknown> }
      | { ok: false; error: string }

    switch (job.type as BackgroundJobType) {
      case "create_client":
        execution = await executeCreateClientJob({
          adminClient,
          workspaceId: job.workspace_id,
          userId: job.user_id,
          payload: job.payload ?? {},
        })
        break
      case "create_document":
        execution = await executeCreateDocumentJob({
          adminClient,
          workspaceId: job.workspace_id,
          userId: job.user_id,
          payload: job.payload ?? {},
        })
        break
      default:
        return moveBackgroundJobToWaitingConfirmation({
          adminClient,
          job,
          errorMessage: buildJobUnsupportedReason(job.type),
        })
    }

    if (!execution.ok) {
      return failBackgroundJob({
        adminClient,
        job,
        errorMessage: execution.error,
      })
    }

    return completeBackgroundJob({
      adminClient,
      job,
      result: execution.result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha inesperada ao processar o job."
    return failBackgroundJob({
      adminClient,
      job,
      errorMessage: message,
    })
  }
}

export async function processBackgroundJobsBatch(options: ProcessBatchOptions = {}) {
  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY nao configurada para processar jobs em segundo plano." }
  }

  const workerId = options.workerId?.trim() || `cron:${process.pid}:${Date.now()}`
  const batchSize = Math.max(options.batchSize ?? DEFAULT_BATCH_SIZE, 1)
  const processingTimeoutSeconds = Math.max(
    options.processingTimeoutSeconds ?? DEFAULT_PROCESSING_TIMEOUT_SECONDS,
    60,
  )

  const { data, error } = await adminClient.rpc("claim_background_jobs", {
    p_worker_id: workerId,
    p_batch_size: batchSize,
    p_processing_timeout_seconds: processingTimeoutSeconds,
  })

  if (error) {
    return { error: error.message }
  }

  const jobs = (data ?? []) as BackgroundJobRow[]
  const processed = []

  for (const job of jobs) {
    const outcome = await processSingleJob({ adminClient, job })
    processed.push({
      id: job.id,
      type: job.type,
      outcome: "error" in outcome ? "failed" : outcome.job.status,
      error: "error" in outcome ? outcome.error : null,
    })
  }

  return {
    success: true,
    workerId,
    claimed: jobs.length,
    processed,
  }
}
