"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Clapperboard,
  Copy,
  CopyPlus,
  Download,
  FileImage,
  Layers3,
  Megaphone,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  RefreshCcw,
  WandSparkles,
} from "lucide-react"
import {
  createStudioConversationAction,
  createStudioImageVariationAction,
  createStudioVideoVariationAction,
  deleteStudioConversationAction,
  duplicateStudioConversationAction,
  getStudioConversationMessagesAction,
  getStudioConversationsAction,
  getStudioImageSignedUrlAction,
  getStudioVideoSignedUrlAction,
  refreshStudioConversationVideoAction,
  renameStudioConversationAction,
  runStudioConversationAction,
} from "@/actions/studio"
import { AreaChat, type ChatMessage } from "@/components/app/area-chat"
import { PortalHeader, PortalPageHeader } from "@/components/portal/portal-header"
import { toast } from "@/hooks/use-toast"
import type { StudioConversationSummary } from "@/lib/studio-types"

const studioSuggestions = ["Campanha", "Criativo", "Imagem", "Video"]

const starterItems = ["campanhas", "criativos", "imagens", "videos", "apresentacoes", "landing pages", "anuncios", "e-mails"]

const studioCreationCards = [
  {
    title: "Criativos",
    description: "Posts, anuncios e conteudos para redes sociais.",
    prompt: "Quero criar um criativo para redes sociais.",
    icon: Layers3,
  },
  {
    title: "Campanhas",
    description: "Planejamento completo de campanhas.",
    prompt: "Quero criar uma campanha completa.",
    icon: Megaphone,
  },
  {
    title: "Imagens",
    description: "Crie imagens com IA.",
    prompt: "Quero criar uma imagem com IA.",
    icon: FileImage,
  },
  {
    title: "Videos",
    description: "Crie videos com IA.",
    prompt: "Quero criar um video com IA.",
    icon: Clapperboard,
  },
] as const

function buildStudioStarterText() {
  return ["Como posso ajudar?", "", "Posso criar:", "", ...starterItems.map((item) => `- ${item}`)].join("\n")
}

function mapServerMessageToChatMessage(message: {
  id: string
  from: string
  text: string
  time: string
  createdAt?: string | null
  imageUrl?: string
  imageAlt?: string
  imageStatus?: string
  imagePrompt?: string
  videoUrl?: string
  videoStatus?: string
  videoPrompt?: string
  videoState?: string
  videoGenerationId?: string
  videoFileName?: string
}): ChatMessage {
  return {
    id: message.id,
    from: message.from as "cos" | "user",
    text: message.text,
    time: message.time,
    createdAt: message.createdAt,
    imageUrl: message.imageUrl,
    imageAlt: message.imageAlt,
    imageStatus: message.imageStatus,
    imagePrompt: message.imagePrompt,
    videoUrl: message.videoUrl,
    videoStatus: message.videoStatus,
    videoPrompt: message.videoPrompt,
    videoState: message.videoState,
    videoGenerationId: message.videoGenerationId,
    videoFileName: message.videoFileName,
  }
}

