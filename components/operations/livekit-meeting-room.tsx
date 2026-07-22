"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Loader2, Mic, MicOff, MonitorUp, Phone, PhoneOff, Send, Video, VideoOff, X } from "lucide-react"
import {
  Room,
  RoomEvent,
  Track,
  type LocalParticipant,
  type Participant,
  type RemoteParticipant,
  type TrackPublication,
} from "livekit-client"
import {
  endMeetingLiveRoomAction,
  getMeetingLiveKitTokenAction,
  processMeetingFollowAlongAction,
  refreshMeetingRecordingStatusAction,
  removeMeetingParticipantAction,
  startMeetingRecordingAction,
  syncMeetingParticipantConnectionAction,
  type MeetingFollowAlongResult,
  type MeetingFollowAlongState,
  type MeetingParticipantRole,
  type MeetingRecordingState,
} from "@/actions/meetings"

type RoomParticipantSnapshot = {
  identity: string
  name: string
  isLocal: boolean
  videoTrack: Track | null
  audioTrack: Track | null
  screenShareTrack: Track | null
}

type ChatMessage = {
  id: string
  authorIdentity: string
  authorName: string
  text: string
  createdAt: string
}

const CHAT_TOPIC = "cos-meet-chat"

function renderFollowAlongList(items: string[], emptyLabel: string) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-500">{emptyLabel}</p>
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

