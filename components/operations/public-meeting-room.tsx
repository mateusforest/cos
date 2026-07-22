"use client"

import { getPublicMeetingBySlugAction, requestPublicMeetingEntryAction, type MeetingFollowAlongState, type MeetingRecordingState } from "@/actions/meetings"
import { useEffect, useRef, useState } from "react"
import { Loader2, Maximize2, Minimize2 } from "lucide-react"
import { LiveKitMeetingRoom } from "@/components/operations/livekit-meeting-room"

type MeetingJoinRequest = {
  id: string
  participantName: string
  requestedAt: string
  status: "waiting" | "approved" | "denied"
}

type ConnectedMeetingParticipant = {
  requestId: string
  participantName: string
  connectedAt: string
  status: "online"
}

type PublicMeetingRecord = {
  id: string
  title: string
  scheduledAt: string | null
  participants: string[]
  description: string
  meetingLink: string
  publicRoomLink: string
  cosShouldAttend: boolean
  cosShouldRecord: boolean
  followAlong: MeetingFollowAlongState
  recording: MeetingRecordingState
  joinRequests: MeetingJoinRequest[]
  connectedParticipants: ConnectedMeetingParticipant[]
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

export function PublicMeetingRoom({ meeting, slug }: { meeting: PublicMeetingRecord; slug: string }) {
  const [currentMeeting, setCurrentMeeting] = useState(meeting)
  const [guestName, setGuestName] = useState("")
  const [joined, setJoined] = useState(false)
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const [isVideoModalFullscreen, setIsVideoModalFullscreen] = useState(false)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [requestStatus, setRequestStatus] = useState<MeetingJoinRequest["status"] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const videoModalRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!slug || !requestId || requestStatus === "denied") return

    const interval = window.setInterval(() => {
      void (async () => {
        const result = await getPublicMeetingBySlugAction({ slug })
        if (result.error || !result.meeting) return

        setCurrentMeeting(result.meeting as PublicMeetingRecord)

        const nextRequest = result.meeting.joinRequests.find((item) => item.id === requestId)
        if (!nextRequest) return

        setRequestStatus(nextRequest.status)

        if (nextRequest.status === "approved") {
          setJoined(true)
          setIsVideoModalOpen(true)
          setFeedback(`Entrada liberada para ${nextRequest.participantName}.`)
          setError(null)
        }

        if (nextRequest.status === "denied") {
          setJoined(false)
          setRequestId(null)
          setError("Seu acesso a esta reuniao foi negado pelo organizador.")
          setFeedback(null)
        }
      })()
    }, 3000)

    return () => window.clearInterval(interval)
  }, [requestId, requestStatus, slug])

  useEffect(() => {
    if (!joined) return

    const shouldPollRecording =
      currentMeeting.cosShouldRecord &&
      (currentMeeting.recording.status === "preparing" ||
        currentMeeting.recording.status === "recording" ||
        currentMeeting.recording.status === "finalizing" ||
        currentMeeting.recording.status === "processing")

    if (!shouldPollRecording) return

    const interval = window.setInterval(() => {
      void getPublicMeetingBySlugAction({ slug }).then((result) => {
        if (result.meeting) {
          setCurrentMeeting(result.meeting as PublicMeetingRecord)
        }
      })
    }, 6000)

    return () => window.clearInterval(interval)
  }, [currentMeeting.cosShouldRecord, currentMeeting.recording.status, joined, slug])

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

  const joinRoom = async () => {
    if (!guestName.trim()) {
      setError("Informe seu nome para solicitar entrada.")
      return
    }

    setIsSubmittingRequest(true)
    setError(null)
    setFeedback(null)

    const result = await requestPublicMeetingEntryAction({
      slug,
      participantName: guestName.trim(),
    })

    setIsSubmittingRequest(false)

    if (result.error || !result.requestId) {
      setError(result.error ?? "Nao foi possivel solicitar entrada na reuniao.")
      return
    }

    setRequestId(result.requestId)
    setRequestStatus("waiting")
    setJoined(false)
    setFeedback("Solicitacao enviada. Aguarde a aprovacao do organizador.")
  }

  const closeVideoModal = () => {
    setIsVideoModalOpen(false)
  }

  const openVideoModal = () => {
    setIsVideoModalOpen(true)
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

  return (
    <main className="min-h-screen bg-[#f6f7fb] px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600">COS Meet</span>
          <h1 className="mt-4 text-3xl font-semibold text-[#0a0a0a]">{currentMeeting.title}</h1>
          <p className="mt-2 text-sm text-gray-500">{currentMeeting.description || `Reuniao agendada para ${formatDateTimeLabel(currentMeeting.scheduledAt)}.`}</p>
        </section>

        {!joined ? (
          <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#0a0a0a]">Solicitar entrada</h2>
            <p className="mt-2 text-sm text-gray-500">Informe seu nome e solicite a aprovacao do organizador para entrar nesta reuniao ao vivo.</p>
            <div className="mt-4 space-y-3">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-[#0a0a0a]">Seu nome</span>
                <input
                  value={guestName}
                  onChange={(event) => setGuestName(event.target.value)}
                  placeholder="Ex: Maria Silva"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none"
                />
              </label>
              {feedback && <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">{feedback}</div>}
              {error && <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
              <button
                onClick={() => void joinRoom()}
                disabled={isSubmittingRequest || requestStatus === "waiting"}
                className="rounded-2xl bg-[#0a0a0a] px-5 py-3 text-sm font-medium text-white hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmittingRequest ? (
                  <>
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                    Solicitando...
                  </>
                ) : requestStatus === "waiting" ? (
                  "Aguardando aprovacao"
                ) : (
                  "Solicitar entrada"
                )}
              </button>
            </div>
          </section>
        ) : (
          <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#0a0a0a]">Sala publica do COS Meet</h2>
                <p className="mt-2 text-sm text-gray-500">Bem-vindo, {guestName.trim()}. Entre na mesma sala real do organizador pelo COS Meet.</p>
              </div>
              <button onClick={openVideoModal} className="rounded-2xl bg-[#0a0a0a] px-5 py-3 text-sm font-medium text-white hover:bg-[#1a1a1a]">
                Abrir sala de video
              </button>
            </div>

            {feedback && <div className="mt-4 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">{feedback}</div>}
          </section>
        )}

        {joined && (
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
                      <p className="text-sm text-gray-500">Entre na mesma estrutura da sala interna, sem desconectar ao fechar este modal.</p>
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
                      meetingId={currentMeeting.id}
                      cosShouldRecord={currentMeeting.cosShouldRecord}
                      slug={slug}
                      participantName={guestName.trim()}
                      role="guest"
                      requestId={requestId ?? undefined}
                      cosShouldAttend={currentMeeting.cosShouldAttend}
                      initialFollowAlong={currentMeeting.followAlong}
                      initialRecording={currentMeeting.recording}
                      className="h-full overflow-hidden"
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
