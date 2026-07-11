"use client"

import { getPublicMeetingBySlugAction, requestPublicMeetingEntryAction } from "@/actions/meetings"
import { useEffect, useRef, useState } from "react"
import { Loader2, Mic, MicOff, Video, VideoOff } from "lucide-react"

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
  const [guestName, setGuestName] = useState("")
  const [joined, setJoined] = useState(false)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [requestStatus, setRequestStatus] = useState<MeetingJoinRequest["status"] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [callError, setCallError] = useState<string | null>(null)
  const [hasMediaAccess, setHasMediaAccess] = useState(false)
  const [isCallActive, setIsCallActive] = useState(false)
  const [isCameraEnabled, setIsCameraEnabled] = useState(true)
  const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState(true)
  const [isRequestingMedia, setIsRequestingMedia] = useState(false)
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (!videoRef.current || !streamRef.current) return
    videoRef.current.srcObject = streamRef.current
  }, [hasMediaAccess])

  useEffect(() => {
    return () => {
      stopMediaTracks()
    }
  }, [])

  useEffect(() => {
    if (!slug || !requestId || requestStatus === "denied") return

    const interval = window.setInterval(() => {
      void (async () => {
        const result = await getPublicMeetingBySlugAction({ slug })
        if (result.error || !result.meeting) return

        const nextRequest = result.meeting.joinRequests.find((item) => item.id === requestId)
        if (!nextRequest) return

        setRequestStatus(nextRequest.status)

        if (nextRequest.status === "approved") {
          setJoined(true)
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

    setIsRequestingMedia(true)
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
      setCallError(mediaError instanceof Error ? mediaError.message : "Nao foi possivel acessar camera e microfone.")
      setHasMediaAccess(false)
    } finally {
      setIsRequestingMedia(false)
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

  const startCall = async () => {
    if (!streamRef.current) {
      await requestMediaAccess()
    }

    if (!streamRef.current) return

    setIsCallActive(true)
    setFeedback(`Chamada iniciada para ${guestName.trim()}.`)
    setCallError(null)
  }

  const endCall = () => {
    stopMediaTracks()
    setFeedback("Chamada encerrada.")
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600">COS Meet</span>
          <h1 className="mt-4 text-3xl font-semibold text-[#0a0a0a]">{meeting.title}</h1>
          <p className="mt-2 text-sm text-gray-500">{meeting.description || `Reuniao agendada para ${formatDateTimeLabel(meeting.scheduledAt)}.`}</p>
        </section>

        {!joined ? (
          <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#0a0a0a]">Solicitar entrada</h2>
            <p className="mt-2 text-sm text-gray-500">Informe seu nome, autorize camera e microfone e solicite a aprovacao do organizador para entrar nesta reuniao.</p>
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
              {callError && <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{callError}</div>}
              {feedback && <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">{feedback}</div>}
              {error && <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

              <div className="overflow-hidden rounded-3xl border border-gray-100 bg-[#0a0a0a]">
                <div className="aspect-video w-full">
                  {hasMediaAccess ? (
                    <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/80">
                      Autorize camera e microfone para exibir o preview local desta sala.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => void requestMediaAccess()} disabled={isRequestingMedia} className="rounded-2xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
                    {isRequestingMedia ? (
                      <>
                        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                        Autorizando...
                      </>
                    ) : (
                      "Autorizar camera e microfone"
                    )}
                  </button>
                  <button
                    onClick={() => void joinRoom()}
                    disabled={isSubmittingRequest || requestStatus === "waiting"}
                    className="rounded-2xl bg-[#0a0a0a] px-5 py-3 text-sm font-medium text-white hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmittingRequest ? "Solicitando..." : requestStatus === "waiting" ? "Aguardando aprovacao" : "Solicitar entrada"}
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button onClick={() => toggleTrack("video")} disabled={!hasMediaAccess} className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
                    {isCameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                    {isCameraEnabled ? "Camera ligada" : "Camera desligada"}
                  </button>
                  <button onClick={() => toggleTrack("audio")} disabled={!hasMediaAccess} className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
                    {isMicrophoneEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                    {isMicrophoneEnabled ? "Microfone ligado" : "Microfone desligado"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#0a0a0a]">Sala publica do COS Meet</h2>
                <p className="mt-2 text-sm text-gray-500">Bem-vindo, {guestName.trim()}. Autorize camera e microfone para usar o preview local e participar da chamada.</p>
              </div>
            </div>

            {feedback && <div className="mt-4 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">{feedback}</div>}
            {callError && <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{callError}</div>}

            <div className="mt-4 overflow-hidden rounded-3xl border border-gray-100 bg-[#0a0a0a]">
              <div className="aspect-video w-full">
                {hasMediaAccess ? (
                  <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/80">
                    Autorize camera e microfone para exibir o preview local desta sala.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2">
                <button onClick={() => void requestMediaAccess()} disabled={isRequestingMedia} className="rounded-2xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
                  {isRequestingMedia ? (
                    <>
                      <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                      Autorizando...
                    </>
                  ) : (
                    "Autorizar camera e microfone"
                  )}
                </button>
                <button onClick={() => void startCall()} disabled={isCallActive} className="rounded-2xl bg-[#0a0a0a] px-4 py-2 text-sm text-white hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50">
                  Iniciar chamada
                </button>
                <button onClick={endCall} disabled={!hasMediaAccess} className="rounded-2xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
                  Encerrar chamada
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button onClick={() => toggleTrack("video")} disabled={!hasMediaAccess} className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
                  {isCameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                  {isCameraEnabled ? "Camera ligada" : "Camera desligada"}
                </button>
                <button onClick={() => toggleTrack("audio")} disabled={!hasMediaAccess} className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
                  {isMicrophoneEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  {isMicrophoneEnabled ? "Microfone ligado" : "Microfone desligado"}
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
