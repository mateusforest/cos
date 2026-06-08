"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Plus, LifeBuoy, AlertCircle, Clock, CheckCircle2 } from "lucide-react"
import { MasterHeader } from "@/components/master/master-header"
import { MasterPageHeader, TableCard, StatusBadge, KpiCard, PrimaryButton } from "@/components/master/master-ui"
import { useMaster } from "@/components/master/master-store"

const kpis = [
  { label: "Chamados abertos", value: "0", sublabel: "Nenhum chamado ainda", icon: AlertCircle },
  { label: "Em andamento", value: "0", sublabel: "Nenhum em andamento", icon: Clock },
  { label: "Resolvidos no mês", value: "0", sublabel: "Nenhum resolvido ainda", icon: CheckCircle2 },
  { label: "Satisfação", value: "—", sublabel: "Sem dados ainda", icon: LifeBuoy },
]

type Chamado = {
  id: string
  assunto: string
  categoria: string
  empresa: string
  prioridade: string
  responsavel: string
  status: string
}

const chamados: Chamado[] = []

export default function MasterSuportePage() {
  const { openModal } = useMaster()
  const [filtro, setFiltro] = useState("Todos")
  const filtros = ["Todos", "Aberto", "Em andamento", "Resolvido"]

  const filtrados = chamados.filter((c) => filtro === "Todos" || c.status === filtro)

  return (
    <div className="flex-1 flex flex-col h-full">
      <MasterHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <MasterPageHeader
            title="Suporte"
            description="Chamados e conversas de suporte de toda a plataforma. Compatível com a futura sessão de Suporte do Operações e Connect."
            actions={<PrimaryButton icon={Plus} onClick={() => openModal("chamado")}>Novo chamado</PrimaryButton>}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {kpis.map((kpi, i) => (
              <KpiCard key={kpi.label} {...kpi} delay={i * 0.04} />
            ))}
          </div>

          <TableCard
            toolbar={
              <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 flex-wrap">
                {filtros.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFiltro(f)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      filtro === f ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            }
          >
            <table className="w-full min-w-[820px]">
              <thead>
                <tr className="text-left text-xs font-medium text-muted-foreground border-b border-gray-100">
                  <th className="px-5 py-3">Chamado</th>
                  <th className="px-5 py-3">Categoria</th>
                  <th className="px-5 py-3">Empresa</th>
                  <th className="px-5 py-3">Prioridade</th>
                  <th className="px-5 py-3">Responsável</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium">{c.assunto}</p>
                      <p className="text-xs text-muted-foreground">{c.id}</p>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{c.categoria}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{c.empresa}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={c.prioridade} /></td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{c.responsavel}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">
                      {filtro === "Todos" ? "Nenhum chamado aberto ainda." : "Nenhum chamado nesta categoria."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableCard>
        </div>
      </div>
    </div>
  )
}
