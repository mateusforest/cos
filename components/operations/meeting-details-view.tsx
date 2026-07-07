"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { CalendarDays, Loader2, MapPin, Save, Users, Video } from "lucide-react"
import { getMeetingByIdAction, updateMeetingAction, type MeetingStatus, type MeetingType } from "@/actions/meetings"
import { useAuth } from "@/components/auth/auth-provider"

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

function toDateTimeLocalValue(value: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const timezoneOffset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - timezoneOffset * 60_000)
  return localDate.toISOString().slice(0, 16)
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

function buildForm(meeting: MeetingRecord): MeetingFormState {
  return {
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
  }
}

export function MeetingDetailsView({
  meetingId,
  variant,
}: {
  meetingId: string
  variant: "app" | "portal"
}) {
  const { canManageWorkspace } = useAuth()
  const [meeting, setMeeting] = useState<MeetingRecord | null>(null)
  const [form, setForm] = useState<MeetingFormState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const listHref = variant === "portal" ? "/portal/reunioes" : "/app/reunioes"

  const loadMeeting = async () => {
    setIsLoading(true)
    setError(null)

    const result = await getMeetingByIdAction({ meetingId })

    if (result.error || !result.meeting) {
      setError(result.error ?? "Não foi possível carregar a reunião.")
      setMeeting(null)
      setForm(null)
      setIsLoading(false)
      return
    }

    const nextMeeting = result.meeting as MeetingRecord
    setMeeting(nextMeeting)
    setForm(buildForm(nextMeeting))
    setIsLoading(false)
  }

  useEffect(() => {
    void loadMeeting()
  }, [meetingId])

  const save = async (nextStatus?: MeetingStatus) => {
    if (!form) return

    setIsSaving(true)
    setError(null)
    setFeedback(null)

    const result = await updateMeetingAction({
      meetingId,
      title: form.title,
      scheduledAt: form.scheduledAt || undefined,
      participants: form.participants,
      meetingType: form.meetingType,
      meetingLink: form.meetingType === "video" ? form.meetingLink : "",
      meetingLocation: form.meetingType === "in_person" ? form.meetingLocation : "",
      description: form.description,
      summary: form.description,
      status: nextStatus ?? form.status,
      cosShouldAttend: form.cosShouldAttend,
      cosShouldRecord: form.cosShouldRecord,
      cosShouldExtract: form.cosShouldExtract,
      cosShouldReport: form.cosShouldReport,
    })

    setIsSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setFeedback(nextStatus === "finished" ? "Reunião finalizada com sucesso." : "Reunião atualizada com sucesso.")
    setIsEditing(false)
    await loadMeeting()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Carregando reunião...
      </div>
    )
  }

  if (!meeting || !form) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
        {error ?? "Reunião não encontrada."}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-[#0a0a0a]">{meeting.title}</h1>
              <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                {meeting.statusLabel}
              </span>
              <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
                {meeting.meetingType === "video" ? "Vídeo" : "Presencial"}
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-500">{meeting.description || "Sem descrição registrada ainda."}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={listHref} className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Voltar
            </Link>
            {canManageWorkspace && (
              <>
                <button onClick={() => setIsEditing((current) => !current)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  {isEditing ? "Cancelar edição" : "Editar"}
                </button>
                <button onClick={() => void save("finished")} disabled={isSaving || meeting.status === "finished"} className="rounded-xl bg-[#0a0a0a] px-4 py-2 text-sm text-white hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50">
                  Finalizar reunião
                </button>
              </>
            )}
          </div>
        </div>

        {error && <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {feedback && <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">{feedback}</div>}

        <div className="grid gap-3 md:grid-cols-2">
          <InfoRow icon={CalendarDays} label="Data e hora" value={formatDateTimeLabel(meeting.scheduledAt)} />
          <InfoRow icon={Users} label="Participantes" value={meeting.participants.length > 0 ? meeting.participants.join(", ") : "Nenhum participante informado"} />
          <InfoRow icon={meeting.meetingType === "video" ? Video : MapPin} label={meeting.meetingType === "video" ? "Link da reunião" : "Local"} value={meeting.meetingType === "video" ? meeting.meetingLink || "Nenhum link real informado ainda." : meeting.meetingLocation || "Nenhum local informado ainda."} />
          <InfoRow icon={Video} label="Recurso ao vivo" value="Vídeo, gravação e transcrição em tempo real ainda não estão conectados." />
        </div>

        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-sm font-medium text-[#0a0a0a]">Preferências do COS</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2 text-sm text-gray-700">
            <PreferenceItem label="Acompanhar a reunião" enabled={meeting.cosShouldAttend} />
            <PreferenceItem label="Gravar reunião" enabled={meeting.cosShouldRecord} />
            <PreferenceItem label="Extrair informações importantes" enabled={meeting.cosShouldExtract} />
            <PreferenceItem label="Gerar relatório automático" enabled={meeting.cosShouldReport} />
          </div>
        </div>
      </div>

      {isEditing && canManageWorkspace && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <h2 className="text-lg font-semibold text-[#0a0a0a]">Editar reunião</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <FormField label="Título">
              <input value={form.title} onChange={(event) => setForm((prev) => (prev ? { ...prev, title: event.target.value } : prev))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
            </FormField>
            <FormField label="Data e hora">
              <input type="datetime-local" value={form.scheduledAt} onChange={(event) => setForm((prev) => (prev ? { ...prev, scheduledAt: event.target.value } : prev))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
            </FormField>
            <FormField label="Participantes">
              <input value={form.participants} onChange={(event) => setForm((prev) => (prev ? { ...prev, participants: event.target.value } : prev))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
            </FormField>
            <FormField label="Status">
              <select value={form.status} onChange={(event) => setForm((prev) => (prev ? { ...prev, status: event.target.value as MeetingStatus } : prev))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none">
                <option value="scheduled">Agendada</option>
                <option value="in_progress">Em andamento</option>
                <option value="finished">Finalizada</option>
              </select>
            </FormField>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setForm((prev) => (prev ? { ...prev, meetingType: "video" } : prev))} className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${form.meetingType === "video" ? "border-[#0a0a0a] bg-[#0a0a0a] text-white" : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"}`}>Vídeo</button>
            <button type="button" onClick={() => setForm((prev) => (prev ? { ...prev, meetingType: "in_person" } : prev))} className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${form.meetingType === "in_person" ? "border-[#0a0a0a] bg-[#0a0a0a] text-white" : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"}`}>Presencial</button>
          </div>

          <div className="mt-3 space-y-3">
            {form.meetingType === "video" ? (
              <FormField label="Link da reunião">
                <input value={form.meetingLink} onChange={(event) => setForm((prev) => (prev ? { ...prev, meetingLink: event.target.value } : prev))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
              </FormField>
            ) : (
              <FormField label="Local">
                <input value={form.meetingLocation} onChange={(event) => setForm((prev) => (prev ? { ...prev, meetingLocation: event.target.value } : prev))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
              </FormField>
            )}
            <FormField label="Descrição">
              <textarea value={form.description} onChange={(event) => setForm((prev) => (prev ? { ...prev, description: event.target.value } : prev))} rows={4} className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
            </FormField>
          </div>

          <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-sm font-medium text-[#0a0a0a]">Deseja que o COS acompanhe esta reunião?</p>
            <div className="mt-3 space-y-2">
              <ToggleRow label="Acompanhar a reunião" checked={form.cosShouldAttend} onChange={(checked) => setForm((prev) => (prev ? { ...prev, cosShouldAttend: checked } : prev))} />
              <ToggleRow label="Gravar reunião" checked={form.cosShouldRecord} onChange={(checked) => setForm((prev) => (prev ? { ...prev, cosShouldRecord: checked } : prev))} />
              <ToggleRow label="Extrair informações importantes" checked={form.cosShouldExtract} onChange={(checked) => setForm((prev) => (prev ? { ...prev, cosShouldExtract: checked } : prev))} />
              <ToggleRow label="Gerar relatório automático" checked={form.cosShouldReport} onChange={(checked) => setForm((prev) => (prev ? { ...prev, cosShouldReport: checked } : prev))} />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button onClick={() => void save()} disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-[#0a0a0a] px-4 py-2.5 text-sm text-white hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50">
              <Save className="h-4 w-4" />
              {isSaving ? "Salvando..." : "Salvar reunião"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-[#0a0a0a]">{label}</span>
      </div>
      <p className="text-sm text-gray-600">{value}</p>
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
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-gray-300" />
      {label}
    </label>
  )
}

function PreferenceItem({ label, enabled }: { label: string; enabled: boolean }) {
  return <div>{label}: <strong>{enabled ? "Sim" : "Não"}</strong></div>
}
