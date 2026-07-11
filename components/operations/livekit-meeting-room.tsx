"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Loader2, Mic, MicOff, Phone, PhoneOff, Video, VideoOff, X } from "lucide-react"
import {
  Room,
  RoomEvent,
  Track,
  type LocalParticipant,
  type RemoteParticipant,
  type TrackPublication,
} from "livekit-client"
import {
  endMeetingLiveRoomAction,
  getMeetingLiveKitTokenAction,
  removeMeetingParticipantAction,
  syncMeetingParticipantConnectionAction,
  type MeetingParticipantRole,
} from "@/actions/meetings"

type RoomParticipantSnapshot = {
  identity: string
  name: string
  isLocal: boolean
  videoTrack: Track | null
  audioTrack: Track | null
}

function getParticipantTracks(participant: LocalParticipant | RemoteParticipant) {
  const publications = Array.from(participant.trackPublications.values() as Iterable<TrackPublication>)
  const videoTrack = publications.find((publication) => publication.source === Track.Source.Camera && publication.track)?.track ?? null
  const audioTrack = publications.find((publication) => publication.source === Track.Source.Microphone && publication.track)?.track ?? null

  return { videoTrack, audioTrack }
}

function buildRoomParticipants(room: Room) {
  const localParticipant = room.localParticipant
  const participants: RoomParticipantSnapshot[] = [
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
  ]

  return participants
}

