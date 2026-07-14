"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  getOperationsConversationMessagesAction,
  runOperationsEngineAction,
} from "@/actions/operations-engine"
import { AreaChat, type ChatMessage } from "@/components/app/area-chat"
import { useAuth } from "@/components/auth/auth-provider"
import { getOperationsAreaConfigs, slug } from "@/lib/area-configs"

const portalDestinations: Record<string, string> = {
  clientes: "/portal/cadastros/clientes",
  leads: "/portal/cadastros/leads",
  produtos: "/portal/cadastros/produtos",
  servicos: "/portal/cadastros/servicos",
  projetos: "/portal/operacoes",
  ordens: "/portal/operacoes",
  processos: "/portal/operacoes",
  propostas: "/portal/vendas/propostas",
  negociacoes: "/portal/vendas/negociacoes",
  pedidos: "/portal/vendas/pedidos",
  vendas: "/portal/vendas/vendas",
  funil: "/portal/vendas/funil",
  ganhos: "/portal/financeiro",
  gastos: "/portal/financeiro",
  "fluxo-de-caixa": "/portal/financeiro",
  comercial: "/portal/equipe",
  operacional: "/portal/equipe",
  financeiro: "/portal/equipe",
  administrativo: "/portal/equipe",
  contratos: "/portal/contratos",
  arquivos: "/portal/documentos",
  relatorios: "/portal/relatorios",
}

function resolveChatCopy(area: string, subLabel: string) {
  if (area === "cadastros") {
    const normalizedSub = slug(subLabel)
    const portalLabelBySub: Record<string, string> = {
      clientes: "Ver clientes no Portal",
      leads: "Ver leads no Portal",
      produtos: "Ver produtos no Portal",
      servicos: "Ver servicos no Portal",
    }

    return {
      subtitle: `Conversa contextual de ${subLabel.toLowerCase()} do seu workspace.`,
      emptyLabel: `Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre ${subLabel.toLowerCase()}.`,
      quickActions:
        normalizedSub === "clientes"
          ? ["Criar cliente", "Buscar cliente", portalLabelBySub[normalizedSub]]
          : [`Buscar ${subLabel.toLowerCase()}`, portalLabelBySub[normalizedSub] ?? "Ver cadastros no Portal"],
    }
  }

  if (area === "operacoes") {
    return {
      subtitle: `Conversa operacional sobre ${subLabel.toLowerCase()}.`,
      emptyLabel: `Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre ${subLabel.toLowerCase()}.`,
      quickActions: ["Criar operacao", "Buscar operacao", "Ver operacoes no Portal"],
    }
  }

  if (area === "vendas") {
    const normalizedSub = slug(subLabel)

    return {
      subtitle: `Conversa comercial sobre ${subLabel.toLowerCase()}.`,
      emptyLabel: `Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre ${subLabel.toLowerCase()}.`,
      quickActions:
        normalizedSub === "propostas"
          ? ["Criar proposta", "Ver vendas no Portal"]
          : normalizedSub === "negociacoes"
            ? ["Abrir propostas", "Ver vendas no Portal"]
            : ["Ver vendas no Portal"],
    }
  }

  if (area === "financeiro") {
    return {
      subtitle: `Conversa financeira sobre ${subLabel.toLowerCase()}.`,
      emptyLabel: `Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre ${subLabel.toLowerCase()}.`,
      quickActions: ["Registrar ganho", "Registrar gasto", "Ver financeiro no Portal"],
    }
  }

  if (area === "equipe") {
    return {
      subtitle: `Conversa contextual da equipe ${subLabel.toLowerCase()}.`,
      emptyLabel: `Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre a equipe ${subLabel.toLowerCase()}.`,
      quickActions: ["Adicionar membro", "Atribuir tarefa", "Ver equipe no Portal"],
    }
  }

  if (area === "documentos") {
    return {
      subtitle: `Conversa documental sobre ${subLabel.toLowerCase()}.`,
      emptyLabel: `Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre ${subLabel.toLowerCase()}.`,
      quickActions: ["Criar documento", "Buscar arquivo", "Ver documentos no Portal"],
    }
  }

  return {
    subtitle: `${subLabel} · COS Operacoes`,
    emptyLabel: `Ainda nao ha mensagens nesta conversa. Use o campo abaixo para falar com o COS sobre ${subLabel.toLowerCase()}.`,
    quickActions: ["Abrir no Portal"],
  }
}

