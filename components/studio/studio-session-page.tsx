"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, useTransition } from "react"
import { useSearchParams } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  Clapperboard,
  Copy,
  Download,
  ExternalLink,
  ImageIcon,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react"
import {
  createStudioVideoAction,
  generateStudioCampaignAction,
  generateStudioCreativeAction,
  generateStudioImageAction,
  getStudioSessionAction,
  refreshStudioVideoAction,
} from "@/actions/studio"
import { COSLoading } from "@/components/cos/cos-loading"
import { PortalHeader } from "@/components/portal/portal-header"
import { useToast } from "@/hooks/use-toast"
import {
  creativeFormatOptions,
  getCreativeFormatConfig,
  getImageFormatConfig,
  getStudioSectionConfig,
  imageFormatOptions,
  videoAspectRatioOptions,
  videoDurationOptions,
} from "@/lib/studio-config"
import type {
  StudioCampaignInput,
  StudioCreativeInput,
  StudioHistoryEntry,
  StudioImageInput,
  StudioSection,
  StudioVideoInput,
  StudioVideoResult,
} from "@/lib/studio-types"

const defaultCreativeInput: StudioCreativeInput = {
  objective: "",
  productOrService: "",
  audience: "",
  platform: "Instagram",
  format: "instagram-square",
  tone: "Direto e envolvente",
  additionalInfo: "",
}

const defaultCampaignInput: StudioCampaignInput = {
  objective: "",
  productOrService: "",
  audience: "",
  channel: "Instagram e Meta Ads",
  duration: "30 dias",
  budget: "",
  tone: "Claro e persuasivo",
  additionalContext: "",
}

const defaultImageInput: StudioImageInput = {
  description: "",
  style: "Fotorealista",
  purpose: "Midia social",
  format: "square",
  textOverlay: "",
}

const defaultVideoInput: StudioVideoInput = {
  sceneDescription: "",
  style: "Cinematografico",
  cameraMovement: "Dolly suave",
  aspectRatio: "16:9",
  duration: "5s",
}

function formatEntryTime(value: string | null) {
  if (!value) return "Agora"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Agora"
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

async function downloadPreparedImage({
  source,
  width,
  height,
  fileName,
}: {
  source: string
  width: number
  height: number
  fileName: string
}) {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const nextImage = new Image()
    nextImage.crossOrigin = "anonymous"
    nextImage.onload = () => resolve(nextImage)
    nextImage.onerror = () => reject(new Error("Nao foi possivel abrir a imagem para download."))
    nextImage.src = source
  })

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")

  if (!context) {
    throw new Error("Nao foi possivel preparar o download da imagem.")
  }

  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, width, height)

  const scale = Math.min(width / image.width, height / image.height)
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale
  const offsetX = (width - drawWidth) / 2
  const offsetY = (height - drawHeight) / 2

  context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight)

  const href = canvas.toDataURL("image/png")
  const anchor = document.createElement("a")
  anchor.href = href
  anchor.download = fileName
  anchor.click()
}

