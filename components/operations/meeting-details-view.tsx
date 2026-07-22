"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  CalendarDays,
  Check,
  FileText,
  Loader2,
  Maximize2,
  MapPin,
  Minimize2,
  Paperclip,
  Save,
  Trash2,
  Upload,
  Users,
  Video,
} from "lucide-react"
import {
  decidePublicMeetingEntryAction,
  getMeetingByIdAction,
  processMeetingInsightsAction,
  updateMeetingAction,
  type MeetingAnalysisItem,
  type MeetingAnalysisSectionKey,
  type MeetingAnalysisSections,
  type MeetingJoinRequest,
  type MeetingAttachment,
  type MeetingAttachmentKind,
  type ConnectedMeetingParticipant,
  type MeetingHistoryEntry,
  type MeetingStatus,
  type MeetingTimelineEvent,
  type MeetingTranscriptionState,
  type MeetingType,
  type MeetingInsightsState,
  type MeetingInsightsResult,
  type MeetingFollowAlongState,
} from "@/actions/meetings"
import { useAuth } from "@/components/auth/auth-provider"
import { COSLoading } from "@/components/cos/cos-loading"
import { uploadDocumentFile } from "@/lib/document-upload"
import { LiveKitMeetingRoom } from "@/components/operations/livekit-meeting-room"

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
  publicRoomSlug: string
  publicRoomLink: string
  meetingLocation: string
  description: string
  cosShouldAttend: boolean
  cosShouldRecord: boolean
  cosShouldExtract: boolean
  cosShouldReport: boolean
  analysisSections: MeetingAnalysisSections
  attachments: MeetingAttachment[]
  timeline: MeetingTimelineEvent[]
  history: MeetingHistoryEntry[]
  transcriptionState: MeetingTranscriptionState
  transcriptionTextAvailable: boolean
  insights: MeetingInsightsState
  followAlong: MeetingFollowAlongState
  joinRequests: MeetingJoinRequest[]
  connectedParticipants: ConnectedMeetingParticipant[]
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

const ANALYSIS_SECTIONS: Array<{ key: MeetingAnalysisSectionKey; label: string }> = [
  { key: "summary", label: "Resumo" },
  { key: "decisions", label: "Decisoes" },
  { key: "tasks", label: "Tarefas" },
  { key: "pendingItems", label: "Pendencias" },
  { key: "responsibles", label: "Responsaveis" },
  { key: "nextSteps", label: "Proximos passos" },
]

function toDateTimeLocalValue(value: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const timezoneOffset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - timezoneOffset * 60_000)
  return localDate.toISOString().slice(0, 16)
}

function formatDateTimeLabel(value: string | null) {
  if (!value) return "Nao definida"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Nao definida"
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

function buildUpdatedSections(
  sections: MeetingAnalysisSections,
  key: MeetingAnalysisSectionKey,
  itemId: string,
  updater: (item: MeetingAnalysisItem) => MeetingAnalysisItem,
) {
  return {
    ...sections,
    [key]: sections[key].map((item) => (item.id === itemId ? updater(item) : item)),
  }
}

function detectAttachmentKind(file: File, fallback: MeetingAttachmentKind): MeetingAttachmentKind {
  if (file.type.startsWith("audio/")) return "audio"
  if (file.type.startsWith("video/")) return "video"
  return fallback
}

function statusBadgeClass(status: MeetingAnalysisItem["status"]) {
  if (status === "accepted") return "bg-emerald-50 text-emerald-700"
  if (status === "discarded") return "bg-red-50 text-red-700"
  return "bg-amber-50 text-amber-700"
}

function statusLabel(status: MeetingAnalysisItem["status"]) {
  if (status === "accepted") return "Aceito"
  if (status === "discarded") return "Descartado"
  return "Em revisao"
}

function formatConnectedDuration(value: string) {
  const startedAt = new Date(value)
  if (Number.isNaN(startedAt.getTime())) return "Agora"

  const diffMs = Date.now() - startedAt.getTime()
  const totalMinutes = Math.max(0, Math.floor(diffMs / 60_000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0) {
    return `${hours}h ${minutes}min`
  }

  return `${minutes}min`
}

function renderInsightsList(items: string[]) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-500">Nenhum item identificado nesta secao.</p>
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item} className="rounded-2xl border border-white bg-white p-3 text-sm text-gray-700">
          {item}
        </div>
      ))}
    </div>
  )
}

