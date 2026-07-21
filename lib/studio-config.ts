import type { LucideIcon } from "lucide-react"
import { Clapperboard, FileImage, Layers3, Megaphone } from "lucide-react"
import type {
  StudioCreativeFormatKey,
  StudioImageFormatKey,
  StudioSection,
  StudioVideoAspectRatio,
  StudioVideoDuration,
} from "@/lib/studio-types"

export const studioSections: Array<{
  key: StudioSection
  title: string
  description: string
  href: string
  icon: LucideIcon
}> = [
  {
    key: "criativos",
    title: "Criativos",
    description: "Posts, carrosseis, stories, banners e materiais para redes sociais.",
    href: "/portal/marketing/criativos",
    icon: Layers3,
  },
  {
    key: "campanhas",
    title: "Campanhas",
    description: "Estrategias, copies, anuncios, calendarios editoriais e campanhas completas.",
    href: "/portal/marketing/campanhas",
    icon: Megaphone,
  },
  {
    key: "imagens",
    title: "Imagens",
    description: "Geracao e edicao de imagens utilizando OpenAI.",
    href: "/portal/marketing/imagens",
    icon: FileImage,
  },
  {
    key: "videos",
    title: "Videos",
    description: "Geracao de videos utilizando Luma.",
    href: "/portal/marketing/videos",
    icon: Clapperboard,
  },
]

export const creativeFormatOptions: Array<{
  key: StudioCreativeFormatKey
  label: string
  requestedWidth: number
  requestedHeight: number
  providerSize: "1024x1024" | "1024x1536" | "1536x1024"
}> = [
  { key: "instagram-square", label: "Instagram quadrado — 1080x1080", requestedWidth: 1080, requestedHeight: 1080, providerSize: "1024x1024" },
  { key: "instagram-vertical", label: "Instagram vertical — 1080x1350", requestedWidth: 1080, requestedHeight: 1350, providerSize: "1024x1536" },
  { key: "story-reels", label: "Story/Reels — 1080x1920", requestedWidth: 1080, requestedHeight: 1920, providerSize: "1024x1536" },
  { key: "facebook", label: "Facebook — 1200x630", requestedWidth: 1200, requestedHeight: 630, providerSize: "1536x1024" },
  { key: "linkedin", label: "LinkedIn — 1200x627", requestedWidth: 1200, requestedHeight: 627, providerSize: "1536x1024" },
  { key: "banner-horizontal", label: "Banner horizontal — 1920x1080", requestedWidth: 1920, requestedHeight: 1080, providerSize: "1536x1024" },
]

export const imageFormatOptions: Array<{
  key: StudioImageFormatKey
  label: string
  requestedWidth: number
  requestedHeight: number
  providerSize: "1024x1024" | "1024x1536" | "1536x1024"
}> = [
  { key: "square", label: "Quadrado — 1080x1080", requestedWidth: 1080, requestedHeight: 1080, providerSize: "1024x1024" },
  { key: "portrait", label: "Vertical — 1080x1350", requestedWidth: 1080, requestedHeight: 1350, providerSize: "1024x1536" },
  { key: "landscape", label: "Horizontal — 1920x1080", requestedWidth: 1920, requestedHeight: 1080, providerSize: "1536x1024" },
]

export const videoAspectRatioOptions: StudioVideoAspectRatio[] = ["16:9", "9:16", "1:1", "4:3", "21:9"]
export const videoDurationOptions: StudioVideoDuration[] = ["5s", "10s"]

export function getStudioSectionConfig(section: StudioSection) {
  return (
    studioSections.find((item) => item.key === section) ?? {
      key: section,
      title: "Studio",
      description: "Crie campanhas, imagens, videos e conteudos por conversa.",
      href: "/portal/marketing",
      icon: Megaphone,
    }
  )
}

export function getCreativeFormatConfig(format: StudioCreativeFormatKey) {
  return creativeFormatOptions.find((item) => item.key === format) ?? creativeFormatOptions[0]
}

export function getImageFormatConfig(format: StudioImageFormatKey) {
  return imageFormatOptions.find((item) => item.key === format) ?? imageFormatOptions[0]
}
