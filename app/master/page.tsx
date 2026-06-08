"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Building2,
  Boxes,
  Users,
  DollarSign,
  Sparkles,
  LifeBuoy,
  Plug,
  ArrowUpRight,
  Plus,
  Loader2,
} from "lucide-react"
import { MasterHeader } from "@/components/master/master-header"
import { MasterPageHeader, KpiCard, StatusBadge, PrimaryButton } from "@/components/master/master-ui"
import { useMaster } from "@/components/master/master-store"
import {
  getMasterDashboardStatsAction,
  getMasterRecentActivityAction,
  getMasterTopClientsAction,
} from "@/actions/master"

type DashboardStats = {
  activeClients: number
  activeWorkspaces: number
  totalUsers: number
  monthlyRevenue: number
  monthlyRevenueLabel: string
  aiUsageTokens: number
  openSupportTickets: number
  activeIntegrations: number
}

type RecentActivity = {
  id: string
  action: string
  description: string
  workspaceName: string
  createdAt: string | null
}

type TopClient = {
  name: string
  type: string
  status: string
  users: number
}

function formatDateLabel(value: string | null) {
  if (!value) {
    return "Agora"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "Agora"
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export default function MasterOverviewPage() {
  const { openModal } = useMaster()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activities, setActivities] = useState<RecentActivity[]>([])
  const [topClients, setTopClients] = useState<TopClient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)

      const [statsResult, activitiesResult, clientsResult] = await Promise.all([
        getMasterDashboardStatsAction(),
        getMasterRecentActivityAction(),
        getMasterTopClientsAction(),
      ])

      const nextError = statsResult.error || activitiesResult.error || clientsResult.error || null

      if (nextError) {
        setError(nextError)
        setStats(null)
        setActivities([])
        setTopClients([])
        setIsLoading(false)
        return
      }

      setStats(statsResult.stats ?? null)
      setActivities((activitiesResult.activities ?? []) as RecentActivity[])
      setTopClients((clientsResult.clients ?? []) as TopClient[])
      setIsLoading(false)
    }

    void load()
  }, [])

  const kpis = [
    { label: "Clientes ativos", value: String(stats?.activeClients ?? 0), sublabel: "Workspaces da plataforma", icon: Building2 },
    { label: "Workspaces ativos", value: String(stats?.activeWorkspaces ?? 0), sublabel: "Operações e Connect", icon: Boxes },
    { label: "Usuários totais", value: String(stats?.totalUsers ?? 0), sublabel: "Perfis cadastrados", icon: Users },
    { label: "Receita mensal", value: stats?.monthlyRevenueLabel ?? "R$ 0,00", sublabel: "Invoices pagas do mês", icon: DollarSign },
    { label: "Uso de IA", value: String(stats?.aiUsageTokens ?? 0), sublabel: "tokens registrados", icon: Sparkles },
    { label: "Chamados abertos", value: String(stats?.openSupportTickets ?? 0), sublabel: "open, in_progress e waiting", icon: LifeBuoy },
    { label: "Integrações ativas", value: String(stats?.activeIntegrations ?? 0), sublabel: "connect_sources conectadas", icon: Plug },
  ]

  return (
    <div className="flex-1 flex flex-col h-full">
      <MasterHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <MasterPageHeader
            title="Painel Master COS"
            description="Visão geral da operação da plataforma."
            actions={<PrimaryButton icon={Plus} onClick={() => openModal("cliente")}>Novo cliente</PrimaryButton>}
          />

          {error && (
            <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando dashboard master...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {kpis.map((kpi, index) => (
                  <KpiCard key={kpi.label} {...kpi} delay={index * 0.04} />
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-6"
                >
                  <h2 className="font-semibold mb-5">Atividade recente</h2>
                  {activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma atividade registrada ainda.</p>
                  ) : (
                    <div className="space-y-1">
                      {activities.map((activity) => (
                        <div key={activity.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                          <span className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
                            <ArrowUpRight className="w-4 h-4 text-gray-500" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{activity.action}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {activity.description}
                              {activity.workspaceName ? ` · ${activity.workspaceName}` : ""}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground flex-shrink-0">{formatDateLabel(activity.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white border border-gray-100 rounded-2xl p-6"
                >
                  <h2 className="font-semibold mb-5">Principais clientes</h2>
                  {topClients.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">Nenhum cliente cadastrado ainda.</p>
                  ) : (
                    <div className="space-y-3">
                      {topClients.map((client) => (
                        <div key={client.name} className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{client.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {client.type} · {client.users} usuário(s)
                            </p>
                          </div>
                          <StatusBadge status={client.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