function renderInsightsTasks(tasks: MeetingInsightsResult["tasks"]) {
  if (tasks.length === 0) {
    return <p className="text-sm text-gray-500">Nenhuma tarefa identificada nesta extracao.</p>
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div key={task.id} className="rounded-2xl border border-white bg-white p-3 text-sm text-gray-700">
          <p className="font-medium text-[#0a0a0a]">{task.text}</p>
          <p className="mt-1 text-xs text-gray-500">
            Responsavel: {task.responsible || "Nao identificado"} | Prazo: {task.deadline || "Nao identificado"}
          </p>
        </div>
      ))}
    </div>
  )
}

function renderInsightsResponsibles(items: MeetingInsightsResult["responsibles"]) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-500">Nenhum responsavel identificado nesta extracao.</p>
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="rounded-2xl border border-white bg-white p-3 text-sm text-gray-700">
          <p className="font-medium text-[#0a0a0a]">{item.name}</p>
          <p className="mt-1 text-sm text-gray-600">{item.context || "Sem contexto adicional."}</p>
          <p className="mt-1 text-xs text-gray-500">Prazo: {item.deadline || "Nao identificado"}</p>
        </div>
      ))}
    </div>
  )
}

export function MeetingDetailsView({
  meetingId,
  variant,
}: {
  meetingId: string
  variant: "app" | "portal"
}) {
  const { canManageWorkspace, profile, user, workspace } = useAuth()
  const searchParams = useSearchParams()
  const [meeting, setMeeting] = useState<MeetingRecord | null>(null)
  const [form, setForm] = useState<MeetingFormState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isAnalysisSaving, setIsAnalysisSaving] = useState(false)
  const [isInsightsProcessing, setIsInsightsProcessing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [analysisOpen, setAnalysisOpen] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingItemSection, setEditingItemSection] = useState<MeetingAnalysisSectionKey | null>(null)
  const [editingItemText, setEditingItemText] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [attachmentKind, setAttachmentKind] = useState<MeetingAttachmentKind>("document")
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const [isVideoModalFullscreen, setIsVideoModalFullscreen] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const videoModalRef = useRef<HTMLDivElement | null>(null)

  const listHref = variant === "portal" ? "/portal/reunioes" : "/app/reunioes"
  const orderedTimeline = useMemo(
    () => (meeting?.timeline ?? []).slice().sort((a, b) => (b.occurredAt ?? "").localeCompare(a.occurredAt ?? "")),
    [meeting?.timeline],
  )
  const orderedHistory = useMemo(
    () => (meeting?.history ?? []).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [meeting?.history],
  )
  const waitingParticipants = useMemo(
    () => (meeting?.joinRequests ?? []).filter((request) => request.status === "waiting"),
    [meeting?.joinRequests],
  )
  const connectedParticipants = useMemo(
    () => (meeting?.connectedParticipants ?? []).slice().sort((a, b) => b.connectedAt.localeCompare(a.connectedAt)),
    [meeting?.connectedParticipants],
  )
  const insightsState = meeting?.insights ?? null

  const loadMeeting = async (options?: { openAnalysis?: boolean; silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoading(true)
    }
    setError(null)

    const result = await getMeetingByIdAction({ meetingId })

    if (result.error || !result.meeting) {
      setError(result.error ?? "Nao foi possivel carregar a reuniao.")
      if (!options?.silent) {
        setMeeting(null)
        setForm(null)
      }
      if (!options?.silent) {
        setIsLoading(false)
      }
      return
    }

    const nextMeeting = result.meeting as MeetingRecord
    setMeeting(nextMeeting)
    setForm(buildForm(nextMeeting))
    setAnalysisOpen(options?.openAnalysis ?? nextMeeting.status === "finished")
    if (!options?.silent) {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadMeeting()
  }, [meetingId])

  useEffect(() => {
    if (!meeting || meeting.meetingType !== "video") return

    const interval = window.setInterval(() => {
      void loadMeeting({ openAnalysis: analysisOpen, silent: true })
    }, 3000)

    return () => window.clearInterval(interval)
  }, [analysisOpen, meeting, meetingId])

  useEffect(() => {
    if (meeting?.meetingType !== "video") return
    if (searchParams.get("sala") !== "video") return
    setIsVideoModalOpen(true)
  }, [meeting?.meetingType, searchParams])

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsVideoModalFullscreen(document.fullscreenElement === videoModalRef.current)
    }

    document.addEventListener("fullscreenchange", syncFullscreenState)
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState)
  }, [])

  useEffect(() => {
    if (!isVideoModalOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isVideoModalOpen])

  const openVideoModal = () => {
    setIsVideoModalOpen(true)
  }

  const closeVideoModal = () => {
    setIsVideoModalOpen(false)
  }

  const toggleVideoModalFullscreen = async () => {
    const modalElement = videoModalRef.current
    if (!modalElement) return

    if (document.fullscreenElement === modalElement) {
      await document.exitFullscreen()
      return
    }

    await modalElement.requestFullscreen()
  }

  const copyPublicMeetingLink = async () => {
    if (!meeting?.publicRoomLink) {
      setError("Nenhum link publico disponivel para copiar.")
      return
    }

    try {
      const absoluteMeetingLink =
        typeof window === "undefined"
          ? meeting.publicRoomLink
          : new URL(meeting.publicRoomLink, window.location.origin).toString()

      await navigator.clipboard.writeText(absoluteMeetingLink)
      setCopyFeedback("Link copiado")
      window.setTimeout(() => setCopyFeedback(null), 2000)
    } catch {
      setError("Nao foi possivel copiar o link da reuniao.")
    }
  }

  const decideParticipantEntry = async (requestId: string, decision: "approved" | "denied") => {
    if (!meeting) return

    setError(null)
    setFeedback(null)

    const result = await decidePublicMeetingEntryAction({
      meetingId: meeting.id,
      requestId,
      decision,
    })

    if (result.error) {
      setError(result.error)
      return
    }

    setFeedback(decision === "approved" ? "Participante liberado para entrar na reuniao." : "Solicitacao negada e removida da fila.")
    await loadMeeting({ openAnalysis: analysisOpen })
  }

  const save = async (nextStatus?: MeetingStatus) => {
    if (!form) return

    setIsSaving(true)
    setError(null)
    setFeedback(null)

    const statusToSave = nextStatus ?? form.status
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
      status: statusToSave,
      cosShouldAttend: form.cosShouldAttend,
      cosShouldRecord: form.cosShouldRecord,
      cosShouldExtract: form.cosShouldExtract,
      cosShouldReport: form.cosShouldReport,
      historyDescription: statusToSave === "finished" ? "Reuniao finalizada e analise do COS aberta." : "Reuniao atualizada no COS Meet.",
    })

    setIsSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setFeedback(statusToSave === "finished" ? "Reuniao finalizada com sucesso. A analise do COS foi aberta." : "Reuniao atualizada com sucesso.")
    setIsEditing(false)
    await loadMeeting({ openAnalysis: statusToSave === "finished" })
  }

  const persistAnalysis = async (nextSections: MeetingAnalysisSections, historyDescription: string) => {
    if (!meeting) return

    setIsAnalysisSaving(true)
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
      status: meeting.status,
      cosShouldAttend: meeting.cosShouldAttend,
      cosShouldRecord: meeting.cosShouldRecord,
      cosShouldExtract: meeting.cosShouldExtract,
      cosShouldReport: meeting.cosShouldReport,
      analysisSections: nextSections,
      attachments: meeting.attachments,
      timeline: meeting.timeline,
      transcriptionState: meeting.transcriptionState,
      historyAction: "meeting_analysis_updated",
      historyDescription,
    })

    setIsAnalysisSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setMeeting((current) => (current ? { ...current, analysisSections: nextSections } : current))
    setFeedback("Analise do COS atualizada.")
    await loadMeeting({ openAnalysis: true })
  }

  const updateAnalysisItemStatus = async (
    sectionKey: MeetingAnalysisSectionKey,
    itemId: string,
    nextStatus: MeetingAnalysisItem["status"],
  ) => {
    if (!meeting) return

    const nextSections = buildUpdatedSections(meeting.analysisSections, sectionKey, itemId, (item) => ({
      ...item,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    }))

    await persistAnalysis(
      nextSections,
      nextStatus === "accepted" ? "Item da analise aceito para revisao manual posterior." : "Item da analise descartado antes de virar dado do sistema.",
    )
  }

  const startEditingAnalysisItem = (sectionKey: MeetingAnalysisSectionKey, item: MeetingAnalysisItem) => {
    setEditingItemId(item.id)
    setEditingItemSection(sectionKey)
    setEditingItemText(item.text)
  }

  const saveEditedAnalysisItem = async () => {
    if (!meeting || !editingItemId || !editingItemSection) return

    const trimmedText = editingItemText.trim()
    if (!trimmedText) {
      setError("Informe o conteudo do item antes de salvar.")
      return
    }

    const nextSections = buildUpdatedSections(meeting.analysisSections, editingItemSection, editingItemId, (item) => ({
      ...item,
      text: trimmedText,
      updatedAt: new Date().toISOString(),
    }))

    setEditingItemId(null)
    setEditingItemSection(null)
    setEditingItemText("")
    await persistAnalysis(nextSections, "Item da analise do COS editado manualmente.")
  }

  const uploadAttachment = async () => {
    if (!meeting) return
    if (!selectedFile) {
      setError("Selecione um arquivo para anexar.")
      return
    }

    if (!user?.id || !workspace?.id) {
      setError("Nao foi possivel identificar a sessao atual para enviar o arquivo.")
      return
    }

    setIsUploading(true)
    setError(null)
    setFeedback(null)

    const uploadResult = await uploadDocumentFile({
      file: selectedFile,
      userId: user.id,
      workspaceId: workspace.id,
    })

    if (uploadResult.error || !uploadResult.publicUrl || !uploadResult.filePath) {
      setIsUploading(false)
      setError(uploadResult.error || "Nao foi possivel anexar o arquivo.")
      return
    }

    const uploadedAt = new Date().toISOString()
    const nextAttachment: MeetingAttachment = {
      id: `attachment_${Date.now()}`,
      name: selectedFile.name,
      kind: detectAttachmentKind(selectedFile, attachmentKind),
      fileUrl: uploadResult.publicUrl,
      filePath: uploadResult.filePath,
      mimeType: selectedFile.type || "application/octet-stream",
      uploadedAt,
    }

    const nextAttachments = [...meeting.attachments, nextAttachment]
    const nextTimeline = [...meeting.timeline, { id: `timeline_${Date.now()}`, type: "meeting_attachment_added", label: `Arquivo anexado: ${selectedFile.name}`, occurredAt: uploadedAt }]

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
      status: meeting.status,
      cosShouldAttend: meeting.cosShouldAttend,
      cosShouldRecord: meeting.cosShouldRecord,
      cosShouldExtract: meeting.cosShouldExtract,
      cosShouldReport: meeting.cosShouldReport,
      analysisSections: meeting.analysisSections,
      attachments: nextAttachments,
      timeline: nextTimeline,
      transcriptionState: meeting.transcriptionState,
      historyAction: "meeting_attachment_added",
      historyDescription: `Arquivo ${selectedFile.name} anexado a reuniao.`,
    })

    setIsUploading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setSelectedFile(null)
    setAttachmentKind("document")
    setFeedback("Arquivo anexado com sucesso.")
    await loadMeeting({ openAnalysis: analysisOpen })
  }

  const processInsights = async (force = false) => {
    if (!meeting) return

    setIsInsightsProcessing(true)
    setError(null)
    setFeedback(null)

    const result = await processMeetingInsightsAction({
      meetingId: meeting.id,
      force,
    })

    setIsInsightsProcessing(false)

    if (result.error) {
      setError(result.error)
      await loadMeeting({ openAnalysis: analysisOpen })
      return
    }

    setFeedback(
      result.reused
        ? "Os insights desta reuniao ja estavam concluidos para a transcricao atual."
        : "Insights da reuniao processados com sucesso.",
    )
    await loadMeeting({ openAnalysis: analysisOpen })
  }

  if (isLoading) {
    return (
      <div className="py-6">
        <COSLoading
          title="Carregando reuniao"
          description="Estamos recuperando os detalhes e o historico desta reuniao."
          currentStep="Carregando COS Meet"
        />
      </div>
    )
  }

  if (!meeting || !form) {
    return <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error ?? "Reuniao nao encontrada."}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-[#0a0a0a]">{meeting.title}</h1>
              <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">{meeting.statusLabel}</span>
              <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600">
                {meeting.meetingType === "video" ? "Video" : "Presencial"}
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-500">{meeting.description || "Sem descricao registrada ainda."}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={listHref} className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Voltar
            </Link>
            {canManageWorkspace && (
              <>
                <button onClick={() => setIsEditing((current) => !current)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  {isEditing ? "Cancelar edicao" : "Editar"}
                </button>
                <button
                  onClick={() => void save("finished")}
                  disabled={isSaving || meeting.status === "finished"}
                  className="rounded-xl bg-[#0a0a0a] px-4 py-2 text-sm text-white hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Finalizar reuniao
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
          <InfoRow
            icon={meeting.meetingType === "video" ? Video : MapPin}
            label={meeting.meetingType === "video" ? "Link publico da sala" : "Local"}
            value={meeting.meetingType === "video" ? meeting.publicRoomLink || "Nenhum link publico gerado ainda." : meeting.meetingLocation || "Nenhum local informado ainda."}
          />
          <InfoRow
            icon={Video}
            label="Transcricao"
            value={meeting.transcriptionTextAvailable ? "Transcricao disponivel para extracao de insights." : meeting.transcriptionState.note}
          />
        </div>

        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-sm font-medium text-[#0a0a0a]">Preferencias do COS</p>
          <div className="mt-3 grid gap-2 text-sm text-gray-700 md:grid-cols-2">
            <PreferenceItem label="Acompanhar a reuniao" enabled={meeting.cosShouldAttend} />
            <PreferenceItem label="Gravar reuniao" enabled={meeting.cosShouldRecord} />
            <PreferenceItem label="Extrair informacoes importantes" enabled={meeting.cosShouldExtract} />
            <PreferenceItem label="Gerar relatorio automatico" enabled={meeting.cosShouldReport} />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#0a0a0a]">Insights</h2>
              <p className="text-sm text-gray-500">
                A extracao usa OpenAI no servidor somente quando existe uma transcricao real associada a esta reuniao.
              </p>
            </div>

            {canManageWorkspace && meeting.status === "finished" && meeting.cosShouldExtract && (
              <button
                onClick={() => void processInsights(insightsState?.status === "completed")}
                disabled={
                  isInsightsProcessing ||
                  insightsState?.status === "processing" ||
                  insightsState?.status === "awaiting_transcription"
                }
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isInsightsProcessing || insightsState?.status === "processing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                {insightsState?.status === "completed" ? "Extrair novamente" : "Processar insights"}
              </button>
            )}
          </div>

          <div className="mt-4 space-y-4">
            {!meeting.cosShouldExtract ? (
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
                A extracao de informacoes importantes esta desativada nas preferencias desta reuniao.
              </div>
            ) : meeting.status !== "finished" ? (
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
                Os insights ficam disponiveis para processamento depois que a reuniao for finalizada.
              </div>
            ) : insightsState?.status === "awaiting_transcription" ? (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
                A extracao depende de uma transcricao disponivel. Esta reuniao ainda nao possui texto de transcricao associado.
              </div>
            ) : insightsState?.status === "ready" ? (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
                Transcricao disponivel. A reuniao esta pronta para extrair os insights.
              </div>
            ) : insightsState?.status === "processing" ? (
              <COSLoading
                title="Processando insights"
                description="Estamos analisando a transcricao da reuniao para estruturar os pontos mais importantes."
                currentStep="Extraindo informacoes"
              />
            ) : insightsState?.status === "failed" ? (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                {insightsState.error || "Nao foi possivel concluir a extracao dos insights desta reuniao."}
              </div>
            ) : insightsState?.status === "completed" && insightsState.result ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-[#0a0a0a]">Resumo</h3>
                    <span className="text-xs text-gray-500">
                      Processado em {formatDateTimeLabel(insightsState.processedAt)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-gray-700">{insightsState.result.executiveSummary}</p>
                </div>

                <InsightSection title="Assuntos principais">
                  {renderInsightsList(insightsState.result.mainTopics)}
                </InsightSection>

                <InsightSection title="Decisoes">
                  {renderInsightsList(insightsState.result.decisions)}
                </InsightSection>

                <InsightSection title="Tarefas">
                  {renderInsightsTasks(insightsState.result.tasks)}
                </InsightSection>

                <InsightSection title="Responsaveis e prazos">
                  {renderInsightsResponsibles(insightsState.result.responsibles)}
                </InsightSection>

                <InsightSection title="Riscos">
                  {renderInsightsList(insightsState.result.risks)}
                </InsightSection>

                <InsightSection title="Perguntas em aberto">
                  {renderInsightsList(insightsState.result.openQuestions)}
                </InsightSection>

                <InsightSection title="Proximos passos">
                  {renderInsightsList(insightsState.result.nextSteps)}
                </InsightSection>
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
                Nenhum insight processado ainda para esta reuniao.
              </div>
            )}
          </div>
        </div>
      </div>

      {meeting.meetingType === "video" && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#0a0a0a]">Sala de video do COS Meet</h2>
              <p className="text-sm text-gray-500">
                Abra o modal da sala para entrar na mesma reuniao real usada pelos convidados aprovados.
              </p>
            </div>
            <a href={meeting.publicRoomLink || "#"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Abrir link da reuniao
            </a>
            {meeting.meetingLink ? (
              <button onClick={() => void copyPublicMeetingLink()} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                Copiar link
              </button>
            ) : (
              <button onClick={() => void copyPublicMeetingLink()} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                Copiar link
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={openVideoModal} className="rounded-xl bg-[#0a0a0a] px-4 py-2 text-sm text-white hover:bg-[#1a1a1a]">
              Abrir sala de video
            </button>
          </div>

          {copyFeedback && <p className="mt-3 text-sm text-green-600">{copyFeedback}</p>}

          <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
            A sala do COS Meet agora usa audio e video em tempo real, mantendo o mesmo fluxo de aprovacao da sala publica.
          </div>
        </div>
      )}

      {meeting.meetingType === "video" && canManageWorkspace && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[#0a0a0a]">Participantes aguardando</h2>
                <p className="text-sm text-gray-500">Solicitacoes reais de entrada enviadas pela sala publica.</p>
              </div>
              <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">{waitingParticipants.length} aguardando</span>
            </div>

            <div className="mt-4 space-y-3">
              {waitingParticipants.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">Nenhuma solicitacao pendente no momento.</p>
              ) : (
                waitingParticipants.map((request) => (
                  <div key={request.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm font-medium text-[#0a0a0a]">{request.participantName}</p>
                        <p className="mt-1 text-xs text-gray-500">Solicitado em {formatDateTimeLabel(request.requestedAt)}</p>
                        <p className="mt-2 text-xs font-medium text-amber-700">Status: Aguardando</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => void decideParticipantEntry(request.id, "approved")} className="rounded-xl bg-[#0a0a0a] px-4 py-2 text-sm text-white hover:bg-[#1a1a1a]">
                          Permitir
                        </button>
                        <button onClick={() => void decideParticipantEntry(request.id, "denied")} className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-700 hover:bg-red-50">
                          Negar
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[#0a0a0a]">Participantes conectados</h2>
                <p className="text-sm text-gray-500">Participantes liberados pelo organizador nesta reuniao.</p>
              </div>
              <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">{connectedParticipants.length} online</span>
            </div>

            <div className="mt-4 space-y-3">
              {connectedParticipants.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">Nenhum participante conectado ainda.</p>
              ) : (
                connectedParticipants.map((participant) => (
                  <div key={participant.identity} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-medium text-[#0a0a0a]">{participant.participantName}</p>
                        <p className="mt-1 text-xs text-gray-500">Conectado ha {formatConnectedDuration(participant.connectedAt)}</p>
                      </div>
                      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        {participant.role === "organizer" ? "Organizador online" : "Status online"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {meeting.meetingType === "video" && (
        <>
          <div className={`fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm transition-opacity ${isVideoModalOpen ? "opacity-100" : "pointer-events-none opacity-0"}`} />
          <div
            className={`fixed inset-x-0 bottom-0 z-[80] transition-all lg:inset-0 lg:flex lg:items-center lg:justify-center ${isVideoModalOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
          >
            <div
              ref={videoModalRef}
              className={`w-full overflow-hidden rounded-t-3xl bg-white lg:rounded-3xl ${isVideoModalFullscreen ? "h-[100dvh] rounded-none" : "max-h-[92vh] lg:max-h-[88vh] lg:max-w-6xl"}`}
            >
              <div className="flex h-full flex-col p-5 pb-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-[#0a0a0a]">Sala de video do COS Meet</h2>
                    <p className="text-sm text-gray-500">Entre na sala real do COS Meet para se conectar com os convidados aprovados.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => void toggleVideoModalFullscreen()} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      {isVideoModalFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                      Tela cheia
                    </button>
                    <button onClick={closeVideoModal} className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      Fechar
                    </button>
                  </div>
                </div>

                <div className="mt-4 min-h-0 flex-1 overflow-hidden">
                  <LiveKitMeetingRoom
                    meetingId={meeting.id}
                    participantName={profile?.full_name?.trim() || user?.email?.trim() || workspace?.name?.trim() || "Organizador"}
                    role="organizer"
                    canManage={canManageWorkspace}
                    cosShouldAttend={meeting.cosShouldAttend}
                    initialFollowAlong={meeting.followAlong}
                    className="h-full overflow-hidden"
                    onEnded={async () => {
                      setIsVideoModalOpen(false)
                      await loadMeeting({ openAnalysis: true })
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {meeting.status === "finished" && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#0a0a0a]">Analise do COS</h2>
              <p className="text-sm text-gray-500">
                Revise cada item antes de transformar qualquer informacao em dado do sistema. Nenhuma acao automatica e executada nesta etapa.
              </p>
            </div>
            <button onClick={() => setAnalysisOpen((current) => !current)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              {analysisOpen ? "Ocultar analise" : "Abrir analise"}
            </button>
          </div>

          {analysisOpen && (
            <div className="mt-4 space-y-4">
              {isAnalysisSaving && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700">
                  Salvando analise do COS...
                </div>
              )}

              {ANALYSIS_SECTIONS.map((section) => (
                <div key={section.key} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-[#0a0a0a]">{section.label}</h3>
                    <span className="text-xs text-gray-500">{meeting.analysisSections[section.key].length} item(ns)</span>
                  </div>

                  {meeting.analysisSections[section.key].length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhum item registrado nesta secao ainda.</p>
                  ) : (
                    <div className="space-y-3">
                      {meeting.analysisSections[section.key].map((item) => {
                        const isEditingItem = editingItemId === item.id && editingItemSection === section.key

                        return (
                          <div key={item.id} className="rounded-2xl border border-white bg-white p-3">
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div className="min-w-0 flex-1">
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(item.status)}`}>{statusLabel(item.status)}</span>
                                {isEditingItem ? (
                                  <div className="mt-3 space-y-2">
                                    <textarea
                                      value={editingItemText}
                                      onChange={(event) => setEditingItemText(event.target.value)}
                                      rows={3}
                                      className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                                    />
                                    <div className="flex flex-wrap gap-2">
                                      <button onClick={() => void saveEditedAnalysisItem()} className="rounded-xl bg-[#0a0a0a] px-3 py-2 text-xs text-white hover:bg-[#1a1a1a]">
                                        Salvar item
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingItemId(null)
                                          setEditingItemSection(null)
                                          setEditingItemText("")
                                        }}
                                        className="rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <p className="mt-3 text-sm text-gray-700">{item.text}</p>
                                    <p className="mt-2 text-xs text-gray-400">Atualizado em {formatDateTimeLabel(item.updatedAt)}</p>
                                  </>
                                )}
                              </div>

                              {!isEditingItem && canManageWorkspace && (
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => void updateAnalysisItemStatus(section.key, item.id, "accepted")}
                                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-50"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                    Aceitar
                                  </button>
                                  <button
                                    onClick={() => startEditingAnalysisItem(section.key, item)}
                                    className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    onClick={() => void updateAnalysisItemStatus(section.key, item.id, "discarded")}
                                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Descartar
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#0a0a0a]">Arquivos da reuniao</h2>
            <p className="text-sm text-gray-500">Audio, video e documentos ficam centralizados nesta propria reuniao.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[180px,1fr,auto]">
          <FormField label="Tipo do anexo">
            <select value={attachmentKind} onChange={(event) => setAttachmentKind(event.target.value as MeetingAttachmentKind)} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none">
              <option value="document">Documento</option>
              <option value="audio">Audio</option>
              <option value="video">Video</option>
            </select>
          </FormField>
          <FormField label="Arquivo">
            <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-700 transition-colors hover:border-gray-400">
              <Upload className="h-4 w-4 text-gray-500" />
              <span>{selectedFile ? selectedFile.name : "Selecionar audio, video ou documento"}</span>
              <input
                type="file"
                accept="audio/*,video/*,.pdf,.doc,.docx,.txt,.rtf,.xlsx,.xls,.csv,.ppt,.pptx,image/*"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                className="hidden"
              />
            </label>
          </FormField>
          <div className="flex items-end">
            <button
              onClick={() => void uploadAttachment()}
              disabled={isUploading || !selectedFile}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a0a0a] px-4 py-3 text-sm text-white hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              Anexar
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
          O upload usa o storage real de documentos quando estiver configurado. Video, gravacao e transcricao em tempo real continuam em estado honesto e sem simulacao.
        </div>

        <div className="mt-4 space-y-3">
          {meeting.attachments.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">Nenhum arquivo anexado ainda.</p>
          ) : (
            meeting.attachments.map((attachment) => (
              <div key={attachment.id} className="flex flex-col gap-3 rounded-2xl border border-gray-100 p-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                      {attachment.kind === "audio" ? "Audio" : attachment.kind === "video" ? "Video" : "Documento"}
                    </span>
                    <span className="truncate text-sm font-medium text-[#0a0a0a]">{attachment.name}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Anexado em {formatDateTimeLabel(attachment.uploadedAt)}</p>
                </div>
                <a href={attachment.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <FileText className="h-4 w-4" />
                  Abrir arquivo
                </a>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <h2 className="text-lg font-semibold text-[#0a0a0a]">Linha do tempo</h2>
          <div className="mt-4 space-y-3">
            {orderedTimeline.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum evento registrado ainda.</p>
            ) : (
              orderedTimeline.map((event) => (
                <div key={event.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-sm font-medium text-[#0a0a0a]">{event.label}</p>
                  <p className="mt-1 text-xs text-gray-500">{event.occurredAt ? formatDateTimeLabel(event.occurredAt) : "Horario nao disponivel"}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <h2 className="text-lg font-semibold text-[#0a0a0a]">Historico completo</h2>
          <div className="mt-4 space-y-3">
            {orderedHistory.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum historico registrado ainda.</p>
            ) : (
              orderedHistory.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-sm font-medium text-[#0a0a0a]">{entry.description}</p>
                  <p className="mt-1 text-xs text-gray-500">{formatDateTimeLabel(entry.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {isEditing && canManageWorkspace && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <h2 className="text-lg font-semibold text-[#0a0a0a]">Editar reuniao</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <FormField label="Titulo">
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
            <button type="button" onClick={() => setForm((prev) => (prev ? { ...prev, meetingType: "video" } : prev))} className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${form.meetingType === "video" ? "border-[#0a0a0a] bg-[#0a0a0a] text-white" : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"}`}>Video</button>
            <button type="button" onClick={() => setForm((prev) => (prev ? { ...prev, meetingType: "in_person" } : prev))} className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${form.meetingType === "in_person" ? "border-[#0a0a0a] bg-[#0a0a0a] text-white" : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"}`}>Presencial</button>
          </div>

          <div className="mt-3 space-y-3">
            {form.meetingType === "video" ? (
              <FormField label="Link de video opcional">
                <input value={form.meetingLink} onChange={(event) => setForm((prev) => (prev ? { ...prev, meetingLink: event.target.value } : prev))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
              </FormField>
            ) : (
              <FormField label="Local">
                <input value={form.meetingLocation} onChange={(event) => setForm((prev) => (prev ? { ...prev, meetingLocation: event.target.value } : prev))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
              </FormField>
            )}
            <FormField label="Descricao">
              <textarea value={form.description} onChange={(event) => setForm((prev) => (prev ? { ...prev, description: event.target.value } : prev))} rows={4} className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none" />
            </FormField>
          </div>

          <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-sm font-medium text-[#0a0a0a]">Deseja que o COS acompanhe esta reuniao?</p>
            <div className="mt-3 space-y-2">
              <ToggleRow label="Acompanhar a reuniao" checked={form.cosShouldAttend} onChange={(checked) => setForm((prev) => (prev ? { ...prev, cosShouldAttend: checked } : prev))} />
              <ToggleRow label="Gravar reuniao" checked={form.cosShouldRecord} onChange={(checked) => setForm((prev) => (prev ? { ...prev, cosShouldRecord: checked } : prev))} />
              <ToggleRow label="Extrair informacoes importantes" checked={form.cosShouldExtract} onChange={(checked) => setForm((prev) => (prev ? { ...prev, cosShouldExtract: checked } : prev))} />
              <ToggleRow label="Gerar relatorio automatico" checked={form.cosShouldReport} onChange={(checked) => setForm((prev) => (prev ? { ...prev, cosShouldReport: checked } : prev))} />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button onClick={() => void save()} disabled={isSaving} className="inline-flex items-center gap-2 rounded-xl bg-[#0a0a0a] px-4 py-2.5 text-sm text-white hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50">
              <Save className="h-4 w-4" />
              {isSaving ? "Salvando..." : "Salvar reuniao"}
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
  return (
    <div>
      {label}: <strong>{enabled ? "Sim" : "Nao"}</strong>
    </div>
  )
}

function InsightSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <h3 className="mb-3 text-sm font-semibold text-[#0a0a0a]">{title}</h3>
      {children}
    </div>
  )
}
