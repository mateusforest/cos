import { AccessToken, EgressClient, RoomServiceClient } from "livekit-server-sdk"

type LiveKitParticipantRole = "organizer" | "guest"

function requireLiveKitEnv() {
  const url = process.env.LIVEKIT_URL?.trim()
  const apiKey = process.env.LIVEKIT_API_KEY?.trim()
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim()

  if (!url || !apiKey || !apiSecret) {
    throw new Error("Sala de reuniao nao configurada. Defina LIVEKIT_URL, LIVEKIT_API_KEY e LIVEKIT_API_SECRET.")
  }

  return {
    url,
    apiKey,
    apiSecret,
  }
}

function toLiveKitHttpUrl(url: string) {
  if (url.startsWith("wss://")) return `https://${url.slice(6)}`
  if (url.startsWith("ws://")) return `http://${url.slice(5)}`
  return url
}

export function buildLiveKitRoomName(meetingId: string) {
  return `cos-meet-${meetingId}`
}

export function getLiveKitUrl() {
  return requireLiveKitEnv().url
}

export async function createLiveKitToken({
  roomName,
  identity,
  participantName,
  role,
}: {
  roomName: string
  identity: string
  participantName: string
  role: LiveKitParticipantRole
}) {
  const { apiKey, apiSecret } = requireLiveKitEnv()
  const token = new AccessToken(apiKey, apiSecret, {
    identity,
    name: participantName,
    metadata: JSON.stringify({
      role,
      participantName,
    }),
  })

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    roomAdmin: role === "organizer",
  })

  return token.toJwt()
}

export function createLiveKitRoomServiceClient() {
  const { url, apiKey, apiSecret } = requireLiveKitEnv()
  return new RoomServiceClient(toLiveKitHttpUrl(url), apiKey, apiSecret)
}

export function createLiveKitEgressClient() {
  const { url, apiKey, apiSecret } = requireLiveKitEnv()
  return new EgressClient(toLiveKitHttpUrl(url), apiKey, apiSecret)
}
