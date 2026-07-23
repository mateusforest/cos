"use server"

import { canManageWorkspace, getUserAccessForUser } from "@/lib/auth"
import { createBackgroundJob } from "@/lib/background-jobs"
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server"
import {
  buildWhileYouRestNextStep,
  buildWhileYouRestPlan,
  type WhileYouRestPlanItem,
} from "@/lib/while-you-rest"

type PlanStatus = "draft" | "running" | "completed" | "partial" | "waiting_confirmation" | "failed"

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
}

type PlanItemView = WhileYouRestPlanItem & {
  runtimeStatus: "aguardando" | "em_execucao" | "concluido" | "falhou" | "aguardando_confirmacao" | "nao_suportado"
  jobId: string | null
  result: Record<string, unknown> | null
  error: string | null
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

function summarizePlan(items: PlanItemView[]) {
  const completed = items.filter((item) => item.runtimeStatus === "concluido")
  const failed = items.filter((item) => item.runtimeStatus === "falhou")
  const waitingConfirmation = items.filter((item) => item.runtimeStatus === "aguardando_confirmacao")
  const unsupported = items.filter((item) => item.runtimeStatus === "nao_suportado")
  const running = items.filter((item) => item.runtimeStatus === "em_execucao" || item.runtimeStatus === "aguardando")

  let status: PlanStatus = "draft"

  if (running.length > 0) {
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

  return {
    status,
    summary: {
      completedCount: completed.length,
      failedCount: failed.length,
      waitingConfirmationCount: waitingConfirmation.length,
      unsupportedCount: unsupported.length,
      runningCount: running.length,
      nextStep: buildWhileYouRestNextStep(items),
    },
  }
}

async function hydratePlan(row: WhileYouRestPlanRow, adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>) {
  const plan = row.plan ?? []
  const jobIds = (row.job_ids ?? []).filter(Boolean)

  let jobs: BackgroundJobSnapshot[] = []

  if (jobIds.length > 0) {
    const { data } = await adminClient
      .from("background_jobs")
      .select("id, status, type, result, error, updated_at")
      .in("id", jobIds)
      .returns<BackgroundJobSnapshot[]>()

    jobs = data ?? []
  }

  const jobById = new Map(jobs.map((job) => [job.id, job]))
  const executableJobIds = jobIds

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

  const { status, summary } = summarizePlan(items)

  return {
    id: row.id,
    requestText: row.request_text,
    status,
    items,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    summary,
  }
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

  const { data, error } = await actor.adminClient
    .from("while_you_rest_plans")
    .insert({
      workspace_id: actor.workspaceId,
      user_id: actor.userId,
      request_text: trimmedRequest,
      plan: planDraft.items,
      status: "draft",
      summary: {
        nextStep: buildWhileYouRestNextStep(planDraft.items),
      },
    })
    .select("*")
    .single<WhileYouRestPlanRow>()

  if (error || !data) {
    return { error: error?.message ?? "Nao foi possivel montar o plano agora." }
  }

  const hydrated = await hydratePlan(data, actor.adminClient)

  return {
    success: true,
    plan: hydrated,
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

  const { data, error } = await actor.adminClient
    .from("while_you_rest_plans")
    .select("*")
    .eq("id", planId)
    .eq("workspace_id", actor.workspaceId)
    .maybeSingle<WhileYouRestPlanRow>()

  if (error) {
    return { error: error.message }
  }

  if (!data) {
    return { error: "Plano nao encontrado." }
  }

  if (data.status !== "draft" && data.status !== "running") {
    return {
      success: true,
      plan: await hydratePlan(data, actor.adminClient),
    }
  }

  const planItems = data.plan ?? []
  const createdJobIds: string[] = [...(data.job_ids ?? [])]

  for (const item of planItems) {
    if (item.kind !== "executable") {
      continue
    }

    const result = await createBackgroundJob({
      type: item.actionType,
      payload: item.payload,
      idempotencyKey: `while-you-rest:${data.id}:${item.id}:${item.actionType}`,
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

  const nextStatus: PlanStatus =
    executableCount > 0 ? "running" : waitingConfirmationCount > 0 ? "waiting_confirmation" : "failed"

  const { data: updated, error: updateError } = await actor.adminClient
    .from("while_you_rest_plans")
    .update({
      job_ids: createdJobIds,
      status: nextStatus,
      started_at: data.started_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
      summary: {
        executableCount,
        waitingConfirmationCount,
        unsupportedCount,
        nextStep: buildWhileYouRestNextStep(planItems),
      },
    })
    .eq("id", data.id)
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

export async function getLatestWhileYouRestPlanAction() {
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
    .limit(1)
    .maybeSingle<WhileYouRestPlanRow>()

  if (error) {
    return { error: error.message }
  }

  if (!data) {
    return { success: true, plan: null }
  }

  const hydrated = await hydratePlan(data, actor.adminClient)

  const { error: updateError } = await actor.adminClient
    .from("while_you_rest_plans")
    .update({
      status: hydrated.status,
      completed_at:
        hydrated.status === "completed" || hydrated.status === "partial" || hydrated.status === "failed"
          ? data.completed_at ?? new Date().toISOString()
          : null,
      summary: hydrated.summary,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.id)

  if (updateError) {
    console.error("[while-you-rest] summary-update:", updateError.message)
  }

  return {
    success: true,
    plan: hydrated,
  }
}
