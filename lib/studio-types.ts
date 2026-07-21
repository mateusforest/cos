export type StudioSection = "criativos" | "campanhas" | "imagens" | "videos"

export type StudioAssetPersistence = "stored" | "ephemeral" | "none"

export type StudioCreativeFormatKey =
  | "instagram-square"
  | "instagram-vertical"
  | "story-reels"
  | "facebook"
  | "linkedin"
  | "banner-horizontal"

export type StudioImageFormatKey = "square" | "portrait" | "landscape"

export type StudioVideoAspectRatio = "16:9" | "9:16" | "1:1" | "4:3" | "21:9"
export type StudioVideoDuration = "5s" | "10s"

export type StudioCreativeInput = {
  objective: string
  productOrService: string
  audience: string
  platform: string
  format: StudioCreativeFormatKey
  tone: string
  additionalInfo: string
}

export type StudioCampaignInput = {
  objective: string
  productOrService: string
  audience: string
  channel: string
  duration: string
  budget: string
  tone: string
  additionalContext: string
}

export type StudioImageInput = {
  description: string
  style: string
  purpose: string
  format: StudioImageFormatKey
  textOverlay: string
}

export type StudioVideoInput = {
  sceneDescription: string
  style: string
  cameraMovement: string
  aspectRatio: StudioVideoAspectRatio
  duration: StudioVideoDuration
}

export type StudioCreativeResult = {
  type: "creative"
  headline: string
  supportText: string
  cta: string
  caption: string
  visualPrompt: string
  imageUrl: string | null
  imageDataUrl?: string | null
  imageFileName?: string | null
  selectedFormatLabel: string
  requestedWidth: number
  requestedHeight: number
  providerSize: string
  persistence: StudioAssetPersistence
}

export type StudioCampaignResult = {
  type: "campaign"
  concept: string
  campaignName: string
  slogan: string
  audience: string
  valueProposition: string
  keyMessages: string[]
  copies: string[]
  ctas: string[]
  ads: string[]
  publishingSequence: string[]
  suggestedCalendar: string[]
  creativeIdeas: string[]
  recommendedMetrics: string[]
}

export type StudioImageResult = {
  type: "image"
  revisedPrompt: string
  imageUrl: string | null
  imageDataUrl?: string | null
  imageFileName?: string | null
  requestedFormatLabel: string
  requestedWidth: number
  requestedHeight: number
  providerSize: string
  persistence: StudioAssetPersistence
}

export type StudioVideoResult = {
  type: "video"
  generationId: string
  state: "queued" | "processing" | "completed" | "failed"
  videoUrl: string | null
  videoFileName?: string | null
  persistence: StudioAssetPersistence
  aspectRatio: StudioVideoAspectRatio
  duration: StudioVideoDuration
  failureReason?: string | null
  statusMessage: string
}

export type StudioResult =
  | StudioCreativeResult
  | StudioCampaignResult
  | StudioImageResult
  | StudioVideoResult

export type StudioHistoryEntry = {
  messageId: string
  conversationId: string
  conversationArea: string
  section: StudioSection
  title: string
  summary: string
  assistantText: string
  createdAt: string | null
  input: StudioCreativeInput | StudioCampaignInput | StudioImageInput | StudioVideoInput
  result: StudioResult
}

export type StudioSessionState = {
  conversationId: string | null
  conversationArea: string
  entries: StudioHistoryEntry[]
  openAiConfigured: boolean
  lumaConfigured: boolean
}
