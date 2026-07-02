"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Mail, Plus, Shield, UserPlus, Users } from "lucide-react"
import { addWorkspaceMemberAction, getWorkspaceMembersAction } from "@/actions/workspace"
import { useAuth } from "@/components/auth/auth-provider"
import { PortalHeader, PortalPageHeader } from "@/components/portal/portal-header"

type WorkspaceMember = {
  userId: string
  role: string
  fullName: string
  email: string
}

type InviteForm = {
  email: string
  password: string
  role: "owner" | "admin" | "member"
}

const defaultInvite: InviteForm = {
  email: "",
  password: "",
  role: "member",
}

function formatRole(role: string) {
  if (role === "owner") return "Proprietario"
  if (role === "admin") return "Admin"
  return "Membro"
}

export default function EquipePage() {
  const { canManageWorkspace, membershipRole } = useAuth()
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInviting, setIsInviting] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [invite, setInvite] = useState<InviteForm>(defaultInvite)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const loadMembers = async () => {
    setIsLoading(true)
    setError(null)

    const result = await getWorkspaceMembersAction()

    if (result.error) {
      setMembers([])
      setError(result.error)
      setIsLoading(false)
      return
    }

    setMembers((result.members ?? []) as WorkspaceMember[])
    setIsLoading(false)
  }

  useEffect(() => {
    void loadMembers()
  }, [])

  const stats = useMemo(() => {
    const owners = members.filter((member) => member.role === "owner").length
    const admins = members.filter((member) => member.role === "admin").length
    const activeRoles = new Set(members.map((member) => member.role)).size

    return [
      {
        label: "Membros ativos",
        value: String(members.length),
        description: members.length > 0 ? "Usuarios reais do workspace" : "Nenhum usuario cadastrado ainda.",
      },
      {
        label: "Papeis ativos",
        value: String(activeRoles),
        description: activeRoles > 0 ? "Niveis de acesso em uso" : "Nenhum papel atribuido ainda.",
      },
      {
        label: "Administradores",
        value: String(admins),
        description: admins > 0 ? "Membros com acesso administrativo" : "Nenhum admin configurado.",
      },
      {
        label: "Proprietarios",
        value: String(owners),
        description: owners > 0 ? "Owners vinculados ao workspace" : "Nenhum owner encontrado.",
      },
    ]
  }, [members])

  const submitInvite = async () => {
    setIsInviting(true)
    setError(null)
    setFeedback(null)

    const result = await addWorkspaceMemberAction({
      email: invite.email,
      password: invite.password,
      role: invite.role,
    })

    setIsInviting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setFeedback("Membro adicionado ao workspace com conta criada com sucesso.")
    setInvite(defaultInvite)
    setInviteOpen(false)
    await loadMembers()
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <PortalHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between gap-4 mb-8">
            <PortalPageHeader title="Equipe" description="Gerencie membros e niveis de acesso reais do workspace." />
            {canManageWorkspace && (
              <button
                onClick={() => {
                  setInviteOpen((prev) => !prev)
                  setError(null)
                  setFeedback(null)
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#0a0a0a] text-white rounded-xl text-sm hover:bg-gray-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Adicionar membro
              </button>
            )}
          </div>

          {error && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
          {feedback && <div className="mb-4 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">{feedback}</div>}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((item) => (
              <div key={item.label} className="bg-white border border-gray-100 rounded-2xl p-5">
                <p className="text-sm text-muted-foreground mb-1">{item.label}</p>
                <p className="text-2xl font-semibold">{item.value}</p>
                <p className="text-sm text-muted-foreground mt-2">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-5">
                <div>
                  <h2 className="font-semibold">Membros</h2>
                  <p className="text-sm text-muted-foreground">Lista real de usuarios vinculados ao workspace atual.</p>
                </div>
                <div className="text-sm text-muted-foreground">
                  Papel atual: {formatRole(membershipRole || "member")}
                </div>
              </div>

              {inviteOpen && canManageWorkspace && (
                <div className="mb-5 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr),minmax(0,1fr),180px,auto] gap-3">
                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium text-[#0a0a0a]">E-mail</span>
                      <input
                        type="email"
                        value={invite.email}
                        onChange={(event) => setInvite((prev) => ({ ...prev, email: event.target.value }))}
                        placeholder="usuario@empresa.com"
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                      />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium text-[#0a0a0a]">Senha</span>
                      <input
                        type="password"
                        value={invite.password}
                        onChange={(event) => setInvite((prev) => ({ ...prev, password: event.target.value }))}
                        placeholder="Minimo de 6 caracteres"
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                      />
                    </label>
                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium text-[#0a0a0a]">Papel</span>
                      <select
                        value={invite.role}
                        onChange={(event) => setInvite((prev) => ({ ...prev, role: event.target.value as InviteForm["role"] }))}
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                      >
                        <option value="member">Membro</option>
                        <option value="admin">Admin</option>
                        <option value="owner">Proprietario</option>
                      </select>
                    </label>
                    <div className="flex items-end">
                      <button
                        onClick={submitInvite}
                        disabled={isInviting || !invite.email.trim() || !invite.password.trim()}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isInviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                        {isInviting ? "Criando..." : "Adicionar"}
                      </button>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-gray-500">
                    O membro sera criado com e-mail, senha e papel e vinculado ao workspace atual.
                  </p>
                </div>
              )}

              {isLoading ? (
                <div className="flex items-center justify-center py-16 text-sm text-gray-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Carregando equipe...
                </div>
              ) : members.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center">
                  <p className="text-sm text-muted-foreground">Nenhum usuario cadastrado ainda.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-gray-100">
                  {members.map((member) => (
                    <div key={member.userId} className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600">
                        {member.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#0a0a0a]">{member.fullName}</p>
                        <p className="truncate text-xs text-gray-500">{member.email}</p>
                      </div>
                      <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                        {formatRole(member.role)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-white border border-gray-100 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-muted-foreground" />
                  <h2 className="font-semibold">Permissoes</h2>
                </div>
                <div className="space-y-3">
                  <InfoRow
                    icon={Users}
                    label="Gestao do workspace"
                    value={canManageWorkspace ? "Liberada para esta conta" : "Somente leitura"}
                  />
                  <InfoRow
                    icon={Mail}
                    label="Contas"
                    value={canManageWorkspace ? "Criacao direta de membros habilitada" : "Indisponivel para este perfil"}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Shield
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-[#0a0a0a]">{label}</span>
      </div>
      <p className="text-sm text-gray-500">{value}</p>
    </div>
  )
}