export function StudioHome() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const conversationId = searchParams.get("conversationId")?.trim() || ""
  const draft = searchParams.get("draft")?.trim() || ""
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversations, setConversations] = useState<StudioConversationSummary[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(Boolean(conversationId))
  const [isLoadingConversations, setIsLoadingConversations] = useState(true)
  const [activeTitle, setActiveTitle] = useState("Studio IA")
  const [prefilledInput, setPrefilledInput] = useState(draft)
  const [pendingImageMessageId, setPendingImageMessageId] = useState<string | null>(null)
  const [pendingVideoMessageId, setPendingVideoMessageId] = useState<string | null>(null)
  const [isConversationMenuOpen, setIsConversationMenuOpen] = useState(false)
  const refreshingVideoIdsRef = useRef<Set<string>>(new Set())
  const videoPollingAttemptsRef = useRef<Record<string, number>>({})

  const loadConversations = async () => {
    setIsLoadingConversations(true)
    const result = await getStudioConversationsAction()

    if (result.error) {
      toast({
        title: "Nao foi possivel carregar",
        description: result.error,
      })
      setIsLoadingConversations(false)
      return
    }

    setConversations(result.conversations ?? [])
    setIsLoadingConversations(false)
  }

  const loadConversationMessages = async (targetConversationId: string) => {
    const result = await getStudioConversationMessagesAction({ conversationId: targetConversationId })

    if (result.error) {
      toast({
        title: "Nao foi possivel carregar",
        description: result.error,
      })
      return null
    }

    const nextMessages = ((result.messages ?? []).filter(Boolean) as ChatMessage[])
    setMessages(
      nextMessages.length > 0
        ? nextMessages
        : [
            {
              id: "studio-welcome",
              from: "cos",
              text: buildStudioStarterText(),
              time: "",
            },
          ],
    )
    setActiveTitle(result.title || "Studio IA")
    return result
  }

  useEffect(() => {
    void loadConversations()
  }, [])

  useEffect(() => {
    setPrefilledInput(draft)
  }, [draft])

  useEffect(() => {
    let active = true

    const loadMessages = async () => {
      if (!conversationId) {
        setMessages([
          {
            id: "studio-welcome",
            from: "cos",
            text: buildStudioStarterText(),
            time: "",
          },
        ])
        setActiveTitle("Studio IA")
        setIsLoadingMessages(false)
        setIsConversationMenuOpen(false)
        return
      }

      setIsLoadingMessages(true)
      const result = await getStudioConversationMessagesAction({ conversationId })

      if (!active) {
        return
      }

      if (result.error) {
        toast({
          title: "Nao foi possivel carregar",
          description: result.error,
        })
        setMessages([])
        setActiveTitle("Studio IA")
        setIsLoadingMessages(false)
        return
      }

      const nextMessages = ((result.messages ?? []).filter(Boolean) as ChatMessage[])

      setMessages(
        nextMessages.length > 0
          ? nextMessages
          : [
              {
                id: "studio-welcome",
                from: "cos",
                text: buildStudioStarterText(),
                time: "",
              },
            ],
      )
      setActiveTitle(result.title || "Studio IA")
      setIsLoadingMessages(false)
      setIsConversationMenuOpen(false)
    }

    void loadMessages()

    return () => {
      active = false
    }
  }, [conversationId])

  useEffect(() => {
    if (!conversationId) {
      return
    }

    const pendingMessages = messages.filter(
      (message) =>
        message.id &&
        message.videoGenerationId &&
        (message.videoState === "queued" || message.videoState === "processing" || message.videoState === "preparing"),
    )

    if (pendingMessages.length === 0) {
      return
    }

    let cancelled = false

    const refreshPendingVideos = async () => {
      for (const message of pendingMessages) {
        if (!message.id || refreshingVideoIdsRef.current.has(message.id)) {
          continue
        }

        const attempts = videoPollingAttemptsRef.current[message.id] ?? 0
        const createdAt = message.createdAt ? new Date(message.createdAt).getTime() : 0

        if (attempts >= 40 || (createdAt > 0 && Date.now() - createdAt > 1000 * 60 * 30)) {
          continue
        }

        refreshingVideoIdsRef.current.add(message.id)
        videoPollingAttemptsRef.current[message.id] = attempts + 1

        const result = await refreshStudioConversationVideoAction({
          conversationId,
          messageId: message.id,
        })

        refreshingVideoIdsRef.current.delete(message.id)

        if (cancelled) {
          return
        }

        if (result.error || !result.message) {
          continue
        }

        const refreshedMessage = mapServerMessageToChatMessage(result.message)

        setMessages((current) =>
          current.map((item) =>
            item.id === refreshedMessage.id
              ? {
                  ...item,
                  ...refreshedMessage,
                }
              : item,
          ),
        )
      }
    }

    void refreshPendingVideos()
    const interval = window.setInterval(() => {
      void refreshPendingVideos()
    }, 15000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [conversationId, messages])

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === conversationId) ?? null,
    [conversations, conversationId],
  )

  const openNewConversation = () => {
    setPrefilledInput("")
    setActiveTitle("Studio IA")
    setIsConversationMenuOpen(false)
    router.replace("/portal/marketing")
  }

  const openConversation = (id: string) => {
    setPrefilledInput("")
    setIsConversationMenuOpen(false)
    router.replace(`/portal/marketing?conversationId=${id}`)
  }

  const openCreationCard = async (prompt: string) => {
    const result = await createStudioConversationAction()

    if ("error" in result && result.error) {
      toast({
        title: "Nao foi possivel abrir",
        description: result.error,
      })
      return
    }

    if (!("conversation" in result) || !result.conversation) {
      toast({
        title: "Nao foi possivel abrir",
        description: "O Studio nao conseguiu preparar a nova conversa.",
      })
      return
    }

    setPrefilledInput(prompt)
    setActiveTitle("Studio IA")
    setIsConversationMenuOpen(false)
    await loadConversations()
    router.replace(`/portal/marketing?conversationId=${result.conversation.id}&draft=${encodeURIComponent(prompt)}`)
  }

  const handleRenameConversation = async () => {
    if (!conversationId) return

    const nextTitle = window.prompt("Novo nome da conversa", activeTitle)

    if (!nextTitle || nextTitle.trim() === activeTitle.trim()) {
      return
    }

    const result = await renameStudioConversationAction({
      conversationId,
      title: nextTitle,
    })

    if (result.error) {
      toast({
        title: "Nao foi possivel renomear",
        description: result.error,
      })
      return
    }

    setActiveTitle(nextTitle.trim())
    setIsConversationMenuOpen(false)
    await loadConversations()
    toast({
      title: "Conversa renomeada",
      description: "O novo titulo foi salvo no Studio.",
    })
  }

  const handleDeleteConversation = async () => {
    if (!conversationId) return

    const confirmed = window.confirm("Deseja excluir esta conversa do Studio?")

    if (!confirmed) {
      return
    }

    const result = await deleteStudioConversationAction({ conversationId })

    if (result.error) {
      toast({
        title: "Nao foi possivel excluir",
        description: result.error,
      })
      return
    }

    setMessages([
      {
        id: "studio-welcome",
        from: "cos",
        text: buildStudioStarterText(),
        time: "",
      },
    ])
    setActiveTitle("Studio IA")
    setPrefilledInput("")
    setIsConversationMenuOpen(false)
    router.replace("/portal/marketing")
    await loadConversations()
    toast({
      title: "Conversa excluida",
      description: "A criacao foi removida do historico do Studio.",
    })
  }

  const handleDuplicateConversation = async () => {
    if (!conversationId) return

    const result = await duplicateStudioConversationAction({ conversationId })

    if (result.error) {
      toast({
        title: "Nao foi possivel duplicar",
        description: result.error,
      })
      return
    }

    await loadConversations()
    setIsConversationMenuOpen(false)
    router.replace(`/portal/marketing?conversationId=${result.conversationId}`)
    toast({
      title: "Conversa duplicada",
      description: "A copia foi criada no historico do Studio.",
    })
  }

  const handleDownloadImage = async (messageId: string) => {
    if (!conversationId) return

    const result = await getStudioImageSignedUrlAction({
      conversationId,
      messageId,
      download: true,
    })

    if (result.error || !result.url) {
      toast({
        title: "Nao foi possivel baixar",
        description: result.error || "A imagem ainda nao esta disponivel.",
      })
      return
    }

    window.open(result.url, "_blank", "noopener,noreferrer")
  }

  const handleImageVariation = async (messageId: string, regenerate = false) => {
    if (!conversationId) return

    const instructions = regenerate ? "" : window.prompt("Como voce quer ajustar a nova versao?", "mais clean")

    if (!regenerate && instructions === null) {
      return
    }

    setPendingImageMessageId(messageId)

    const result = await createStudioImageVariationAction({
      conversationId,
      messageId,
      instructions: instructions || "",
      regenerate,
    })

    setPendingImageMessageId(null)

    if (result.error || !result.message) {
      toast({
        title: regenerate ? "Nao foi possivel gerar novamente" : "Nao foi possivel criar a variacao",
        description: result.error || "Tente novamente em instantes.",
      })
      return
    }

    await loadConversationMessages(conversationId)
    await loadConversations()
  }

  const handleDownloadVideo = async (messageId: string) => {
    if (!conversationId) return

    const result = await getStudioVideoSignedUrlAction({
      conversationId,
      messageId,
      download: true,
    })

    if (result.error || !result.url) {
      toast({
        title: "Nao foi possivel baixar",
        description: result.error || "O video ainda nao esta disponivel.",
      })
      return
    }

    window.open(result.url, "_blank", "noopener,noreferrer")
  }

  const handleVideoVariation = async (messageId: string, regenerate = false) => {
    if (!conversationId) return

    const instructions = regenerate ? "" : window.prompt("Como voce quer ajustar a nova versao?", "mais cinematografico")

    if (!regenerate && instructions === null) {
      return
    }

    setPendingVideoMessageId(messageId)

    const result = await createStudioVideoVariationAction({
      conversationId,
      messageId,
      instructions: instructions || "",
      regenerate,
    })

    setPendingVideoMessageId(null)

    if (result.error || !("message" in result) || !result.message) {
      toast({
        title: regenerate ? "Nao foi possivel gerar novamente" : "Nao foi possivel criar a nova versao",
        description: result.error || "Tente novamente em instantes.",
      })
      return
    }

    await loadConversationMessages(conversationId)
    await loadConversations()
  }

  return (
    <div className="flex h-full flex-1 flex-col">
      <PortalHeader />
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-[22rem] shrink-0 border-r border-gray-100 bg-white xl:flex xl:flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Conversas recentes</p>
              <div className="mt-3 space-y-2">
                {isLoadingConversations ? (
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                    Carregando conversas...
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-500">
                    Nenhuma criacao salva ainda.
                  </div>
                ) : (
                  conversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => openConversation(conversation.id)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                        conversation.id === conversationId ? "border-[#0a0a0a] bg-gray-50" : "border-gray-100 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <p className="truncate text-sm font-semibold text-[#0a0a0a]">{conversation.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-gray-500">{conversation.preview}</p>
                      <p className="mt-2 text-[11px] text-gray-400">{conversation.time}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col bg-[#fcfcfc]">
          <div className="border-b border-gray-100 bg-white px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-[#0a0a0a]">{activeConversation?.title || activeTitle}</p>
                <p className="text-sm text-gray-500">Crie campanhas, criativos, imagens e videos conversando com o COS.</p>
              </div>
              {conversationId ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={openNewConversation}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4" />
                    Nova conversa
                  </button>
                  <button
                    onClick={() => void handleRenameConversation()}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-gray-50"
                  >
                    <Pencil className="h-4 w-4" />
                    Renomear
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setIsConversationMenuOpen((current) => !current)}
                      className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-gray-50"
                      aria-label="Mais acoes"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {isConversationMenuOpen ? (
                      <div className="absolute right-0 top-full z-20 mt-2 w-44 rounded-2xl border border-gray-100 bg-white p-2 shadow-lg">
                        <button
                          onClick={() => void handleDuplicateConversation()}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-[#0a0a0a] transition-colors hover:bg-gray-50"
                        >
                          <CopyPlus className="h-4 w-4" />
                          Duplicar
                        </button>
                        <button
                          onClick={() => void handleDeleteConversation()}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-red-700 transition-colors hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Excluir
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {!conversationId ? (
            <div className="flex-1 overflow-y-auto bg-white px-4 py-6">
              <div className="mx-auto max-w-5xl">
                <PortalPageHeader
                  title="Studio IA"
                  description="Crie campanhas, criativos, imagens e videos conversando com o COS."
                />
                <p className="mt-6 text-lg font-semibold text-[#0a0a0a]">O que voce deseja criar hoje?</p>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {studioCreationCards.map((card) => (
                    <button
                      key={card.title}
                      onClick={() => void openCreationCard(card.prompt)}
                      className="rounded-3xl border border-gray-100 bg-white p-5 text-left transition-colors hover:bg-gray-50"
                    >
                      <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-50">
                        <card.icon className="h-5 w-5 text-[#0a0a0a]" />
                      </span>
                      <p className="text-base font-semibold text-[#0a0a0a]">{card.title}</p>
                      <p className="mt-2 text-sm text-gray-500">{card.description}</p>
                    </button>
                  ))}
                </div>
                <div className="mt-8 xl:hidden">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Conversas recentes</p>
                  <div className="mt-3 space-y-2">
                    {isLoadingConversations ? (
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                        Carregando conversas...
                      </div>
                    ) : conversations.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-500">
                        Nenhuma criacao salva ainda.
                      </div>
                    ) : (
                      conversations.map((conversation) => (
                        <button
                          key={conversation.id}
                          onClick={() => openConversation(conversation.id)}
                          className="w-full rounded-2xl border border-gray-100 bg-white px-4 py-3 text-left transition-colors hover:bg-gray-50"
                        >
                          <p className="truncate text-sm font-semibold text-[#0a0a0a]">{conversation.title}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-gray-500">{conversation.preview}</p>
                          <p className="mt-2 text-[11px] text-gray-400">{conversation.time}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {conversationId ? (
            <AreaChat
              conversationKey={conversationId}
              title={activeConversation?.title || activeTitle}
              subtitle="Crie campanhas, criativos, imagens e videos conversando com o COS."
              icon={Sparkles}
              color="#0a0a0a"
              bg="#f5f5f5"
              messages={messages}
              isLoadingHistory={isLoadingMessages}
              placeholder="Descreva o que voce deseja criar..."
              prefilledInput={prefilledInput}
              hideHeader={false}
              quickActions={studioSuggestions.map((label) => ({
                label,
                onClick: () => setPrefilledInput(label),
              }))}
              emptyLabel="Como posso ajudar?"
              renderMessageActions={(message) =>
                message.from === "cos" ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(message.text)
                        toast({
                          title: "Conteudo copiado",
                          description: "A resposta do Studio foi copiada.",
                        })
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-[#0a0a0a] transition-colors hover:bg-gray-50"
                    >
                      <Copy className="h-3 w-3" />
                      Copiar
                    </button>
                    {message.imagePrompt ? (
                      <button
                        onClick={async () => {
                          await navigator.clipboard.writeText(message.imagePrompt || "")
                          toast({
                            title: "Prompt copiado",
                            description: "O prompt final da imagem foi copiado.",
                          })
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-[#0a0a0a] transition-colors hover:bg-gray-50"
                      >
                        <Copy className="h-3 w-3" />
                        Copiar prompt
                      </button>
                    ) : null}
                    {message.imageUrl && message.id ? (
                      <button
                        onClick={() => void handleDownloadImage(message.id!)}
                        className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-[#0a0a0a] transition-colors hover:bg-gray-50"
                      >
                        <Download className="h-3 w-3" />
                        Baixar
                      </button>
                    ) : null}
                    {message.imagePrompt && message.id ? (
                      <button
                        onClick={() => void handleImageVariation(message.id!, false)}
                        disabled={pendingImageMessageId === message.id}
                        className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-[#0a0a0a] transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <WandSparkles className="h-3 w-3" />
                        Criar variacao
                      </button>
                    ) : null}
                    {message.imagePrompt && message.id ? (
                      <button
                        onClick={() => void handleImageVariation(message.id!, true)}
                        disabled={pendingImageMessageId === message.id}
                        className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-[#0a0a0a] transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <RefreshCcw className="h-3 w-3" />
                        Gerar novamente
                      </button>
                    ) : null}
                    {message.videoPrompt ? (
                      <button
                        onClick={async () => {
                          await navigator.clipboard.writeText(message.videoPrompt || "")
                          toast({
                            title: "Prompt copiado",
                            description: "O prompt final do video foi copiado.",
                          })
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-[#0a0a0a] transition-colors hover:bg-gray-50"
                      >
                        <Copy className="h-3 w-3" />
                        Copiar prompt
                      </button>
                    ) : null}
                    {message.videoUrl && message.id ? (
                      <button
                        onClick={() => void handleDownloadVideo(message.id!)}
                        className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-[#0a0a0a] transition-colors hover:bg-gray-50"
                      >
                        <Download className="h-3 w-3" />
                        Baixar
                      </button>
                    ) : null}
                    {message.videoPrompt && message.id ? (
                      <button
                        onClick={() => void handleVideoVariation(message.id!, false)}
                        disabled={pendingVideoMessageId === message.id}
                        className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-[#0a0a0a] transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <WandSparkles className="h-3 w-3" />
                        Nova versao
                      </button>
                    ) : null}
                    {message.videoPrompt && message.id ? (
                      <button
                        onClick={() => void handleVideoVariation(message.id!, true)}
                        disabled={pendingVideoMessageId === message.id}
                        className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-[#0a0a0a] transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <RefreshCcw className="h-3 w-3" />
                        Gerar novamente
                      </button>
                    ) : null}
                    <button
                      onClick={() => setPrefilledInput("Continue esta criacao considerando a ultima resposta.")}
                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-[#0a0a0a] transition-colors hover:bg-gray-50"
                    >
                      <MessageSquare className="h-3 w-3" />
                      Continuar criacao
                    </button>
                  </div>
                ) : null
              }
              onSendMessage={async (input, now) => {
                const result = await runStudioConversationAction({
                  conversationId: conversationId || undefined,
                  message: input,
                })

                if (result.error || !result.message) {
                  return {
                    messages: [
                      {
                        id: `studio-error-${Date.now()}`,
                        from: "cos" as const,
                        text: result.error || "Nao consegui concluir esta criacao agora. Tente novamente em instantes.",
                        time: now,
                      },
                    ],
                  }
                }

                if (result.conversationId && result.conversationId !== conversationId) {
                  router.replace(`/portal/marketing?conversationId=${result.conversationId}`)
                }

                setPrefilledInput("")

                if (result.conversationId) {
                  await loadConversationMessages(result.conversationId)
                }

                await loadConversations()

                return { messages: [] }
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
