"use server"

import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server"
import { getUserAccessForUser } from "@/lib/auth"

type MasterActor = {
  actorId: string
  profileName: string | null
  profileEmail: string | null
  adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>
}

type WorkspaceRow = {
  id: string
  name: string | null
  type: "operations" | "connect" | null
  owner_id: string | null
  created_at: string | null
}

type ProfileRow = {
  id: string
  full_name: string | null
  email: string | null
  global_role: string | null
  created_at: string | null
}

type WorkspaceMemberRow = {
  workspace_id: string
  user_id: string
  role: string | null
}

type ActivityLogRow = {
  id: string
  workspace_id?: string | null
  action?: string | null
  description?: string | null
  created_at?: string | null
}

type MasterOverviewStats = {
  activeClients: number
  activeWorkspaces: number
  totalUsers: number
  monthlyRevenue: number
  monthlyRevenueLabel: string
  aiUsageTokens: number
  openSupportTickets: number
  activeIntegrations: number
}

function formatMonthBounds() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

async function requireMasterActor() {
  const supabase = await createSupabaseServerClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    return { error: "Sessão inválida. Faça login novamente." as const }
  }

  const access = await getUserAccessForUser(authData.user)

  if (access.profile?.global_role !== "master") {
    return { error: "Acesso restrito à equipe master." as const }
  }

  const adminClient = createSupabaseAdminClient()

  if (!adminClient) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY não configurada para o painel master." as const }
  }

  return {
    actorId: authData.user.id,
    profileName: access.profile?.full_name || null,
    profileEmail: access.profile?.email || authData.user.email || null,
    adminClient,
  } satisfies MasterActor
}

function toCurrencyBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

function normalizeWorkspaceType(value: string | null | undefined) {
  if (value === "operations") return "Operações"
  if (value === "connect") return "Connect"
  return "—"
}

export async function getMasterDashboardStatsAction() {
  const actor = await requireMasterActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const { start, end } = formatMonthBounds()

  const [
    workspacesResult,
    profilesResult,
    openTicketsResult,
    aiUsageResult,
    connectSourcesResult,
    invoicesResult,
  ] = await Promise.all([
    actor.adminClient.from("workspaces").select("id", { count: "exact", head: true }),
    actor.adminClient.from("profiles").select("id", { count: "exact", head: true }),
    actor.adminClient
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "in_progress", "waiting"]),
    actor.adminClient.from("ai_usage_logs").select("*"),
    actor.adminClient.from("connect_sources").select("*").eq("status", "connected"),
    actor.adminClient.from("invoices").select("*"),
  ])

  const workspaceCount = workspacesResult.count ?? 0
  const usersCount = profilesResult.count ?? 0
  const openTicketsCount = openTicketsResult.count ?? 0
  const connectedSourcesCount = Array.isArray(connectSourcesResult.data) ? connectSourcesResult.data.length : 0

  const monthlyInvoices = (Array.isArray(invoicesResult.data) ? invoicesResult.data : []).filter((invoice) => {
    const status = typeof invoice.status === "string" ? invoice.status.toLowerCase() : ""
    const paidAt = typeof invoice.paid_at === "string" ? invoice.paid_at : typeof invoice.created_at === "string" ? invoice.created_at : null
    return status === "paid" && Boolean(paidAt) && paidAt >= start && paidAt < end
  })

  const monthlyRevenue = monthlyInvoices.reduce((sum, invoice) => {
    const amount =
      typeof invoice.amount === "number"
        ? invoice.amount
        : typeof invoice.amount_paid === "number"
          ? invoice.amount_paid
          : typeof invoice.total === "number"
            ? invoice.total
            : 0

    return sum + amount
  }, 0)

  const totalTokens = (Array.isArray(aiUsageResult.data) ? aiUsageResult.data : []).reduce((sum, log) => {
    return sum + (typeof log.total_tokens === "number" ? log.total_tokens : 0)
  }, 0)

  return {
    success: true,
    stats: {
      activeClients: workspaceCount,
      activeWorkspaces: workspaceCount,
      totalUsers: usersCount,
      monthlyRevenue,
      monthlyRevenueLabel: toCurrencyBRL(monthlyRevenue),
      aiUsageTokens: totalTokens,
      openSupportTickets: openTicketsCount,
      activeIntegrations: connectedSourcesCount,
    },
  }
}