function renderFollowAlongTasks(tasks: MeetingFollowAlongResult["tasks"]) {
  if (tasks.length === 0) {
    return <p className="text-sm text-gray-500">Nenhuma tarefa nova identificada.</p>
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

function renderFollowAlongResponsibles(items: MeetingFollowAlongResult["responsibles"]) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-500">Nenhum responsavel novo identificado.</p>
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

function followAlongStatusLabel(status: MeetingFollowAlongState["status"]) {
  if (status === "active") return "Acompanhando"
  if (status === "paused") return "Pausa"
  if (status === "finished") return "Finalizado"
  if (status === "error") return "Erro"
  return "Aguardando conteudo"
}

function followAlongStatusClass(status: MeetingFollowAlongState["status"]) {
  if (status === "active") return "bg-blue-50 text-blue-700"
  if (status === "paused") return "bg-amber-50 text-amber-700"
  if (status === "finished") return "bg-emerald-50 text-emerald-700"
  if (status === "error") return "bg-red-50 text-red-700"
  return "bg-gray-100 text-gray-700"
}

function recordingStatusLabel(status: MeetingRecordingState["status"]) {
  if (status === "preparing") return "Preparando gravacao"
  if (status === "recording") return "Gravando"
  if (status === "finalizing") return "Finalizando gravacao"
  if (status === "processing") return "Processando"
  if (status === "available") return "Disponivel"
  if (status === "failed") return "Falha na gravacao"
  if (status === "unavailable") return "Indisponivel"
  return "Gravacao nao solicitada"
}

function recordingStatusClass(status: MeetingRecordingState["status"]) {
  if (status === "preparing") return "bg-amber-50 text-amber-700"
  if (status === "recording") return "bg-red-50 text-red-700"
  if (status === "finalizing" || status === "processing") return "bg-blue-50 text-blue-700"
  if (status === "available") return "bg-emerald-50 text-emerald-700"
  if (status === "failed") return "bg-red-50 text-red-700"
  return "bg-gray-100 text-gray-700"
}

function getParticipantTracks(participant: LocalParticipant | RemoteParticipant) {
  const publications = Array.from(participant.trackPublications.values() as Iterable<TrackPublication>)
  const videoTrack = publications.find((publication) => publication.source === Track.Source.Camera && publication.track)?.track ?? null
  const audioTrack = publications.find((publication) => publication.source === Track.Source.Microphone && publication.track)?.track ?? null
  const screenShareTrack = publications.find((publication) => publication.source === Track.Source.ScreenShare && publication.track)?.track ?? null

  return { videoTrack, audioTrack, screenShareTrack }
}

function buildRoomParticipants(room: Room) {
  const localParticipant = room.localParticipant
  return [
    {
      identity: localParticipant.identity,
      name: localParticipant.name || "Voce",
      isLocal: true,
      ...getParticipantTracks(localParticipant),
    },
    ...Array.from(room.remoteParticipants.values()).map((participant) => ({
      identity: participant.identity,
      name: participant.name || participant.identity,
      isLocal: false,
      ...getParticipantTracks(participant),
    })),
  ] satisfies RoomParticipantSnapshot[]
}

function buildGridClass(count: number, hasScreenShare: boolean) {
  if (hasScreenShare) {
    return "grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]"
  }

  if (count <= 1) return "grid-cols-1"
  if (count === 2) return "grid-cols-1 md:grid-cols-2"
  if (count <= 4) return "grid-cols-1 sm:grid-cols-2"
  return "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
}

function formatChatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function createLocalChatMessage(authorIdentity: string, authorName: string, text: string): ChatMessage {
  return {
    id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    authorIdentity,
    authorName,
    text,
    createdAt: new Date().toISOString(),
  }
}

export function LiveKitMeetingRoom({
  meetingId,
  slug,
  participantName,
  role,
  requestId,
  canManage,
  cosShouldAttend = false,
  cosShouldRecord = false,
  initialFollowAlong,
  initialRecording,
  onEnded,
  className,
}: {
  meetingId: string
  slug?: string
  participantName: string
  role: MeetingParticipantRole
  requestId?: string
  canManage?: boolean
  cosShouldAttend?: boolean
  cosShouldRecord?: boolean
  initialFollowAlong?: MeetingFollowAlongState | null
  initialRecording?: MeetingRecordingState | null
  onEnded?: () => void
  className?: string
}) {
  const [room, setRoom] = useState<Room | null>(null)
  const [identity, setIdentity] = useState<string | null>(null)
  const [participants, setParticipants] = useState<RoomParticipantSnapshot[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatText, setChatText] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isEndingMeeting, setIsEndingMeeting] = useState(false)
  const [isCameraEnabled, setIsCameraEnabled] = useState(true)
  const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState(true)
  const [isScreenShareEnabled, setIsScreenShareEnabled] = useState(false)
  const [desiredCameraEnabled, setDesiredCameraEnabled] = useState(true)
  const [desiredMicrophoneEnabled, setDesiredMicrophoneEnabled] = useState(true)
  const [followAlong, setFollowAlong] = useState<MeetingFollowAlongState | null>(initialFollowAlong ?? null)
  const [recording, setRecording] = useState<MeetingRecordingState | null>(initialRecording ?? null)
  const [isFollowAlongProcessing, setIsFollowAlongProcessing] = useState(false)
  const [isRecordingStarting, setIsRecordingStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const roomRef = useRef<Room | null>(null)
  const identityRef = useRef<string | null>(null)
  const hasSyncedPresenceRef = useRef(false)
  const isLeavingRef = useRef(false)
  const syncedMessageIdsRef = useRef<Set<string>>(new Set())
  const lastProcessedContentKeyRef = useRef<string | null>(null)

  const remoteParticipants = useMemo(() => participants.filter((participant) => !participant.isLocal), [participants])
  const screenShareParticipant = useMemo(
    () => participants.find((participant) => participant.screenShareTrack),
    [participants],
  )
  const cameraParticipants = useMemo(
    () => participants.filter((participant) => participant.identity !== screenShareParticipant?.identity),
    [participants, screenShareParticipant?.identity],
  )
  const normalizedMeetingMessages = useMemo(
    () =>
      messages.map((message) => {
        const time = formatChatTime(message.createdAt)
        return `[${time || "--:--"}] ${message.authorName}: ${message.text.trim()}`
      }),
    [messages],
  )

  useEffect(() => {
    setFollowAlong(initialFollowAlong ?? null)
  }, [initialFollowAlong])

  useEffect(() => {
    setRecording(initialRecording ?? null)
  }, [initialRecording])

  const syncParticipants = (nextRoom: Room) => {
    setParticipants(buildRoomParticipants(nextRoom))
    setIsCameraEnabled(nextRoom.localParticipant.isCameraEnabled)
    setIsMicrophoneEnabled(nextRoom.localParticipant.isMicrophoneEnabled)

    const screenSharePublication = Array.from(nextRoom.localParticipant.trackPublications.values()).find(
      (publication) => publication.source === Track.Source.ScreenShare && publication.track,
    )
    setIsScreenShareEnabled(Boolean(screenSharePublication))
  }

  const syncPresence = async (status: "connected" | "disconnected", nextIdentity: string) => {
    if (status === "connected" && hasSyncedPresenceRef.current) return
    if (status === "disconnected" && !hasSyncedPresenceRef.current) return

    const result = await syncMeetingParticipantConnectionAction({
      role,
      status,
      identity: nextIdentity,
      participantName,
      meetingId,
      slug,
      requestId,
    })

    if (!result.error) {
      hasSyncedPresenceRef.current = status === "connected"
    }
  }

  const cleanupRoom = (nextRoom?: Room | null) => {
    const activeRoom = nextRoom ?? roomRef.current
    activeRoom?.removeAllListeners()
    activeRoom?.disconnect()
    roomRef.current = null
    identityRef.current = null
    setRoom(null)
    setParticipants([])
    setMessages([])
    setIsConnected(false)
    setIdentity(null)
    setIsScreenShareEnabled(false)
  }

  useEffect(() => {
    return () => {
      const currentIdentity = identityRef.current
      if (currentIdentity) {
        void syncPresence("disconnected", currentIdentity)
      }
      cleanupRoom()
    }
  }, [])

  useEffect(() => {
    if (!cosShouldAttend || role !== "organizer" || !isConnected) return

    const combinedText = normalizedMeetingMessages.join("\n").trim()
    const nextHash = combinedText || `messages:${normalizedMeetingMessages.length}`

    if (lastProcessedContentKeyRef.current === nextHash || isFollowAlongProcessing) {
      return
    }

    const timeout = window.setTimeout(() => {
      void (async () => {
        setIsFollowAlongProcessing(true)

        const result = await processMeetingFollowAlongAction({
          meetingId,
          messages: normalizedMeetingMessages,
        })

        setIsFollowAlongProcessing(false)

        if (result.error) {
          setFollowAlong((current) => ({
            status: "error",
            processedAt: current?.processedAt ?? null,
            error: result.error ?? "Nao foi possivel acompanhar esta reuniao.",
            sourceHash: current?.sourceHash ?? null,
            lastMessageCount: current?.lastMessageCount ?? normalizedMeetingMessages.length,
            result: current?.result ?? null,
          }))
          return
        }

        if (result.meeting?.followAlong) {
          setFollowAlong(result.meeting.followAlong)
          lastProcessedContentKeyRef.current = nextHash
        }
      })()
    }, 1200)

    return () => window.clearTimeout(timeout)
  }, [cosShouldAttend, isConnected, isFollowAlongProcessing, meetingId, normalizedMeetingMessages, role])

  useEffect(() => {
    if (!cosShouldRecord || role !== "organizer" || !canManage || !isConnected || isRecordingStarting) return

    if (
      recording?.status === "preparing" ||
      recording?.status === "recording" ||
      recording?.status === "finalizing" ||
      recording?.status === "processing" ||
      recording?.status === "available"
    ) {
      return
    }

    void (async () => {
      setIsRecordingStarting(true)
      const result = await startMeetingRecordingAction({ meetingId })
      setIsRecordingStarting(false)

        if (result.error) {
          setRecording((current) => ({
            enabled: true,
            recordingId: current?.recordingId ?? null,
            egressId: current?.egressId ?? null,
          status: "failed",
          storagePath: current?.storagePath ?? null,
          mimeType: current?.mimeType ?? null,
          fileName: current?.fileName ?? null,
          startedAt: current?.startedAt ?? null,
            endedAt: current?.endedAt ?? null,
            durationSeconds: current?.durationSeconds ?? null,
            sizeBytes: current?.sizeBytes ?? null,
            updatedAt: new Date().toISOString(),
            error: result.error ?? "Nao foi possivel iniciar a gravacao da reuniao.",
          }))
          return
        }

      if (result.meeting?.recording) {
        setRecording(result.meeting.recording)
      }
    })()
  }, [canManage, cosShouldRecord, isConnected, isRecordingStarting, meetingId, recording?.status, role])

  useEffect(() => {
    if (!cosShouldRecord) return
    if (!recording) return

    const shouldPoll =
      recording.status === "preparing" ||
      recording.status === "recording" ||
      recording.status === "finalizing" ||
      recording.status === "processing"

    if (!shouldPoll) return

    if (role !== "organizer") return

    const interval = window.setInterval(() => {
      void refreshMeetingRecordingStatusAction({ meetingId }).then((result) => {
        if (result.meeting?.recording) {
          setRecording(result.meeting.recording)
        }
      })
    }, 6000)

    return () => window.clearInterval(interval)
  }, [cosShouldRecord, meetingId, recording, role])

  const displayedFollowAlong =
    followAlong ??
    (cosShouldAttend
      ? {
          status: "awaiting_content",
          processedAt: null,
          error: null,
          sourceHash: null,
          lastMessageCount: 0,
          result: null,
        }
      : null)
  const displayedRecording =
    recording ??
    (cosShouldRecord
      ? {
          enabled: true,
          recordingId: null,
          egressId: null,
          status: "unavailable" as const,
          storagePath: null,
          mimeType: null,
          fileName: null,
          startedAt: null,
          endedAt: null,
          durationSeconds: null,
          sizeBytes: null,
          updatedAt: null,
          error: null,
        }
      : null)

  const safelyEnableTracks = async (nextRoom: Room) => {
    if (desiredCameraEnabled) {
      try {
        await nextRoom.localParticipant.setCameraEnabled(true)
      } catch (trackError) {
        setError(trackError instanceof Error ? trackError.message : "Nao foi possivel habilitar a camera.")
      }
    }

    if (desiredMicrophoneEnabled) {
      try {
        await nextRoom.localParticipant.setMicrophoneEnabled(true)
      } catch (trackError) {
        setError(trackError instanceof Error ? trackError.message : "Nao foi possivel habilitar o microfone.")
      }
    }
  }

  const handleJoin = async () => {
    if (!participantName.trim()) {
      setError("Informe o nome do participante antes de entrar.")
      return
    }

    setIsConnecting(true)
    setError(null)
    setFeedback(null)
    isLeavingRef.current = false

    const tokenResult = await getMeetingLiveKitTokenAction({
      role,
      participantName,
      meetingId,
      slug,
      requestId,
    })

    if (tokenResult.error || !tokenResult.token || !tokenResult.url || !tokenResult.identity) {
      setIsConnecting(false)
      setError(tokenResult.error ?? "Nao foi possivel gerar a conexao da sala.")
      return
    }

    const nextRoom = new Room({
      adaptiveStream: true,
      dynacast: true,
    })

    const handleRoomUpdate = () => syncParticipants(nextRoom)

    nextRoom.on(RoomEvent.ParticipantConnected, handleRoomUpdate)
    nextRoom.on(RoomEvent.ParticipantDisconnected, handleRoomUpdate)
    nextRoom.on(RoomEvent.TrackSubscribed, handleRoomUpdate)
    nextRoom.on(RoomEvent.TrackUnsubscribed, handleRoomUpdate)
    nextRoom.on(RoomEvent.LocalTrackPublished, handleRoomUpdate)
    nextRoom.on(RoomEvent.LocalTrackUnpublished, handleRoomUpdate)
    nextRoom.on(RoomEvent.TrackMuted, handleRoomUpdate)
    nextRoom.on(RoomEvent.TrackUnmuted, handleRoomUpdate)
    nextRoom.on(RoomEvent.DataReceived, (payload, sender?: Participant, _kind?: unknown, topic?: string) => {
      if (topic !== CHAT_TOPIC) return

      try {
        const decoded = new TextDecoder().decode(payload)
        const parsed = JSON.parse(decoded) as ChatMessage
        if (syncedMessageIdsRef.current.has(parsed.id)) return
        syncedMessageIdsRef.current.add(parsed.id)

        setMessages((current) => [
          ...current,
          {
            ...parsed,
            authorIdentity: sender?.identity || parsed.authorIdentity,
            authorName: sender?.name || parsed.authorName,
          },
        ])
      } catch {
      }
    })
    nextRoom.on(RoomEvent.Disconnected, () => {
      const currentIdentity = identityRef.current
      if (currentIdentity && !isLeavingRef.current) {
        void syncPresence("disconnected", currentIdentity)
      }

      roomRef.current = null
      identityRef.current = null
      hasSyncedPresenceRef.current = false
      setRoom(null)
      setIdentity(null)
      setParticipants([])
      setMessages([])
      setIsConnected(false)
      setIsScreenShareEnabled(false)
      setFeedback(isLeavingRef.current ? "Voce saiu da sala." : "Reuniao encerrada pelo organizador.")
    })

    try {
      await nextRoom.connect(tokenResult.url, tokenResult.token)
      roomRef.current = nextRoom
      identityRef.current = tokenResult.identity
      setRoom(nextRoom)
      setIdentity(tokenResult.identity)
      setIsConnected(true)
      await safelyEnableTracks(nextRoom)
      await syncPresence("connected", tokenResult.identity)
      syncParticipants(nextRoom)
      setFeedback("Conectado ao COS Meet.")
    } catch (connectionError) {
      nextRoom.removeAllListeners()
      nextRoom.disconnect()
      setError(connectionError instanceof Error ? connectionError.message : "Nao foi possivel entrar na sala.")
    } finally {
      setIsConnecting(false)
    }
  }

  const handleLeave = async () => {
    const currentIdentity = identityRef.current
    isLeavingRef.current = true

    if (currentIdentity) {
      await syncPresence("disconnected", currentIdentity)
    }

    cleanupRoom()
    hasSyncedPresenceRef.current = false
    setFeedback("Voce saiu da sala.")
  }

  const toggleCamera = async () => {
    const currentRoom = roomRef.current
    if (!currentRoom) {
      setDesiredCameraEnabled((current) => !current)
      return
    }

    setError(null)

    try {
      await currentRoom.localParticipant.setCameraEnabled(!currentRoom.localParticipant.isCameraEnabled)
      syncParticipants(currentRoom)
    } catch (trackError) {
      setError(trackError instanceof Error ? trackError.message : "Nao foi possivel atualizar a camera.")
    }
  }

  const toggleMicrophone = async () => {
    const currentRoom = roomRef.current
    if (!currentRoom) {
      setDesiredMicrophoneEnabled((current) => !current)
      return
    }

    setError(null)

    try {
      await currentRoom.localParticipant.setMicrophoneEnabled(!currentRoom.localParticipant.isMicrophoneEnabled)
      syncParticipants(currentRoom)
    } catch (trackError) {
      setError(trackError instanceof Error ? trackError.message : "Nao foi possivel atualizar o microfone.")
    }
  }

  const toggleScreenShare = async () => {
    const currentRoom = roomRef.current
    if (!currentRoom) return

    setError(null)

    try {
      await currentRoom.localParticipant.setScreenShareEnabled(!isScreenShareEnabled)
      syncParticipants(currentRoom)
    } catch (trackError) {
      setError(trackError instanceof Error ? trackError.message : "Nao foi possivel compartilhar a tela.")
    }
  }

  const handleSendChatMessage = async () => {
    const currentRoom = roomRef.current
    const currentIdentity = identityRef.current
    const trimmedText = chatText.trim()

    if (!currentRoom || !currentIdentity || !trimmedText) return

    const nextMessage = createLocalChatMessage(currentIdentity, participantName.trim() || "Voce", trimmedText)
    const encoded = new TextEncoder().encode(JSON.stringify(nextMessage))
    const payload = Uint8Array.from(encoded)

    try {
      await currentRoom.localParticipant.publishData(payload, {
        reliable: true,
        topic: CHAT_TOPIC,
      })

      syncedMessageIdsRef.current.add(nextMessage.id)
      setMessages((current) => [...current, nextMessage])
      setChatText("")
    } catch (chatError) {
      setError(chatError instanceof Error ? chatError.message : "Nao foi possivel enviar a mensagem.")
    }
  }

  const handleRemoveParticipant = async (participantIdentity: string) => {
    const result = await removeMeetingParticipantAction({
      meetingId,
      identity: participantIdentity,
    })

    if (result.error) {
      setError(result.error)
      return
    }

    setFeedback("Participante removido da sala.")
  }

  const handleEndMeeting = async () => {
    setIsEndingMeeting(true)
    setError(null)

    const result = await endMeetingLiveRoomAction({ meetingId })
    setIsEndingMeeting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    const currentIdentity = identityRef.current
    if (currentIdentity) {
      await syncPresence("disconnected", currentIdentity)
    }

    cleanupRoom()
    hasSyncedPresenceRef.current = false
    setFeedback("Reuniao encerrada.")
    onEnded?.()
  }

  const gridClass = buildGridClass(participants.length, Boolean(screenShareParticipant))

  return (
    <div className={`space-y-4 ${className ?? ""}`}>
      {error && <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {feedback && <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">{feedback}</div>}

      {displayedRecording && displayedRecording.status !== "not_requested" && displayedRecording.status !== "unavailable" && (
        <div className={`rounded-2xl border p-4 text-sm ${recordingStatusClass(displayedRecording.status)}`}>
          <strong>{recordingStatusLabel(displayedRecording.status)}</strong>
          {displayedRecording.status === "recording" && " A reuniao esta sendo gravada com seguranca no COS Meet."}
          {displayedRecording.status === "preparing" && " Estamos preparando a gravacao da reuniao."}
          {displayedRecording.status === "finalizing" && " A gravacao esta sendo finalizada."}
          {displayedRecording.status === "processing" && " O arquivo da reuniao ainda esta sendo processado."}
          {displayedRecording.status === "failed" && displayedRecording.error ? ` ${displayedRecording.error}` : ""}
        </div>
      )}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.55fr)_320px]">
        <div className={`mx-auto grid w-full max-w-[1600px] gap-4 ${gridClass}`}>
          {participants.length === 0 ? (
            <div className="col-span-full flex aspect-video items-center justify-center rounded-3xl border border-gray-100 bg-[#0a0a0a] px-6 text-center text-sm text-white/80">
              Entre na sala para iniciar o audio e video em tempo real.
            </div>
          ) : (
            <>
              {screenShareParticipant && (
                <ParticipantTile participant={screenShareParticipant} prioritizeScreenShare />
              )}
              {cameraParticipants.map((participant) => (
                <ParticipantTile key={participant.identity} participant={participant} />
              ))}
            </>
          )}
        </div>

        <div className="space-y-4 xl:max-h-[inherit] xl:overflow-y-auto xl:pr-1">
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <h3 className="text-sm font-semibold text-[#0a0a0a]">Participantes</h3>
            <div className="mt-3 space-y-3">
              {participants.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhum participante conectado ainda.</p>
              ) : (
                participants.map((participant) => (
                  <div key={participant.identity} className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#0a0a0a]">{participant.name}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {participant.isLocal ? "Voce" : "Conectado"}
                          {participant.screenShareTrack ? " - Compartilhando tela" : ""}
                        </p>
                      </div>
                      {!participant.isLocal && canManage ? (
                        <button onClick={() => void handleRemoveParticipant(participant.identity)} className="rounded-xl border border-red-200 px-3 py-2 text-xs text-red-700 hover:bg-red-50">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Online</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <div className="flex flex-wrap gap-2">
              {!isConnected ? (
                <>
                  <button onClick={() => setDesiredCameraEnabled((current) => !current)} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    {desiredCameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                    {desiredCameraEnabled ? "Camera ligada" : "Camera desligada"}
                  </button>
                  <button onClick={() => setDesiredMicrophoneEnabled((current) => !current)} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    {desiredMicrophoneEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                    {desiredMicrophoneEnabled ? "Microfone ligado" : "Microfone desligado"}
                  </button>
                  <button onClick={() => void handleJoin()} disabled={isConnecting} className="inline-flex items-center gap-2 rounded-xl bg-[#0a0a0a] px-4 py-2 text-sm text-white hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50">
                    {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
                    {isConnecting ? "Entrando..." : "Entrar"}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => void toggleCamera()} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    {isCameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                    {isCameraEnabled ? "Camera ligada" : "Camera desligada"}
                  </button>
                  <button onClick={() => void toggleMicrophone()} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    {isMicrophoneEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                    {isMicrophoneEnabled ? "Microfone ligado" : "Microfone desligado"}
                  </button>
                  <button onClick={() => void toggleScreenShare()} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <MonitorUp className="h-4 w-4" />
                    {isScreenShareEnabled ? "Parar tela" : "Compartilhar tela"}
                  </button>
                  <button onClick={() => void handleLeave()} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm text-red-700 hover:bg-red-50">
                    <PhoneOff className="h-4 w-4" />
                    Sair
                  </button>
                  {canManage && (
                    <button onClick={() => void handleEndMeeting()} disabled={isEndingMeeting} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
                      {isEndingMeeting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneOff className="h-4 w-4" />}
                      {isEndingMeeting ? "Encerrando..." : "Encerrar reuniao"}
                    </button>
                  )}
                </>
              )}
            </div>

            <p className="mt-3 text-xs text-gray-500">
              {role === "organizer"
                ? "A sala interna continua conectada com os convidados aprovados na mesma reuniao."
                : "Sua entrada continua respeitando a aprovacao feita pelo organizador."}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <h3 className="text-sm font-semibold text-[#0a0a0a]">Chat interno</h3>
            <div className="mt-3 space-y-3">
              <div className="max-h-72 space-y-2 overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50 p-3">
                {messages.length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhuma mensagem enviada ainda.</p>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className="rounded-2xl border border-white bg-white p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-[#0a0a0a]">{message.authorName}</p>
                        <span className="text-xs text-gray-400">{formatChatTime(message.createdAt)}</span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">{message.text}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <input
                  value={chatText}
                  onChange={(event) => setChatText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      void handleSendChatMessage()
                    }
                  }}
                  placeholder="Enviar mensagem para a reuniao"
                  disabled={!isConnected}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-gray-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                />
                <button onClick={() => void handleSendChatMessage()} disabled={!isConnected || !chatText.trim()} className="inline-flex items-center justify-center rounded-2xl bg-[#0a0a0a] px-4 py-3 text-white hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {cosShouldAttend && displayedFollowAlong && (
            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#0a0a0a]">COS</h3>
                  <p className="mt-1 text-xs text-gray-500">Acompanhamento inteligente com base no conteudo textual real da reuniao.</p>
                </div>
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${followAlongStatusClass(displayedFollowAlong.status)}`}>
                  {followAlongStatusLabel(displayedFollowAlong.status)}
                </span>
              </div>

              {isFollowAlongProcessing && (
                <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700">
                  O COS esta acompanhando o novo conteudo da reuniao.
                </div>
              )}

              {displayedFollowAlong.error && (
                <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                  {displayedFollowAlong.error}
                </div>
              )}

              {displayedFollowAlong.status === "awaiting_content" && (
                <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600">
                  O COS esta aguardando mensagens reais da reuniao para identificar decisoes, tarefas e proximos passos.
                </div>
              )}

              {displayedFollowAlong.result && (
                <div className="mt-3 space-y-3">
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                    <h4 className="text-sm font-medium text-[#0a0a0a]">Decisoes</h4>
                    <div className="mt-2">{renderFollowAlongList(displayedFollowAlong.result.decisions, "Nenhuma decisao nova identificada.")}</div>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                    <h4 className="text-sm font-medium text-[#0a0a0a]">Tarefas</h4>
                    <div className="mt-2">{renderFollowAlongTasks(displayedFollowAlong.result.tasks)}</div>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                    <h4 className="text-sm font-medium text-[#0a0a0a]">Responsaveis</h4>
                    <div className="mt-2">{renderFollowAlongResponsibles(displayedFollowAlong.result.responsibles)}</div>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                    <h4 className="text-sm font-medium text-[#0a0a0a]">Prazos</h4>
                    <div className="mt-2">{renderFollowAlongList(displayedFollowAlong.result.deadlines, "Nenhum prazo novo identificado.")}</div>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                    <h4 className="text-sm font-medium text-[#0a0a0a]">Riscos</h4>
                    <div className="mt-2">{renderFollowAlongList(displayedFollowAlong.result.risks, "Nenhum risco novo identificado.")}</div>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                    <h4 className="text-sm font-medium text-[#0a0a0a]">Perguntas abertas</h4>
                    <div className="mt-2">{renderFollowAlongList(displayedFollowAlong.result.openQuestions, "Nenhuma pergunta aberta nova identificada.")}</div>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                    <h4 className="text-sm font-medium text-[#0a0a0a]">Proximos passos</h4>
                    <div className="mt-2">{renderFollowAlongList(displayedFollowAlong.result.nextSteps, "Nenhum proximo passo novo identificado.")}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isConnected && remoteParticipants.length === 0 && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
          Sala conectada. Aguarde os outros participantes entrarem.
        </div>
      )}
    </div>
  )
}

function ParticipantTile({
  participant,
  prioritizeScreenShare = false,
}: {
  participant: RoomParticipantSnapshot
  prioritizeScreenShare?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const videoElement = videoRef.current
    const audioElement = audioRef.current
    const attachedVideoElements: HTMLMediaElement[] = []
    const attachedAudioElements: HTMLMediaElement[] = []
    const visibleTrack = participant.screenShareTrack ?? participant.videoTrack

    if (visibleTrack && videoElement) {
      visibleTrack.attach(videoElement)
      attachedVideoElements.push(videoElement)
    }

    if (participant.audioTrack && audioElement && !participant.isLocal) {
      participant.audioTrack.attach(audioElement)
      attachedAudioElements.push(audioElement)
    }

    return () => {
      attachedVideoElements.forEach((element) => {
        visibleTrack?.detach(element)
      })
      attachedAudioElements.forEach((element) => {
        if (participant.audioTrack && !participant.isLocal) {
          participant.audioTrack.detach(element)
        }
      })
    }
  }, [participant.audioTrack, participant.isLocal, participant.screenShareTrack, participant.videoTrack])

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-100 bg-[#0a0a0a]">
      <div className="relative aspect-video w-full">
        {participant.screenShareTrack || participant.videoTrack ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={participant.isLocal}
            className={`h-full w-full ${participant.screenShareTrack ? "object-contain" : "object-cover"}`}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/80">
            {participant.name} entrou com camera desligada.
          </div>
        )}
        {!participant.isLocal && <audio ref={audioRef} autoPlay playsInline />}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-4 py-3">
          <span className="text-sm font-medium text-white">{participant.name}</span>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white">
            {participant.screenShareTrack ? "Compartilhando tela" : participant.isLocal ? "Voce" : "Ao vivo"}
          </span>
        </div>
      </div>
    </div>
  )
}
