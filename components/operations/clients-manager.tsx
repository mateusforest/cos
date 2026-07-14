"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Pencil, Plus, Search, Trash2, UserPlus } from "lucide-react"
import {
  createClientAction,
  deleteClientAction,
  getClientsAction,
  updateClientAction,
  type ClientStatus,
} from "@/actions/clients"
import { useAuth } from "@/components/auth/auth-provider"

type ClientRecord = {
  id: string
  name: string
  email: string
  phone: string
  company: string
  notes: string
  status: ClientStatus
  createdAt: string | null
}

type ClientFormState = {
  name: string
  email: string
  phone: string
  company: string
  procedure: string
  professional: string
  notes: string
  status: ClientStatus
}

const defaultForm: ClientFormState = {
  name: "",
  email: "",
  phone: "",
  company: "",
  procedure: "",
  professional: "",
  notes: "",
  status: "active",
}

function formatDateLabel(value: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

function statusLabel(status: ClientStatus) {
  return status === "archived" ? "Arquivado" : "Ativo"
}

function parseClinicNotes(value: string) {
  const lines = value.split("\n")
  let procedure = ""
  let professional = ""
  const notes: string[] = []

  for (const line of lines) {
    if (line.startsWith("Procedimento: ")) {
      procedure = line.replace("Procedimento: ", "").trim()
      continue
    }

    if (line.startsWith("Profissional: ")) {
      professional = line.replace("Profissional: ", "").trim()
      continue
    }

    if (line.startsWith("Observacoes: ")) {
      notes.push(line.replace("Observacoes: ", "").trim())
      continue
    }

    if (line.trim()) {
      notes.push(line.trim())
    }
  }

  return {
    procedure,
    professional,
    notes: notes.join("\n").trim(),
  }
}

function buildClinicNotes(form: ClientFormState) {
  return [
    form.procedure ? `Procedimento: ${form.procedure.trim()}` : "",
    form.professional ? `Profissional: ${form.professional.trim()}` : "",
    form.notes ? `Observacoes: ${form.notes.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n")
}

export function ClientsManager({
  title,
  description,
  variant,
  mode = "default",
}: {
  title: string
  description: string
  variant: "app" | "portal"
  mode?: "default" | "clinic"
}) {
  const isClinicMode = mode === "clinic"
  const { canManageWorkspace } = useAuth()
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | ClientStatus>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingClientId, setEditingClientId] = useState<string | null>(null)
  const [form, setForm] = useState<ClientFormState>(defaultForm)

  const loadClients = async () => {
    setIsLoading(true)
    setError(null)

    const result = await getClientsAction()

    if (result.error) {
      setError(result.error)
      setClients([])
      setIsLoading(false)
      return
    }

    setClients((result.clients ?? []) as ClientRecord[])
    setIsLoading(false)
  }

  useEffect(() => {
    void loadClients()
  }, [])

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesFilter = filter === "all" ? true : client.status === filter
      const term = search.trim().toLowerCase()
      const clinicNotes = isClinicMode ? parseClinicNotes(client.notes) : null
      const matchesSearch =
        !term ||
        [client.name, client.email, client.company, client.phone, clinicNotes?.procedure ?? "", clinicNotes?.professional ?? "", clinicNotes?.notes ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(term)

      return matchesFilter && matchesSearch
    })
  }, [clients, filter, isClinicMode, search])

  const startCreate = () => {
    setEditingClientId(null)
    setForm(defaultForm)
    setError(null)
    setFeedback(null)
    setModalOpen(true)
  }

  const startEdit = (client: ClientRecord) => {
    const clinicNotes = parseClinicNotes(client.notes)

    setEditingClientId(client.id)
    setForm({
      name: client.name,
      email: client.email,
      phone: client.phone,
      company: client.company,
      procedure: isClinicMode ? clinicNotes.procedure : "",
      professional: isClinicMode ? clinicNotes.professional : "",
      notes: isClinicMode ? clinicNotes.notes : client.notes,
      status: client.status,
    })
    setError(null)
    setFeedback(null)
    setModalOpen(true)
  }

  const submit = async () => {
    setIsSaving(true)
    setError(null)
    setFeedback(null)

    const payload = {
      ...form,
      notes: isClinicMode ? buildClinicNotes(form) : form.notes,
    }

    const result = editingClientId
      ? await updateClientAction({
          clientId: editingClientId,
          ...payload,
        })
      : await createClientAction(payload)

    setIsSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setFeedback(
      editingClientId
        ? isClinicMode
          ? "Paciente atualizado com sucesso."
          : "Cliente atualizado com sucesso."
        : isClinicMode
          ? "Paciente criado com sucesso."
          : "Cliente criado com sucesso.",
    )
    setModalOpen(false)
    await loadClients()
  }

  const archiveClient = async (clientId: string) => {
    setError(null)
    setFeedback(null)

    const result = await deleteClientAction({ clientId })

    if (result.error) {
      setError(result.error)
      return
    }

    setFeedback(isClinicMode ? "Paciente arquivado com sucesso." : "Cliente arquivado com sucesso.")
    await loadClients()
  }

  return (
    <div className={variant === "portal" ? "flex-1 flex flex-col h-full" : ""}>
      <div className={variant === "portal" ? "max-w-7xl mx-auto w-full px-6 py-8" : "px-4 py-4 max-w-6xl mx-auto"}>
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#0a0a0a]">{title}</h1>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
          <button
            onClick={startCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0a0a0a] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]"
          >
            <Plus className="h-4 w-4" />
            {isClinicMode ? "Novo paciente" : "Novo cliente"}
          </button>
        </div>

        {error && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {feedback && <div className="mb-4 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">{feedback}</div>}

        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={isClinicMode ? "Buscar por paciente, convenio, procedimento ou profissional..." : "Buscar por nome, e-mail, empresa ou telefone..."}
                className="w-full rounded-xl bg-gray-50 px-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Todos", value: "all" as const },
                { label: "Ativos", value: "active" as const },
                { label: "Arquivados", value: "archived" as const },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value)}
                  className={`rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                    filter === option.value ? "border-[#0a0a0a] bg-[#0a0a0a] text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isClinicMode ? "Carregando pacientes..." : "Carregando clientes..."}
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center">
              <p className="text-sm text-gray-500">{isClinicMode ? "Nenhum paciente cadastrado ainda." : "Nenhum cliente cadastrado ainda."}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-500">
                    <th className="px-4 py-3">{isClinicMode ? "Paciente" : "Nome"}</th>
                    <th className="px-4 py-3">{isClinicMode ? "Convenio" : "E-mail"}</th>
                    <th className="px-4 py-3">{isClinicMode ? "Procedimento" : "Telefone"}</th>
                    <th className="px-4 py-3">{isClinicMode ? "Profissional" : "Empresa"}</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Criado em</th>
                    <th className="px-4 py-3 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => {
                    const clinicNotes = isClinicMode ? parseClinicNotes(client.notes) : null

                    return (
                      <tr key={client.id} className="border-b border-gray-50 last:border-0">
                        <td className="px-4 py-3.5 text-sm font-medium text-[#0a0a0a]">{client.name}</td>
                        <td className="px-4 py-3.5 text-sm text-gray-500">{isClinicMode ? client.company || "-" : client.email || "-"}</td>
                        <td className="px-4 py-3.5 text-sm text-gray-500">{isClinicMode ? clinicNotes?.procedure || "-" : client.phone || "-"}</td>
                        <td className="px-4 py-3.5 text-sm text-gray-500">{isClinicMode ? clinicNotes?.professional || "-" : client.company || "-"}</td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${client.status === "archived" ? "bg-gray-100 text-gray-600" : "bg-emerald-50 text-emerald-600"}`}>
                            {statusLabel(client.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-500">{formatDateLabel(client.createdAt)}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => startEdit(client)}
                              disabled={!canManageWorkspace}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Editar
                            </button>
                            <button
                              onClick={() => archiveClient(client.id)}
                              disabled={!canManageWorkspace || client.status === "archived"}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Arquivar
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <>
          <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 z-[80] max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 lg:inset-0 lg:m-auto lg:h-fit lg:max-h-[80vh] lg:max-w-lg lg:rounded-3xl">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50">
                <UserPlus className="h-5 w-5 text-blue-500" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-[#0a0a0a]">
                  {editingClientId ? (isClinicMode ? "Editar paciente" : "Editar cliente") : isClinicMode ? "Novo paciente" : "Novo cliente"}
                </h2>
                <p className="text-sm text-gray-500">
                  {isClinicMode ? "Cadastre pacientes com convenio, procedimento e profissional usando a estrutura existente." : "Cadastre clientes reais do seu workspace."}
                </p>
              </div>
            </div>

            {!canManageWorkspace && editingClientId && (
              <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
                {isClinicMode ? "Apenas owner, admin ou master podem editar e arquivar pacientes." : "Apenas owner, admin ou master podem editar e arquivar clientes."}
              </div>
            )}

            {error && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

            <div className="space-y-3">
              <FormField label={isClinicMode ? "Paciente" : "Nome"}>
                <input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder={isClinicMode ? "Nome do paciente" : "Nome do cliente"}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                />
              </FormField>
              <FormField label="E-mail">
                <input
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="email@empresa.com"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                />
              </FormField>
              <FormField label="Telefone">
                <input
                  value={form.phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                  placeholder="(11) 99999-9999"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                />
              </FormField>
              <FormField label={isClinicMode ? "Convenio" : "Empresa"}>
                <input
                  value={form.company}
                  onChange={(event) => setForm((prev) => ({ ...prev, company: event.target.value }))}
                  placeholder={isClinicMode ? "Nome do convenio" : "Empresa"}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                />
              </FormField>
              {isClinicMode && (
                <>
                  <FormField label="Procedimento">
                    <input
                      value={form.procedure}
                      onChange={(event) => setForm((prev) => ({ ...prev, procedure: event.target.value }))}
                      placeholder="Procedimento principal"
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                    />
                  </FormField>
                  <FormField label="Profissional">
                    <input
                      value={form.professional}
                      onChange={(event) => setForm((prev) => ({ ...prev, professional: event.target.value }))}
                      placeholder="Profissional responsavel"
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                    />
                  </FormField>
                </>
              )}
              <FormField label={isClinicMode ? "Observacoes clinicas iniciais" : "Observacoes"}>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  placeholder={isClinicMode ? "Observacoes iniciais do paciente" : "Observacoes sobre o cliente"}
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                />
              </FormField>
              <FormField label="Status">
                <select
                  value={form.status}
                  onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as ClientStatus }))}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                >
                  <option value="active">Ativo</option>
                  <option value="archived">Arquivado</option>
                </select>
              </FormField>
            </div>

            <div className="mt-5 flex gap-2">
              <button onClick={() => setModalOpen(false)} className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200">
                Cancelar
              </button>
              <button
                onClick={submit}
                disabled={isSaving || (Boolean(editingClientId) && !canManageWorkspace)}
                className="flex-1 rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Salvando..." : editingClientId ? "Salvar alteracoes" : isClinicMode ? "Salvar paciente" : "Salvar cliente"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-[#0a0a0a]">{label}</span>
      {children}
    </label>
  )
}