export async function getMasterRecentActivityAction() {
  const actor = await requireMasterActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const { data: logs, error } = await actor.adminClient
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(8)
    .returns<ActivityLogRow[]>()

  if (error) {
    return { error: error.message }
  }

  const workspaceIds = Array.from(
    new Set((logs ?? []).map((log) => log.workspace_id).filter((value): value is string => Boolean(value))),
  )

  const workspaceResult =
    workspaceIds.length > 0
      ? await actor.adminClient.from("workspaces").select("id, name").in("id", workspaceIds)
      : { data: [] as { id: string; name: string | null }[] }

  const workspaceMap = new Map((workspaceResult.data ?? []).map((workspace) => [workspace.id, workspace.name]))

  return {
    success: true,
    activities: (logs ?? []).map((log) => ({
      id: log.id,
      action: log.action || "activity_logged",
      description: log.description || "Atividade registrada.",
      workspaceName: log.workspace_id ? workspaceMap.get(log.workspace_id) || "Workspace sem nome" : "",
      createdAt: log.created_at || null,
    })),
  }
}

export async function getMasterOverviewAction() {
  const actor = await requireMasterActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const { start, end } = formatMonthBounds()

  const [
    workspacesResult,
    profilesResult,
    openTicketsResult,
    aiUsageResult,
    connectSourcesResult,
    invoicesResult,
    logsResult,
    membersResult,
  ] = await Promise.all([
    actor.adminClient.from("workspaces").select("id, name, type, owner_id, created_at", { count: "exact" }).returns<WorkspaceRow[]>(),
    actor.adminClient.from("profiles").select("id", { count: "exact", head: true }),
    actor.adminClient
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "in_progress", "waiting"]),
    actor.adminClient.from("ai_usage_logs").select("total_tokens"),
    actor.adminClient.from("connect_sources").select("id").eq("status", "connected"),
    actor.adminClient.from("invoices").select("*"),
    actor.adminClient
      .from("activity_logs")
      .select("id, workspace_id, action, description, created_at")
      .order("created_at", { ascending: false })
      .limit(8)
      .returns<ActivityLogRow[]>(),
    actor.adminClient.from("workspace_members").select("workspace_id, user_id, role").returns<WorkspaceMemberRow[]>(),
  ])

  const error =
    workspacesResult.error ||
    profilesResult.error ||
    openTicketsResult.error ||
    aiUsageResult.error ||
    connectSourcesResult.error ||
    invoicesResult.error ||
    logsResult.error ||
    membersResult.error

  if (error) {
    return { error: error.message }
  }

  const workspaces = workspacesResult.data ?? []
  const members = membersResult.data ?? []
  const logs = logsResult.data ?? []

  const monthlyInvoices = (Array.isArray(invoicesResult.data) ? invoicesResult.data : []).filter((invoice) => {
    const status = typeof invoice.status === "string" ? invoice.status.toLowerCase() : ""
    const paidAt = typeof invoice.paid_at === "string" ? invoice.paid_at : typeof invoice.created_at === "string" ? invoice.created_at : null
    return status === "paid" && Boolean(paidAt) && paidAt >= start && paidAt < end
  })

  const monthlyRevenue = monthlyInvoices.reduce((sum, invoice) => {
    const amount =
      typeof invoice.amount === "number"
        ? invoice.amount
        : typeof invoice.amount_paid === "number"
          ? invoice.amount_paid
          : typeof invoice.total === "number"
            ? invoice.total
            : 0

    return sum + amount
  }, 0)

  const totalTokens = (Array.isArray(aiUsageResult.data) ? aiUsageResult.data : []).reduce((sum, log) => {
    return sum + (typeof log.total_tokens === "number" ? log.total_tokens : 0)
  }, 0)

  const workspaceMap = new Map(workspaces.map((workspace) => [workspace.id, workspace]))
  const memberCounts = new Map<string, number>()

  members.forEach((member) => {
    memberCounts.set(member.workspace_id, (memberCounts.get(member.workspace_id) ?? 0) + 1)
  })

  const topClients = [...workspaces]
    .map((workspace) => ({
      name: workspace.name || "Workspace sem nome",
      type: normalizeWorkspaceType(workspace.type),
      status: "Ativo",
      users: memberCounts.get(workspace.id) ?? 0,
    }))
    .sort((left, right) => right.users - left.users)
    .slice(0, 5)

  return {
    success: true,
    overview: {
      stats: {
        activeClients: workspaces.length,
        activeWorkspaces: workspaces.length,
        totalUsers: profilesResult.count ?? 0,
        monthlyRevenue,
        monthlyRevenueLabel: toCurrencyBRL(monthlyRevenue),
        aiUsageTokens: totalTokens,
        openSupportTickets: openTicketsResult.count ?? 0,
        activeIntegrations: Array.isArray(connectSourcesResult.data) ? connectSourcesResult.data.length : 0,
      } satisfies MasterOverviewStats,
      activities: logs.map((log) => ({
        id: log.id,
        action: log.action || "activity_logged",
        description: log.description || "Atividade registrada.",
        workspaceName: log.workspace_id ? workspaceMap.get(log.workspace_id)?.name || "Workspace sem nome" : "",
        createdAt: log.created_at || null,
      })),
      topClients,
    },
  }
}

