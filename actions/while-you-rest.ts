"use server"

import { canManageWorkspace, getUserAccessForUser } from "@/lib/auth"
import { createBackgroundJob } from "@/lib/background-jobs"
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server"
import {
  buildWhileYouRestNextStep,
  buildWhileYouRestPlan,
  buildWhileYouRestTitle,
  estimateWhileYouRestMinutes,
  type WhileYouRestControlState,
  type WhileYouRestPlanItem,
} from "@/lib/while-you-rest"

type StoredPlanStatus = "draft" | "running" | "completed" | "partial" | "waiting_confirmation" | "failed"
export type WhileYouRestExecutionState =
  | "draft"
  | "queued"
  | "running"
  | "paused"
  | "waiting_confirmation"
  | "completed"
  | "completed_with_issues"
  | "failed"
  | "cancelled"

type BackgroundJobStatus = "pending" | "processing" | "completed" | "failed" | "waiting_confirmation"
type RuntimeItemStatus =
  | "aguardando"
  | "em_execucao"
  | "concluido"
  | "falhou"
  | "aguardando_confirmacao"
  | "nao_suportado"
  | "cancelado"

type WhileYouRestPlanRow = {
  id: string
  workspace_id: string
  user_id: string | null
  request_text: string
  plan: WhileYouRestPlanItem[] | null
  job_ids: string[] | null
  status: StoredPlanStatus
  summary: Record<string, unknown> | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

type BackgroundJobSnapshot = {
  id: string
  status: BackgroundJobStatus
  type: string
  result: Record<string, unknown> | null
  error: string | null
  updated_at: string
}

type PlanItemView = WhileYouRestPlanItem & {
  runtimeStatus: RuntimeItemStatus
  jobId: string | null
  result: Record<string, unknown> | null
  error: string | null
}

export type WhileYouRestHydratedPlan = {
  id: string
  title: string
  requestText: string
  status: WhileYouRestExecutionState
  controlState: WhileYouRestControlState
  items: PlanItemView[]
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  elapsedLabel: string
  estimatedMinutes: number
  summary: Record<string, unknown>
}

const PAUSE_DELAY_YEARS = 10

function formatElapsedLabel(startedAt: string | null, fallbackAt: string, completedAt: string | null) {
  const start = new Date(startedAt ?? fallbackAt).getTime()
  const end = new Date(completedAt ?? new Date().toISOString()).getTime()
  const diffMinutes = Math.max(1, Math.round((end - start) / 60000))

  if (diffMinutes < 60) {
    return `${diffMinutes} min`
  }

  const hours = Math.floor(diffMinutes / 60)
  const minutes = diffMinutes % 60
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`
}

function getSummaryString(summary: Record<string, unknown> | null | undefined, key: string, fallback: string) {
  const value = summary?.[key]
  return typeof value === "string" ? value : fallback
}

function getSummaryNumber(summary: Record<string, unknown> | null | undefined, key: string, fallback: number) {
  const value = summary?.[key]
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function getSummaryStringArray(summary: Record<string, unknown> | null | undefined, key: string) {
  const value = summary?.[key]
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function getSummaryControlState(summary: Record<string, unknown> | null | undefined): WhileYouRestControlState {
  const value = summary?.controlState
  return value === "draft" || value === "running" || value === "paused" || value === "ended" ? value : "draft"
}

async function getWhileYouRestActor() {
  const supabase = await createSupabaseServerClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    return { error: "Sessao invalida. Faca login novamente." as const }
  }

  const access = await getUserAccessForUser(authData.user, supabase)

  if (!access.workspace?.id) {
    return { error: "Nenhum workspace encontrado para esta conta." as const }
  }

  if (access.workspace.type !== "operations") {
    return { error: "Enquanto voce descansa esta disponivel apenas no COS Operacoes." as const }
  }

  const adminClient = createSupabaseAdminClient()
  if (!adminClient) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY nao configurada para este fluxo." as const }
  }

  return {
    userId: authData.user.id,
    workspaceId: access.workspace.id,
    canManage: canManageWorkspace(access) || access.profile?.global_role === "master",
    adminClient,
  }
}

function mapRuntimeStatus({
  item,
  job,
  cancelledJobIds,
}: {
  item: WhileYouRestPlanItem
  job: BackgroundJobSnapshot | null
  cancelledJobIds: string[]
}): RuntimeItemStatus {
  if (item.kind === "unsupported") {
    return "nao_suportado"
  }

  if (item.kind === "waiting_confirmation") {
    return "aguardando_confirmacao"
  }

  if (!job) {
    return "aguardando"
  }

  if (cancelledJobIds.includes(job.id) && job.status === "pending") {
    return "cancelado"
  }

  switch (job.status) {
    case "pending":
      return "aguardando"
    case "processing":
      return "em_execucao"
    case "completed":
      return "concluido"
    case "failed":
      return "falhou"
    case "waiting_confirmation":
      return "aguardando_confirmacao"
    default:
      return "aguardando"
  }
}

function buildStateAndSummary(items: PlanItemView[], controlState: WhileYouRestControlState) {
  const counts = items.reduce(
    (acc, item) => {
      switch (item.runtimeStatus) {
        case "concluido":
          acc.completed += 1
          break
        case "em_execucao":
          acc.running += 1
          break
        case "aguardando":
          acc.pending += 1
          break
        case "falhou":
          acc.failed += 1
          break
        case "aguardando_confirmacao":
          acc.waitingConfirmation += 1
          break
        case "cancelado":
          acc.cancelled += 1
          break
        case "nao_suportado":
          // Unsupported items still depend on the user to move forward.
          acc.waitingConfirmation += 1
          break
      }

      return acc
    },
    {
      completed: 0,
      running: 0,
      pending: 0,
      failed: 0,
      waitingConfirmation: 0,
      cancelled: 0,
    },
  )

  const total = items.length
  const hasPendingOrRunning = counts.pending > 0 || counts.running > 0
  const onlySuccessful = total > 0 && counts.completed === total
  const hasIssues =
    counts.failed > 0 ||
    counts.waitingConfirmation > 0 ||
    counts.cancelled > 0

  let status: WhileYouRestExecutionState = "draft"

  if (controlState === "draft") {
    status = "draft"
  } else if (controlState === "paused") {
    status = "paused"
  } else if (controlState === "ended") {
    status = "cancelled"
  } else if (hasPendingOrRunning) {
    status = counts.running > 0 ? "running" : "queued"
  } else if (onlySuccessful) {
    status = "completed"
  } else if (counts.failed > 0 && counts.completed === 0 && counts.waitingConfirmation === 0 && counts.cancelled === 0) {
    status = "failed"
  } else if (counts.waitingConfirmation > 0 && counts.completed === 0 && counts.failed === 0 && counts.cancelled === 0) {
    status = "waiting_confirmation"
  } else {
    status = hasIssues || counts.completed > 0 ? "completed_with_issues" : "failed"
  }

  const finalForProgress =
    counts.completed +
    counts.failed +
    counts.cancelled +
    ((status === "waiting_confirmation" || status === "completed_with_issues" || status === "cancelled") ? counts.waitingConfirmation : 0)
  const progressPercent = total > 0 ? Math.round((finalForProgress / total) * 100) : 0

  return {
    status,
    summary: {
      completedCount: counts.completed,
      runningCount: counts.running,
      pendingCount: counts.pending,
      failedCount: counts.failed,
      waitingConfirmationCount: counts.waitingConfirmation,
      cancelledCount: counts.cancelled,
      totalCount: total,
      finalizedCount: finalForProgress,
      progressPercent,
      documentsCreated: items.filter((item) => item.result?.entityType === "document").length,
      clientsCreated: items.filter((item) => item.result?.entityType === "client").length,
      nextStep: buildWhileYouRestNextStep(items),
    },
  }
}

async function fetchJobs(adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, jobIds: string[]) {
  if (jobIds.length === 0) {
    return [] as BackgroundJobSnapshot[]
  }

  const { data } = await adminClient
    .from("background_jobs")
    .select("id, status, type, result, error, updated_at")
    .in("id", jobIds)
    .returns<BackgroundJobSnapshot[]>()

  return data ?? []
}

async function hydratePlan(
  row: WhileYouRestPlanRow,
  adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
): Promise<WhileYouRestHydratedPlan> {
  const plan = row.plan ?? []
  const jobIds = (row.job_ids ?? []).filter(Boolean)
  const jobs = await fetchJobs(adminClient, jobIds)
  const jobById = new Map(jobs.map((job) => [job.id, job]))
  const cancelledJobIds = getSummaryStringArray(row.summary, "cancelledJobIds")
  const controlState = getSummaryControlState(row.summary)

  const items: PlanItemView[] = plan.map((item, index) => {
    const jobId = item.kind === "executable" ? jobIds[index] ?? null : null
    const job = jobId ? jobById.get(jobId) ?? null : null

    return {
      ...item,
      runtimeStatus: mapRuntimeStatus({ item, job, cancelledJobIds }),
      jobId,
      result: job?.result ?? null,
      error: job?.error ?? null,
    }
  })

  const title = getSummaryString(row.summary, "title", buildWhileYouRestTitle(row.request_text, plan))
  const estimatedMinutes = getSummaryNumber(row.summary, "estimatedMinutes", estimateWhileYouRestMinutes(plan))
  const { status, summary } = buildStateAndSummary(items, controlState)
  const completedAt =
    status === "completed" || status === "completed_with_issues" || status === "failed" || status === "cancelled"
      ? row.completed_at ?? new Date().toISOString()
      : row.completed_at

  return {
    id: row.id,
    title,
    requestText: row.request_text,
    status,
    controlState,
    items,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt,
    elapsedLabel: formatElapsedLabel(row.started_at, row.created_at, completedAt),
    estimatedMinutes,
    summary: {
      ...summary,
      title,
      estimatedMinutes,
      controlState,
      cancelledJobIds,
    },
  }
}

async function getPlanRow({
  planId,
  workspaceId,
  adminClient,
}: {
  planId: string
  workspaceId: string
  adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
}) {
  const { data, error } = await adminClient
    .from("while_you_rest_plans")
    .select("*")
    .eq("id", planId)
    .eq("workspace_id", workspaceId)
    .maybeSingle<WhileYouRestPlanRow>()

  if (error) {
    return { error: error.message }
  }

  if (!data) {
    return { error: "Execucao nao encontrada." }
  }

  return { row: data }
}

async function updatePendingAvailability({
  adminClient,
  jobIds,
  availableAt,
}: {
  adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
  jobIds: string[]
  availableAt: string
}) {
  if (jobIds.length === 0) {
    return
  }

  await adminClient
    .from("background_jobs")
    .update({
      available_at: availableAt,
      updated_at: new Date().toISOString(),
    })
    .in("id", jobIds)
    .eq("status", "pending")
}

async function persistRowUpdate({
  adminClient,
  row,
  patch,
}: {
  adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
  row: WhileYouRestPlanRow
  patch: Record<string, unknown>
}) {
  const { data, error } = await adminClient
    .from("while_you_rest_plans")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .select("*")
    .single<WhileYouRestPlanRow>()

  if (error || !data) {
    return { error: error?.message ?? "Nao foi possivel atualizar a execucao." }
  }

  return { row: data }
}

export async function createWhileYouRestPlanAction(requestText: string) {
  const actor = await getWhileYouRestActor()
  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage) {
    return { error: "Apenas owner, admin ou master podem iniciar esse modo." }
  }

  const trimmedRequest = requestText.trim()
  if (!trimmedRequest) {
    return { error: "Descreva o que o COS deve deixar pronto." }
  }

  const planDraft = buildWhileYouRestPlan(trimmedRequest)
  const title = buildWhileYouRestTitle(trimmedRequest, planDraft.items)
  const estimatedMinutes = estimateWhileYouRestMinutes(planDraft.items)

  const { data, error } = await actor.adminClient
    .from("while_you_rest_plans")
    .insert({
      workspace_id: actor.workspaceId,
      user_id: actor.userId,
      request_text: trimmedRequest,
      plan: planDraft.items,
      status: "draft",
      summary: {
        title,
        estimatedMinutes,
        controlState: "draft",
        cancelledJobIds: [],
        nextStep: buildWhileYouRestNextStep(planDraft.items),
      },
    })
    .select("*")
    .single<WhileYouRestPlanRow>()

  if (error || !data) {
    return { error: error?.message ?? "Nao foi possivel organizar esse pedido." }
  }

  return {
    success: true,
    plan: await hydratePlan(data, actor.adminClient),
  }
}

export async function startWhileYouRestPlanAction(planId: string) {
  const actor = await getWhileYouRestActor()
  if ("error" in actor) {
    return { error: actor.error }
  }

  if (!actor.canManage) {
    return { error: "Apenas owner, admin ou master podem iniciar esse modo." }
  }

  const loaded = await getPlanRow({
    planId,
    workspaceId: actor.workspaceId,
    adminClient: actor.adminClient,
  })
  if ("error" in loaded) {
    return { error: loaded.error }
  }

  const row = loaded.row
  const planItems = row.plan ?? []
  const createdJobIds = [...(row.job_ids ?? [])]

  for (const item of planItems) {
    if (item.kind !== "executable") {
      continue
    }

    const result = await createBackgroundJob({
      type: item.actionType,
      payload: item.payload,
      idempotencyKey: `while-you-rest:${row.id}:${item.id}:${item.actionType}`,
    })

    if ("error" in result) {
      return { error: result.error }
    }

    if (result.job?.id && !createdJobIds.includes(result.job.id)) {
      createdJobIds.push(result.job.id)
    }
  }

  const updated = await persistRowUpdate({
    adminClient: actor.adminClient,
    row,
    patch: {
      job_ids: createdJobIds,
      status: "running",
      started_at: row.started_at ?? new Date().toISOString(),
      summary: {
        ...(row.summary ?? {}),
        controlState: "running",
        cancelledJobIds: getSummaryStringArray(row.summary, "cancelledJobIds"),
      },
    },
  })

  if ("error" in updated) {
    return { error: updated.error }
  }

  return {
    success: true,
    plan: await hydratePlan(updated.row, actor.adminClient),
  }
}

export async function pauseWhileYouRestPlanAction(planId: string) {
  const actor = await getWhileYouRestActor()
  if ("error" in actor) {
    return { error: actor.error }
  }

  const loaded = await getPlanRow({
    planId,
    workspaceId: actor.workspaceId,
    adminClient: actor.adminClient,
  })
  if ("error" in loaded) {
    return { error: loaded.error }
  }

  const row = loaded.row
  const availableAt = new Date(Date.now() + PAUSE_DELAY_YEARS * 365 * 24 * 60 * 60 * 1000).toISOString()
  await updatePendingAvailability({
    adminClient: actor.adminClient,
    jobIds: (row.job_ids ?? []).filter(Boolean),
    availableAt,
  })

  const updated = await persistRowUpdate({
    adminClient: actor.adminClient,
    row,
    patch: {
      status: "running",
      summary: {
        ...(row.summary ?? {}),
        controlState: "paused",
      },
    },
  })

  if ("error" in updated) {
    return { error: updated.error }
  }

  return {
    success: true,
    plan: await hydratePlan(updated.row, actor.adminClient),
  }
}

export async function continueWhileYouRestPlanAction(planId: string) {
  const actor = await getWhileYouRestActor()
  if ("error" in actor) {
    return { error: actor.error }
  }

  const loaded = await getPlanRow({
    planId,
    workspaceId: actor.workspaceId,
    adminClient: actor.adminClient,
  })
  if ("error" in loaded) {
    return { error: loaded.error }
  }

  const row = loaded.row
  await updatePendingAvailability({
    adminClient: actor.adminClient,
    jobIds: (row.job_ids ?? []).filter(Boolean),
    availableAt: new Date().toISOString(),
  })

  const updated = await persistRowUpdate({
    adminClient: actor.adminClient,
    row,
    patch: {
      status: "running",
      summary: {
        ...(row.summary ?? {}),
        controlState: "running",
      },
    },
  })

  if ("error" in updated) {
    return { error: updated.error }
  }

  return {
    success: true,
    plan: await hydratePlan(updated.row, actor.adminClient),
  }
}

export async function endWhileYouRestPlanAction(planId: string) {
  const actor = await getWhileYouRestActor()
  if ("error" in actor) {
    return { error: actor.error }
  }

  const loaded = await getPlanRow({
    planId,
    workspaceId: actor.workspaceId,
    adminClient: actor.adminClient,
  })
  if ("error" in loaded) {
    return { error: loaded.error }
  }

  const row = loaded.row
  const jobIds = (row.job_ids ?? []).filter(Boolean)
  const jobs = await fetchJobs(actor.adminClient, jobIds)
  const cancelledJobIds = [
    ...new Set([
      ...getSummaryStringArray(row.summary, "cancelledJobIds"),
      ...jobs.filter((job) => job.status === "pending").map((job) => job.id),
    ]),
  ]

  const availableAt = new Date(Date.now() + PAUSE_DELAY_YEARS * 365 * 24 * 60 * 60 * 1000).toISOString()
  await updatePendingAvailability({
    adminClient: actor.adminClient,
    jobIds,
    availableAt,
  })

  const updated = await persistRowUpdate({
    adminClient: actor.adminClient,
    row,
    patch: {
      status: "partial",
      completed_at: row.completed_at ?? new Date().toISOString(),
      summary: {
        ...(row.summary ?? {}),
        controlState: "ended",
        cancelledJobIds,
      },
    },
  })

  if ("error" in updated) {
    return { error: updated.error }
  }

  return {
    success: true,
    plan: await hydratePlan(updated.row, actor.adminClient),
  }
}

export async function getWhileYouRestPlansAction() {
  const actor = await getWhileYouRestActor()
  if ("error" in actor) {
    return { error: actor.error }
  }

  const { data, error } = await actor.adminClient
    .from("while_you_rest_plans")
    .select("*")
    .eq("workspace_id", actor.workspaceId)
    .eq("user_id", actor.userId)
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<WhileYouRestPlanRow[]>()

  if (error) {
    return { error: error.message }
  }

  const plans = await Promise.all((data ?? []).map((row) => hydratePlan(row, actor.adminClient)))

  return {
    success: true,
    plans,
  }
}

export async function getLatestWhileYouRestPlanAction() {
  const result = await getWhileYouRestPlansAction()
  if ("error" in result) {
    return result
  }

  return {
    success: true,
    plan: result.plans[0] ?? null,
  }
}