export default function SubAreaPage({ params }: { params: Promise<{ area: string; sub: string }> }) {
  const { area, sub } = use(params)
  const router = useRouter()
  const { workspace } = useAuth()
  const areaConfigs = getOperationsAreaConfigs(workspace?.metadata?.segment)
  const config = areaConfigs[area]
  const [messages, setMessages] = useState<ChatMessage[]>(config?.messages ?? [])
  const [isLoadingMessages, setIsLoadingMessages] = useState(true)

  const subLabel =
    config?.subsections.find((section) => slug(section) === sub) ??
    sub.charAt(0).toUpperCase() + sub.slice(1).replace(/-/g, " ")

  const chatCopy = resolveChatCopy(area, subLabel)

  useEffect(() => {
    let isMounted = true

    const loadMessages = async () => {
      setIsLoadingMessages(true)
      const result = await getOperationsConversationMessagesAction({
        area,
        subArea: sub,
      })

      if (!isMounted) {
        return
      }

      if (result.success) {
        setMessages(result.messages)
      } else {
        setMessages(config?.messages ?? [])
      }

      setIsLoadingMessages(false)
    }

    void loadMessages()

    return () => {
      isMounted = false
    }
  }, [area, sub, config])

  return (
    <AreaChat
      conversationKey={`${area}/${sub}`}
      title={subLabel}
      subtitle={chatCopy.subtitle}
      icon={config?.icon ?? areaConfigs.sistema.icon}
      color={config?.color}
      bg={config?.bg}
      messages={messages}
      isLoadingHistory={isLoadingMessages}
      quickActions={chatCopy.quickActions.map((label) => ({
        label,
        onClick: () => {
          if (label.includes("Portal")) {
            router.push(portalDestinations[sub] || "/portal")
            return
          }

          if (label === "Criar cliente") {
            router.push("/app/novo/cliente")
            return
          }

          if (label === "Criar operacao") {
            router.push("/app/novo/operacao")
            return
          }

          if (label === "Criar proposta") {
            router.push("/portal/vendas/propostas")
            return
          }

          if (label === "Abrir propostas") {
            router.push("/portal/vendas/propostas")
            return
          }

          if (label === "Registrar ganho" || label === "Registrar gasto") {
            router.push("/app/novo/financeiro")
            return
          }

          if (label === "Criar documento") {
            router.push("/app/novo/documento")
            return
          }
        },
      }))}
      onSendMessage={async (input, now) => {
        try {
          const result = await runOperationsEngineAction({
            message: input,
            area,
            subArea: sub,
          })
          const responseText =
            typeof result.message === "string" && result.message.trim()
              ? result.message
              : "Nao consegui executar sua solicitacao agora. Tente novamente em instantes."
          const ctaLabel =
            "suggestedLabel" in result && typeof result.suggestedLabel === "string" ? result.suggestedLabel : undefined
          const ctaHref =
            "suggestedHref" in result && typeof result.suggestedHref === "string" ? result.suggestedHref : undefined

          return {
            messages: [
              {
                id: `subarea-cos-${Date.now()}`,
                from: "cos",
                text: responseText,
                time: now,
                ctaLabel,
                ctaHref,
              },
            ],
          }
        } catch {
          return {
            messages: [
              {
                id: `subarea-cos-error-${Date.now()}`,
                from: "cos",
                text: "Nao consegui executar sua solicitacao agora. Tente novamente em instantes.",
                time: now,
              },
            ],
          }
        }
      }}
      emptyLabel={chatCopy.emptyLabel}
    />
  )
}
