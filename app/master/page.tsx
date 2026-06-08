"use client"

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
} from "lucide-react"
import { MasterHeader } from "@/components/master/master-header"
import { MasterPageHeader, KpiCard, StatusBadge, PrimaryButton } from "@/components/master/master-ui"
import { useMaster } from "@/components/master/master-store"

const kpis = [
  { label: "Clientes ativos", value: "0", sublabel: "Nenhum cliente ainda", icon: Building2 },
  { label: "Workspaces ativos", value: "0", sublabel: "Operações e Connect", icon: Boxes },
  { label: "Usuários totais", value: "0", sublabel: "Nenhum usuário ainda", icon: Users },
  { label: "Receita mensal", value: "R$ 0,00", sublabel: "MRR estimado", icon: DollarSign },
  { label: "Uso de IA", value: "0", sublabel: "tokens no mês", icon: Sparkles },
  { label: "Chamados abertos", value: "0", sublabel: "Nenhum chamado ainda", icon: LifeBuoy },
  { label: "Integrações ativas", value: "0", sublabel: "Nenhuma conectada", icon: Plug },
]

const recentActivity: { title: string; desc: string; time: string }[] = []

const topClients: { name: string; type: string; plan: string; status: string }[] = []

export default function MasterOverviewPage() {
  const { openModal } = useMaster()

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

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {kpis.map((kpi, i) => (
              <KpiCard key={kpi.label} {...kpi} delay={i * 0.04} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Atividade recente */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-6"
            >
              <h2 className="font-semibold mb-5">Atividade recente</h2>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma atividade registrada ainda.</p>
              ) : (
                <div className="space-y-1">
                  {recentActivity.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                      <span className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
                        <ArrowUpRight className="w-4 h-4 text-gray-500" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{a.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{a.desc}</p>
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{a.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Principais clientes */}
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
                  {topClients.map((c, i) => (
                    <div key={i} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.type} · {c.plan}
                        </p>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
