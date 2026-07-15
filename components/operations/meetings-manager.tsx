"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { CalendarDays, MapPin, Pencil, Plus, Search, Users, Video } from "lucide-react"
import {
  createMeetingAction,
  getMeetingsAction,
  updateMeetingAction,
  type MeetingStatus,
  type MeetingType,
} from "@/actions/meetings"
import { useAuth } from "@/components/auth/auth-provider"
import { COSLoading } from "@/components/cos/cos-loading"

type MeetingRecord = {
  id: string
  title: string
  status: MeetingStatus
  statusLabel: string
  createdAt: string | null
  scheduledAt: string | null
  participants: string[]
  meetingType: MeetingType
  meetingLink: string
  publicRoomLink: string
  meetingLocation: string
  description: string
  cosShouldAttend: boolean
  cosShouldRecord: boolean
  cosShouldExtract: boolean
  cosShouldReport: boolean
}

type MeetingFormState = {
  title: string
  scheduledAt: string
  participants: string
  meetingType: MeetingType
  meetingLink: string
  meetingLocation: string
  description: string
  status: MeetingStatus
  cosShouldAttend: boolean
  cosShouldRecord: boolean
  cosShouldExtract: boolean
  cosShouldReport: boolean
}

const defaultForm: MeetingFormState = {
  title: "",
  scheduledAt: "",
  participants: "",
  meetingType: "video",
  meetingLink: "",
  meetingLocation: "",
  description: "",
  status: "scheduled",
  cosShouldAttend: true,
  cosShouldRecord: false,
  cosShouldExtract: true,
  cosShouldReport: true,
}

function formatDateTimeLabel(value: string | null) {
  if (!value) return "Não definida"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Não definida"
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function toDateTimeLocalValue(value: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const timezoneOffset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - timezoneOffset * 60_000)
  return localDate.toISOString().slice(0, 16)
}

function buildParticipantsLabel(participants: string[]) {
  if (participants.length === 0) return "Sem participantes informados"
  if (participants.length === 1) return participants[0]
  return `${participants[0]} +${participants.length - 1}`
}

function buildPreferenceSummary(meeting: MeetingRecord) {
  const enabled = [
    meeting.cosShouldAttend ? "Acompanhar" : "",
    meeting.cosShouldRecord ? "Gravar" : "",
    meeting.cosShouldExtract ? "Extrair" : "",
    meeting.cosShouldReport ? "Relatório" : "",
  ].filter(Boolean)

  if (enabled.length === 0) return "Sem preferências do COS"
  return enabled.join(" · ")
}

function buildInternalRoomLabel(basePath: string, meetingId: string) {
  return `${basePath}/${meetingId}`
}