export async function getMasterClientsAction() {
  const actor = await requireMasterActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const [{ data: workspaces, error: workspaceError }, { data: members, error: membersError }] = await Promise.all([
    actor.adminClient
      .from("workspaces")
      .select("id, name, type, owner_id, created_at")
      .order("created_at", { ascending: false })
      .returns<WorkspaceRow[]>(),
    actor.adminClient
      .from("workspace_members")
      .select("workspace_id, user_id, role")
      .returns<WorkspaceMemberRow[]>(),
  ])

  if (workspaceError) {
    return { error: workspaceError.message }
  }

  if (membersError) {
    return { error: membersError.message }
  }

  const memberCounts = new Map<string, number>()
  ;(members ?? []).forEach((member) => {
    memberCounts.set(member.workspace_id, (memberCounts.get(member.workspace_id) ?? 0) + 1)
  })

  return {
    success: true,
    clients: (workspaces ?? []).map((workspace) => ({
      id: workspace.id,
      company: workspace.name || "Workspace sem nome",
      type: normalizeWorkspaceType(workspace.type),
      users: memberCounts.get(workspace.id) ?? 0,
      status: "Ativo",
      createdAt: workspace.created_at,
    })),
  }
}

export async function getMasterWorkspacesAction() {
  const actor = await requireMasterActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const [{ data: workspaces, error: workspaceError }, { data: members, error: membersError }, { data: profiles, error: profilesError }] =
    await Promise.all([
      actor.adminClient
        .from("workspaces")
        .select("id, name, type, owner_id, created_at")
        .order("created_at", { ascending: false })
        .returns<WorkspaceRow[]>(),
      actor.adminClient
        .from("workspace_members")
        .select("workspace_id, user_id, role")
        .returns<WorkspaceMemberRow[]>(),
      actor.adminClient
        .from("profiles")
        .select("id, full_name, email, global_role, created_at")
        .returns<ProfileRow[]>(),
    ])

  if (workspaceError) return { error: workspaceError.message }
  if (membersError) return { error: membersError.message }
  if (profilesError) return { error: profilesError.message }

  const memberCounts = new Map<string, number>()
  ;(members ?? []).forEach((member) => {
    memberCounts.set(member.workspace_id, (memberCounts.get(member.workspace_id) ?? 0) + 1)
  })

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]))

  return {
    success: true,
    workspaces: (workspaces ?? []).map((workspace) => {
      const owner = workspace.owner_id ? profileMap.get(workspace.owner_id) : null
      return {
        id: workspace.id,
        name: workspace.name || "Workspace sem nome",
        type: normalizeWorkspaceType(workspace.type),
        ownerName: owner?.full_name || owner?.email || "Sem owner",
        members: memberCounts.get(workspace.id) ?? 0,
        createdAt: workspace.created_at,
        status: "Ativo",
      }
    }),
  }
}