export function LiveKitMeetingRoom({
  meetingId,
  slug,
  participantName,
  role,
  requestId,
  canManage,
  onEnded,
}: {
  meetingId: string
  slug?: string
  participantName: string
  role: MeetingParticipantRole
  requestId?: string
  canManage?: boolean
  onEnded?: () => void
}) {
  const [room, setRoom] = useState<Room | null>(null)
  const [identity, setIdentity] = useState<string | null>(null)
  const [participants, setParticipants] = useState<RoomParticipantSnapshot[]>([])
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isEndingMeeting, setIsEndingMeeting] = useState(false)
  const [isCameraEnabled, setIsCameraEnabled] = useState(true)
  const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const presenceSentRef = useRef(false)

  const remoteParticipants = useMemo(() => participants.filter((participant) => !participant.isLocal), [participants])

  const syncParticipants = (nextRoom: Room) => {
    setParticipants(buildRoomParticipants(nextRoom))
    setIsCameraEnabled(nextRoom.localParticipant.isCameraEnabled)
    setIsMicrophoneEnabled(nextRoom.localParticipant.isMicrophoneEnabled)
  }

  const syncPresence = async (status: "connected" | "disconnected", nextIdentity: string) => {
    if (status === "connected" && presenceSentRef.current) return
    if (status === "disconnected" && !presenceSentRef.current) return

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
      presenceSentRef.current = status === "connected"
    }
  }

  const cleanupRoom = (nextRoom?: Room | null) => {
    const activeRoom = nextRoom ?? room
    activeRoom?.removeAllListeners()
    activeRoom?.disconnect()
    setRoom(null)
    setParticipants([])
    setIsConnected(false)
    setIdentity(null)
    setIsCameraEnabled(true)
    setIsMicrophoneEnabled(true)
  }

  useEffect(() => {
    return () => {
      const currentIdentity = identity
      if (currentIdentity) {
        void syncPresence("disconnected", currentIdentity)
      }
      cleanupRoom(room)
    }
  }, [identity, room])

  const handleJoin = async () => {
    setIsConnecting(true)
    setError(null)
    setFeedback(null)

    const tokenResult = await getMeetingLiveKitTokenAction({
      role,
      participantName,
      meetingId,
      slug,
      requestId,
    })

    if (tokenResult.error || !tokenResult.token || !tokenResult.url || !tokenResult.identity) {
      setIsConnecting(false)
      setError(tokenResult.error ?? "Nao foi possivel gerar a conexao do LiveKit.")
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
    nextRoom.on(RoomEvent.Disconnected, () => {
      const currentIdentity = tokenResult.identity
      void syncPresence("disconnected", currentIdentity)
      setFeedback(role === "guest" ? "Voce saiu da sala do COS Meet." : "Sala desconectada.")
      setIsConnected(false)
      setParticipants([])
      setRoom(null)
      setIdentity(null)
    })

    try {
      await nextRoom.connect(tokenResult.url, tokenResult.token)
      await nextRoom.localParticipant.setCameraEnabled(true)
      await nextRoom.localParticipant.setMicrophoneEnabled(true)
      await syncPresence("connected", tokenResult.identity)
      setRoom(nextRoom)
      setIdentity(tokenResult.identity)
      setIsConnected(true)
      syncParticipants(nextRoom)
      setFeedback("Conectado ao COS Meet ao vivo.")
    } catch (connectionError) {
      nextRoom.removeAllListeners()
      nextRoom.disconnect()
      setError(connectionError instanceof Error ? connectionError.message : "Nao foi possivel entrar na sala do LiveKit.")
    } finally {
      setIsConnecting(false)
    }
  }

  const handleLeave = async () => {
    if (!identity) {
      cleanupRoom()
      return
    }

    await syncPresence("disconnected", identity)
    cleanupRoom()
    setFeedback("Voce saiu da sala.")
  }

  const toggleCamera = async () => {
    if (!room) return
    await room.localParticipant.setCameraEnabled(!room.localParticipant.isCameraEnabled)
    syncParticipants(room)
  }

  const toggleMicrophone = async () => {
    if (!room) return
    await room.localParticipant.setMicrophoneEnabled(!room.localParticipant.isMicrophoneEnabled)
    syncParticipants(room)
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

    if (identity) {
      await syncPresence("disconnected", identity)
    }

    cleanupRoom()
    setFeedback("Reuniao encerrada.")
    onEnded?.()
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {feedback && <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">{feedback}</div>}

      <div className="grid gap-4 lg:grid-cols-[1.4fr,0.8fr]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {participants.length === 0 ? (
              <div className="col-span-full flex aspect-video items-center justify-center rounded-3xl border border-gray-100 bg-[#0a0a0a] px-6 text-center text-sm text-white/80">
                Entre na sala para iniciar o audio e video em tempo real no LiveKit.
              </div>
            ) : (
              participants.map((participant) => (
                <ParticipantTile key={participant.identity} participant={participant} />
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <h3 className="text-sm font-semibold text-[#0a0a0a]">Participantes na sala</h3>
            <div className="mt-3 space-y-3">
              {participants.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhum participante conectado ainda.</p>
              ) : (
                participants.map((participant) => (
                  <div key={participant.identity} className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#0a0a0a]">{participant.name}</p>
                        <p className="mt-1 text-xs text-gray-500">{participant.isLocal ? "Voce" : "Conectado ao vivo"}</p>
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
                <button onClick={() => void handleJoin()} disabled={isConnecting} className="inline-flex items-center gap-2 rounded-xl bg-[#0a0a0a] px-4 py-2 text-sm text-white hover:bg-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50">
                  {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
                  {isConnecting ? "Entrando..." : "Entrar"}
                </button>
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
                ? "A sala interna usa o mesmo room real do LiveKit aberto para os convidados aprovados."
                : "Sua entrada continua respeitando a aprovacao feita pelo organizador."}
            </p>
          </div>
        </div>
      </div>

      {isConnected && remoteParticipants.length === 0 && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
          Sala conectada. Aguarde os outros participantes entrarem para iniciar a conversa em tempo real.
        </div>
      )}
    </div>
  )
}

function ParticipantTile({ participant }: { participant: RoomParticipantSnapshot }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const videoElement = videoRef.current
    const audioElement = audioRef.current
    const attachedVideoElements: HTMLMediaElement[] = []
    const attachedAudioElements: HTMLMediaElement[] = []

    if (participant.videoTrack && videoElement) {
      participant.videoTrack.attach(videoElement)
      attachedVideoElements.push(videoElement)
    }

    if (participant.audioTrack && audioElement && !participant.isLocal) {
      participant.audioTrack.attach(audioElement)
      attachedAudioElements.push(audioElement)
    }

    return () => {
      attachedVideoElements.forEach((element) => {
        participant.videoTrack?.detach(element)
      })
      attachedAudioElements.forEach((element) => {
        if (participant.audioTrack && !participant.isLocal) {
          participant.audioTrack.detach(element)
        }
      })
    }
  }, [participant.audioTrack, participant.isLocal, participant.videoTrack])

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-100 bg-[#0a0a0a]">
      <div className="relative aspect-video w-full">
        {participant.videoTrack ? (
          <video ref={videoRef} autoPlay playsInline muted={participant.isLocal} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/80">
            {participant.name} ainda nao publicou video.
          </div>
        )}
        {!participant.isLocal && <audio ref={audioRef} autoPlay playsInline />}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-4 py-3">
          <span className="text-sm font-medium text-white">{participant.name}</span>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white">{participant.isLocal ? "Voce" : "Ao vivo"}</span>
        </div>
      </div>
    </div>
  )
}
