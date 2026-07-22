"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Copy, MessageSquare, Pencil, Plus, Sparkles, Trash2, CopyPlus, Download, RefreshCcw, WandSparkles } from "lucide-react"
import {
  createStudioConversationAction,
  createStudioImageVariationAction,
  deleteStudioConversationAction,
  duplicateStudioConversationAction,
  getStudioConversationMessagesAction,
  getStudioConversationsAction,
  getStudioImageSignedUrlAction,
  renameStudioConversationAction,
  runStudioConversationAction,
} from "@/actions/studio"
import { AreaChat, type ChatMessage } from "@/components/app/area-chat"
import { PortalHeader, PortalPageHeader } from "@/components/portal/portal-header"
import { toast } from "@/hooks/use-toast"
import type { StudioConversationSummary } from "@/lib/studio-types"

const studioSuggestions = [
  "Criar campanha",
  "Criar anuncio",
  "Criar post",
  "Criar roteiro",
  "Criar e-mail",
  "Criar apresentacao",
  "Criar landing page",
  "Criar sequencia de WhatsApp",
]

const initialPromptExamples = [
  "Um post para Instagram",
  "Uma campanha",
  "Um anuncio",
  "Um e-mail",
  "Um roteiro",
  "Uma apresentacao",
  "Um video",
  "Uma imagem",
]

function buildStudioStarterText() {
  return [
    "O que voce deseja criar hoje?",
    "",
    ...initialPromptExamples.map((item) => `• ${item}`),
  ].join("\n")
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

  const loadConversations = async (nextConversationId?: string | null) => {
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

    if (nextConversationId && !conversationId) {
      router.replace(`/portal/marketing?conversationId=${nextConversationId}`)
    }
  }

  useEffect(() => {
    void loadConversations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    }

    void loadMessages()

    return () => {
      active = false
    }
  }, [conversationId])

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === conversationId) ?? null,
    [conversations, conversationId],
  )

  const openNewConversation = async () => {
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

    setPrefilledInput("")
    await loadConversations(result.conversation.id)
    router.replace(`/portal/marketing?conversationId=${result.conversation.id}`)
  }

  const openConversation = (id: string) => {
    setPrefilledInput("")
    router.replace(`/portal/marketing?conversationId=${id}`)
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

    await loadConversations(result.conversationId)
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

    const nextMessage = result.message

    setMessages((current) => [
      ...current,
      {
        id: nextMessage.id,
        from: nextMessage.from as "cos" | "user",
        text: nextMessage.text,
        time: nextMessage.time,
        imageUrl: nextMessage.imageUrl,
        imageAlt: nextMessage.imageAlt,
        imageStatus: nextMessage.imageStatus,
        imagePrompt: nextMessage.imagePrompt,
      },
    ])

    await loadConversations()
  }

  return (
    <div className="flex h-full flex-1 flex-col">
      <PortalHeader />
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-[22rem] shrink-0 border-r border-gray-100 bg-white xl:flex xl:flex-col">
          <div className="border-b border-gray-100 px-5 py-5">
            <PortalPageHeader
              title="Studio IA"
              description="Crie campanhas, criativos, textos, imagens e videos conversando com o COS."
            />
            <button
              onClick={() => void openNewConversation()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0a0a0a] px-4 py-2.5 text-sm text-white transition-colors hover:bg-gray-800"
            >
              <Plus className="h-4 w-4" />
              Nova criacao
            </button>
          </div>

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

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">Sugestoes</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {studioSuggestions.map((suggestion) => (
                  <Link
                    key={suggestion}
                    href={`/portal/marketing?draft=${encodeURIComponent(suggestion)}`}
                    className="rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-[#0a0a0a] transition-colors hover:bg-gray-50"
                  >
                    {suggestion}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col bg-[#fcfcfc]">
          <div className="border-b border-gray-100 bg-white px-4 py-4 xl:hidden">
            <PortalPageHeader
              title="Studio IA"
              description="Crie campanhas, criativos, textos, imagens e videos conversando com o COS."
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => void openNewConversation()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0a0a0a] px-4 py-2.5 text-sm text-white transition-colors hover:bg-gray-800"
              >
                <Plus className="h-4 w-4" />
                Nova criacao
              </button>
              {studioSuggestions.slice(0, 4).map((suggestion) => (
                <Link
                  key={suggestion}
                  href={`/portal/marketing?draft=${encodeURIComponent(suggestion)}`}
                  className="rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-[#0a0a0a] transition-colors hover:bg-gray-50"
                >
                  {suggestion}
                </Link>
              ))}
            </div>
          </div>

          <div className="border-b border-gray-100 bg-white px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-[#0a0a0a]">{activeConversation?.title || activeTitle}</p>
                <p className="text-sm text-gray-500">Converse com o COS para criar textos e materiais do Studio.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => void openNewConversation()}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4" />
                  Nova criacao
                </button>
                {conversationId ? (
                  <>
                    <button
                      onClick={() => void handleRenameConversation()}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-gray-50"
                    >
                      <Pencil className="h-4 w-4" />
                      Renomear
                    </button>
                    <button
                      onClick={() => void handleDuplicateConversation()}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-[#0a0a0a] transition-colors hover:bg-gray-50"
                    >
                      <CopyPlus className="h-4 w-4" />
                      Duplicar
                    </button>
                    <button
                      onClick={() => void handleDeleteConversation()}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <AreaChat
            conversationKey={conversationId || "studio-root"}
            title={activeConversation?.title || activeTitle}
            subtitle="Crie campanhas, criativos, textos e planejamentos conversando com o COS."
            icon={Sparkles}
            color="#0a0a0a"
            bg="#f5f5f5"
            messages={messages}
            isLoadingHistory={isLoadingMessages}
            placeholder="Descreva o que voce deseja criar..."
            prefilledInput={prefilledInput}
            quickActions={studioSuggestions.map((label) => ({
              label,
              onClick: () => setPrefilledInput(label),
            }))}
            emptyLabel="O que voce deseja criar hoje?"
            renderMessageActions={(message) =>
              message.from === "cos" && conversationId ? (
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
                  <button
                    onClick={() => setPrefilledInput("Continue esta criacao considerando a ultima resposta.")}
                    className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-[#0a0a0a] transition-colors hover:bg-gray-50"
                  >
                    <MessageSquare className="h-3 w-3" />
                    Continuar criacao
                  </button>
                  <button
                    onClick={() => void handleRenameConversation()}
                    className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-[#0a0a0a] transition-colors hover:bg-gray-50"
                  >
                    <Pencil className="h-3 w-3" />
                    Renomear conversa
                  </button>
                  <button
                    onClick={() => void handleDuplicateConversation()}
                    className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-[#0a0a0a] transition-colors hover:bg-gray-50"
                  >
                    <CopyPlus className="h-3 w-3" />
                    Duplicar
                  </button>
                  <button
                    onClick={() => void handleDeleteConversation()}
                    className="inline-flex items-center gap-1 rounded-full border border-red-200 px-2.5 py-1 text-[11px] font-medium text-red-700 transition-colors hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3" />
                    Excluir conversa
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
              await loadConversations()

              return {
                messages: [
                  {
                    id: result.message.id,
                    from: result.message.from as "cos" | "user",
                    text: result.message.text,
                    time: result.message.time || now,
                    imageUrl: result.message.imageUrl,
                    imageAlt: result.message.imageAlt,
                    imageStatus: result.message.imageStatus,
                    imagePrompt: result.message.imagePrompt,
                  },
                ],
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}
