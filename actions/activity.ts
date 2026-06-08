"use server"

import { getUserAccessForUser } from "@/lib/auth"
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server"

type ActivityRow = {
  id: string
  workspace_id: string | null
  area: string | null
  action: string | null
  description: string | null
  created_at: string | null
}

async function getActivityActor() {
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
    return { error: "SUPABASE_SERVICE_ROLE_KEY não configurada para histórico." as const }
  }

  return {
    workspaceId: access.workspace.id,
    adminClient,
  }
}

export async function getWorkspaceActivityLogsAction() {
  const actor = await getActivityActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const { data, error } = await actor.adminClient
    .from("activity_logs")
    .select("id, workspace_id, area, action, description, created_at")
    .eq("workspace_id", actor.workspaceId)
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<ActivityRow[]>()

  if (error) {
    return { error: error.message }
  }

  return {
    success: true,
    logs: (data ?? []).map((log) => ({
      id: log.id,
      area: log.area || "sistema",
      action: log.action || "activity_logged",
      description: log.description || "Atividade registrada.",
      createdAt: log.created_at,
    })),
  }
}
