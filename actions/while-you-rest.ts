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

type PlanStatus = "draft" | "running" | "completed" | "partial" | "waiting_confirmation" | "failed"
type DisplayStatus = "in_progress" | "waiting_confirmation" | "completed" | "error" | "paused"

type WhileYouRestPlanRow = {
  id: string
  workspace_id: string
  user_id: string | null
  request_text: string
  plan: WhileYouRestPlanItem[] | null
  job_ids: string[] | null
  status: PlanStatus
  summary: Record<string, unknown> | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

type BackgroundJobSnapshot = {
  id: string
  status: "pending" | "processing" | "completed" | "failed" | "waiting_confirmation"
  type: string
  result: Record<string, unknown> | null
  error: string | null
  updated_at: string
  available_at?: string
}

type PlanItemView = WhileYouRestPlanItem & {
  runtimeStatus: "aguardando" | "em_execucao" | "concluido" | "falhou" | "aguardando_confirmacao" | "nao_suportado"
  jobId: string | null
  result: Record<string, unknown> | null
  error: string | null
}

type HydratedPlan = {
  id: string
  title: string
  requestText: string
  status: PlanStatus
  displayStatus: DisplayStatus
  controlState: WhileYouRestControlState
  isFinished: boolean
  items: PlanItemView[]
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  elapsedLabel: string
  estimatedMinutes: number
  summary: Record<string, unknown>
}

const PAUSE_DELAY_DAYS = 3650

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

function readSummaryValue<T>(summary: Record<string, unknown> | null | undefined, key: string, fallback: T): T {
  const value = summary?.[key]
  return value === undefined ? fallback : (value as T)
}

function formatElapsedLabel(startedAt: string | null, completedAt: string | null) {
  const start = startedAt ? new Date(startedAt).getTime() : Date.now()
  const end = completedAt ? new Date(completedAt).getTime() : Date.now()
  const diffMinutes = Math.max(1, Math.round((end - start) / 60000))

  if (diffMinutes < 60) {
    return `${diffMinutes} min`
  }

  const hours = Math.floor(diffMinutes / 60)
  const minutes = diffMinutes % 60

  if (minutes === 0) {
    return `${hours} h`
  }

  return `${hours} h ${minutes} min`
}

function mapJobStatus(
  item: WhileYouRestPlanItem,
  job: BackgroundJobSnapshot | null,
): PlanItemView["runtimeStatus"] {
  if (item.kind === "unsupported") {
    return "nao_suportado"
  }

  if (item.kind === "waiting_confirmation") {
    return "aguardando_confirmacao"
  }

  if (!job) {
    return "aguardando"
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

function summarizePlan(items: PlanItemView[], controlState: WhileYouRestControlState) {
  const completed = items.filter((item) => item.runtimeStatus === "concluido")
  const failed = items.filter((item) => item.runtimeStatus === "falhou")
  const waitingConfirmation = items.filter((item) => item.runtimeStatus === "aguardando_confirmacao")
  const unsupported = items.filter((item) => item.runtimeStatus === "nao_suportado")
  const pending = items.filter((item) => item.runtimeStatus === "aguardando")
  const processing = items.filter((item) => item.runtimeStatus === "em_execucao")

  let status: PlanStatus = "draft"

  if (controlState === "paused") {
    status = "running"
  } else if (processing.length > 0 || pending.length > 0) {
    status = "running"
  } else if (failed.length > 0 && completed.length > 0) {
    status = "partial"
  } else if (failed.length > 0 && completed.length === 0) {
    status = "failed"
  } else if (waitingConfirmation.length > 0 && completed.length === 0) {
    status = "waiting_confirmation"
  } else if (completed.length > 0) {
    status = waitingConfirmation.length > 0 || unsupported.length > 0 ? "partial" : "completed"
  }

  let displayStatus: DisplayStatus
  if (controlState === "paused") {
    displayStatus = "paused"
  } else if (status === "running") {
    displayStatus = "in_progress"
  } else if (status === "waiting_confirmation") {
    displayStatus = "waiting_confirmation"
  } else if (status === "failed") {
    displayStatus = "error"
  } else {
    displayStatus = failed.length > 0 ? "error" : "completed"
  }

  if (controlState === "ended" && displayStatus === "in_progress") {
    displayStatus = "completed"
  }

  return {
    status,
    displayStatus,
    summary: {
      completedCount: completed.length,
      failedCount: failed.length,
      waitingConfirmationCount: waitingConfirmation.length,
      unsupportedCount: unsupported.length,
      pendingCount: pending.length + unsupported.length + waitingConfirmation.length,
      processingCount: processing.length,
      totalCount: items.length,
      progressPercent: items.length > 0 ? Math.round((completed.length / items.length) * 100) : 0,
      documentsCreated: completed.filter((item) => item.result?.entityType === "document").length,
      clientsCreated: completed.filter((item) => item.result?.entityType === "client").length,
      nextStep: buildWhileYouRestNextStep(items),
    },
  }
}

async function fetchPlanJobs(adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, jobIds: string[]) {
  if (jobIds.length === 0) {
    return [] as BackgroundJobSnapshot[]
  }

  const { data } = await adminClient
    .from("background_jobs")
    .select("id, status, type, result, error, updated_at, available_at")
    .in("id", jobIds)
    .returns<BackgroundJobSnapshot[]>()

  return data ?? []
}

async function hydratePlan(row: WhileYouRestPlanRow, adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>): Promise<HydratedPlan> {
  const plan = row.plan ?? []
  const jobIds = (row.job_ids ?? []).filter(Boolean)
  const jobs = await fetchPlanJobs(adminClient, jobIds)
  const jobById = new Map(jobs.map((job) => [job.id, job]))
  const executableJobIds = jobIds
  const controlState = readSummaryValue<WhileYouRestControlState>(row.summary, "controlState", row.status === "draft" ? "draft" : "running")

  const items: PlanItemView[] = plan.map((item, index) => {
    const jobId = item.kind === "executable" ? executableJobIds[index] ?? null : null
    const job = jobId ? jobById.get(jobId) ?? null : null

    return {
      ...item,
      runtimeStatus: mapJobStatus(item, job),
      jobId,
      result: job?.result ?? null,
      error: job?.error ?? null,
    }
  })

  const { status, displayStatus, summary } = summarizePlan(items, controlState)
  const title = readSummaryValue<string>(row.summary, "title", buildWhileYouRestTitle(row.request_text, plan))
  const estimatedMinutes = readSummaryValue<number>(row.summary, "estimatedMinutes", estimateWhileYouRestMinutes(plan))
  const finished = controlState === "ended" || ["completed", "partial", "failed"].includes(status)
  const completedAt = finished ? row.completed_at ?? new Date().toISOString() : row.completed_at

  return {
    id: row.id,
    title,
    requestText: row.request_text,
    status,
    displayStatus,
    controlState,
    isFinished: finished,
    items,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt,
    elapsedLabel: formatElapsedLabel(row.started_at ?? row.created_at, completedAt),
    estimatedMinutes,
    summary: {
      ...summary,
      title,
      controlState,
      estimatedMinutes,
    },
  }
}

async function getPlanRow(planId: string, workspaceId: string, adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>) {
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

  return { data }
}

async function updatePlanSummary({
  adminClient,
  row,
  summary,
  status,
  completedAt,
}: {
  adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
  row: WhileYouRestPlanRow
  summary: Record<string, unknown>
  status?: PlanStatus
  completedAt?: string | null
}) {
  const { data, error } = await adminClient
    .from("while_you_rest_plans")
    .update({
      status: status ?? row.status,
      completed_at: completedAt === undefined ? row.completed_at : completedAt,
      summary,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .select("*")
    .single<WhileYouRestPlanRow>()

  if (error || !data) {
    return { error: error?.message ?? "Nao foi possivel atualizar a execucao." }
  }

  return { data }
}

async function updatePendingJobsAvailability({
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
        nextStep: buildWhileYouRestNextStep(planDraft.items),
      },
    })
    .select("*")
    .single<WhileYouRestPlanRow>()

  if (error || !data) {
    return { error: error?.message ?? "Nao foi possivel montar o plano agora." }
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

  const planRow = await getPlanRow(planId, actor.workspaceId, actor.adminClient)
  if ("error" in planRow) {
    return { error: planRow.error }
  }

  const row = planRow.data
  const planItems = row.plan ?? []
  const createdJobIds: string[] = [...(row.job_ids ?? [])]

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

  const executableCount = planItems.filter((item) => item.kind === "executable").length
  const waitingConfirmationCount = planItems.filter((item) => item.kind === "waiting_confirmation").length
  const unsupportedCount = planItems.filter((item) => item.kind === "unsupported").length

  const summary = {
    ...(row.summary ?? {}),
    controlState: "running",
    executableCount,
    waitingConfirmationCount,
    unsupportedCount,
    estimatedMinutes: readSummaryValue<number>(row.summary, "estimatedMinutes", estimateWhileYouRestMinutes(planItems)),
    title: readSummaryValue<string>(row.summary, "title", buildWhileYouRestTitle(row.request_text, planItems)),
    nextStep: buildWhileYouRestNextStep(planItems),
  }

  const { data: updated, error: updateError } = await actor.adminClient
    .from("while_you_rest_plans")
    .update({
      job_ids: createdJobIds,
      status: executableCount > 0 ? "running" : waitingConfirmationCount > 0 ? "waiting_confirmation" : "failed",
      started_at: row.started_at ?? new Date().toISOString(),
      summary,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .select("*")
    .single<WhileYouRestPlanRow>()

  if (updateError || !updated) {
    return { error: updateError?.message ?? "Nao foi possivel iniciar o plano." }
  }

  return {
    success: true,
    plan: await hydratePlan(updated, actor.adminClient),
  }
}

export async function pauseWhileYouRestPlanAction(planId: string) {
  const actor = await getWhileYouRestActor()
  if ("error" in actor) {
    return { error: actor.error }
  }

  const planRow = await getPlanRow(planId, actor.workspaceId, actor.adminClient)
  if ("error" in planRow) {
    return { error: planRow.error }
  }

  const row = planRow.data
  const futureDate = new Date(Date.now() + PAUSE_DELAY_DAYS * 24 * 60 * 60 * 1000).toISOString()
  await updatePendingJobsAvailability({
    adminClient: actor.adminClient,
    jobIds: (row.job_ids ?? []).filter(Boolean),
    availableAt: futureDate,
  })

  const updated = await updatePlanSummary({
    adminClient: actor.adminClient,
    row,
    status: "running",
    summary: {
      ...(row.summary ?? {}),
      controlState: "paused",
    },
  })

  if ("error" in updated) {
    return { error: updated.error }
  }

  return {
    success: true,
    plan: await hydratePlan(updated.data, actor.adminClient),
  }
}

export async function continueWhileYouRestPlanAction(planId: string) {
  const actor = await getWhileYouRestActor()
  if ("error" in actor) {
    return { error: actor.error }
  }

  const planRow = await getPlanRow(planId, actor.workspaceId, actor.adminClient)
  if ("error" in planRow) {
    return { error: planRow.error }
  }

  const row = planRow.data
  await updatePendingJobsAvailability({
    adminClient: actor.adminClient,
    jobIds: (row.job_ids ?? []).filter(Boolean),
    availableAt: new Date().toISOString(),
  })

  const updated = await updatePlanSummary({
    adminClient: actor.adminClient,
    row,
    status: "running",
    summary: {
      ...(row.summary ?? {}),
      controlState: "running",
    },
  })

  if ("error" in updated) {
    return { error: updated.error }
  }

  return {
    success: true,
    plan: await hydratePlan(updated.data, actor.adminClient),
  }
}

export async function endWhileYouRestPlanAction(planId: string) {
  const actor = await getWhileYouRestActor()
  if ("error" in actor) {
    return { error: actor.error }
  }

  const planRow = await getPlanRow(planId, actor.workspaceId, actor.adminClient)
  if ("error" in planRow) {
    return { error: planRow.error }
  }

  const row = planRow.data
  const futureDate = new Date(Date.now() + PAUSE_DELAY_DAYS * 24 * 60 * 60 * 1000).toISOString()
  await updatePendingJobsAvailability({
    adminClient: actor.adminClient,
    jobIds: (row.job_ids ?? []).filter(Boolean),
    availableAt: futureDate,
  })

  const updated = await updatePlanSummary({
    adminClient: actor.adminClient,
    row,
    summary: {
      ...(row.summary ?? {}),
      controlState: "ended",
    },
    completedAt: row.completed_at ?? new Date().toISOString(),
  })

  if ("error" in updated) {
    return { error: updated.error }
  }

  return {
    success: true,
    plan: await hydratePlan(updated.data, actor.adminClient),
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
