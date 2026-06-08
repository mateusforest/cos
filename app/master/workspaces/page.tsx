"use client"

import { useState } from "react"
import { Plus, Search, MoreVertical } from "lucide-react"
import { MasterHeader } from "@/components/master/master-header"
import { MasterPageHeader, TableCard, StatusBadge, PrimaryButton } from "@/components/master/master-ui"
import { useMaster } from "@/components/master/master-store"

type Workspace = {
  nome: string
  tipo: "Operações" | "Connect"
  usuarios: number
  status: string
  plano: string
}

const workspaces: Workspace[] = []

const filtros = ["Todos", "Operações", "Connect"] as const

export default function MasterWorkspacesPage() {
  const { openModal, showToast } = useMaster()
  const [filtro, setFiltro] = useState<(typeof filtros)[number]>("Todos")
  const [busca, setBusca] = useState("")

  const filtrados = workspaces.filter((w) => {
    const matchFiltro = filtro === "Todos" || w.tipo === filtro
    const matchBusca = w.nome.toLowerCase().includes(busca.toLowerCase())
    return matchFiltro && matchBusca
  })

  return (
    <div className="flex-1 flex flex-col h-full">
      <MasterHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <MasterPageHeader
            title="Workspaces"
            description="Ambientes de trabalho provisionados em cada produto do COS."
            actions={<PrimaryButton icon={Plus} onClick={() => openModal("workspace")}>Novo workspace</PrimaryButton>}
          />

          <TableCard
            toolbar={
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar workspace..."
                    className="w-full sm:w-56 pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                  />
                </div>
                <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
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
              </div>
            }
          >
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="text-left text-xs font-medium text-muted-foreground border-b border-gray-100">
                  <th className="px-5 py-3">Nome</th>
                  <th className="px-5 py-3">Tipo</th>
                  <th className="px-5 py-3">Usuários</th>
                  <th className="px-5 py-3">Plano</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((w) => (
                  <tr key={w.nome} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-medium">{w.nome}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{w.tipo}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{w.usuarios}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{w.plano}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={w.status} /></td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => showToast("Ações do workspace disponíveis após o backend.")}
                        aria-label={`Ações de ${w.nome}`}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">
                      {busca || filtro !== "Todos" ? "Nenhum workspace encontrado para os filtros atuais." : "Nenhum workspace encontrado."}
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
