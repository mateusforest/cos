"use client"

import { useEffect, useMemo, useState } from "react"
import { Activity, ExternalLink, Loader2, MonitorCog } from "lucide-react"
import { getWorkspaceActivityLogsAction } from "@/actions/activity"
import { useAuth } from "@/components/auth/auth-provider"

type ActivityLog = {
  id: string
  area: string
  action: string
  actionLabel?: string
  description: string
  createdAt: string | null
}

function formatDateLabel(value: string | null) {
  if (!value) return "Agora"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Agora"

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function humanizeArea(area: string) {
  if (area === "financial") return "Financeiro"
  if (area === "support") return "Suporte"
  if (area === "documents") return "Documentos"
  if (area === "operations") return "Operacoes"
  if (area === "clients") return "Cadastros"
  if (area === "meetings") return "Reunioes"
  return "Sistema"
}

export function SystemActivityManager() {
  const { workspace } = useAuth()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadLogs = async () => {
      setIsLoading(true)
      setError(null)

      const result = await getWorkspaceActivityLogsAction()

      if (!isMounted) {
        return
      }

      if (result.error) {
        setError(result.error)
        setLogs([])
        setIsLoading(false)
        return
      }

      setLogs((result.logs ?? []) as ActivityLog[])
      setIsLoading(false)
    }

    void loadLogs()

    return () => {
      isMounted = false
    }
  }, [])

  const stats = useMemo(() => {
    const supportLogs = logs.filter((log) => log.area === "support").length
    const financialLogs = logs.filter((log) => log.area === "financial").length
    const documentLogs = logs.filter((log) => log.area === "documents").length

    return [
      {
        label: "Atividades recentes",
        value: String(logs.length),
        description: logs.length > 0 ? "Registros reais do workspace" : "Nenhum log registrado ainda.",
      },
      {
        label: "Suporte",
        value: String(supportLogs),
        description: supportLogs > 0 ? "Interacoes reais com chamados" : "Nenhum chamado recente.",
      },
      {
        label: "Financeiro",
        value: String(financialLogs),
        description: financialLogs > 0 ? "Lancamentos recentes registrados" : "Nenhum lancamento recente.",
      },
      {
        label: "Documentos",
        value: String(documentLogs),
        description: documentLogs > 0 ? "Documentos movimentados recentemente" : "Nenhum documento recente.",
      },
    ]
  }, [logs])

  return (
    <div className="max-w-7xl mx-auto w-full px-6 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-[#0a0a0a]">Sistema</h1>
          <p className="text-sm text-gray-500">Acompanhe logs, atividade recente e o sistema principal do workspace.</p>
        </div>
      </div>

      {error && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-gray-100 bg-white p-5">
            <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
            <p className="text-2xl font-semibold text-[#0a0a0a]">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-2">{stat.description}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.5fr),minmax(320px,0.9fr)] gap-6">
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100">
              <Activity className="h-5 w-5 text-gray-600" />
            </span>
            <div>
              <h2 className="font-semibold text-[#0a0a0a]">Atividade recente</h2>
              <p className="text-sm text-gray-500">Logs reais gravados pelas operacoes do workspace.</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center">
              <p className="text-sm text-gray-500">Nenhuma atividade registrada ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="rounded-2xl border border-gray-100 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#0a0a0a]">{log.actionLabel || log.action}</p>
                      <p className="text-sm text-gray-500">{log.description}</p>
                    </div>
                    <span className="text-xs text-gray-400">{formatDateLabel(log.createdAt)}</span>
                  </div>
                  <div className="mt-2">
                    <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                      {humanizeArea(log.area)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100">
                <MonitorCog className="h-5 w-5 text-gray-600" />
              </span>
              <div>
                <h2 className="font-semibold text-[#0a0a0a]">Sistema principal</h2>
                <p className="text-sm text-gray-500">Dados reais do workspace atualmente conectado.</p>
              </div>
            </div>

            <div className="space-y-3">
              <InfoRow label="Nome" value={workspace?.primary_system_name || "Nao configurado"} />
              <InfoRow
                label="Tipo"
                value={String(workspace?.metadata?.primary_system_type || "Nao configurado")}
              />
              <InfoRow
                label="URL"
                value={workspace?.primary_system_url || "Nao configurada"}
                href={workspace?.primary_system_url || undefined}
              />
              <InfoRow
                label="Observacoes"
                value={String(workspace?.metadata?.primary_system_notes || "Nenhuma observacao registrada.")}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({
  label,
  value,
  href,
}: {
  label: string
  value: string
  href?: string
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-gray-400">{label}</p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-[#0a0a0a] hover:text-gray-700"
        >
          {value}
          <ExternalLink className="h-4 w-4 text-gray-400" />
        </a>
      ) : (
        <p className="mt-1 text-sm text-[#0a0a0a]">{value}</p>
      )}
    </div>
  )
}
