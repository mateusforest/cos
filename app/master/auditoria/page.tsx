"use client"

import { useState } from "react"
import { type LucideIcon } from "lucide-react"
import { MasterHeader } from "@/components/master/master-header"
import { MasterPageHeader, TableCard } from "@/components/master/master-ui"

type Log = {
  acao: string
  tipo: string
  ator: string
  alvo: string
  data: string
  icon: LucideIcon
}

const logs: Log[] = []

const filtros = ["Todos", "Usuário", "Assinatura", "Integração", "Workspace", "Sessão", "Sistema"]

export default function MasterAuditoriaPage() {
  const [filtro, setFiltro] = useState("Todos")
  const filtrados = logs.filter((l) => filtro === "Todos" || l.tipo === filtro)

  return (
    <div className="flex-1 flex flex-col h-full">
      <MasterHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <MasterPageHeader title="Auditoria" description="Registro de eventos e ações realizadas na plataforma." />

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
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="text-left text-xs font-medium text-muted-foreground border-b border-gray-100">
                  <th className="px-5 py-3">Evento</th>
                  <th className="px-5 py-3">Tipo</th>
                  <th className="px-5 py-3">Responsável</th>
                  <th className="px-5 py-3">Detalhe</th>
                  <th className="px-5 py-3 text-right">Data</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((l, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <l.icon className="w-4 h-4 text-gray-600" />
                        </span>
                        <span className="text-sm font-medium">{l.acao}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{l.tipo}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{l.ator}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{l.alvo}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground text-right">{l.data}</td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-sm text-muted-foreground">
                      {filtro === "Todos" ? "Nenhum log registrado ainda." : "Nenhum evento neste filtro."}
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
