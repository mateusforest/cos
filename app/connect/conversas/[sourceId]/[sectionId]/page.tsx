"use client"

import { use, useEffect, useState } from "react"
import {
  getConnectConversationMessagesAction,
  sendConnectConversationMessageAction,
} from "@/actions/connect"
import { AreaChat, type ChatMessage } from "@/components/app/area-chat"
import { useConnect } from "@/components/connect/connect-store"
import { Plug, Wrench, Layers, ExternalLink } from "lucide-react"

export default function ConnectSectionChatPage({
  params,
}: {
  params: Promise<{ sourceId: string; sectionId: string }>
}) {
  const { sourceId, sectionId } = use(params)
  const { sources, openModal, toast } = useConnect()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(true)

  const source = sources.find((item) => item.id === sourceId) ?? null
  const section = source?.sections.find((item) => item.id === sectionId) ?? null

  useEffect(() => {
    let isMounted = true

    if (!source || !section) {
      setMessages([])
      setIsLoadingMessages(false)
      return
    }

    const loadMessages = async () => {
      setIsLoadingMessages(true)
      const result = await getConnectConversationMessagesAction({
        sourceId,
        sectionId,
      })

      if (!isMounted) {
        return
      }

      if (result.success) {
        setMessages(result.messages)
      } else {
        setMessages([])
      }

      setIsLoadingMessages(false)
    }

    void loadMessages()

    return () => {
      isMounted = false
    }
  }, [section, sectionId, source, sourceId])

  if (!source || !section) {
    return (
      <AreaChat
        title="Sessao nao encontrada"
        subtitle="Esta sessao ainda nao esta disponivel para o seu workspace."
        icon={Plug}
        emptyLabel="Volte para Conversas e selecione uma sessao valida do Connect."
      />
    )
  }

  return (
    <AreaChat
      conversationKey={`${sourceId}/${sectionId}`}
      title={section.name}
      subtitle={`${source.name} - ${section.description || "Sessao operacional do Connect."}`}
      icon={Plug}
      messages={messages}
      isLoadingHistory={isLoadingMessages}
      emptyLabel={`Ainda nao ha mensagens nesta sessao. Converse com o COS sobre ${section.name}.`}
      quickActions={[
        {
          label: "Criar acao",
          icon: Wrench,
          onClick: () => openModal("action", { sourceId: source.id }),
        },
        {
          label: "Criar sessao",
          icon: Layers,
          onClick: () => openModal("section", { sourceId: source.id }),
        },
        {
          label: "Ver fonte",
          icon: ExternalLink,
          onClick: () => {
            if (source.accessUrl) {
              window.open(source.accessUrl, "_blank", "noopener,noreferrer")
              return
            }
            toast("Esta fonte ainda nao possui URL de acesso configurada.")
          },
        },
      ]}
      onSendMessage={async (input, now) => {
        const result = await sendConnectConversationMessageAction({
          sourceId,
          sectionId,
          message: input,
        })

        if (result.success) {
          setMessages(result.messages)

          const latestCosMessage = [...result.messages].reverse().find((message) => message.from === "cos")

          return {
            messages: latestCosMessage
              ? [
                  {
                    id: latestCosMessage.id,
                    from: latestCosMessage.from,
                    text: latestCosMessage.text,
                    time: latestCosMessage.time,
                  } satisfies ChatMessage,
                ]
              : [],
          }
        }

        return {
          messages: [
            {
              from: "cos",
              text: result.error || "Nao foi possivel salvar sua mensagem nesta sessao.",
              time: now,
            } satisfies ChatMessage,
          ],
        }
      }}
    />
  )
}