export async function getMasterUsersAction() {
  const actor = await requireMasterActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const [{ data: profiles, error: profilesError }, { data: members, error: membersError }, { data: workspaces, error: workspacesError }] =
    await Promise.all([
      actor.adminClient
        .from("profiles")
        .select("id, full_name, email, global_role, created_at")
        .order("created_at", { ascending: false })
        .returns<ProfileRow[]>(),
      actor.adminClient
        .from("workspace_members")
        .select("workspace_id, user_id, role")
        .returns<WorkspaceMemberRow[]>(),
      actor.adminClient
        .from("workspaces")
        .select("id, name, type, owner_id, created_at")
        .returns<WorkspaceRow[]>(),
    ])

  if (profilesError) return { error: profilesError.message }
  if (membersError) return { error: membersError.message }
  if (workspacesError) return { error: workspacesError.message }

  const workspaceMap = new Map((workspaces ?? []).map((workspace) => [workspace.id, workspace]))
  const membershipsByUser = new Map<string, WorkspaceMemberRow[]>()

  ;(members ?? []).forEach((member) => {
    const current = membershipsByUser.get(member.user_id) ?? []
    current.push(member)
    membershipsByUser.set(member.user_id, current)
  })

  return {
    success: true,
    users: (profiles ?? []).map((profile) => {
      const userMemberships = membershipsByUser.get(profile.id) ?? []
      const workspaceNames = userMemberships
        .map((membership) => workspaceMap.get(membership.workspace_id)?.name || "Workspace sem nome")
        .filter(Boolean)

      return {
        id: profile.id,
        fullName: profile.full_name || profile.email || "Usuário sem nome",
        email: profile.email || "Sem e-mail",
        globalRole: profile.global_role || "user",
        workspaces: workspaceNames,
        createdAt: profile.created_at,
      }
    }),
  }
}

export async function getMasterTopClientsAction() {
  const clientsResult = await getMasterClientsAction()

  if (clientsResult.error) {
    return { error: clientsResult.error }
  }

  const topClients = [...(clientsResult.clients ?? [])]
    .sort((left, right) => right.users - left.users)
    .slice(0, 5)
    .map((client) => ({
      name: client.company,
      type: client.type,
      status: client.status,
      users: client.users,
    }))

  return {
    success: true,
    clients: topClients,
  }
}

export async function getMasterSettingsOverviewAction() {
  const actor = await requireMasterActor()

  if ("error" in actor) {
    return { error: actor.error }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || null
  const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || "development"

  return {
    success: true,
    settings: {
      platformName: "COS",
      appUrl: supabaseUrl,
      environment,
      status: "Ativo",
      aiConfigured: Boolean(process.env.OPENAI_API_KEY),
      stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
      integrations: [
        { name: "Supabase", status: process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Configurado" : "Nao configurado" },
        { name: "OpenAI", status: process.env.OPENAI_API_KEY ? "Configurado" : "Nao configurado" },
        { name: "Stripe", status: process.env.STRIPE_SECRET_KEY ? "Configurado" : "Nao configurado" },
        { name: "WhatsApp", status: "Em preparacao" },
        { name: "E-mail", status: "Em preparacao" },
      ],
      currentUser: {
        name: actor.profileName || actor.profileEmail || "Equipe COS",
        email: actor.profileEmail || "",
        role: "master",
      },
    },
  }
}
