"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Wallet, TrendingUp, TrendingDown, Plus, Download, Clock, CheckCircle2 } from "lucide-react"
import { PortalHeader, PortalPageHeader } from "@/components/portal/portal-header"
import { usePortalInteractions } from "@/components/portal/portal-interactions"
import { toast } from "@/hooks/use-toast"

const kpis = [
  { label: "Saldo atual", value: "R$ 0,00", sublabel: "Nenhum registro ainda", icon: Wallet, color: "text-emerald-500" },
  { label: "Ganhos do mês", value: "R$ 0,00", sublabel: "Nenhuma entrada", icon: TrendingUp, color: "text-emerald-500" },
  { label: "Gastos do mês", value: "R$ 0,00", sublabel: "Nenhuma saída", icon: TrendingDown, color: "text-red-500" },
  { label: "A receber", value: "R$ 0,00", sublabel: "Nenhuma cobrança pendente", icon: Clock, color: "text-amber-500" },
]

export default function FinanceiroPage() {
  const { openQuickActionForm, openFilters } = usePortalInteractions()

  return (
    <div className="flex-1 flex flex-col h-full">
      <PortalHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between gap-4 mb-8">
            <PortalPageHeader title="Financeiro" description="Acompanhe o fluxo de caixa e as cobranças do seu negócio." />
            <div className="flex items-center gap-2">
              <button
                onClick={() => toast({ title: "Exportação preparada", description: "A exportação real será conectada ao backend." })}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4 text-muted-foreground" />
                Exportar
              </button>
              <button
                onClick={() => openQuickActionForm("operacao")}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#0a0a0a] text-white rounded-xl text-sm hover:bg-gray-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Lançamento
              </button>
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{kpi.label}</span>
                  <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
                <p className="text-2xl font-semibold mb-1">{kpi.value}</p>
                <p className={`text-sm ${kpi.color}`}>{kpi.sublabel}</p>
              </div>
            ))}
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold">Transações recentes</h2>
                <div className="flex items-center gap-2">
                  <button onClick={openFilters} className="text-sm text-muted-foreground hover:text-[#0a0a0a] transition-colors">
                    Filtros
                  </button>
                  <Link href="/portal/balanco" className="text-sm text-muted-foreground hover:text-[#0a0a0a] transition-colors">
                    Ver todas
                  </Link>
                </div>
              </div>
              <div className="py-10 text-center text-sm text-muted-foreground">Nenhum faturamento registrado ainda.</div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white border border-gray-100 rounded-2xl p-6">
              <h2 className="font-semibold mb-5">Cobranças pendentes</h2>
              <div className="py-6 text-center text-sm text-muted-foreground">Nenhuma cobrança pendente ainda.</div>
              <button
                onClick={() => toast({ title: "Recebimento preparado", description: "A confirmação real será concluída quando o backend estiver conectado." })}
                className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 text-sm text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                Registrar recebimento
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