export function MeetingsManager({
  title,
  description,
  variant,
}: {
  title: string
  description: string
  variant: "app" | "portal"
}) {
  const { canManageWorkspace } = useAuth()
  const [meetings, setMeetings] = useState<MeetingRecord[]>([])
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | MeetingStatus>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null)
  const [form, setForm] = useState<MeetingFormState>(defaultForm)

  const basePath = variant === "portal" ? "/portal/reunioes" : "/app/reunioes"

  const loadMeetings = async () => {
    setIsLoading(true)
    setError(null)

    const result = await getMeetingsAction()

    if (result.error) {
      setError(result.error)
      setMeetings([])
      setIsLoading(false)
      return
    }

    setMeetings((result.meetings ?? []) as MeetingRecord[])
    setIsLoading(false)
  }

  useEffect(() => {
    void loadMeetings()
  }, [])

  const filteredMeetings = useMemo(() => {
    const term = search.trim().toLowerCase()

    return meetings.filter((meeting) => {
      const matchesFilter = filter === "all" ? true : meeting.status === filter
      const haystack = [
        meeting.title,
        meeting.description,
        meeting.meetingLink,
        meeting.meetingLocation,
        meeting.participants.join(" "),
      ]
        .join(" ")
        .toLowerCase()

      const matchesSearch = !term || haystack.includes(term)
      return matchesFilter && matchesSearch
    })
  }, [filter, meetings, search])

  const openCreate = () => {
    setEditingMeetingId(null)
    setForm(defaultForm)
    setError(null)
    setFeedback(null)
    setModalOpen(true)
  }

  const openEdit = (meeting: MeetingRecord) => {
    setEditingMeetingId(meeting.id)
    setForm({
      title: meeting.title,
      scheduledAt: toDateTimeLocalValue(meeting.scheduledAt),
      participants: meeting.participants.join(", "),
      meetingType: meeting.meetingType,
      meetingLink: meeting.meetingLink,
      meetingLocation: meeting.meetingLocation,
      description: meeting.description,
      status: meeting.status,
      cosShouldAttend: meeting.cosShouldAttend,
      cosShouldRecord: meeting.cosShouldRecord,
      cosShouldExtract: meeting.cosShouldExtract,
      cosShouldReport: meeting.cosShouldReport,
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
      title: form.title,
      scheduledAt: form.scheduledAt || undefined,
      participants: form.participants,
      meetingType: form.meetingType,
      meetingLink: form.meetingType === "video" ? form.meetingLink : "",
      meetingLocation: form.meetingType === "in_person" ? form.meetingLocation : "",
      description: form.description,
      summary: form.description,
      status: form.status,
      cosShouldAttend: form.cosShouldAttend,
      cosShouldRecord: form.cosShouldRecord,
      cosShouldExtract: form.cosShouldExtract,
      cosShouldReport: form.cosShouldReport,
      nextSteps: [
        `Participantes: ${form.participants || "Não informados"}`,
        `Preferências do COS: ${[
          form.cosShouldAttend ? "acompanhar" : "",
          form.cosShouldRecord ? "gravar" : "",
          form.cosShouldExtract ? "extrair" : "",
          form.cosShouldReport ? "relatório" : "",
        ]
          .filter(Boolean)
          .join(", ") || "nenhuma"}`,
      ].join("\n"),
    }

    const result = editingMeetingId
      ? await updateMeetingAction({ meetingId: editingMeetingId, ...payload })
      : await createMeetingAction(payload)

    setIsSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setFeedback(editingMeetingId ? "Reunião atualizada com sucesso." : "Reunião criada com sucesso.")
    setModalOpen(false)
    await loadMeetings()
  }

  const finishMeeting = async (meeting: MeetingRecord) => {
    setError(null)
    setFeedback(null)

    const result = await updateMeetingAction({
      meetingId: meeting.id,
      title: meeting.title,
      scheduledAt: meeting.scheduledAt || undefined,
      participants: meeting.participants,
      meetingType: meeting.meetingType,
      meetingLink: meeting.meetingLink,
      meetingLocation: meeting.meetingLocation,
      description: meeting.description,
      summary: meeting.description,
      status: "finished",
      cosShouldAttend: meeting.cosShouldAttend,
      cosShouldRecord: meeting.cosShouldRecord,
      cosShouldExtract: meeting.cosShouldExtract,
      cosShouldReport: meeting.cosShouldReport,
    })

    if (result.error) {
      setError(result.error)
      return
    }

    setFeedback("Reunião finalizada com sucesso.")
    await loadMeetings()
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
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0a0a0a] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a]"
          >
            <Plus className="h-4 w-4" />
            Nova reunião
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
                placeholder="Buscar por título, participantes, link ou local..."
                className="w-full rounded-xl bg-gray-50 px-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Todas", value: "all" as const },
                { label: "Agendadas", value: "scheduled" as const },
                { label: "Em andamento", value: "in_progress" as const },
                { label: "Finalizadas", value: "finished" as const },
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
            <>
            <COSLoading
              title="Carregando reunioes"
              description="Estamos reunindo as reunioes e os estados reais do COS Meet."
              currentStep="Carregando reunioes"
            />
            <div className="hidden">
              Carregando reuniões...
            </div>
            </>
          ) : filteredMeetings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center">
              <p className="text-sm text-gray-500">Nenhuma reunião registrada ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMeetings.map((meeting) => (
                <div key={meeting.id} className="rounded-2xl border border-gray-100 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-[#0a0a0a]">{meeting.title}</h2>
                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                          {meeting.statusLabel}
                        </span>
                        <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
                          {meeting.meetingType === "video" ? "Vídeo" : "Presencial"}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-2 text-sm text-gray-600 md:grid-cols-2">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-gray-400" />
                          <span>{formatDateTimeLabel(meeting.scheduledAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span>{buildParticipantsLabel(meeting.participants)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {meeting.meetingType === "video" ? <Video className="h-4 w-4 text-gray-400" /> : <MapPin className="h-4 w-4 text-gray-400" />}
                          <span className="truncate">
                            {meeting.meetingType === "video"
                              ? meeting.publicRoomLink || buildInternalRoomLabel(basePath, meeting.id)
                              : meeting.meetingLocation || "Local ainda não informado"}
                          </span>
                        </div>
                        <div className="text-gray-500">{buildPreferenceSummary(meeting)}</div>
                      </div>

                      <p className="mt-3 text-sm text-gray-500">{meeting.description || "Sem descrição registrada ainda."}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`${basePath}/${meeting.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        Abrir
                      </Link>
                      <button
                        onClick={() => openEdit(meeting)}
                        disabled={!canManageWorkspace}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>
                      <button
                        onClick={() => finishMeeting(meeting)}
                        disabled={!canManageWorkspace || meeting.status === "finished"}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Finalizar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <>
          <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 z-[80] max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 lg:inset-0 lg:m-auto lg:h-fit lg:max-h-[80vh] lg:max-w-2xl lg:rounded-3xl">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50">
                <Video className="h-5 w-5 text-red-500" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-[#0a0a0a]">{editingMeetingId ? "Editar reunião" : "Nova reunião"}</h2>
                <p className="text-sm text-gray-500">Configure o COS Meet com os campos reais da reunião e mantenha estados honestos para o que ainda não está conectado.</p>
              </div>
            </div>

            {error && <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="Título">
                <input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Título da reunião" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
              </FormField>
              <FormField label="Data e hora">
                <input type="datetime-local" value={form.scheduledAt} onChange={(event) => setForm((prev) => ({ ...prev, scheduledAt: event.target.value }))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
              </FormField>
              <FormField label="Participantes">
                <input value={form.participants} onChange={(event) => setForm((prev) => ({ ...prev, participants: event.target.value }))} placeholder="Separe por vírgula" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
              </FormField>
              <FormField label="Status">
                <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as MeetingStatus }))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none">
                  <option value="scheduled">Agendada</option>
                  <option value="in_progress">Em andamento</option>
                  <option value="finished">Finalizada</option>
                </select>
              </FormField>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setForm((prev) => ({ ...prev, meetingType: "video" }))} className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${form.meetingType === "video" ? "border-[#0a0a0a] bg-[#0a0a0a] text-white" : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"}`}>Vídeo</button>
              <button type="button" onClick={() => setForm((prev) => ({ ...prev, meetingType: "in_person" }))} className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${form.meetingType === "in_person" ? "border-[#0a0a0a] bg-[#0a0a0a] text-white" : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"}`}>Presencial</button>
            </div>

            <div className="mt-3 space-y-3">
              {form.meetingType === "video" ? (
                <FormField label="Link de video opcional">
                  <input value={form.meetingLink} onChange={(event) => setForm((prev) => ({ ...prev, meetingLink: event.target.value }))} placeholder="Cole aqui um link externo opcional, se existir" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
                </FormField>
              ) : (
                <FormField label="Local">
                  <input value={form.meetingLocation} onChange={(event) => setForm((prev) => ({ ...prev, meetingLocation: event.target.value }))} placeholder="Ex: Sala 2, matriz" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
                </FormField>
              )}

              <FormField label="Descrição">
                <textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Contexto e objetivo da reunião" rows={4} className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
              </FormField>
            </div>

            <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-sm font-medium text-[#0a0a0a]">Deseja que o COS acompanhe esta reunião?</p>
              <div className="mt-3 space-y-2">
                <ToggleRow label="Gravar reunião" checked={form.cosShouldRecord} onChange={(checked) => setForm((prev) => ({ ...prev, cosShouldRecord: checked, cosShouldAttend: checked || prev.cosShouldAttend }))} />
                <ToggleRow label="Extrair informações importantes" checked={form.cosShouldExtract} onChange={(checked) => setForm((prev) => ({ ...prev, cosShouldExtract: checked, cosShouldAttend: checked || prev.cosShouldAttend }))} />
                <ToggleRow label="Gerar relatório automático" checked={form.cosShouldReport} onChange={(checked) => setForm((prev) => ({ ...prev, cosShouldReport: checked, cosShouldAttend: checked || prev.cosShouldAttend }))} />
                <ToggleRow label="Acompanhar a reunião" checked={form.cosShouldAttend} onChange={(checked) => setForm((prev) => ({ ...prev, cosShouldAttend: checked }))} />
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
              Vídeo, gravação e transcrição em tempo real ainda não estão implementados neste módulo. O COS Meet registra os dados e as preferências reais da reunião sem simular execução.
            </div>

            <div className="mt-5 flex gap-2">
              <button onClick={() => setModalOpen(false)} className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200">
                Cancelar
              </button>
              <button
                onClick={submit}
                disabled={isSaving || (Boolean(editingMeetingId) && !canManageWorkspace)}
                className="flex-1 rounded-2xl bg-[#0a0a0a] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Salvando..." : editingMeetingId ? "Salvar alterações" : "Salvar reunião"}
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

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center gap-3 text-sm text-gray-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-gray-300"
      />
      {label}
    </label>
  )
}
