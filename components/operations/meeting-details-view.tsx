"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  CalendarDays,
  Check,
  Mic,
  MicOff,
  FileText,
  Loader2,
  MapPin,
  Paperclip,
  Save,
  Trash2,
  Upload,
  Users,
  Video,
  VideoOff,
} from "lucide-react"
import {
  getMeetingByIdAction,
  updateMeetingAction,
  type MeetingAnalysisItem,
  type MeetingAnalysisSectionKey,
  type MeetingAnalysisSections,
  type MeetingAttachment,
  type MeetingAttachmentKind,
  type MeetingHistoryEntry,
  type MeetingStatus,
  type MeetingTimelineEvent,
  type MeetingTranscriptionState,
  type MeetingType,
} from "@/actions/meetings"
import { useAuth } from "@/components/auth/auth-provider"
import { uploadDocumentFile } from "@/lib/document-upload"

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
  analysisSections: MeetingAnalysisSections
  attachments: MeetingAttachment[]
  timeline: MeetingTimelineEvent[]
  history: MeetingHistoryEntry[]
  transcriptionState: MeetingTranscriptionState
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

export function MeetingDetailsView({
  meetingId,
  variant,
}: {
  meetingId: string
  variant: "app" | "portal"
}) {
  const { canManageWorkspace, user, workspace } = useAuth()
  const searchParams = useSearchParams()
  const [meeting, setMeeting] = useState<MeetingRecord | null>(null)
  const [form, setForm] = useState<MeetingFormState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isAnalysisSaving, setIsAnalysisSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [analysisOpen, setAnalysisOpen] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingItemSection, setEditingItemSection] = useState<MeetingAnalysisSectionKey | null>(null)
  const [editingItemText, setEditingItemText] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [attachmentKind, setAttachmentKind] = useState<MeetingAttachmentKind>("document")
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const [callError, setCallError] = useState<string | null>(null)
  const [hasMediaAccess, setHasMediaAccess] = useState(false)
  const [isCallActive, setIsCallActive] = useState(false)
  const [isCameraEnabled, setIsCameraEnabled] = useState(true)
  const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const listHref = variant === "portal" ? "/portal/reunioes" : "/app/reunioes"
  const roomHref = `${listHref}/${meetingId}?sala=video`
  const orderedTimeline = useMemo(
    () => (meeting?.timeline ?? []).slice().sort((a, b) => (b.occurredAt ?? "").localeCompare(a.occurredAt ?? "")),
    [meeting?.timeline],
  )
  const orderedHistory = useMemo(
    () => (meeting?.history ?? []).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [meeting?.history],
  )

  const loadMeeting = async (options?: { openAnalysis?: boolean }) => {
    setIsLoading(true)
    setError(null)

    const result = await getMeetingByIdAction({ meetingId })

    if (result.error || !result.meeting) {
      setError(result.error ?? "Nao foi possivel carregar a reuniao.")
      setMeeting(null)
      setForm(null)
      setIsLoading(false)
      return
    }

    const nextMeeting = result.meeting as MeetingRecord
    setMeeting(nextMeeting)
    setForm(buildForm(nextMeeting))
    setAnalysisOpen(options?.openAnalysis ?? nextMeeting.status === "finished")
    setIsLoading(false)
  }

  useEffect(() => {
    void loadMeeting()
  }, [meetingId])

  useEffect(() => {
    if (!videoRef.current || !streamRef.current) return
    videoRef.current.srcObject = streamRef.current
  }, [hasMediaAccess])

  useEffect(() => {
    if (meeting?.meetingType !== "video") return
    if (searchParams.get("sala") !== "video") return
    setIsVideoModalOpen(true)
  }, [meeting?.meetingType, searchParams])

  useEffect(() => {
    return () => {
      stopMediaTracks()
    }
  }, [])

  const stopMediaTracks = () => {
    if (!streamRef.current) return

    streamRef.current.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setHasMediaAccess(false)
    setIsCallActive(false)
    setIsCameraEnabled(true)
    setIsMicrophoneEnabled(true)
  }

  const requestMediaAccess = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCallError("Camera e microfone nao sao suportados neste navegador.")
      return
    }

    setCallError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })

      stopMediaTracks()
      streamRef.current = stream
      setHasMediaAccess(true)
      setIsCameraEnabled(stream.getVideoTracks().some((track) => track.enabled))
      setIsMicrophoneEnabled(stream.getAudioTracks().some((track) => track.enabled))

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (mediaError) {
      const resolvedError = mediaError instanceof Error ? mediaError.message : "Nao foi possivel acessar camera e microfone."
      setCallError(resolvedError)
      setHasMediaAccess(false)
    }
  }

  const toggleTrack = (kind: "video" | "audio") => {
    const stream = streamRef.current
    if (!stream) return

    const tracks = kind === "video" ? stream.getVideoTracks() : stream.getAudioTracks()
    const nextEnabled = !tracks.every((track) => track.enabled === false)

    tracks.forEach((track) => {
      track.enabled = !nextEnabled
    })

    if (kind === "video") {
      setIsCameraEnabled(!nextEnabled)
      return
    }

    setIsMicrophoneEnabled(!nextEnabled)
  }

  const startCall = () => {
    if (!streamRef.current) {
      void requestMediaAccess()
      return
    }

    setIsCallActive(true)
    setFeedback("Chamada local iniciada no COS Meet.")
    setCallError(null)
  }

  const endCall = () => {
    stopMediaTracks()
    setFeedback("Chamada encerrada.")
  }

  const openVideoModal = () => {
    setIsVideoModalOpen(true)
  }

  const closeVideoModal = () => {
    setIsVideoModalOpen(false)
    stopMediaTracks()
    setCallError(null)
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Carregando reuniao...
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
            label={meeting.meetingType === "video" ? "Sala interna" : "Local"}
            value={meeting.meetingType === "video" ? roomHref : meeting.meetingLocation || "Nenhum local informado ainda."}
          />
          <InfoRow icon={Video} label="Transcricao em tempo real" value={meeting.transcriptionState.note} />
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
      </div>

      {meeting.meetingType === "video" && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#0a0a0a]">Sala de video do COS Meet</h2>
              <p className="text-sm text-gray-500">
                Abra o modal da sala para autorizar camera e microfone, ver o preview local e controlar a chamada sem alterar o link existente.
              </p>
            </div>
            <Link href={roomHref} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Abrir link da reuniao
            </Link>
            {meeting.meetingLink ? (
              <a
                href={meeting.meetingLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Abrir link externo
              </a>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={openVideoModal} className="rounded-xl bg-[#0a0a0a] px-4 py-2 text-sm text-white hover:bg-[#1a1a1a]">
              Abrir sala de video
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
            Esta etapa entrega camera, microfone, preview local e controles reais no navegador. A distribuicao da chamada para outros participantes continua pelo link/sala ja configurado na reuniao.
          </div>
        </div>
      )}

      {meeting.meetingType === "video" && isVideoModalOpen && (
        <>
          <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm" onClick={closeVideoModal} />
          <div className="fixed inset-x-0 bottom-0 z-[80] max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 lg:inset-0 lg:m-auto lg:h-fit lg:max-h-[85vh] lg:max-w-4xl lg:rounded-3xl">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#0a0a0a]">Sala de video do COS Meet</h2>
                <p className="text-sm text-gray-500">Autorize camera e microfone para exibir o preview local e controlar a chamada desta reuniao.</p>
              </div>
              <button onClick={closeVideoModal} className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                Fechar
              </button>
            </div>

            {callError && <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{callError}</div>}

            <div className="mt-4 overflow-hidden rounded-3xl border border-gray-100 bg-[#0a0a0a]">
              <div className="aspect-video w-full">
                {hasMediaAccess ? (
                  <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/80">
                    Clique em &quot;Autorizar camera e microfone&quot; para exibir o preview local desta reuniao.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2">
                <button onClick={() => void requestMediaAccess()} className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  Autorizar camera e microfone
                </button>
                <button
                  onClick={() => void startCall()}
                  disabled={isCallActive}
                  className="rounded-xl bg-[#0a0a0a] px-4 py-2 text-sm text-white hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Iniciar chamada
                </button>
                <button
                  onClick={endCall}
                  disabled={!hasMediaAccess}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Encerrar chamada
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => toggleTrack("video")}
                  disabled={!hasMediaAccess}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                  {isCameraEnabled ? "Camera ligada" : "Camera desligada"}
                </button>
                <button
                  onClick={() => toggleTrack("audio")}
                  disabled={!hasMediaAccess}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isMicrophoneEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  {isMicrophoneEnabled ? "Microfone ligado" : "Microfone desligado"}
                </button>
                <button
                  onClick={closeVideoModal}
                  className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                >
                  Sair
                </button>
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
              <FormField label="Link externo da reuniao (opcional)">
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