function CopyBlock({
  title,
  content,
  onCopy,
}: {
  title: string
  content: string | string[]
  onCopy: (value: string) => void
}) {
  const normalized = Array.isArray(content) ? content.join("\n") : content

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#0a0a0a]">{title}</p>
        <button
          onClick={() => onCopy(normalized)}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
        >
          <Copy className="h-3.5 w-3.5" />
          Copiar
        </button>
      </div>

      {Array.isArray(content) ? (
        <ul className="space-y-2 text-sm text-gray-600">
          {content.map((item) => (
            <li key={item} className="rounded-xl bg-gray-50 px-3 py-2">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="whitespace-pre-wrap text-sm text-gray-600">{content}</p>
      )}
    </div>
  )
}

export function StudioSessionPage({ section }: { section: StudioSection }) {
  const sectionConfig = getStudioSectionConfig(section)
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [sessionLoading, setSessionLoading] = useState(true)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState(searchParams.get("conversationId")?.trim() || "")
  const [entries, setEntries] = useState<StudioHistoryEntry[]>([])
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
  const [providerStatus, setProviderStatus] = useState({ openAiConfigured: true, lumaConfigured: true })
  const [creativeInput, setCreativeInput] = useState<StudioCreativeInput>(defaultCreativeInput)
  const [campaignInput, setCampaignInput] = useState<StudioCampaignInput>(defaultCampaignInput)
  const [imageInput, setImageInput] = useState<StudioImageInput>(defaultImageInput)
  const [videoInput, setVideoInput] = useState<StudioVideoInput>(defaultVideoInput)
  const [creativeDraft, setCreativeDraft] = useState<Record<string, string> | null>(null)
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null)
  const [videoPollAttempts, setVideoPollAttempts] = useState(0)
  const [isPending, startTransition] = useTransition()

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.messageId === selectedMessageId) ?? entries[0] ?? null,
    [entries, selectedMessageId],
  )

  useEffect(() => {
    let active = true

    startTransition(async () => {
      const response = await getStudioSessionAction({
        section,
        conversationId: searchParams.get("conversationId")?.trim() || undefined,
      })

      if (!active) {
        return
      }

      if ("error" in response) {
        setSubmitError(response.error)
        setEntries([])
      } else {
        setConversationId(response.conversationId || "")
        setEntries(response.entries)
        setProviderStatus({
          openAiConfigured: response.openAiConfigured,
          lumaConfigured: response.lumaConfigured,
        })
        setSelectedMessageId(response.entries[0]?.messageId ?? null)
      }

      setSessionLoading(false)
    })

    return () => {
      active = false
    }
  }, [searchParams, section])

  useEffect(() => {
    if (!selectedEntry || selectedEntry.section !== "criativos" || selectedEntry.result.type !== "creative") {
      setCreativeDraft(null)
      return
    }

    setCreativeDraft({
      headline: selectedEntry.result.headline,
      supportText: selectedEntry.result.supportText,
      cta: selectedEntry.result.cta,
      caption: selectedEntry.result.caption,
      visualPrompt: selectedEntry.result.visualPrompt,
    })
  }, [selectedEntry])

  useEffect(() => {
    if (!selectedEntry || selectedEntry.section !== "videos" || selectedEntry.result.type !== "video") {
      setVideoPollAttempts(0)
      return
    }

    const videoEntry = selectedEntry
    const videoResult = videoEntry.result as StudioVideoResult

    if (videoResult.state === "completed" || videoResult.state === "failed") {
      setVideoPollAttempts(0)
      return
    }

    if (videoPollAttempts >= 20) {
      setSubmitError("O acompanhamento automatico deste video atingiu o limite desta etapa. Atualize manualmente para consultar novamente.")
      return
    }

    const generationId = videoResult.generationId
    const timer = window.setTimeout(() => {
      void handleRefreshVideo(videoEntry.messageId, generationId)
      setVideoPollAttempts((current) => current + 1)
    }, 5000)

    return () => window.clearTimeout(timer)
  }, [selectedEntry, videoPollAttempts])

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast({ title: "Conteudo copiado", description: "O bloco foi copiado para a area de transferencia." })
    } catch {
      toast({ title: "Falha ao copiar", description: "Nao foi possivel copiar este bloco agora." })
    }
  }

  const updateEntry = (entry: StudioHistoryEntry) => {
    setEntries((current) => {
      const next = [entry, ...current.filter((item) => item.messageId !== entry.messageId)]
      return next
    })
    setSelectedMessageId(entry.messageId)
    if (entry.conversationId) {
      setConversationId(entry.conversationId)
    }
  }

  const handleRefreshVideo = async (messageId: string, generationId: string) => {
    const nextConversationId = conversationId || selectedEntry?.conversationId || ""

    if (!nextConversationId) {
      return
    }

    const response = await refreshStudioVideoAction({
      conversationId: nextConversationId,
      messageId,
      generationId,
    })

    if ("error" in response) {
      setSubmitError(response.error ?? "Nao foi possivel atualizar o video agora.")
      return
    }

    updateEntry(response.entry)
  }

  const handleSubmit = () => {
    setSubmitError(null)

    startTransition(async () => {
      if (section === "campanhas") {
        const response = await generateStudioCampaignAction(campaignInput)

        if ("error" in response || !response.entry) {
          setSubmitError(response.error || "Nao foi possivel gerar a campanha.")
          return
        }

        updateEntry(response.entry)
        return
      }

      if (section === "criativos") {
        const response = await generateStudioCreativeAction(creativeInput)

        if ("error" in response || !response.entry) {
          setSubmitError(response.error || "Nao foi possivel gerar o criativo.")
          return
        }

        updateEntry(response.entry)
        return
      }

      if (section === "imagens") {
        const response = await generateStudioImageAction(imageInput)

        if ("error" in response || !response.entry) {
          setSubmitError(response.error || "Nao foi possivel gerar a imagem.")
          return
        }

        updateEntry(response.entry)
        return
      }

      const response = await createStudioVideoAction(videoInput)

      if ("error" in response || !response.entry) {
        setSubmitError(response.error || "Nao foi possivel iniciar a geracao de video.")
        return
      }

      updateEntry(response.entry)
      setVideoPollAttempts(0)
    })
  }

  const handleRegenerateCurrent = () => {
    if (section === "criativos" && selectedEntry?.section === "criativos") {
      setCreativeInput(selectedEntry.input as StudioCreativeInput)
    }

    if (section === "campanhas" && selectedEntry?.section === "campanhas") {
      setCampaignInput(selectedEntry.input as StudioCampaignInput)
    }

    if (section === "imagens" && selectedEntry?.section === "imagens") {
      setImageInput(selectedEntry.input as StudioImageInput)
    }

    if (section === "videos" && selectedEntry?.section === "videos") {
      setVideoInput(selectedEntry.input as StudioVideoInput)
    }

    handleSubmit()
  }

  const renderForm = () => {
    if (section === "criativos") {
      return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Objetivo">
            <input value={creativeInput.objective} onChange={(event) => setCreativeInput((current) => ({ ...current, objective: event.target.value }))} className={inputClassName} />
          </Field>
          <Field label="Produto ou servico">
            <input value={creativeInput.productOrService} onChange={(event) => setCreativeInput((current) => ({ ...current, productOrService: event.target.value }))} className={inputClassName} />
          </Field>
          <Field label="Publico">
            <input value={creativeInput.audience} onChange={(event) => setCreativeInput((current) => ({ ...current, audience: event.target.value }))} className={inputClassName} />
          </Field>
          <Field label="Plataforma">
            <input value={creativeInput.platform} onChange={(event) => setCreativeInput((current) => ({ ...current, platform: event.target.value }))} className={inputClassName} />
          </Field>
          <Field label="Formato">
            <select value={creativeInput.format} onChange={(event) => setCreativeInput((current) => ({ ...current, format: event.target.value as StudioCreativeInput["format"] }))} className={inputClassName}>
              {creativeFormatOptions.map((option) => (
                <option key={option.key} value={option.key}>{option.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Tom">
            <input value={creativeInput.tone} onChange={(event) => setCreativeInput((current) => ({ ...current, tone: event.target.value }))} className={inputClassName} />
          </Field>
          <Field label="Informacoes adicionais" className="md:col-span-2">
            <textarea value={creativeInput.additionalInfo} onChange={(event) => setCreativeInput((current) => ({ ...current, additionalInfo: event.target.value }))} className={`${inputClassName} min-h-28`} />
          </Field>
        </div>
      )
    }

    if (section === "campanhas") {
      return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Objetivo">
            <input value={campaignInput.objective} onChange={(event) => setCampaignInput((current) => ({ ...current, objective: event.target.value }))} className={inputClassName} />
          </Field>
          <Field label="Produto ou servico">
            <input value={campaignInput.productOrService} onChange={(event) => setCampaignInput((current) => ({ ...current, productOrService: event.target.value }))} className={inputClassName} />
          </Field>
          <Field label="Publico">
            <input value={campaignInput.audience} onChange={(event) => setCampaignInput((current) => ({ ...current, audience: event.target.value }))} className={inputClassName} />
          </Field>
          <Field label="Canal">
            <input value={campaignInput.channel} onChange={(event) => setCampaignInput((current) => ({ ...current, channel: event.target.value }))} className={inputClassName} />
          </Field>
          <Field label="Duracao">
            <input value={campaignInput.duration} onChange={(event) => setCampaignInput((current) => ({ ...current, duration: event.target.value }))} className={inputClassName} />
          </Field>
          <Field label="Orcamento opcional">
            <input value={campaignInput.budget} onChange={(event) => setCampaignInput((current) => ({ ...current, budget: event.target.value }))} className={inputClassName} />
          </Field>
          <Field label="Tom">
            <input value={campaignInput.tone} onChange={(event) => setCampaignInput((current) => ({ ...current, tone: event.target.value }))} className={inputClassName} />
          </Field>
          <Field label="Contexto adicional" className="md:col-span-2">
            <textarea value={campaignInput.additionalContext} onChange={(event) => setCampaignInput((current) => ({ ...current, additionalContext: event.target.value }))} className={`${inputClassName} min-h-28`} />
          </Field>
        </div>
      )
    }

    if (section === "imagens") {
      return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Descricao">
            <textarea value={imageInput.description} onChange={(event) => setImageInput((current) => ({ ...current, description: event.target.value }))} className={`${inputClassName} min-h-28`} />
          </Field>
          <div className="space-y-4">
            <Field label="Estilo">
              <input value={imageInput.style} onChange={(event) => setImageInput((current) => ({ ...current, style: event.target.value }))} className={inputClassName} />
            </Field>
            <Field label="Finalidade">
              <input value={imageInput.purpose} onChange={(event) => setImageInput((current) => ({ ...current, purpose: event.target.value }))} className={inputClassName} />
            </Field>
            <Field label="Proporcao ou formato">
              <select value={imageInput.format} onChange={(event) => setImageInput((current) => ({ ...current, format: event.target.value as StudioImageInput["format"] }))} className={inputClassName}>
                {imageFormatOptions.map((option) => (
                  <option key={option.key} value={option.key}>{option.label}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Texto opcional na imagem" className="md:col-span-2">
            <input value={imageInput.textOverlay} onChange={(event) => setImageInput((current) => ({ ...current, textOverlay: event.target.value }))} className={inputClassName} />
          </Field>
          <div className="md:col-span-2 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
            Referencia visual e upload de imagem inicial continuam desativados nesta V1 porque o fluxo atual do Portal ainda nao expõe um envio server-side seguro para esse uso.
          </div>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Descricao da cena" className="md:col-span-2">
          <textarea value={videoInput.sceneDescription} onChange={(event) => setVideoInput((current) => ({ ...current, sceneDescription: event.target.value }))} className={`${inputClassName} min-h-28`} />
        </Field>
        <Field label="Estilo">
          <input value={videoInput.style} onChange={(event) => setVideoInput((current) => ({ ...current, style: event.target.value }))} className={inputClassName} />
        </Field>
        <Field label="Movimento de camera">
          <input value={videoInput.cameraMovement} onChange={(event) => setVideoInput((current) => ({ ...current, cameraMovement: event.target.value }))} className={inputClassName} />
        </Field>
        <Field label="Proporcao">
          <select value={videoInput.aspectRatio} onChange={(event) => setVideoInput((current) => ({ ...current, aspectRatio: event.target.value as StudioVideoInput["aspectRatio"] }))} className={inputClassName}>
            {videoAspectRatioOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </Field>
        <Field label="Duracao suportada">
          <select value={videoInput.duration} onChange={(event) => setVideoInput((current) => ({ ...current, duration: event.target.value as StudioVideoInput["duration"] }))} className={inputClassName}>
            {videoDurationOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </Field>
        <div className="md:col-span-2 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
          Imagem inicial opcional ainda nao esta disponivel nesta V1 porque o fluxo atual nao expõe um upload server-side compatível com a Luma sem ampliar o escopo.
        </div>
      </div>
    )
  }

  const renderResult = () => {
    if (!selectedEntry) {
      return (
        <EmptyCard
          title="Nenhuma geracao nesta sessao"
          description="Preencha o formulario para iniciar sua primeira geracao no Studio."
        />
      )
    }

    if (selectedEntry.result.type === "campaign") {
      return (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <p className="text-sm text-gray-500">{selectedEntry.summary}</p>
            <h2 className="mt-1 text-xl font-semibold text-[#0a0a0a]">{selectedEntry.result.campaignName}</h2>
            <p className="mt-2 text-sm text-gray-600">{selectedEntry.result.slogan}</p>
          </div>
          <CopyBlock title="Conceito central" content={selectedEntry.result.concept} onCopy={handleCopy} />
          <CopyBlock title="Publico" content={selectedEntry.result.audience} onCopy={handleCopy} />
          <CopyBlock title="Proposta" content={selectedEntry.result.valueProposition} onCopy={handleCopy} />
          <CopyBlock title="Mensagens principais" content={selectedEntry.result.keyMessages} onCopy={handleCopy} />
          <CopyBlock title="Copies" content={selectedEntry.result.copies} onCopy={handleCopy} />
          <CopyBlock title="CTAs" content={selectedEntry.result.ctas} onCopy={handleCopy} />
          <CopyBlock title="Anuncios" content={selectedEntry.result.ads} onCopy={handleCopy} />
          <CopyBlock title="Sequencia de publicacoes" content={selectedEntry.result.publishingSequence} onCopy={handleCopy} />
          <CopyBlock title="Calendario sugerido" content={selectedEntry.result.suggestedCalendar} onCopy={handleCopy} />
          <CopyBlock title="Ideias de criativos" content={selectedEntry.result.creativeIdeas} onCopy={handleCopy} />
          <CopyBlock title="Metricas recomendadas" content={selectedEntry.result.recommendedMetrics} onCopy={handleCopy} />
        </div>
      )
    }

    if (selectedEntry.result.type === "creative") {
      const creativeResult = selectedEntry.result
      const creativeInputEntry = selectedEntry.input as StudioCreativeInput
      const imageSource = creativeResult.imageUrl || creativeResult.imageDataUrl || ""

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-500">{creativeResult.selectedFormatLabel}</p>
                  <p className="text-base font-semibold text-[#0a0a0a]">{selectedEntry.title}</p>
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">
                  {creativeResult.requestedWidth}x{creativeResult.requestedHeight}
                </span>
              </div>

              <div className="space-y-3">
                <Field label="Headline">
                  <textarea
                    value={creativeDraft?.headline || ""}
                    onChange={(event) => setCreativeDraft((current) => ({ ...(current || {}), headline: event.target.value }))}
                    className={`${inputClassName} min-h-20`}
                  />
                </Field>
                <Field label="Texto de apoio">
                  <textarea
                    value={creativeDraft?.supportText || ""}
                    onChange={(event) => setCreativeDraft((current) => ({ ...(current || {}), supportText: event.target.value }))}
                    className={`${inputClassName} min-h-20`}
                  />
                </Field>
                <Field label="CTA">
                  <input
                    value={creativeDraft?.cta || ""}
                    onChange={(event) => setCreativeDraft((current) => ({ ...(current || {}), cta: event.target.value }))}
                    className={inputClassName}
                  />
                </Field>
                <Field label="Legenda">
                  <textarea
                    value={creativeDraft?.caption || ""}
                    onChange={(event) => setCreativeDraft((current) => ({ ...(current || {}), caption: event.target.value }))}
                    className={`${inputClassName} min-h-28`}
                  />
                </Field>
                <Field label="Prompt visual">
                  <textarea
                    value={creativeDraft?.visualPrompt || ""}
                    onChange={(event) => setCreativeDraft((current) => ({ ...(current || {}), visualPrompt: event.target.value }))}
                    className={`${inputClassName} min-h-28`}
                  />
                </Field>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              {imageSource ? (
                <>
                  <button onClick={() => setImageModalUrl(imageSource)} className="block overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageSource} alt={selectedEntry.title} className="h-full w-full object-cover" />
                  </button>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => void downloadPreparedImage({
                        source: imageSource,
                        width: creativeResult.requestedWidth,
                        height: creativeResult.requestedHeight,
                        fileName: creativeResult.imageFileName || "studio-criativo.png",
                      })}
                      className={secondaryButtonClassName}
                    >
                      <Download className="h-4 w-4" />
                      Baixar imagem
                    </button>
                    <button
                      onClick={() => {
                        setCreativeInput({
                          ...creativeInputEntry,
                          additionalInfo: `${creativeInputEntry.additionalInfo}\nGerar uma nova variacao visual.`,
                        })
                        handleSubmit()
                      }}
                      className={secondaryButtonClassName}
                    >
                      <RefreshCw className="h-4 w-4" />
                      Gerar nova imagem
                    </button>
                  </div>

                  <p className="mt-3 text-xs text-gray-400">
                    Gerado em {creativeResult.providerSize}. O download prepara o arquivo final no formato solicitado sem deformar a arte.
                  </p>
                </>
              ) : (
                <EmptyCard title="Imagem disponivel apenas nesta execucao" description="O storage de documentos nao estava disponivel para persistir esta imagem gerada." />
              )}
            </div>
          </div>
        </div>
      )
    }

    if (selectedEntry.result.type === "image") {
      const imageResult = selectedEntry.result
      const imageSource = imageResult.imageUrl || imageResult.imageDataUrl || ""

      return (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-gray-500">{imageResult.requestedFormatLabel}</p>
                <p className="text-base font-semibold text-[#0a0a0a]">{selectedEntry.summary}</p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">{imageResult.providerSize}</span>
            </div>

            {imageSource ? (
              <>
                <button onClick={() => setImageModalUrl(imageSource)} className="block overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageSource} alt={selectedEntry.summary} className="h-full w-full object-cover" />
                </button>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => void downloadPreparedImage({
                      source: imageSource,
                      width: imageResult.requestedWidth,
                      height: imageResult.requestedHeight,
                      fileName: imageResult.imageFileName || "studio-imagem.png",
                    })}
                    className={secondaryButtonClassName}
                  >
                    <Download className="h-4 w-4" />
                    Baixar
                  </button>
                  <button
                    onClick={() => {
                      setImageInput((current) => ({
                        ...current,
                        description: current.description ? `${current.description}. Gere uma variacao consistente com o conceito atual.` : current.description,
                      }))
                      handleSubmit()
                    }}
                    className={secondaryButtonClassName}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Gerar variacao
                  </button>
                  <button onClick={() => setImageModalUrl(imageSource)} className={secondaryButtonClassName}>
                    <ExternalLink className="h-4 w-4" />
                    Abrir maior
                  </button>
                </div>
              </>
            ) : (
              <EmptyCard title="Imagem indisponivel no reload" description="Sem storage configurado, a imagem fica disponivel apenas na execucao em que foi gerada." />
            )}

            <Field label="Prompt usado" className="mt-4">
              <textarea value={imageResult.revisedPrompt} readOnly className={`${inputClassName} min-h-28`} />
            </Field>
          </div>
        </div>
      )
    }

    if (selectedEntry.result.type !== "video") {
      return null
    }

    const videoResult = selectedEntry.result

    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-gray-500">{videoResult.aspectRatio} • {videoResult.duration}</p>
              <p className="text-base font-semibold text-[#0a0a0a]">{selectedEntry.title}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs ${
              videoResult.state === "completed"
                ? "bg-emerald-50 text-emerald-700"
                : videoResult.state === "failed"
                  ? "bg-red-50 text-red-700"
                  : "bg-amber-50 text-amber-700"
            }`}>
              {videoResult.state === "completed" ? "Concluido" : videoResult.state === "failed" ? "Falhou" : "Processando"}
            </span>
          </div>

          <p className="text-sm text-gray-600">{videoResult.statusMessage}</p>
          {videoResult.failureReason ? <p className="mt-2 text-sm text-red-600">{videoResult.failureReason}</p> : null}

          {videoResult.videoUrl ? (
            <div className="mt-4">
              <video controls className="w-full rounded-2xl border border-gray-100 bg-black" src={videoResult.videoUrl} />
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={videoResult.videoUrl} download={videoResult.videoFileName || "studio-video.mp4"} className={secondaryButtonClassName}>
                  <Download className="h-4 w-4" />
                  Baixar
                </a>
                <button onClick={() => void handleRefreshVideo(selectedEntry.messageId, videoResult.generationId)} className={secondaryButtonClassName}>
                  <RefreshCw className="h-4 w-4" />
                  Atualizar status
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
              {videoResult.state === "failed"
                ? "Nao houve video disponivel para download."
                : "O video ainda esta sendo preparado. O Studio acompanha o status ate um estado final."}
            </div>
          )}
        </div>
      </div>
    )
  }

  const providerAlert =
    section === "videos"
      ? !providerStatus.lumaConfigured
        ? "LUMA_AGENTS_API_KEY nao configurada. Configure a variavel para ativar a geracao de videos."
        : null
      : !providerStatus.openAiConfigured
        ? "OPENAI_API_KEY nao configurada. Configure a variavel para ativar esta sessao do Studio."
        : null

  return (
    <div className="flex-1 flex flex-col h-full">
      <PortalHeader />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link href="/portal/marketing" className="mb-3 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#0a0a0a]">
                <ArrowLeft className="h-4 w-4" />
                Voltar para Studio
              </Link>
              <h1 className="text-2xl font-semibold text-[#0a0a0a]">{sectionConfig.title}</h1>
              <p className="mt-1 text-sm text-gray-500">{sectionConfig.description}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={handleSubmit} disabled={isPending} className={primaryButtonClassName}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {section === "videos" ? "Gerar video" : "Gerar agora"}
              </button>
              <button onClick={handleRegenerateCurrent} disabled={isPending} className={secondaryButtonClassName}>
                <RefreshCw className="h-4 w-4" />
                Criar novamente
              </button>
            </div>
          </div>

          {providerAlert ? (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {providerAlert}
            </div>
          ) : null}

          {submitError ? (
            <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          ) : null}

          {sessionLoading ? (
            <COSLoading
              title={`Carregando ${sectionConfig.title.toLowerCase()}`}
              description="Estamos organizando o historico e preparando esta sessao do Studio."
              currentStep="Preparando sessao"
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_22rem]">
              <div className="space-y-6">
                <div className="rounded-3xl border border-gray-100 bg-white p-5 sm:p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-50">
                      {section === "campanhas" ? <Sparkles className="h-5 w-5 text-[#0a0a0a]" /> : section === "criativos" ? <ImageIcon className="h-5 w-5 text-[#0a0a0a]" /> : section === "imagens" ? <ImageIcon className="h-5 w-5 text-[#0a0a0a]" /> : <Clapperboard className="h-5 w-5 text-[#0a0a0a]" />}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#0a0a0a]">Area principal de criacao</p>
                      <p className="text-sm text-gray-500">Preencha os campos, gere o resultado e reaproveite o historico desta sessao.</p>
                    </div>
                  </div>
                  {renderForm()}
                </div>

                <div className="rounded-3xl border border-gray-100 bg-gray-50/60 p-5 sm:p-6">
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[#0a0a0a]">Resultado atual</p>
                      <p className="text-sm text-gray-500">O Studio organiza a resposta em blocos reutilizaveis e permite novas iteracoes.</p>
                    </div>
                  </div>
                  {isPending && entries.length === 0 ? (
                    <COSLoading
                      title="Gerando conteudo"
                      description="Estamos consultando os provedores e salvando o historico desta sessao."
                      currentStep="Executando Studio"
                    />
                  ) : (
                    renderResult()
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-gray-100 bg-white p-5 sm:p-6">
                <div className="mb-4">
                  <p className="text-sm font-semibold text-[#0a0a0a]">Historico da sessao</p>
                  <p className="mt-1 text-sm text-gray-500">
                    {conversationId ? `Conversa interna: marketing/${section}` : "Nenhuma geracao salva ainda nesta sessao."}
                  </p>
                </div>

                <div className="space-y-3">
                  {entries.length === 0 ? (
                    <EmptyCard title="Historico vazio" description="As geracoes desta sessao aparecerao aqui assim que voce concluir a primeira execucao." />
                  ) : (
                    entries.map((entry) => (
                      <button
                        key={entry.messageId}
                        onClick={() => setSelectedMessageId(entry.messageId)}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                          selectedEntry?.messageId === entry.messageId ? "border-[#0a0a0a] bg-[#0a0a0a] text-white" : "border-gray-100 bg-gray-50 hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{entry.title}</p>
                            <p className={`mt-1 text-xs ${selectedEntry?.messageId === entry.messageId ? "text-gray-200" : "text-gray-500"}`}>{entry.summary}</p>
                          </div>
                          <span className={`text-[11px] ${selectedEntry?.messageId === entry.messageId ? "text-gray-200" : "text-gray-400"}`}>
                            {formatEntryTime(entry.createdAt)}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {imageModalUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={() => setImageModalUrl(null)}>
          <div className="max-h-[90vh] max-w-5xl overflow-hidden rounded-3xl bg-white p-3" onClick={(event) => event.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageModalUrl} alt="Visual ampliado" className="max-h-[85vh] w-auto rounded-2xl object-contain" />
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-medium text-[#0a0a0a]">{label}</span>
      {children}
    </label>
  )
}

function EmptyCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50">
        <AlertCircle className="h-5 w-5 text-gray-400" />
      </div>
      <p className="text-sm font-medium text-[#0a0a0a]">{title}</p>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
    </div>
  )
}

const inputClassName =
  "w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-[#0a0a0a] focus:border-gray-300 focus:outline-none"

const primaryButtonClassName =
  "inline-flex items-center gap-2 rounded-xl bg-[#0a0a0a] px-4 py-2.5 text-sm text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"

const secondaryButtonClassName =
  "inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70"
