"use client"

import { getPublicMeetingBySlugAction, requestPublicMeetingEntryAction } from "@/actions/meetings"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
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
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

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
                <p className="mt-2 text-sm text-gray-500">Bem-vindo, {guestName.trim()}. Entre na mesma sala real do organizador pelo LiveKit.</p>
              </div>
            </div>

            {feedback && <div className="mt-4 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">{feedback}</div>}
            <div className="mt-4">
              <LiveKitMeetingRoom
                meetingId={meeting.id}
                slug={slug}
                participantName={guestName.trim()}
                role="guest"
                requestId={requestId ?? undefined}
              />
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
