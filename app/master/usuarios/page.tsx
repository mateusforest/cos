"use client"

import { useState } from "react"
import { Plus, Search } from "lucide-react"
import { MasterHeader } from "@/components/master/master-header"
import { MasterPageHeader, TableCard, StatusBadge, PrimaryButton } from "@/components/master/master-ui"
import { useMaster } from "@/components/master/master-store"

type Usuario = {
  nome: string
  email: string
  workspace: string
  tipo: string
  ultimoAcesso: string
  status: string
}

const usuarios: Usuario[] = []

export default function MasterUsuariosPage() {
  const { openModal } = useMaster()
  const [busca, setBusca] = useState("")

  const filtrados = usuarios.filter(
    (u) =>
      u.nome.toLowerCase().includes(busca.toLowerCase()) ||
      u.email.toLowerCase().includes(busca.toLowerCase()) ||
      u.workspace.toLowerCase().includes(busca.toLowerCase()),
  )

  return (
    <div className="flex-1 flex flex-col h-full">
      <MasterHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <MasterPageHeader
            title="Usuários"
            description="Lista global de usuários em todos os workspaces da plataforma."
            actions={<PrimaryButton icon={Plus} onClick={() => openModal("usuario")}>Novo usuário</PrimaryButton>}
          />

          <TableCard
            toolbar={
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar nome, e-mail ou workspace..."
                  className="w-full sm:w-72 pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
            }
          >
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="text-left text-xs font-medium text-muted-foreground border-b border-gray-100">
                  <th className="px-5 py-3">Nome</th>
                  <th className="px-5 py-3">E-mail</th>
                  <th className="px-5 py-3">Workspace</th>
                  <th className="px-5 py-3">Papel</th>
                  <th className="px-5 py-3">Último acesso</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((u) => (
                  <tr key={u.email} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600 flex-shrink-0">
                          {u.nome.charAt(0)}
                        </span>
                        <span className="text-sm font-medium">{u.nome}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{u.email}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{u.workspace}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{u.tipo}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{u.ultimoAcesso}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={u.status} /></td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">
                      {busca ? "Nenhum usuário encontrado." : "Nenhum usuário cadastrado ainda."}
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
